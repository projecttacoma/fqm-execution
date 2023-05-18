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
import * as DataRequirementHelpers from '../helpers/DataRequirementHelpers';
import MeasureReportBuilder from './MeasureReportBuilder';
import * as GapsInCareHelpers from '../gaps/GapsReportBuilder';
import { generateHTML, generateClauseCoverageHTML } from './HTMLBuilder';
import { parseQueryInfo } from '../gaps/QueryFilterParser';
import * as RetrievesHelper from '../gaps/RetrievesFinder';
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
import { clearElmInfoCache } from '../helpers/elm/ELMInfoCache';
import _, { omit } from 'lodash';
import { ELM } from '../types/ELMTypes';
import { getReportBuilder } from '../helpers/reportBuilderFactory';

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a Measure Resource and all necessary data for execution.
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

  if (options.clearElmJsonsCache) {
    clearElmInfoCache();
  }

  // Ensure the CalculationOptions have sane defaults, only if they're not set
  options.calculateHTML = options.calculateHTML ?? true;
  options.calculateSDEs = options.calculateSDEs ?? true;
  options.calculateClauseCoverage = options.calculateClauseCoverage ?? true;

  const compositeMeasureResource = MeasureBundleHelpers.extractCompositeMeasure(measureBundle);

  const isCompositeExecution = compositeMeasureResource != null;

  const measuresToExecute = isCompositeExecution
    ? MeasureBundleHelpers.extractComponentsFromMeasure(compositeMeasureResource, measureBundle)
    : [MeasureBundleHelpers.extractMeasureFromBundle(measureBundle)];

  // Get the PatientSource to use for calculation.
  let patientSource = resolvePatientSource(patientBundles, options);

  const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [];
  let overallClauseCoverageHTML: string | undefined;
  let groupClauseCoverageHTML: Record<string, string> | undefined;

  let newValueSetCache: fhir4.ValueSet[] | undefined = [...valueSetCache];
  const elmLibraries: ELM[] = [];
  let mainLibraryName = '';

  for (const measure of measuresToExecute) {
    // Get the default measurement period out of the Measure object
    const measurementPeriod = MeasureBundleHelpers.extractMeasurementPeriod(measure);
    // Set the measurement period start/end, but only if the caller didn't specify one
    options.measurementPeriodStart = options.measurementPeriodStart ?? measurementPeriod.measurementPeriodStart;
    options.measurementPeriodEnd = options.measurementPeriodEnd ?? measurementPeriod.measurementPeriodEnd;

    const results = await Execution.execute(
      measure,
      measureBundle,
      patientSource,
      options,
      newValueSetCache,
      debugObject
    );
    if (!results.rawResults) {
      throw new Error(results.errorMessage ?? 'something happened with no error message');
    }
    const rawResults = results.rawResults;

    if (!results.elmLibraries || !results.mainLibraryName) {
      throw new UnexpectedResource('no libraries were found');
    }

    if (options.useValueSetCaching && results.valueSetCache) {
      newValueSetCache = newValueSetCache.concat(results.valueSetCache);
    }

    elmLibraries.push(...results.elmLibraries);

    mainLibraryName = results.mainLibraryName;

    // Grab all patient IDs from the raw results.
    const patientIds = Object.keys(rawResults.patientResults);

    // Iterate over patient bundles and make results for each of them.
    patientIds.forEach(patientId => {
      let patientExecutionResult: ExecutionResult<DetailedPopulationGroupResult>;

      // For composite execution, we want to modify the results of a previously existing patient
      // For non-composite execution, there should never be a case where the same patientId occurs twice in this loop
      const existingResult = executionResults.find(er => er.patientId === patientId);
      if (existingResult) {
        patientExecutionResult = existingResult;
      } else {
        patientExecutionResult = {
          patientId: patientId,
          detailedResults: [],
          evaluatedResource: rawResults.patientEvaluatedRecords[patientId],
          patientObject: rawResults.patientResults[patientId]['Patient']
        };

        executionResults.push(patientExecutionResult);
      }

      // Grab statement results for the patient
      const patientStatementResults = rawResults.patientResults[patientId];
      // Grab localId results for the patient
      const patientLocalIdResults = rawResults.localIdPatientResultsMap[patientId];

      // iterator to use for group ID if they are defined in the population groups
      let i = 1;

      // use scoring code from measure as a fallback when building population group
      // relevance map (if scoring code is not present at the group level)
      const measureScoringCode = MeasureBundleHelpers.getScoringCodeFromMeasure(measure);

      // Iterate over measure population groups
      measure.group?.forEach(group => {
        // build initial results set with population values
        const detailedGroupResult = CalculatorHelpers.createPopulationValues(measure, group, patientStatementResults);

        if (isCompositeExecution) {
          detailedGroupResult.componentCanonical = `${measure.url}${measure.version ? `|${measure.version}` : ''}`;
        }

        // fix groupId to an auto incremented if it was not found.
        if (detailedGroupResult.groupId === 'unknown') {
          detailedGroupResult.groupId = `population-group-${i++}`;
        }

        // get the relevance information for each population
        detailedGroupResult.populationRelevance = ResultsHelpers.buildPopulationGroupRelevanceMap(
          detailedGroupResult,
          group,
          measureScoringCode
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

        if (options.calculateHTML) {
          const html = generateHTML(
            elmLibraries,
            detailedGroupResult.statementResults,
            detailedGroupResult.clauseResults,
            detailedGroupResult.groupId
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
        if (isCompositeExecution) {
          if (!patientExecutionResult.componentResults) {
            patientExecutionResult.componentResults = [];
          }
          patientExecutionResult.componentResults.push({
            groupId: detailedGroupResult.groupId,
            componentCanonical: detailedGroupResult.componentCanonical,
            populationResults: detailedGroupResult.populationResults
          });
        }
      });

      // put raw SDE values onto execution result
      if (options.calculateSDEs) {
        patientExecutionResult.supplementalData = ResultsHelpers.getSDEValues(measure, patientStatementResults);
      }
    });

    patientSource = resolvePatientSource(patientBundles, options);

    if (!isCompositeExecution && options.calculateClauseCoverage) {
      groupClauseCoverageHTML = generateClauseCoverageHTML(elmLibraries, executionResults);
      overallClauseCoverageHTML = '';
      Object.entries(groupClauseCoverageHTML).forEach(([groupId, result]) => {
        overallClauseCoverageHTML += result;
        if (debugObject && options.enableDebugOutput) {
          const debugHTML = {
            name: `clause-coverage-${groupId}.html`,
            html: result
          };
          if (Array.isArray(debugObject.html)) {
            debugObject.html.push(debugHTML);
          } else {
            debugObject.html = [debugHTML];
          }
        }
      });
      // don't necessarily need this file, but adding it for backwards compatibility
      if (debugObject && options.enableDebugOutput) {
        debugObject.html?.push({
          name: 'overall-clause-coverage.html',
          html: overallClauseCoverageHTML
        });
      }
    }
  }

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

  return {
    results: prunedExecutionResults,
    debugOutput: debugObject,
    ...(options.returnELM && {
      elmLibraries: _.uniqWith(
        elmLibraries,
        (libOne, libTwo) =>
          libOne.library.identifier.id === libTwo.library.identifier.id &&
          libOne.library.identifier.version === libOne.library.identifier.version
      ),
      mainLibraryName
    }),
    ...(options.useValueSetCaching &&
      newValueSetCache && {
        valueSetCache: _.uniqWith(
          newValueSetCache,
          (vsOne, vsTwo) => vsOne.url === vsTwo.url && vsOne.version === vsTwo.version
        )
      }),
    ...(overallClauseCoverageHTML && { coverageHTML: overallClauseCoverageHTML }),
    ...(groupClauseCoverageHTML && { groupClauseCoverageHTML: groupClauseCoverageHTML })
  };
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

  const compositeMeasureResource = MeasureBundleHelpers.extractCompositeMeasure(measureBundle);
  if (compositeMeasureResource) {
    throw new Error('Composite measures require reportType "summary".');
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

  const builder = getReportBuilder(measureBundle, options);

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
 * @param measureBundle Bundle with a Measure Resource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @param valueSetCache Cache of existing valuesets
 * @returns pass through of raw calculation results from the engine
 */
export async function calculateRaw(
  measureBundle: fhir4.Bundle,
  patientBundles: fhir4.Bundle[],
  options: CalculationOptions = {},
  valueSetCache: fhir4.ValueSet[] = []
): Promise<RCalculationOutput> {
  const debugObject: DebugOutput | undefined = options.enableDebugOutput ? <DebugOutput>{} : undefined;
  // Get the PatientSource to use for calculation.
  const patientSource = resolvePatientSource(patientBundles, options);
  const measure = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);
  const results = await Execution.execute(measure, measureBundle, patientSource, options, valueSetCache, debugObject);
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
      const scoringCode = MeasureBundleHelpers.getScoringCodeFromMeasure(measureResource);

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
 * Get data requirements for a Library bundle
 *
 * @param libraryBundle Bundle of library resources
 * @param options Options for calculation.
 *
 * @returns FHIR Library of data requirements
 */
export async function calculateLibraryDataRequirements(
  libraryBundle: fhir4.Bundle,
  options: CalculationOptions = {}
): Promise<DRCalculationOutput> {
  // omit measurementPeriodStart/measurementPeriodEnd since there is no measure
  options = omit(options, 'measurementPeriodStart', 'measurementPeriodEnd');

  if (options.rootLibRef === undefined) {
    throw new UnexpectedProperty('Root lib ref must be provided in order to calculate library dataRequirements');
  }

  // Extract the library ELM, and the id of the root library, from the library bundle
  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromLibraryBundle(
    libraryBundle,
    options.rootLibRef
  );

  const dataRequirements = await DataRequirementHelpers.getDataRequirements(cqls, rootLibIdentifier, elmJSONs, options);
  dataRequirements.results.relatedArtifact = DataRequirementHelpers.getFlattenedRelatedArtifacts(
    libraryBundle,
    options.rootLibRef
  );
  return dataRequirements;
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
  const measure = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);
  const effectivePeriod = measure.effectivePeriod;
  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromMeasureBundle(
    measureBundle,
    measure
  );
  const dataRequirements = await DataRequirementHelpers.getDataRequirements(
    cqls,
    rootLibIdentifier,
    elmJSONs,
    options,
    effectivePeriod
  );
  dataRequirements.results.relatedArtifact = DataRequirementHelpers.getFlattenedRelatedArtifacts(measureBundle);
  return dataRequirements;
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
  const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromMeasureBundle(measureBundle);
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
    const patientSource = PatientSource.FHIRv401({ requireProfileTagging: options.trustMetaProfile ?? false });
    patientSource.loadBundles(patientBundles);
    return patientSource;
  }
}
