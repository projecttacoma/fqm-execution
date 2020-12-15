import { R4 } from '@ahryman40k/ts-fhir-types';
import {
  ExecutionResult,
  CalculationOptions,
  PopulationResult,
  DetailedPopulationGroupResult,
  DataTypeQuery
} from './types/Calculator';
import { PopulationType, MeasureScoreType, AggregationType } from './types/Enums';
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
      detailedResults: [],
      evaluatedResources: rawResults.evaluatedRecords
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

    // add narrative if specified
    if (options.calculateHTML) {
      report.text = {
        status: R4.NarrativeStatusKind._generated,
        div: ''
      };
    }

    // create group population counts from result's detailedResults (yes/no->1/0)
    report.group = [];
    report.contained = [];
    report.evaluatedResource = [];
    result?.detailedResults?.forEach(detail => {
      // add narrative for relevant clauses
      if (report.text && detail.html) {
        report.text.div += detail.html;
      }

      const group = <R4.IMeasureReport_Group>{};
      group.id = detail.groupId;
      group.population = [];

      // TODO: handle EXM111 (doesn't identify itself as a episode of care measure). if it's an episode of care, you need to iterate over
      // stratifications : may need to clone results for one population group and adjust (in this case, just a straight clone)
      if (detail?.episodeResults) {
        detail.episodeResults.forEach(er => {
          er.populationResults?.forEach(pr => {
            const pop = group.population?.find(
              pop => pop.code?.coding && pop.code.coding[0].code === pr.populationType
            );
            if (pop) {
              // add to pop if already exists
              if (!pop.count) pop.count = 0;
              pop.count += pr.result ? 1 : 0;
            } else {
              group.population?.push(popForResult(pr));
            }
          });
        });
      } else {
        detail.populationResults?.forEach(pr => {
          group.population?.push(popForResult(pr));
        });
      }

      // if the measure definition has stratification, add group.stratifier
      const stratifier = measure.group?.find(g => g.id == detail.groupId)?.stratifier;
      if (stratifier) {
        group.stratifier = [];
        stratifier.forEach(s => {
          const reportStratifier = <R4.IMeasureReport_Stratifier>{};
          reportStratifier.code = s.code ? [s.code] : [];
          const strat = <R4.IMeasureReport_Stratum>{};
          // use existing populations, but reduce count as appropriate
          // Deep copy population with matching attributes but different interface
          strat.population = <R4.IMeasureReport_Population1[]>JSON.parse(JSON.stringify(group.population));

          if (detail.episodeResults) {
            detail?.episodeResults?.forEach(er => {
              const inStrat = er.stratifierResults?.find(sr => sr.strataCode == s.code?.text)?.result;
              strat.population?.forEach(pop => {
                const result = er.populationResults.find(pr => {
                  return (
                    pop.code?.coding && pop.code.coding.length > 0 && pop.code.coding[0].code === pr.populationType
                  );
                })?.result;
                if (result && !inStrat && pop.count) {
                  // reduce count if this episode is in this population but not the stratification
                  pop.count = pop.count - 1;
                }
              });
            });
          } else {
            const inStrat = detail.stratifierResults?.find(sr => sr.strataCode === s.code?.text)?.result;
            // start with population count and change count to 0 if not in strattification
            strat.population?.forEach(pop => {
              if (!inStrat) pop.count = 0;
            });
          }

          const scoringCode =
            measure.scoring?.coding?.find(c => c.system === 'http://hl7.org/fhir/measure-scoring')?.code || '';
          if (scoringCode === MeasureScoreType.CV) {
            // TODO: should we add score observation for stratification?
            strat.measureScore = calcMeasureScoreCV(measure, detail, group.id || '', s);
          } else {
            strat.measureScore = calcMeasureScore(scoringCode, strat.population);
          }

          reportStratifier.stratum = [strat];
          group.stratifier?.push(reportStratifier);
        });
      }

      const scoringCode =
        measure.scoring?.coding?.find(c => c.system === 'http://hl7.org/fhir/measure-scoring')?.code || '';
      // only add an evaluatedResource observation for CV type score and do special calculation
      if (scoringCode === MeasureScoreType.CV) {
        group.measureScore = calcMeasureScoreCV(measure, detail, group.id || '');
        addScoreObservation(group.measureScore, measure, report);
      } else {
        group.measureScore = calcMeasureScore(scoringCode, group.population);
      }

      report.group?.push(group);
    });

    if (result.evaluatedResources) {
      result.evaluatedResources.forEach(resource => {
        const reference: R4.IReference = {
          reference: `${resource.resourceType}/${resource.id}`
        };
        if (!report.evaluatedResource?.find(r => r.reference === reference.reference)) {
          report.evaluatedResource?.push(reference);
        }
      });
    }

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

    // if the patient bundle was found add their information to the subject
    if (patientBundle) {
      // grab the measure resource
      const patient = patientBundle.entry?.find(bundleEntry => {
        return bundleEntry.resource?.resourceType === 'Patient';
      })?.resource as R4.IPatient;

      // create reference to contained patient/subject and match ID
      const patId = `Patient/${patient?.id}`;
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

export function calculateGapsInCare(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): DataTypeQuery[] {
  // Detailed results for population, raw results for ELM content
  const results = calculate(measureBundle, patientBundles, options);
  const { elmLibraries, mainLibraryName } = Execution.execute(measureBundle, patientBundles, options);

  let result: DataTypeQuery[] = [];

  results.forEach(res => {
    res.detailedResults?.forEach(dr => {
      const denomResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result;
      const numerResult = dr.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result;

      // Calculate gaps if patient is in denominator but not numerator
      if (denomResult && !numerResult) {
        const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
        if (!measureEntry || !measureEntry.resource) {
          throw new Error('Argument measureBundle must include a Measure resource');
        }
        const measureResource = measureEntry.resource as R4.IMeasure;
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

        result = CalculatorHelpers.findRetrieves(mainLibraryELM, elmLibraries, numerELMExpression.expression, dr);
      }
    });
  });
  dumpObject(result, 'gaps.json');
  return result;
}

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
      reference: `#${observation.id}`
    });
  });
}

function popForResult(pr: PopulationResult) {
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
  return pop;
}

// // Code->Display https://terminology.hl7.org/1.0.0/CodeSystem-measure-population.html
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

// http://build.fhir.org/ig/HL7/cqf-measures/ValueSet-aggregate-method.html
function aggregate(aggregation: string, observations: number[]) {
  // Note: add break for any non-returning case
  switch (aggregation) {
    case AggregationType.SUM:
      // sum	Sum	The measure score is determined by adding together the observations derived from the measure population.
      return observations.reduce((accumulator, currentValue) => accumulator + currentValue);
    case AggregationType.AVERAGE:
      // average	Average	The measure score is determined by taking the average of the observations derived from the measure population.
      return observations.reduce((accumulator, currentValue) => accumulator + currentValue) / observations.length;
    case AggregationType.MEDIAN:
      // median	Median	The measure score is determined by taking the median of the observations derived from the measure population.
      return median(observations);
    case AggregationType.MIN:
      // minimum	Minimum	The measure score is determined by taking the minimum of the observations derived from the measure population.
      return Math.min(...observations);
    case AggregationType.MAX:
      // maximum	Maximum	The measure score is determined by taking the maximum of the observations derived from the measure population.
      return Math.max(...observations);
    case AggregationType.COUNT:
      // count	Count	The measure score is determined as the number of observations derived from the measure population.
      return observations.length;
    default:
      throw new Error(`Measure score aggregation type \"${aggregation}\" not supported`);
  }
}

function median(observations: number[]) {
  const sorted = observations.sort(function (a, b) {
    return a - b;
  });
  if (sorted.length % 2 === 0) {
    return 0.5 * (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]);
  } else {
    return sorted[sorted.length / 2];
  }
}

function populationTotal(population: R4.IMeasureReport_Population[], type: PopulationType) {
  return (
    population?.find(pop => {
      return pop.code?.coding && pop.code.coding.length > 0 && pop.code?.coding[0].code === type;
    })?.count || 0.0
  );
}

// CV requires different input types than other scores
function calcMeasureScoreCV(
  measure: R4.IMeasure,
  detail: DetailedPopulationGroupResult,
  groupID: string,
  strat?: R4.IMeasure_Stratifier
) {
  let observations = [];
  if (detail.episodeResults) {
    // find all episode results with a true measure observation
    const relevantEpisodes =
      detail.episodeResults?.filter(er => {
        // ignore stratification (by setting as true) if stratifier not passed in
        const inStrat = strat ? er.stratifierResults?.find(sr => sr.strataCode == strat.code?.text)?.result : true;
        return er.populationResults.find(pr => pr.populationType === PopulationType.OBSERV)?.result && inStrat;
      }) || [];

    // Note: only uses first of potentially multiple observations in each episode (since we can't tell which observation is which)
    // if there are multiple oservations, then this may cause inconsistent behavior
    observations = relevantEpisodes.map(
      er => er.populationResults.find(pr => pr.populationType === PopulationType.OBSERV)?.observations[0]
    );
  } else {
    // ignore stratification (by setting as true) if stratifier not passed in
    const inStrat = strat ? detail.stratifierResults?.find(sr => sr.strataCode === strat.code?.text)?.result : true;

    // CV for patient-based results is untested
    const obsResultPop = detail.populationResults?.find(pr => pr.populationType === PopulationType.OBSERV);
    observations = obsResultPop?.result && inStrat ? [obsResultPop.observations[0]] : [];
  }

  // find aggregation type
  const measureGroup = measure.group?.find(g => g.id === groupID);
  const observPop = measureGroup?.population?.find(p => p.code?.coding?.find(c => c.code === 'measure-observation'));
  const aggregation =
    observPop?.extension?.find(
      e => e.url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-aggregateMethod'
    )?.valueCode || '';

  // Note: unit not currently available in data, so not included in this quantity (should be inferable from measure to whoever's using the score)
  // Score also captured in evaluated resource observation
  return {
    value: aggregate(aggregation, observations) //|| 0 TODO: set to alternative value if null (no relevant episodes)?
  };
}

function calcMeasureScore(
  scoringCode: string,
  population: R4.IMeasureReport_Population[] | R4.IMeasureReport_Population1[]
) {
  switch (scoringCode) {
    case MeasureScoreType.PROP:
      // (Numerator - Numerator Exclusions) / (Denominator - D Exclusions - D Exceptions).
      const numeratorCount =
        populationTotal(population, PopulationType.NUMER) - populationTotal(population, PopulationType.NUMEX);
      const denominatorCount =
        populationTotal(population, PopulationType.DENOM) -
        populationTotal(population, PopulationType.DENEX) -
        populationTotal(population, PopulationType.DENEXCEP);

      return {
        // TODO: what if value for denominator 0? ... do we need to subtract denex, dexecep... probably, as https://ecqi.healthit.gov/system/files/eCQM-Logic-and-Guidance-2018-0504.pdf
        value: denominatorCount === 0 ? 0 : (numeratorCount / denominatorCount) * 1.0
      };
    case MeasureScoreType.COHORT:
      // Note: Untested measure score type
      return {
        value: populationTotal(population, PopulationType.IPP) * 1.0
      };

    case MeasureScoreType.RATIO:
      // Note: Untested measure score type
      // (NUMER - NUMEX) / (DENOM - DENEX)`
      const numeratorCount2 =
        populationTotal(population, PopulationType.NUMER) - populationTotal(population, PopulationType.NUMEX);
      const denominatorCount2 =
        populationTotal(population, PopulationType.DENOM) - populationTotal(population, PopulationType.DENEX);

      return {
        // TODO: what if value for denominator 0? ... do we need to subtract denex, dexecep... probably, as https://ecqi.healthit.gov/system/files/eCQM-Logic-and-Guidance-2018-0504.pdf
        value: denominatorCount2 === 0 ? 0 : (numeratorCount2 / denominatorCount2) * 1.0
      };
    default:
      throw new Error(`Measure score type \"${scoringCode}\" not supported`);
  }
}

// TODO: shouldn't this have a group reference or something since the score is specific to a group? (how would this score be re-associated with the right group?)
function addScoreObservation(score: R4.IQuantity, measure: R4.IMeasure, report: R4.IMeasureReport) {
  // create observation resource to reflect the score value and add as reference in evaluated resources
  const observationResource: R4.IObservation = {
    resourceType: 'Observation',
    code: {
      text: 'MeasureObservation'
    },
    id: uuidv4(),
    status: R4.ObservationStatusKind._final,
    valueQuantity: score
  };
  // is this extension necessary?
  observationResource.extension = [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/cqf-measureInfo',
      extension: [
        {
          url: 'measure',
          valueCanonical: measure.url
        },
        {
          url: 'populationId',
          valueString: 'MeasureObservation'
        }
      ]
    }
  ];
  report.contained?.push(observationResource);
  report.evaluatedResource?.push({
    reference: `#${observationResource.id}`
  });
}
