import { CodeService, Repository } from 'cql-execution';
import { MeasureBundleHelpers } from '../..';
import {
  generateEpisodeELMJSONFunction,
  generateBooleanELMJSONFunction
} from '../../calculation/DetailedResultsBuilder';
import { valueSetsForCodeService } from '../../execution/ValueSetHelper';
import { ExtractedLibrary, ValueSetMap } from '../../types/CQLTypes';
import { ELM, ELMIdentifier } from '../../types/ELMTypes';
import { PopulationType } from '../../types/Enums';
import { findObsMsrPopl } from '../DetailedResultsHelpers';
import { isEpisodeOfCareGroup } from '../MeasureBundleHelpers';

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

/**
 * Calculates cqls, elmJSONs, rootLibIdentifier, codeService, rep, and vsMap info or retrieves from cache if available and enabled
 * @param measure {Object} the FHIR Measure that Calculation is being run on
 * @param measureBundle {Object} the FHIR Bundle containing the Measure and supplemental resources
 * @param valueSets {Array} the FHIR Valueset resources referenced by the Libraries within the Measure
 * @param useElmJsonsCaching {boolean} a flag that, when set to true, enables caching of cqls, elmJSONs,
 * rootLibIdentifier, codeService, rep, and vsMap data for quicker use in subsequent runs
 * @returns {Object} an object containing cqls, elmJSONs, rootLibIdentifier, codeService, rep, and vsMap
 */
export function retrieveELMInfo(
  measure: fhir4.Measure,
  measureBundle: fhir4.Bundle,
  valueSets: fhir4.ValueSet[],
  useElmJsonsCaching?: boolean
): ELMInfoCacheType {
  const { id, version } = measure;
  const key = `${id}-${version}`;
  if (!(ELMInfoCache.get(key) && cacheEntryIsValid(ELMInfoCache.get(key)?.lastAccessed))) {
    const vsMap = valueSetsForCodeService(valueSets);

    const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromMeasureBundle(measureBundle);

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
              const elmFunction = isEpisodeOfCareGroup(measure, group)
                ? generateEpisodeELMJSONFunction(obsrvPop.criteria.expression, msrPop.criteria.expression)
                : generateBooleanELMJSONFunction(obsrvPop.criteria.expression);

              mainLib.library.statements.def.push(elmFunction);
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
  // We need typecasting here (and above) since theoretically Map.get() can return undefined, even though we know the key is present at this point
  return ELMInfoCache.get(key) as ELMInfoCacheType;
}

export function clearElmInfoCache() {
  ELMInfoCache.clear();
}

/**
 *
 * @param lastAccessed {Object} a JS date dignifying the last accessed moment of a cache entry
 * @returns {boolean} true if the last accessed date is less than 10 minutes before the current date
 */
function cacheEntryIsValid(lastAccessed?: Date) {
  if (!lastAccessed) {
    return false;
  }
  const now = new Date();
  return now.getTime() - lastAccessed.getTime() <= CACHE_EXPIRE_TIME;
}
