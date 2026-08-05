import { CalculationOptions, RawExecutionData, DebugOutput } from '../types/Calculator';
import { DataProvider, DateTime, Interval, Executor, Results } from 'cql-execution';
import { parseTimeStringAsUTC, getMissingDependentValuesets } from './ValueSetHelper';
import { ValueSetResolver } from './ValueSetResolver';
import { UnexpectedResource } from '../types/errors/CustomErrors';
import { retrieveELMInfo } from '../helpers/elm/ELMInfoCache';
import { MeasureWithLibrary } from '../helpers/MeasureBundleHelpers';
import { DEFAULT_MEASUREMENT_PERIOD_END, DEFAULT_MEASUREMENT_PERIOD_START } from '../constants';

export async function execute(
  measure: MeasureWithLibrary,
  measureBundle: fhir4.Bundle,
  patientSource: DataProvider,
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = [],
  debugObject?: DebugOutput
): Promise<RawExecutionData> {
  // Determine "root" library by looking at which lib is referenced by populations, and pull out the ELM

  // check for any missing valuesets
  const valueSets: fhir4.ValueSet[] = [];
  const newCache: fhir4.ValueSet[] = [];

  // Pass in existing cache to attempt any missing resolutions
  const missingVS = getMissingDependentValuesets(measureBundle, options.useEffectiveDataRequirements, [
    ...valueSetCache
  ]);

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

  const executor = new Executor(lib, codeService, parameters);
  let results: Results;
  try {
    results = await executor.exec(patientSource, executionDateTime);
  } catch (e) {
    if (e instanceof Error) {
      e.message = `The following error occurred in the cql-execution engine: ${e.message}`;

      if (e instanceof TypeError) {
        e.message +=
          '\n\n\t- Inspect the content of the ELM and ensure the data types in the expressions are correct\n\n';
      }
    }
    throw e;
  }

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
 * Normalized the start date for a measurementPeriod to 00:00:00.000Z and
 * the end date for a measurementPeriod to 23:59:59.999Z
 * @param date
 * @param isStartDate
 * @returns
 */
export function normalizeMeasurementPeriodDate(date: string, isStartDate: boolean): string {
  const fixedDate = new Date(date);
  if (isStartDate) {
    fixedDate.setUTCHours(0, 0, 0, 0);
  } else {
    fixedDate.setUTCHours(23, 59, 59, 999);
  }

  return fixedDate.toISOString();
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
    if (!options.measurementPeriodStart.includes('T') && !options.measurementPeriodStart.includes(':')) {
      options.measurementPeriodStart = normalizeMeasurementPeriodDate(options.measurementPeriodStart, true);
    }
    start = parseTimeStringAsUTC(options.measurementPeriodStart);
  } else {
    let defaultMeasurementPeriodStart = DEFAULT_MEASUREMENT_PERIOD_START;
    if (!DEFAULT_MEASUREMENT_PERIOD_START.includes('T') && !DEFAULT_MEASUREMENT_PERIOD_START.includes(':')) {
      defaultMeasurementPeriodStart = normalizeMeasurementPeriodDate(DEFAULT_MEASUREMENT_PERIOD_START, true);
    }
    start = new Date(defaultMeasurementPeriodStart);
  }
  if (options.measurementPeriodEnd) {
    if (!options.measurementPeriodEnd.includes('T') && !options.measurementPeriodEnd.includes(':')) {
      options.measurementPeriodEnd = normalizeMeasurementPeriodDate(options.measurementPeriodEnd, false);
    }
    end = parseTimeStringAsUTC(options.measurementPeriodEnd);
  } else {
    let defaultMeasurementPeriodEnd = DEFAULT_MEASUREMENT_PERIOD_END;
    if (!DEFAULT_MEASUREMENT_PERIOD_END.includes('T') && !DEFAULT_MEASUREMENT_PERIOD_END.includes(':')) {
      defaultMeasurementPeriodEnd = normalizeMeasurementPeriodDate(DEFAULT_MEASUREMENT_PERIOD_END, false);
    }
    end = new Date(defaultMeasurementPeriodEnd);
  }
  const startCql = DateTime.fromJSDate(start, 0); // No timezone offset for start
  const endCql = DateTime.fromJSDate(end, 0); // No timezone offset for stop
  return { startCql, endCql };
}
