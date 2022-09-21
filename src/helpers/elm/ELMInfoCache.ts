import { CodeService, Repository } from 'cql-execution';
import { lastIndexOf } from 'lodash';
import { MeasureBundleHelpers } from '../..';
import { generateELMJSONFunction } from '../../calculation/DetailedResultsBuilder';
import { valueSetsForCodeService } from '../../execution/ValueSetHelper';
import { ExtractedLibrary, ValueSetMap } from '../../types/CQLTypes';
import { ELM, ELMIdentifier } from '../../types/ELMTypes';
import { PopulationType } from '../../types/Enums';
import { findObsMsrPopl } from '../DetailedResultsHelpers';

export interface ELMInfoCacheType {
  rep: Repository;
  elmJSONs: ELM[];
  codeService: CodeService;
  cqls: ExtractedLibrary[];
  rootLibIdentifier: ELMIdentifier;
  vsMap: ValueSetMap;
  lastAccessed?: Date;
}

// Cache entry should expire if it hasn't been accessed in 10 minutes
const CACHE_EXPIRE_TIME = 600000;
const ELMInfoCache = new Map<string, ELMInfoCacheType>();

export function retrieveELMInfo(
  measure: fhir4.Measure,
  measureBundle: fhir4.Bundle,
  valueSets: fhir4.ValueSet[],
  useElmJsonsCaching?: boolean
): ELMInfoCacheType {
  const { id, version } = measure;
  const key = `${id}-${version}`;
  console.log(Object.keys(ELMInfoCache));
  if (!(ELMInfoCache.get(key) && cacheEntryIsValid(ELMInfoCache.get(key)?.lastAccessed))) {
    const vsMap = valueSetsForCodeService(valueSets);

    const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle);

    // add expressions for collecting for all measure observations
    measure.group?.forEach(group => {
      group.population
        ?.filter(
          population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.OBSERV
        )
        ?.forEach(obsrvPop => {
          const msrPop = findObsMsrPopl(group, obsrvPop);
          if (msrPop?.criteria?.expression && obsrvPop.criteria?.expression) {
            const mainLib = elmJSONs.find(elm => elm.library.identifier.id === rootLibIdentifier.id);
            if (mainLib) {
              mainLib.library.statements.def.push(
                generateELMJSONFunction(obsrvPop.criteria.expression, msrPop.criteria.expression)
              );
            }
          }
        });
    });

    const codeService = new CodeService(vsMap);
    const rep = new Repository(elmJSONs);
    if (useElmJsonsCaching) {
      ELMInfoCache.set(key, { cqls, elmJSONs, rootLibIdentifier, codeService, rep, vsMap, lastAccessed: new Date() });
    } else {
      return { cqls, elmJSONs, rootLibIdentifier, codeService, rep, vsMap };
    }
  } else {
    ELMInfoCache.set(key, { ...(ELMInfoCache.get(key) as ELMInfoCacheType), lastAccessed: new Date() });
  }
  return { ...(ELMInfoCache.get(key) as ELMInfoCacheType) };
}

export function clearElmInfoCache() {
  ELMInfoCache.clear();
}
function cacheEntryIsValid(lastAccessed?: Date) {
  console.log(lastAccessed);
  if (!lastAccessed) {
    return false;
  }
  const now = new Date();
  console.log(now);
  return now.getTime() - lastAccessed.getTime() <= CACHE_EXPIRE_TIME;
}
