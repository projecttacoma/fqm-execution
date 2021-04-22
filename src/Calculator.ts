import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions, DebugOutput } from './types/Calculator';
import { PopulationType, MeasureScoreType, ImprovementNotation } from './types/Enums';
import * as cql from './types/CQLTypes';
import * as Execution from './Execution';
import * as CalculatorHelpers from './CalculatorHelpers';
import { extractMeasurementPeriod } from './MeasureHelpers';
import * as ResultsHelpers from './ResultsHelpers';
import * as MeasureReportBuilder from './MeasureReportBuilder';
import * as GapsInCareHelpers from './GapsInCareHelpers';
import { generateHTML } from './HTMLGenerator';
import { ELM } from './types/ELMTypes';
import { parseQueryInfo } from './QueryFilterHelpers';

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @returns Detailed execution results. One for each patient.
 */
export function calculate(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): {
  results: ExecutionResult[];
  debugOutput?: DebugOutput;
  elmLibraries?: ELM[];
  mainLibraryName?: string;
  parameters?: { [key: string]: any };
} {
  const debugObject: DebugOutput | undefined = options.enableDebugOutput ? <DebugOutput>{} : undefined;

  // Ensure the CalculationOptions have sane defaults, only if they're not set
  options.calculateHTML = options.calculateHTML ?? true;
  options.calculateSDEs = options.calculateSDEs ?? true;
  // Get the default measurement period out of the Measure object
  const measurementPeriod = extractMeasurementPeriod(measureBundle);
  // Set the measurement period start/end, but only if the caller didn't specify one
  options.measurementPeriodStart = options.measurementPeriodStart ?? measurementPeriod.measurementPeriodStart;
  options.measurementPeriodEnd = options.measurementPeriodEnd ?? measurementPeriod.measurementPeriodEnd;

  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
  if (!measureEntry || !measureEntry.resource) {
    throw new Error('Measure resource was not found in provided measure bundle');
  }
  const measure = measureEntry.resource as R4.IMeasure;
  const executionResults: ExecutionResult[] = [];

  const results = Execution.execute(measureBundle, patientBundles, options, debugObject);
  if (!results.rawResults) {
    throw new Error(results.errorMessage ?? 'something happened with no error message');
  }
  const rawResults = results.rawResults;

  if (!results.elmLibraries || !results.mainLibraryName) {
    throw new Error('no libraries were found');
  }
  const elmLibraries = results.elmLibraries;
  const mainLibraryName = results.mainLibraryName;

  // Iterate over patient bundles and make results for each of them.
  patientBundles.forEach(patientBundle => {
    const patientEntry = patientBundle.entry?.find(e => e.resource?.resourceType === 'Patient');
    if (!patientEntry || !patientEntry.resource) {
      // Skip this bundle if no patient was found.
      return;
    }
    const patient = patientEntry.resource as R4.IPatient;
    if (!patient.id) {
      // Patient has no ID
      return;
    }
    const patientExecutionResult: ExecutionResult = {
      patientId: patient.id,
      detailedResults: [],
      evaluatedResource: rawResults.patientEvaluatedRecords[patient.id]
    };

    // Grab statement results for the patient
    const patientStatementResults = rawResults.patientResults[patient.id];
    // Grab localId results for the patient
    const patientLocalIdResults = rawResults.localIdPatientResultsMap[patient.id];

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

  // return with the ELM libraries and main library name for further processing if requested.
  if (options.returnELM) {
    return {
      results: executionResults,
      debugOutput: debugObject,
      elmLibraries: results.elmLibraries,
      mainLibraryName: results.mainLibraryName,
      parameters: results.parameters
    };
  } else {
    return { results: executionResults, debugOutput: debugObject };
  }
}

/**
 * Calculate measure against a set of patients. Returning detailed results for each patient and population group.
 *
 * @param measureBundle Bundle with a MeasureResource and all necessary data for execution.
 * @param patientBundles List of bundles of patients to be executed.
 * @param options Options for calculation.
 * @returns MeasureReport resource for each patient according to standard https://www.hl7.org/fhir/measurereport.html
 */
export function calculateMeasureReports(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): { results: R4.IMeasureReport[]; debugOutput?: DebugOutput } {
  // options should be updated by this call if measurementPeriod wasn't initially passed in
  const { results, debugOutput } = calculate(measureBundle, patientBundles, options);

  const reports = MeasureReportBuilder.buildMeasureReports(measureBundle, patientBundles, results, options);

  if (debugOutput && options.enableDebugOutput) {
    debugOutput.measureReports = reports;
  }

  return { results: reports, debugOutput };
}

export function calculateRaw(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): { results: cql.Results | string; debugOutput?: DebugOutput } {
  const debugObject: DebugOutput | undefined = options.enableDebugOutput ? <DebugOutput>{} : undefined;
  const results = Execution.execute(measureBundle, patientBundles, options, debugObject);
  if (results.rawResults) {
    return { results: results.rawResults, debugOutput: debugObject };
  } else {
    return { results: results.errorMessage ?? 'something happened with no error message', debugOutput: debugObject };
  }
}

export function calculateGapsInCare(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): { results: R4.IBundle; debugOutput?: DebugOutput } {
  // Detailed results for populations get ELM content back
  options.returnELM = true;
  const { results, debugOutput, elmLibraries, mainLibraryName, parameters } = calculate(
    measureBundle,
    patientBundles,
    options
  );
  const measureReports = MeasureReportBuilder.buildMeasureReports(measureBundle, patientBundles, results, options);

  let result: R4.IBundle = <R4.IBundle>{};

  results.forEach(res => {
    const matchingMeasureReport = measureReports.find(mr => mr.subject?.reference?.split('/')[1] === res.patientId);

    if (!matchingMeasureReport) {
      throw new Error(`No MeasureReport generated during gaps in care for ${res.patientId}`);
    }

    res.detailedResults?.forEach(dr => {
      const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
      if (!measureEntry || !measureEntry.resource) {
        throw new Error('Argument measureBundle must include a Measure resource');
      }

      // Gaps only supported for proportion/ratio measures
      const measureResource = measureEntry.resource as R4.IMeasure;
      const scoringCode = measureResource.scoring?.coding?.find(c => c.system === 'http://hl7.org/fhir/measure-scoring')
        ?.code;

      if (scoringCode !== MeasureScoreType.PROP) {
        throw new Error(`Gaps in care not supported for measure scoring type ${scoringCode}`);
      }

      const denomResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result;
      const numerResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result;
      const numerRelevance = dr.populationRelevance?.find(pr => pr.populationType === PopulationType.NUMER)?.result;

      if (!measureResource.improvementNotation?.coding) {
        throw new Error('Measure resource must include improvement notation');
      }

      const improvementNotation = measureResource.improvementNotation.coding[0].code;

      if (!improvementNotation) {
        throw new Error('Improvement notation code not present on measure');
      }

      // If positive improvement measure, consider patients in denominator but not numerator for gaps
      // If negative improvement measure, consider patients in numerator for gaps
      // For either case, ignore patient if numerator isn't relevant
      const populationCriteria =
        numerRelevance &&
        (improvementNotation === ImprovementNotation.POSITIVE ? denomResult && !numerResult : numerResult);

      if (populationCriteria) {
        const matchingGroup = measureResource.group?.find(g => g.id === dr.groupId);

        if (!matchingGroup) {
          throw new Error(`Could not find group with id ${dr.groupId} in measure resource`);
        }

        const numerCriteria = matchingGroup.population?.find(
          pop => pop.code?.coding && pop.code.coding[0].code === PopulationType.NUMER
        );

        if (!numerCriteria) {
          throw new Error(`Could not find numerator criteria expression in measure group ${dr.groupId}`);
        }

        const numerExpressionName = numerCriteria.criteria.expression;
        const mainLibraryELM = elmLibraries?.find(lib => lib.library.identifier.id === mainLibraryName);

        if (!mainLibraryELM || !elmLibraries) {
          throw new Error(`Could not find ELM for ${mainLibraryName}`);
        }

        const numerELMExpression = mainLibraryELM.library.statements.def.find(e => e.name === numerExpressionName);
        if (!numerELMExpression) {
          throw new Error(`Expression ${numerExpressionName} not found in ${mainLibraryName}`);
        }

        let retrieves = GapsInCareHelpers.findRetrieves(
          mainLibraryELM,
          elmLibraries,
          numerELMExpression.expression,
          dr
        );

        retrieves.forEach(retrieve => {
          // If the retrieves have a localId for the query and a known library name, we can get more info
          // on how the query filters the sources.
          if (retrieve.queryLocalId && retrieve.libraryName) {
            const library = elmLibraries.find(lib => lib.library.identifier.id === retrieve.libraryName);
            if (library) {
              retrieve.queryInfo = parseQueryInfo(library, retrieve.queryLocalId, parameters);
            }
          }
        });

        retrieves = GapsInCareHelpers.calculateNearMisses(retrieves, improvementNotation);

        const detectedIssue = GapsInCareHelpers.generateDetectedIssueResource(
          retrieves,
          matchingMeasureReport,
          improvementNotation
        );

        // find this patient's bundle
        const patientBundle = patientBundles.find(patientBundle => {
          const patientEntry = patientBundle.entry?.find(
            bundleEntry => bundleEntry.resource?.resourceType === 'Patient'
          );
          return patientEntry?.resource?.id === res.patientId;
        });

        const patientEntry = patientBundle?.entry?.find(e => e.resource?.resourceType === 'Patient');

        if (!patientEntry) {
          throw new Error(`Could not find Patient ${res.patientId} in patientBundles`);
        }

        result = GapsInCareHelpers.generateGapsInCareBundle(
          detectedIssue,
          matchingMeasureReport,
          patientEntry.resource as R4.IPatient
        );

        if (debugOutput && options.enableDebugOutput) {
          debugOutput.gaps = {
            retrieves,
            bundle: result
          };
        }
      }
    });
  });

  return { results: result, debugOutput };
}
