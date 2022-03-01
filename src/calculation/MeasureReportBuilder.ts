import {
  ExecutionResult,
  CalculationOptions,
  PopulationResult,
  DetailedPopulationGroupResult
} from '../types/Calculator';
import { PopulationType, MeasureScoreType, AggregationType } from '../types/Enums';
import { v4 as uuidv4 } from 'uuid';
import { extractMeasureFromBundle } from '../helpers/MeasureBundleHelpers';
import { UnexpectedProperty, UnsupportedProperty } from '../types/errors/CustomErrors';

export default class MeasureReportBuilder {
  report: fhir4.MeasureReport;
  measureBundle: fhir4.Bundle;
  measure: fhir4.Measure;
  options: CalculationOptions;
  isIndividual: boolean;
  calculateSDEs: boolean;
  patientCount: number;
  scoringCode: string;

  constructor(measureBundle: fhir4.Bundle, options: CalculationOptions) {
    this.report = <fhir4.MeasureReport>{
      id: uuidv4(),
      resourceType: 'MeasureReport'
    };
    this.measureBundle = measureBundle;
    this.measure = extractMeasureFromBundle(measureBundle);
    this.scoringCode =
      this.measure.scoring?.coding?.find(
        c =>
          c.system === 'http://hl7.org/fhir/measure-scoring' ||
          c.system === 'http://terminology.hl7.org/CodeSystem/measure-scoring'
      )?.code || '';
    this.options = options;
    // if report type is specified use it, otherwise default to individual report.
    if (this.options.reportType) {
      this.isIndividual = this.options.reportType === 'individual';
    } else {
      this.isIndividual = true;
    }

    // determine if we should be calculating SDE, TODO: Support SDEs for summary/subject-list.
    this.calculateSDEs = this.options.calculateSDEs === true && this.isIndividual;

    this.patientCount = 0;
    this.setupBasicStructure();
    this.setupPopulationGroups();
  }

  private setupBasicStructure() {
    // simple fields
    this.report.period = {
      start: this.options.measurementPeriodStart, // double check format of start and end that we're passing in https://www.hl7.org/fhir/datatypes.html#dateTime... we don't seem to be passing anything in from CLI
      end: this.options.measurementPeriodEnd
    };
    this.report.status = 'complete';
    this.report.type = this.isIndividual ? 'individual' : 'summary';

    // measure url from measure bundle
    this.report.measure = this.measure.url || 'UnknownMeasure'; // or some other default?
    this.report.contained = [];

    // add narrative if specified
    if (this.options.calculateHTML && this.isIndividual) {
      this.report.text = {
        status: 'generated',
        div: ''
      };
    }
  }

  private setupPopulationGroups() {
    // create group population group based on measure resource
    this.report.group = [];
    this.report.evaluatedResource = [];

    // build population groups from measure resource
    this.measure.group?.forEach(measureGroup => {
      const group = <fhir4.MeasureReportGroup>{};
      if (measureGroup.id) {
        group.id = measureGroup.id;
      }

      group.population = [];

      // build each population group with 0 for initial value
      measureGroup.population?.forEach(measurePopulation => {
        const pop = <fhir4.MeasureReportGroupPopulation>{};
        pop.count = 0;
        // copy coding values for the population from the measure
        if (measurePopulation.code?.coding) {
          const popCoding: fhir4.Coding = measurePopulation.code?.coding[0];
          pop.code = {
            coding: [
              {
                system: popCoding.system,
                code: popCoding.code,
                display: popCoding.display
              }
            ]
          };
        }
        group.population?.push(pop);
      });

      // if the measure definition has stratification, add group.stratifier
      if (measureGroup.stratifier) {
        group.stratifier = [];
        measureGroup.stratifier.forEach(s => {
          const reportStratifier = <fhir4.MeasureReportGroupStratifier>{};
          reportStratifier.code = s.code ? [s.code] : [];
          const strat = <fhir4.MeasureReportGroupStratifierStratum>{};
          // use existing populations, but reduce count as appropriate
          // Deep copy population with matching attributes but different interface
          strat.population = <fhir4.MeasureReportGroupStratifierStratumPopulation[]>(
            JSON.parse(JSON.stringify(group.population))
          );

          reportStratifier.stratum = [strat];
          group.stratifier?.push(reportStratifier);
        });
      }

      this.report.group?.push(group);
    });
  }

  public addPatientResults(results: ExecutionResult) {
    // if this is a individual measure report and we have already received a patient we should throw
    // an error
    if (this.isIndividual && this.patientCount > 0) {
      throw new UnsupportedProperty(
        'The MeasureReport being built is an individual report and patient results have already been added'
      );
    }

    if (!results.detailedResults) {
      throw new Error('ExecutionResults are missing detailedResults.');
    }

    // if we are creating an individual report create the patient reference.
    if (this.isIndividual) {
      const patId = `Patient/${results.patientId}`;
      const subjectReference: fhir4.Reference = {
        reference: patId
      };
      this.report.subject = subjectReference;
    }

    results.detailedResults.forEach((groupResults, i) => {
      if (this.isIndividual) {
        // add narrative for relevant clauses
        if (this.report.text && groupResults.html) {
          this.report.text.div += groupResults.html;
        }
      }

      // find corresponding group in report
      // default to index if group is missing an ID
      const group = this.report.group?.find(g => g.id == groupResults.groupId) || this.report.group?.[i];
      if (!group) {
        throw new UnexpectedProperty(`Group ${groupResults.groupId} not found in measure report`);
      }

      // iterate over population results for episodes and increment the counters
      // TODO: handle EXM111 (doesn't identify itself as a episode of care measure). if it's an episode of care, you need to iterate over
      // stratifications : may need to clone results for one population group and adjust (in this case, just a straight clone)
      if (groupResults?.episodeResults) {
        groupResults.episodeResults.forEach(er => {
          er.populationResults?.forEach(pr => {
            this.incrementPopulationInGroup(group, pr);
          });

          // TODO: update this when we support CV for summary/subject-list reports
          if (this.scoringCode === MeasureScoreType.CV) {
            group.measureScore = this.calcMeasureScoreCV(this.measure, groupResults, group.id || '');
            this.addScoreObservation(group.measureScore, this.measure, this.report);
          }

          // add to stratifier results if there are any
          if (group.stratifier) {
            er.stratifierResults?.forEach(stratResults => {
              // only add to results if this episode is in the strata
              if (stratResults.result) {
                const strata = group.stratifier?.find(s => s.code && s.code[0].text === stratResults.strataCode);
                const stratum = strata?.stratum?.[0];
                if (stratum) {
                  er.populationResults?.forEach(pr => {
                    this.incrementPopulationInStratum(stratum, pr);
                  });
                  // TODO: update this when we support CV for summary/subject-list reports
                  if (this.scoringCode === MeasureScoreType.CV) {
                    stratum.measureScore = this.calcMeasureScoreCV(
                      this.measure,
                      groupResults,
                      group.id || '',
                      stratResults.strataCode
                    );
                  }
                } else {
                  throw new UnexpectedProperty(
                    `Stratum ${stratResults.strataCode} in group ${group.id} not found in measure reports`
                  );
                }
              }
            });
          }
        });
      } else {
        groupResults.populationResults?.forEach(pr => {
          this.incrementPopulationInGroup(group, pr);
        });
        // TODO: update this when we support CV for summary/subject-list reports
        if (this.scoringCode === MeasureScoreType.CV) {
          group.measureScore = this.calcMeasureScoreCV(this.measure, groupResults, group.id || '');
          this.addScoreObservation(group.measureScore, this.measure, this.report);
        }
        // add to stratifier results if there are any
        if (group.stratifier) {
          groupResults.stratifierResults?.forEach(stratResults => {
            // only add to results if this patient is in the strata
            if (stratResults.result) {
              const strata = group.stratifier?.find(s => s.code && s.code[0].text === stratResults.strataCode);
              const stratum = strata?.stratum?.[0];
              if (stratum) {
                groupResults.populationResults?.forEach(pr => {
                  this.incrementPopulationInStratum(stratum, pr);
                });
                // TODO: update this when we support CV for summary/subject-list reports
                if (this.scoringCode === MeasureScoreType.CV) {
                  stratum.measureScore = this.calcMeasureScoreCV(
                    this.measure,
                    groupResults,
                    group.id || '',
                    stratResults.strataCode
                  );
                }
              } else {
                throw new UnexpectedProperty(
                  `Stratum ${stratResults.strataCode} in group ${group.id} not found in measure reports`
                );
              }
            }
          });
        }
      }
    });
    if (this.calculateSDEs) {
      this.addSDE(results);
    }

    if (results.evaluatedResource) {
      results.evaluatedResource.forEach(resource => {
        const reference: fhir4.Reference = {
          reference: `${resource.resourceType}/${resource.id}`
        };
        if (!this.report.evaluatedResource?.find(r => r.reference === reference.reference)) {
          this.report.evaluatedResource?.push(reference);
        }
      });
    }

    this.patientCount++;
  }

  private incrementPopulationInStratum(stratum: fhir4.MeasureReportGroupStratifierStratum, pr: PopulationResult) {
    const pop = stratum.population?.find(pop => pop.code?.coding && pop.code.coding[0].code === pr.populationType);
    if (pop) {
      // add to pop count creating it if not already created.
      if (!pop.count) pop.count = 0;
      pop.count += pr.result ? 1 : 0;
    } else {
      throw new UnexpectedProperty(
        `Population ${pr.populationType} in stratum ${stratum.id} not found in measure report.`
      );
    }
  }

  private incrementPopulationInGroup(group: fhir4.MeasureReportGroup, pr: PopulationResult) {
    const pop = group.population?.find(pop => pop.code?.coding && pop.code.coding[0].code === pr.populationType);
    if (pop) {
      // add to pop count creating it if not already created.
      if (!pop.count) pop.count = 0;
      pop.count += pr.result ? 1 : 0;
    } else {
      throw new UnexpectedProperty(`Population ${pr.populationType} in group ${group.id} not found in measure report.`);
    }
  }

  private addSDE(result: ExecutionResult) {
    // 	Note that supplemental data are reported as observations for each patient and included in the evaluatedResources bundle. See the MeasureReport resource or the Quality Reporting topic for more information.
    result.supplementalData?.forEach(sd => {
      const observation = <fhir4.Observation>{};
      observation.resourceType = 'Observation';
      observation.code = { text: sd.name };
      observation.id = uuidv4();
      observation.status = 'final';
      observation.extension = [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/cqf-measureInfo',
          extension: [
            {
              url: 'measure',
              valueCanonical: this.measure.url
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
          } else if (rr.isCode) {
            // if a CQL system code is returned
            observation.valueCodeableConcept?.coding?.push({
              system: rr.system,
              code: rr.code,
              display: rr.display
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
      this.report.contained?.push(observation);
      this.report.evaluatedResource?.push({
        reference: `#${observation.id}`
      });
    });
  }

  private populationTotal(population: fhir4.MeasureReportGroupPopulation[], type: PopulationType) {
    return (
      population?.find(pop => {
        return pop.code?.coding && pop.code.coding.length > 0 && pop.code?.coding[0].code === type;
      })?.count || 0.0
    );
  }

  private median(observations: number[]) {
    const sorted = observations.sort((a, b) => {
      return a - b;
    });
    const centerIndex = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return 0.5 * (sorted[centerIndex - 1] + sorted[centerIndex]);
    } else {
      return sorted[centerIndex];
    }
  }

  // http://build.fhir.org/ig/HL7/cqf-measures/ValueSet-aggregate-method.html
  private aggregate(aggregation: string, observations: number[]) {
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
        return this.median(observations);
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
        throw new UnsupportedProperty(`Measure score aggregation type \"${aggregation}\" not supported`);
    }
  }

  // CV requires different input types than other scores
  private calcMeasureScoreCV(
    measure: fhir4.Measure,
    detail: DetailedPopulationGroupResult,
    groupID: string,
    strataCode?: string
  ) {
    let observations = [];
    if (detail.episodeResults) {
      // find all episode results with a true measure observation
      const relevantEpisodes =
        detail.episodeResults?.filter(er => {
          // ignore stratification (by setting as true) if stratifier not passed in
          const inStrat = strataCode ? er.stratifierResults?.find(sr => sr.strataCode == strataCode)?.result : true;
          return er.populationResults.find(pr => pr.populationType === PopulationType.OBSERV)?.result && inStrat;
        }) || [];

      // Note: only uses first of potentially multiple observations in each episode (since we can't tell which observation is which)
      // if there are multiple oservations, then this may cause inconsistent behavior
      observations = relevantEpisodes.map(
        er => er.populationResults.find(pr => pr.populationType === PopulationType.OBSERV)?.observations[0]
      );
    } else {
      // ignore stratification (by setting as true) if stratifier not passed in
      const inStrat = strataCode ? detail.stratifierResults?.find(sr => sr.strataCode === strataCode)?.result : true;

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
      value: this.aggregate(aggregation, observations) //|| 0 TODO: set to alternative value if null (no relevant episodes)?
    };
  }

  // TODO: shouldn't this have a group reference or something since the score is specific to a group? (how would this score be re-associated with the right group?)
  private addScoreObservation(score: fhir4.Quantity, measure: fhir4.Measure, report: fhir4.MeasureReport) {
    // create observation resource to reflect the score value and add as reference in evaluated resources
    const observationResource: fhir4.Observation = {
      resourceType: 'Observation',
      code: {
        text: 'MeasureObservation'
      },
      id: uuidv4(),
      status: 'final',
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

  private calcMeasureScore(
    scoringCode: string,
    population: fhir4.MeasureReportGroupPopulation[] | fhir4.MeasureReportGroupStratifierStratumPopulation[]
  ): fhir4.Quantity {
    switch (scoringCode) {
      case MeasureScoreType.PROP:
        // (Numerator - Numerator Exclusions) / (Denominator - D Exclusions - D Exceptions).
        const numeratorCount =
          this.populationTotal(population, PopulationType.NUMER) -
          this.populationTotal(population, PopulationType.NUMEX);
        const denominatorCount =
          this.populationTotal(population, PopulationType.DENOM) -
          this.populationTotal(population, PopulationType.DENEX) -
          this.populationTotal(population, PopulationType.DENEXCEP);

        return {
          // TODO: what if value for denominator 0? ... do we need to subtract denex, dexecep... probably, as https://ecqi.healthit.gov/system/files/eCQM-Logic-and-Guidance-2018-0504.pdf
          value: denominatorCount === 0 ? 0 : (numeratorCount / denominatorCount) * 1.0
        };
      case MeasureScoreType.COHORT:
        // Note: Untested measure score type
        return {
          value: this.populationTotal(population, PopulationType.IPP) * 1.0
        };

      case MeasureScoreType.RATIO:
        // Note: Untested measure score type
        // (NUMER - NUMEX) / (DENOM - DENEX)`
        const numeratorCount2 =
          this.populationTotal(population, PopulationType.NUMER) -
          this.populationTotal(population, PopulationType.NUMEX);
        const denominatorCount2 =
          this.populationTotal(population, PopulationType.DENOM) -
          this.populationTotal(population, PopulationType.DENEX);

        return {
          // TODO: what if value for denominator 0? ... do we need to subtract denex, dexecep... probably, as https://ecqi.healthit.gov/system/files/eCQM-Logic-and-Guidance-2018-0504.pdf
          value: denominatorCount2 === 0 ? 0 : (numeratorCount2 / denominatorCount2) * 1.0
        };
      default:
        throw new UnsupportedProperty(`Measure score type \"${scoringCode}\" not supported`);
    }
  }

  private calculateGroupScores() {
    if (!this.isIndividual && this.scoringCode === MeasureScoreType.CV) {
      throw new UnsupportedProperty('Aggregate measure reports for continuous variable measures not supported');
    }

    this.report.group?.forEach(group => {
      if (group.population) {
        if (this.scoringCode === MeasureScoreType.CV) {
          //this...
        } else {
          group.measureScore = this.calcMeasureScore(this.scoringCode, group.population);
        }
      } else {
        throw new UnexpectedProperty(`Group ${group.id} is missing population results.`);
      }

      // calculate all stratifiers in group
      group.stratifier?.forEach(strat => {
        strat.stratum?.forEach(stratum => {
          if (stratum.population) {
            if (this.scoringCode === MeasureScoreType.CV) {
              //
            } else {
              stratum.measureScore = this.calcMeasureScore(this.scoringCode, stratum.population);
            }
          } else {
            throw new UnexpectedProperty(`Group ${group.id} Stratifier ${strat.id} is missing population results.`);
          }
        });
      });
    });
  }

  public getReport(): fhir4.MeasureReport {
    this.calculateGroupScores();
    return this.report;
  }

  static buildMeasureReports(
    measureBundle: fhir4.Bundle,
    executionResults: ExecutionResult[],
    options: CalculationOptions
  ): fhir4.MeasureReport[] {
    const reports: fhir4.MeasureReport[] = [];
    executionResults.forEach(result => {
      const builder = new MeasureReportBuilder(measureBundle, options);
      builder.addPatientResults(result);
      reports.push(builder.getReport());
    });
    return reports;
  }
}
