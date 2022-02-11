import { CalculationOptions, RawExecutionData, DebugOutput } from '../types/Calculator';

// import { PatientSource } from 'cql-exec-fhir';
import cql from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { parseTimeStringAsUTC, valueSetsForCodeService, getMissingDependentValuesets } from './ValueSetHelper';
import * as MeasureBundleHelpers from '../helpers/MeasureBundleHelpers';
import { PopulationType } from '../types/Enums';
import { generateELMJSONFunction } from '../calculation/DetailedResultsBuilder';
import { ValueSetResolver } from './ValueSetResolver';
import { UnexpectedResource } from '../types/errors/CustomErrors';

export async function execute(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = [],
  debugObject?: DebugOutput
): Promise<RawExecutionData> {
  // Determine "root" library by looking at which lib is referenced by populations, and pull out the ELM

  //if there are entries, pb.entry?.length will be > 0 which is truthy. Otherwise falsy
  if (patientBundles.filter(pb => pb.entry?.length).length === 0) {
    throw new UnexpectedResource('No entries found in passed patient bundles');
  }
  const measure = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);

  // check for any missing valuesets
  const valueSets: fhir4.ValueSet[] = [];
  const newCache: fhir4.ValueSet[] = [];

  // Pass in existing cache to attempt any missing resolutions
  const missingVS = getMissingDependentValuesets(measureBundle, [...valueSetCache]);

  if (missingVS.length > 0) {
    if (!options.vsAPIKey || options.vsAPIKey.length == 0) {
      throw new UnexpectedResource(
        `Missing the following valuesets: ${missingVS.join(', ')}, and no API key was provided to resolve them`
      );
    }
    const vsr = new ValueSetResolver(options.vsAPIKey || '');
    const [expansions, errorMessages] = await vsr.getExpansionForValuesetUrls(missingVS);

    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join('\n'));
    }

    valueSets.push(...expansions);

    // Update cache to include new expansions
    if (options.useValueSetCaching) {
      newCache.push(...expansions);
    }
  }

  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType === 'ValueSet') {
      valueSets.push(e.resource as fhir4.ValueSet);
    }
  });

  // Include provided ValueSets in code service
  // These can be provided directly as an argument or via the caching behavior
  valueSets.push(...valueSetCache);

  const vsMap = valueSetsForCodeService(valueSets);

  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle);

  const { startCql, endCql } = getCQLIntervalEndpoints(options);

  const patientSource = new PatientSource.FHIRv401();
  patientSource.loadBundles(patientBundles);

  // add expressions for collecting for all measure observations
  measure.group?.forEach(group => {
    group.population
      ?.filter(
        population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.OBSERV
      )
      ?.forEach(obsrvPop => {
        const msrPop = group.population?.find(
          population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.MSRPOPL
        );
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

  const codeService = new cql.CodeService(vsMap);
  const parameters = { 'Measurement Period': new cql.Interval(startCql, endCql) };
  const executionDateTime = cql.DateTime.fromJSDate(new Date(), 0);
  const rep = new cql.Repository(elmJSONs);
  const lib = rep.resolve(rootLibIdentifier.id, rootLibIdentifier.version);
  /**
   * TODO look more into this if it returns string instead of error
   */
  const executor = new cql.Executor(lib, codeService, parameters);
  const results = await executor.exec(patientSource, executionDateTime);

  // Map evaluated resource from engine to the raw FHIR json
  Object.keys(results.patientEvaluatedRecords).forEach(patientId => {
    results.patientEvaluatedRecords[patientId] = results.patientEvaluatedRecords[patientId].map((r: any) => r._json);
  });

  if (debugObject && options.enableDebugOutput) {
    debugObject.elm = elmJSONs;
    debugObject.cql = cqls;
    debugObject.vs = vsMap;
    debugObject.rawResults = results;
  }

  return {
    rawResults: results,
    elmLibraries: elmJSONs,
    mainLibraryName: rootLibIdentifier.id,
    parameters: parameters,
    ...(options.useValueSetCaching && { valueSetCache: newCache })
  };
}

/**
 * Takes in the calculation options and returns start and end dates to create a cql interval
 * @param options calculationOptions passed in by the user
 * @returns {startCql: Date, endCql: Date}, the start and end date of the calculationOptions
 */
export function getCQLIntervalEndpoints(options: CalculationOptions) {
  // Measure datetime stuff
  let start;
  let end;
  if (options.measurementPeriodStart) {
    start = parseTimeStringAsUTC(options.measurementPeriodStart);
  } else {
    start = new Date('2019-01-01');
  }
  if (options.measurementPeriodEnd) {
    end = parseTimeStringAsUTC(options.measurementPeriodEnd);
  } else {
    end = new Date('2019-12-31');
  }
  const startCql = cql.DateTime.fromJSDate(start, 0); // No timezone offset for start
  const endCql = cql.DateTime.fromJSDate(end, 0); // No timezone offset for stop
  return { startCql, endCql };
}
