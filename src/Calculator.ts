import { R4 } from '@ahryman40k/ts-fhir-types';
import { ExecutionResult, CalculationOptions } from './types/Calculator';
import { PopulationType } from './types/Enums';
import { v4 as uuidv4 } from 'uuid';
import * as cql from './types/CQLTypes';
import * as Execution from './Execution';
import { dumpHTML, dumpObject } from './DebugHelper';
import * as CalculatorHelpers from './CalculatorHelpers';
import * as ResultsHelpers from './ResultsHelpers';
import { generateHTML } from './HTMLGenerator';

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
): ExecutionResult[] {
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
  if (!measureEntry || !measureEntry.resource) {
    throw new Error('Measure resource was not found in provided measure bundle');
  }
  const measure = measureEntry.resource as R4.IMeasure;
  const executionResults: ExecutionResult[] = [];

  const results = Execution.execute(measureBundle, patientBundles, options);
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
      detailedResults: []
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
        const html = generateHTML(elmLibraries, detailedGroupResult.statementResults, detailedGroupResult.groupId);
        detailedGroupResult.html = html;
        dumpHTML(html, `clauses-${detailedGroupResult.groupId}.html`);
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
  dumpObject(executionResults, 'detailedResults.json');
  return executionResults;
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
): R4.IMeasureReport[] {
  // options should be updated by this call if measurementPeriod wasn't initially passed in
  const results = calculate(measureBundle, patientBundles, options);
  const reports: R4.IMeasureReport[] = [];
  results.forEach(result => {
    const report = <R4.IMeasureReport>{};

    // simple fields
    report.resourceType = 'MeasureReport';
    report.period = {
      start: options.measurementPeriodStart, // double check format of start and end that we're passing in https://www.hl7.org/fhir/datatypes.html#dateTime... we don't seem to be passing anything in from CLI
      end: options.measurementPeriodEnd
    };
    report.status = R4.MeasureReportStatusKind._complete; // are there cases where this should be _pending or _error?
    report.type = R4.MeasureReportTypeKind._individual; // are there cases where this should be _subjectList or _summary or _dataCollection

    // measure url from measure bundle
    const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
    const measure = measureEntry?.resource as R4.IMeasure;
    report.measure = measure.url || 'UnknownMeasure'; // or some other default?

    // create group population counts from result's detailedResults (yes/no->1/0)
    report.group = [];
    result?.detailedResults?.forEach(detail => {
      // add narrative for relevant clauses
      if (detail.html) {
        report.text = {
          div: detail.html
        };
      }

      // TODO: check the measure definition for stratification to determine whether to add group.stratiier
      // if yes, add stratifier with population copied into. Set counts to 0 if the result for the stratifier is false
      const group = <R4.IMeasureReport_Group>{};
      group.id = detail.groupId;
      group.population = [];
      let numeratorCount = 0.0;
      let denominatorCount = 0.0;
      // TODO: handle EXM111 (doesn't identify itself as a episode of care measure). if it's an episode of care, you need to iterate over
      // stratifications : may need to clone results for one population group and adjust (in this case, just a straight clone)
      detail?.populationResults?.forEach(pr => {
        const pop = <R4.IMeasureReport_Population>{};

        pop.code = {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-population',
              code: pr.populationType,
              display: POPULATION_DISPLAY_MAP[pr.populationType]
            }
          ]
        };
        pop.count = pr.result ? 1 : 0;
        if (pr.populationType == PopulationType.NUMER) numeratorCount += pop.count;
        if (pr.populationType == PopulationType.DENOM) denominatorCount += pop.count;
        group.population?.push(pop);
      });
      // TODO: handle ratio or continuous variable or cohort
      // currently assumes patient-based proportion measure http://hl7.org/fhir/us/cqfmeasures/measure-conformance.html#proportion-measures
      group.measureScore = {
        value: (numeratorCount / denominatorCount) * 1.0
      };
      report.group?.push(group);
    });

    // TODO: create contained evalatuated resource (contains patient... and population and entity information?)
    // may eventually need the other bits (all pieces of information that were used in calculation), but we might be able to ignore for now
    const evalId = uuidv4();
    const contained: R4.IBundle = {
      resourceType: 'Bundle',
      id: evalId,
      type: R4.BundleTypeKind._collection,
      entry: []
    };

    // find this patient's bundle
    const patientBundle = patientBundles.find(patientBundle => {
      const patientEntry = patientBundle.entry?.find(bundleEntry => {
        return bundleEntry.resource?.resourceType === 'Patient';
      });
      if (patientEntry && patientEntry.resource) {
        return patientEntry.resource.id === result.patientId;
      } else {
        return false;
      }
    });

    // if the patient bundle was found add their information to the evaluated resources
    if (patientBundle) {
      // grab the measure resource
      const patient = patientBundle.entry?.find(bundleEntry => {
        return bundleEntry.resource?.resourceType === 'Patient';
      })?.resource as R4.IPatient;

      // TODO: (related to above) do we need other entries... List, Encounter, Procedure?
      const patId = `Patient/${patient?.id}`;
      contained.entry?.push({
        fullUrl: patId,
        resource: patient
      });
      report.contained = [contained];

      // create reference to contained evaluated resource and match ID
      const evalResourceReference: R4.IReference = {
        reference: evalId
      };
      report.evaluatedResource = [evalResourceReference];

      // create reference to contained patient/subject and match ID
      const subjectReference: R4.IReference = {
        reference: patId
      };
      report.subject = subjectReference;
    }

    // add supplemental data elements to contained and as evaluatedResource references
    if (options.calculateSDEs) addSDE(report, report.measure, result);

    reports.push(report);
  });

  // dump to debug
  dumpObject(reports, 'measure-report.json');
  return reports;
}

export function calculateRaw(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): cql.Results | string {
  const results = Execution.execute(measureBundle, patientBundles, options);
  if (results.rawResults) {
    return results.rawResults;
  } else {
    return results.errorMessage ?? 'something happened with no error message';
  }
}

// Code->Display https://terminology.hl7.org/1.0.0/CodeSystem-measure-population.html
const POPULATION_DISPLAY_MAP = {
  [PopulationType.IPP]: 'Initial Population',
  [PopulationType.DENOM]: 'Denominator',
  [PopulationType.DENEX]: 'Denominator Exclusion',
  [PopulationType.DENEXCEP]: 'Denominator Exception',
  [PopulationType.NUMER]: 'Numerator',
  [PopulationType.NUMEX]: 'Numerator Exclusion',
  [PopulationType.MSRPOPL]: 'Measure Population',
  [PopulationType.MSRPOPLEX]: 'Measure Population Exclusion',
  [PopulationType.OBSERV]: 'Measure Observation'
};

function addSDE(report: R4.IMeasureReport, measureURL: string, result: ExecutionResult) {
  // 	Note that supplemental data are reported as observations for each patient and included in the evaluatedResources bundle. See the MeasureReport resource or the Quality Reporting topic for more information.
  result.supplementalData?.forEach(sd => {
    const observation = <R4.IObservation>{};
    observation.resourceType = 'Observation';
    observation.code = { text: sd.name };
    observation.id = uuidv4();
    observation.status = R4.ObservationStatusKind._final;
    observation.extension = [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/cqf-measureInfo',
        extension: [
          {
            url: 'measure',
            valueCanonical: measureURL
          },
          {
            url: 'populationId',
            valueString: sd.name
          }
        ]
      }
    ];

    // add coding to valueCodeableConcept
    if ('forEach' in sd.rawResult) {
      observation.valueCodeableConcept = { coding: [] };
      sd.rawResult?.forEach((rr: any) => {
        if (rr.code?.value && rr.system?.value && rr.display?.value) {
          // create supplemental data elements
          observation.valueCodeableConcept?.coding?.push({
            system: rr.system.value,
            code: rr.code.value,
            display: rr.display.value
          });
        }
      });
    } else if (sd.rawResult.isCode) {
      observation.valueCodeableConcept = { coding: [] };
      observation.valueCodeableConcept?.coding?.push({
        system: sd.rawResult.system,
        code: sd.rawResult.code,
        display: sd.rawResult.display
      });
    }
    // add as evaluated resource reference
    report.contained?.push(observation);
    report.evaluatedResource?.push({
      reference: observation.id
    });
  });
}
