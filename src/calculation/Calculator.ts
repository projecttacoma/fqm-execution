import {
  ExecutionResult,
  CalculationOptions,
  CalculationOutput,
  MRCalculationOutput,
  AMRCalculationOutput,
  IMRCalculationOutput,
  GICCalculationOutput,
  RCalculationOutput,
  DRCalculationOutput,
  DebugOutput,
  DataTypeQuery,
  QICalculationOutput,
  OneOrManyBundles,
  OneOrMultiPatient,
  PopulationGroupResult,
  DetailedPopulationGroupResult
} from '../types/Calculator';
import { PopulationType, MeasureScoreType, ImprovementNotation } from '../types/Enums';
import * as Execution from '../execution/Execution';
import * as CalculatorHelpers from './DetailedResultsBuilder';
import * as MeasureBundleHelpers from '../helpers/MeasureBundleHelpers';
import * as ResultsHelpers from './ClauseResultsBuilder';
import MeasureReportBuilder from './MeasureReportBuilder';
import * as GapsInCareHelpers from '../gaps/GapsReportBuilder';
import { generateHTML } from './HTMLBuilder';
import { parseQueryInfo } from '../gaps/QueryFilterParser';
import * as RetrievesHelper from '../gaps/RetrievesFinder';
import { uniqBy } from 'lodash';
import { generateDataRequirement, addFhirQueryPatternToDataRequirements } from '../helpers/DataRequirementHelpers';
import { GracefulError } from '../types/errors/GracefulError';
import {
  ErrorWithDebugInfo,
  UnexpectedProperty,
  UnexpectedResource,
  UnsupportedProperty
} from '../types/errors/CustomErrors';
import { Interval, DataProvider } from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { pruneDetailedResults } from '../helpers/DetailedResultsHelpers';

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns Detailed execution results. One for each patient.
 */
export async function calculate<T extends CalculationOptions>(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: T,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<CalculationOutput<T>> {
  // Ensure verboseCalculationResults defaults to true when not provided in options
  options.verboseCalculationResults = options.verboseCalculationResults ?? true;

  const debugObject: DebugOutput | undefined = options.enableDebugOutput ? <DebugOutput>{} : undefined;

  // Get the PatientSource to use for calculation.
  const patientSource = resolvePatientSource(patientBundles, options);

  // Ensure the CalculationOptions have sane defaults, only if they're not set
  options.calculateHTML = options.calculateHTML ?? true;
  options.calculateSDEs = options.calculateSDEs ?? true;
  options.calculateCoverageHTML = options.calculateCoverageHTML ?? true;
  
  // Get the default measurement period out of the Measure object
  const measurementPeriod = MeasureBundleHelpers.extractMeasurementPeriod(measureBundle);
  // Set the measurement period start/end, but only if the caller didn't specify one
  options.measurementPeriodStart = options.measurementPeriodStart ?? measurementPeriod.measurementPeriodStart;
  options.measurementPeriodEnd = options.measurementPeriodEnd ?? measurementPeriod.measurementPeriodEnd;

  const measure = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);
  const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [];

  const results = await Execution.execute(measureBundle, patientSource, options, valueSetCache, debugObject);
  if (!results.rawResults) {
    throw new Error(results.errorMessage ?? 'something happened with no error message');
  }
  const rawResults = results.rawResults;

  if (!results.elmLibraries || !results.mainLibraryName) {
    throw new UnexpectedResource('no libraries were found');
  }
  const elmLibraries = results.elmLibraries;
  const mainLibraryName = results.mainLibraryName;

  // Grab all patient IDs from the raw results.
  const patientIds = Object.keys(rawResults.patientResults);

  // Iterate over patient bundles and make results for each of them.
  patientIds.forEach(patientId => {
    const patientExecutionResult: ExecutionResult<DetailedPopulationGroupResult> = {
      patientId: patientId,
      detailedResults: [],
      evaluatedResource: rawResults.patientEvaluatedRecords[patientId],
      patientObject: rawResults.patientResults[patientId]['Patient']
    };

    // Grab statement results for the patient
    const patientStatementResults = rawResults.patientResults[patientId];
    // Grab localId results for the patient
    const patientLocalIdResults = rawResults.localIdPatientResultsMap[patientId];

    // iterator to use for group ID if they are defined in the population groups
    let i = 1;

    // Iterate over measure population groups
    measure.group?.forEach(group => {
      // build initial results set with population values
      const detailedGroupResult = CalculatorHelpers.createPopulationValues(measure, group, patientStatementResults);

      // fix groupId to an auto incremented if it was not found.
      if (detailedGroupResult.groupId === 'unknown') {
        detailedGroupResult.groupId = `population-group-${i++}`;
      }

      // get the relevance information for each population
      detailedGroupResult.populationRelevance = ResultsHelpers.buildPopulationGroupRelevanceMap(
        group,
        detailedGroupResult
      );

      // use relevance info to fill out statement relevance information and create initial statementResults structure
      detailedGroupResult.statementResults = ResultsHelpers.buildStatementRelevanceMap(
        measure,
        detailedGroupResult.populationRelevance,
        mainLibraryName,
        elmLibraries,
        group,
        options.calculateSDEs ?? false
      );

      // adds result information to the statement results and builds up clause results
      detailedGroupResult.clauseResults = ResultsHelpers.buildStatementAndClauseResults(
        measure,
        elmLibraries,
        patientLocalIdResults,
        detailedGroupResult.statementResults,
        true,
        true
      );

      if (options.calculateHTML || options.calculateCoverageHTML) {
        let highlightingType;
        if (options.calculateCoverageHTML) {
          highlightingType = 'coverage';
        }
        const html = generateHTML(
          elmLibraries,
          detailedGroupResult.statementResults,
          detailedGroupResult.clauseResults,
          detailedGroupResult.groupId,
          highlightingType
        );
        detailedGroupResult.html = html;
        if (debugObject && options.enableDebugOutput) {
          const debugHtml = {
            name: `clauses-${detailedGroupResult.groupId}.html`,
            html
          };
          if (Array.isArray(debugObject.html) && debugObject.html?.length !== 0) {
            debugObject.html?.push(debugHtml);
          } else {
            debugObject.html = [debugHtml];
          }
        }
      }

      // add this group result to the patient results
      patientExecutionResult.detailedResults?.push(detailedGroupResult);
    });

    // put raw SDE values onto execution result
    if (options.calculateSDEs) {
      patientExecutionResult.supplementalData = ResultsHelpers.getSDEValues(measure, patientStatementResults);
    }

    executionResults.push(patientExecutionResult);
  });

  if (debugObject && options.enableDebugOutput) {
    debugObject.detailedResults = executionResults;
  }

  let prunedExecutionResults: ExecutionResult<PopulationGroupResult>[];
  if (options.verboseCalculationResults === false) {
    // Prune to simple view
    prunedExecutionResults = pruneDetailedResults(executionResults);
  } else {
    prunedExecutionResults = executionResults as ExecutionResult<DetailedPopulationGroupResult>[];
  }

  // return with the ELM libraries and main library name for further processing if requested.
  if (options.returnELM) {
    return {
      results: prunedExecutionResults,
      debugOutput: debugObject,
      elmLibraries: results.elmLibraries,
      mainLibraryName: results.mainLibraryName,
      parameters: results.parameters,
      ...(options.useValueSetCaching && results.valueSetCache && { valueSetCache: results.valueSetCache })
    };
  } else {
    return {
      results: prunedExecutionResults,
      debugOutput: debugObject,
      ...(options.useValueSetCaching && results.valueSetCache && { valueSetCache: results.valueSetCache })
    };
  }
}

/**
 * Calculate measure against a set of patients. Returning individual or summary MeasureReports based on options
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns MeasureReport resource(s) for each patient or entire population according to standard https://www.hl7.org/fhir/measurereport.html
 */
export async function calculateMeasureReports(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<MRCalculationOutput> {
  return options.reportType === 'summary'
    ? calculateAggregateMeasureReport(measureBundle, patientBundles, options, valueSetCache)
    : calculateIndividualMeasureReports(measureBundle, patientBundles, options, valueSetCache);
}

/**
 * Calculate measure against a set of patients. Returning measure reports for each patient.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns MeasureReport resource for each patient according to standard https://www.hl7.org/fhir/measurereport.html
 */
export async function calculateIndividualMeasureReports(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<IMRCalculationOutput> {
  if (options.reportType && options.reportType !== 'individual') {
    throw new UnsupportedProperty('calculateMeasureReports only supports reportType "individual".');
  }
  // options should be updated by this call if measurementPeriod wasn't initially passed in
  const calculationResults = await calculate(measureBundle, patientBundles, options, valueSetCache);
  const { results, debugOutput } = calculationResults;

  const reports = MeasureReportBuilder.buildMeasureReports(measureBundle, results, options);

  if (debugOutput && options.enableDebugOutput) {
    debugOutput.measureReports = reports;
  }

  return { results: reports, debugOutput, valueSetCache: calculationResults.valueSetCache };
}

/**
 * Calculate measure against a set of patients. Returning a single MeasureReport for aggregated results.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns MeasureReport resource summary according to standard https://www.hl7.org/fhir/measurereport.html
 */
export async function calculateAggregateMeasureReport(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<AMRCalculationOutput> {
  if (options.reportType && options.reportType === 'individual') {
    throw new Error('calculateAggregateMeasureReports only supports reportType "summary".');
  }
  // options should be updated by this call if measurementPeriod wasn't initially passed in
  const calculationResults = await calculate(measureBundle, patientBundles, options, valueSetCache);
  const { results, debugOutput } = calculationResults;

  const builder = new MeasureReportBuilder(measureBundle, options);

  results.forEach(result => {
    builder.addPatientResults(result);
  });

  const report = builder.getReport();

  if (debugOutput && options.enableDebugOutput) {
    debugOutput.measureReports = [report];
  }

  return { results: report, debugOutput, valueSetCache: calculationResults.valueSetCache };
}

/**
 * Get raw results from cql-execution
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns pass through of raw calculation results from the engine
 */
export async function calculateRaw(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<RCalculationOutput> {
  const debugObject: DebugOutput | undefined = options.enableDebugOutput ? <DebugOutput>{} : undefined;
  // Get the PatientSource to use for calculation.
  const patientSource = resolvePatientSource(patientBundles, options);
  const results = await Execution.execute(measureBundle, patientSource, options, valueSetCache, debugObject);
  if (results.rawResults) {
    return { results: results.rawResults, debugOutput: debugObject, valueSetCache: results.valueSetCache };
  } else {
    throw new ErrorWithDebugInfo(results.errorMessage ?? 'something happened with no error message', debugObject);
  }
}

/**
 * Get any gaps in care for the patients
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns gaps bundle of DetectedIssues and GuidanceResponses
 */
export async function calculateGapsInCare<T extends OneOrMultiPatient>(
  measureBundle: fhir4.Bundle,
  patientBundles: T,
  options: CalculationOptions,
  valueSetCache: fhir4.ValueSet[] = []
): Promise<GICCalculationOutput<T>> {
  // Detailed results for populations get ELM content back
  options.returnELM = true;

  const calculationResults = await calculate(measureBundle, patientBundles, options, valueSetCache);

  const { results, debugOutput, elmLibraries, mainLibraryName, parameters } = calculationResults;
  const measureReports = MeasureReportBuilder.buildMeasureReports(measureBundle, results, options);
  const result: fhir4.Bundle[] = [];
  const errorLog: GracefulError[] = [];
  const resultPromises = results.map(async res => {
    const matchingMeasureReport = measureReports.find(mr => mr.subject?.reference?.split('/')[1] === res.patientId);

    if (!matchingMeasureReport) {
      throw new Error(`No MeasureReport generated during gaps in care for ${res.patientId}`);
    }

    const drPromises = res.detailedResults?.map(async (dr, i) => {
      const measureResource = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);

      // Gaps only supported for proportion/ratio measures
      const scoringCode = measureResource.scoring?.coding?.find(
        c =>
          c.system === 'http://hl7.org/fhir/measure-scoring' ||
          c.system === 'http://terminology.hl7.org/CodeSystem/measure-scoring'
      )?.code;

      if (scoringCode !== MeasureScoreType.PROP) {
        throw new UnsupportedProperty(`Gaps in care not supported for measure scoring type ${scoringCode}`);
      }

      const denomResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result;
      const numerResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result;
      const numerRelevance = dr.populationRelevance?.find(pr => pr.populationType === PopulationType.NUMER)?.result;

      if (!measureResource.improvementNotation?.coding) {
        throw new UnexpectedProperty('Measure resource must include improvement notation');
      }

      const improvementNotation = measureResource.improvementNotation.coding[0].code;

      if (!improvementNotation) {
        throw new UnexpectedProperty('Improvement notation code not present on measure');
      }

      // If positive improvement measure, consider patients in denominator but not numerator for gaps
      // If negative improvement measure, consider patients in numerator for gaps
      // For either case, ignore patient if numerator isn't relevant
      const populationCriteria =
        numerRelevance &&
        (improvementNotation === ImprovementNotation.POSITIVE ? denomResult && !numerResult : numerResult);
      if (populationCriteria) {
        const matchingGroup = measureResource.group?.find(g => g.id === dr.groupId) || measureResource.group?.[i];

        if (!matchingGroup) {
          throw new Error(`Could not find group with id ${dr.groupId} in measure resource`);
        }

        const numerCriteria = matchingGroup.population?.find(
          pop => pop.code?.coding && pop.code.coding[0].code === PopulationType.NUMER
        );

        if (!numerCriteria) {
          throw new UnexpectedProperty(`Could not find numerator criteria expression in measure group ${dr.groupId}`);
        }

        const numerExpressionName = numerCriteria.criteria.expression;
        const mainLibraryELM = elmLibraries?.find(lib => lib.library.identifier.id === mainLibraryName);

        if (!mainLibraryELM || !elmLibraries) {
          throw new UnexpectedResource(`Could not find ELM for ${mainLibraryName}`);
        }

        const numerELMExpression = mainLibraryELM.library.statements.def.find(e => e.name === numerExpressionName);
        if (!numerELMExpression) {
          throw new UnexpectedProperty(`Expression ${numerExpressionName} not found in ${mainLibraryName}`);
        }

        // Parse ELM for basic info about queries
        const retrievesOutput = RetrievesHelper.findRetrieves(
          mainLibraryELM,
          elmLibraries,
          numerELMExpression.expression
        );

        const baseRetrieves = retrievesOutput.results;
        const retrievesErrors = retrievesOutput.withErrors;
        errorLog.push(...retrievesErrors);

        // Add detailed info to queries based on clause results
        const gapsRetrieves = GapsInCareHelpers.processQueriesForGaps(baseRetrieves, dr);

        const grPromises = gapsRetrieves.map(async retrieve => {
          // If the retrieves have a localId for the query and a known library name, we can get more info
          // on how the query filters the sources.
          if (retrieve.queryLocalId && retrieve.queryLibraryName) {
            const library = elmLibraries.find(lib => lib.library.identifier.id === retrieve.queryLibraryName);
            if (library) {
              retrieve.queryInfo = await parseQueryInfo(
                library,
                elmLibraries,
                retrieve.queryLocalId,
                retrieve.valueComparisonLocalId,
                parameters,
                res.patientObject
              );
            }
          }
        });
        await Promise.all(grPromises);

        const { results: detailedGapsRetrieves, withErrors: reasonDetailErrors } =
          GapsInCareHelpers.calculateReasonDetail(gapsRetrieves, improvementNotation, dr);

        errorLog.push(...reasonDetailErrors);

        const { detectedIssues, withErrors: detectedIssueErrors } = GapsInCareHelpers.generateDetectedIssueResources(
          detailedGapsRetrieves,
          matchingMeasureReport,
          improvementNotation
        );
        errorLog.push(...detectedIssueErrors);

        const patient = res.patientObject?._json as fhir4.Patient;
        const gapsBundle = GapsInCareHelpers.generateGapsInCareBundle(detectedIssues, matchingMeasureReport, patient);
        result.push(gapsBundle);
        if (debugOutput && options.enableDebugOutput) {
          debugOutput.gaps = {
            retrieves: detailedGapsRetrieves,
            bundle: result
          };
        }
      } else {
        result.push(<fhir4.Bundle>{});
      }
    });
    if (drPromises) {
      await Promise.all(drPromises);
    }
  });
  await Promise.all(resultPromises);
  return {
    results: <OneOrManyBundles<T>>(result.length === 1 ? result[0] : result),
    debugOutput,
    valueSetCache: calculationResults.valueSetCache,
    withErrors: errorLog
  };
}

/**
 * Get data requirements for this measure
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param options Options for calculation.
 *
 * @returns FHIR Library of data requirements
 */
export async function calculateDataRequirements(
  measureBundle: fhir4.Bundle,
  options: CalculationOptions = {}
): Promise<DRCalculationOutput> {
  // Extract the library ELM, and the id of the root library, from the measure bundle
  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle);
  const rootLib = elmJSONs.find(ej => ej.library.identifier == rootLibIdentifier);

  const { startCql, endCql } = Execution.getCQLIntervalEndpoints(options);

  // We need a root library to run dataRequirements properly. If we don't have one, error out.
  if (!rootLib?.library) {
    throw new UnexpectedResource("root library doesn't contain a library object"); //unexpected resource
  }

  const parameters = { 'Measurement Period': new Interval(startCql, endCql) };
  const withErrors: GracefulError[] = [];
  // get the retrieves for every statement in the root library
  const allRetrieves = rootLib.library.statements.def.flatMap(statement => {
    if (statement.expression && statement.name != 'Patient') {
      const retrievesOutput = RetrievesHelper.findRetrieves(rootLib, elmJSONs, statement.expression);
      withErrors.push(...retrievesOutput.withErrors);
      return retrievesOutput.results;
    } else {
      return [] as DataTypeQuery[];
    }
  });

  const allRetrievesPromises = allRetrieves.map(async retrieve => {
    // If the retrieves have a localId for the query and a known library name, we can get more info
    // on how the query filters the sources.
    if (retrieve.queryLocalId && retrieve.queryLibraryName) {
      const library = elmJSONs.find(lib => lib.library.identifier.id === retrieve.queryLibraryName);
      if (library) {
        retrieve.queryInfo = await parseQueryInfo(
          library,
          elmJSONs,
          retrieve.queryLocalId,
          retrieve.valueComparisonLocalId,
          parameters
        );
      }
    }
  });

  await Promise.all(allRetrievesPromises);

  const results: fhir4.Library = {
    resourceType: 'Library',
    type: { coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }] },
    status: 'unknown'
  };
  results.dataRequirement = uniqBy(
    allRetrieves.map(retrieve => {
      const dr = generateDataRequirement(retrieve);
      GapsInCareHelpers.addFiltersToDataRequirement(retrieve, dr, withErrors);
      addFhirQueryPatternToDataRequirements(dr);
      return dr;
    }),
    JSON.stringify
  );

  return {
    results: results,
    debugOutput: {
      cql: cqls,
      elm: elmJSONs,
      gaps: {
        retrieves: allRetrieves
      }
    },
    withErrors
  };
}

/**
 * Get detailed query info for all statements of a Measure
 *
 * @param measureBundle Bundle with a Measure resource and all dependent library resources
 * @returns Detailed query info object for all statements
 */
export async function calculateQueryInfo(
  measureBundle: fhir4.Bundle,
  options: CalculationOptions = {}
): Promise<QICalculationOutput> {
  // Extract the library ELM, and the id of the root library, from the measure bundle
  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle);
  const rootLib = elmJSONs.find(ej => ej.library.identifier == rootLibIdentifier);
  const { startCql, endCql } = Execution.getCQLIntervalEndpoints(options);

  if (!rootLib?.library) {
    throw new UnexpectedResource("root library doesn't contain a library object"); //unexpected resource
  }

  const parameters = { 'Measurement Period': new Interval(startCql, endCql) };
  // get the retrieves for every statement in the root library
  const withErrors: GracefulError[] = [];
  const allRetrieves = rootLib.library.statements.def.flatMap(statement => {
    if (statement.expression && statement.name != 'Patient') {
      const retrievesOutput = RetrievesHelper.findRetrieves(rootLib, elmJSONs, statement.expression);
      withErrors.push(...retrievesOutput.withErrors);
      return retrievesOutput.results;
    } else {
      return [] as DataTypeQuery[];
    }
  });

  const allRetrievesPromises = allRetrieves.map(async retrieve => {
    // If the retrieves have a localId for the query and a known library name, we can get more info
    // on how the query filters the sources.
    if (retrieve.queryLocalId && retrieve.queryLibraryName) {
      const library = elmJSONs.find(lib => lib.library.identifier.id === retrieve.queryLibraryName);
      if (library) {
        retrieve.queryInfo = await parseQueryInfo(
          library,
          elmJSONs,
          retrieve.queryLocalId,
          retrieve.valueComparisonLocalId,
          parameters
        );
      }
    }
  });

  await Promise.all(allRetrievesPromises);

  return {
    results: allRetrieves,
    debugOutput: {
      cql: cqls,
      elm: elmJSONs
    },
    withErrors
  };
}

/**
 * Resolve the PatientSource to use for calculation. If a PatientSource was provided, use it. Otherwise use
 * cql-exec-fhir to make one from Patient Bundles.
 *
 * @param patientBundles Patient bundle array passed in.
 * @param options Options passed into the calculator.
 * @returns PatientSource to use for calculation.
 */
function resolvePatientSource(patientBundles: fhir4.Bundle[], options: CalculationOptions): DataProvider {
  if (options.patientSource) {
    return options.patientSource;
  } else {
    //if there are entries, pb.entry?.length will be > 0 which is truthy. Otherwise falsy
    if (patientBundles.filter(pb => pb.entry?.length).length === 0) {
      throw new UnexpectedResource('No entries found in passed patient bundles');
    }
    const patientSource = PatientSource.FHIRv401(options.trustMetaProfile);
    patientSource.loadBundles(patientBundles);
    return patientSource;
  }
}
