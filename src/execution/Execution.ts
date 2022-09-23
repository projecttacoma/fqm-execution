import { CalculationOptions, RawExecutionData, DebugOutput } from '../types/Calculator';
import { DataProvider, DateTime, Interval, Executor } from 'cql-execution';
import { parseTimeStringAsUTC, getMissingDependentValuesets } from './ValueSetHelper';
import * as MeasureBundleHelpers from '../helpers/MeasureBundleHelpers';
import { ValueSetResolver } from './ValueSetResolver';
import { UnexpectedResource } from '../types/errors/CustomErrors';
import { retrieveELMInfo } from '../helpers/elm/ELMInfoCache';

export async function execute(
  measureBundle: fhir4.Bundle,
  patientSource: DataProvider,
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = [],
  debugObject?: DebugOutput
): Promise<RawExecutionData> {
  // Determine "root" library by looking at which lib is referenced by populations, and pull out the ELM

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

  const { cqls, rootLibIdentifier, elmJSONs, codeService, rep, vsMap } = retrieveELMInfo(
    measure,
    measureBundle,
    valueSets,
    options.useElmJsonsCaching
  );
  const { startCql, endCql } = getCQLIntervalEndpoints(options);

  const parameters = { 'Measurement Period': new Interval(startCql, endCql) };
  const executionDateTime = DateTime.fromJSDate(new Date(), 0);
  const lib = rep.resolve(rootLibIdentifier.id, rootLibIdentifier.version);
  /**
   * TODO look more into this if it returns string instead of error
   */
  const executor = new Executor(lib, codeService, parameters);
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
  const startCql = DateTime.fromJSDate(start, 0); // No timezone offset for start
  const endCql = DateTime.fromJSDate(end, 0); // No timezone offset for stop
  return { startCql, endCql };
}
