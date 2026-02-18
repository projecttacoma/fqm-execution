import { PopulationGroupResult, CalculationOptions, ExecutionResult } from '../types/Calculator';
import {
  getCompositeScoringFromMeasure,
  getGroupIdForComponent,
  getWeightForComponent,
  filterComponentResults,
  getCompositeScoringFromGroup,
  getWeightForComponentFromExtension
} from '../helpers/MeasureBundleHelpers';
import { CompositeScoreType, PopulationType } from '../types/Enums';
import { v4 as uuidv4 } from 'uuid';
import { AbstractMeasureReportBuilder } from './AbstractMeasureReportBuilder';

export type CompositeMeasureReport = fhir4.MeasureReport & {
  group: (fhir4.MeasureReportGroup & {
    population: [
      fhir4.MeasureReportGroupPopulation & { count: number },
      fhir4.MeasureReportGroupPopulation & { count: number }
    ];
  })[];
};

interface ComponentPopulationResults {
  numerator: number;
  denominator: number;
  weight: number;
}

export class CompositeReportBuilder<T extends PopulationGroupResult> extends AbstractMeasureReportBuilder<
  T,
  CompositeMeasureReport
> {
  report: CompositeMeasureReport;
  compositeScoringType: CompositeScoreType | undefined;
  compositeFraction:
    | { numerator: number; denominator: number }
    | Record<string, { numerator: number; denominator: number }>;
  components: Record<string, Record<string, number> | number>;
  groups: Record<string, Record<string, number | string>>;
  groupDefinedCompositeMeasure: boolean;

  constructor(compositeMeasure: fhir4.Measure, options: CalculationOptions) {
    super(compositeMeasure, options);

    // need to check if composite scoring is defined at the measure level or at the group level

    this.compositeScoringType = getCompositeScoringFromMeasure(compositeMeasure);
    this.groupDefinedCompositeMeasure = this.compositeScoringType === undefined ? true : false;

    if (this.groupDefinedCompositeMeasure === true) {
      this.components = {};
      this.compositeFraction = {};
      this.groups = {};
      this.options = options;
      // need to handle as group
      const groupsForMeasureReport: (fhir4.MeasureReportGroup & {
        population: [
          fhir4.MeasureReportGroupPopulation & { count: number },
          fhir4.MeasureReportGroupPopulation & { count: number }
        ];
      })[] = [];
      compositeMeasure.group?.forEach(g => {
        // For now we are going to assume that all groups in Measure.group have an id
        // Could make type where MeasureGroup.id must exist
        if (g.id) {
          // If a group doesn't have a composite scoring type defined, we will just make it all-or-nothing for now
          (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[g.id] = {
            numerator: 0,
            denominator: 0
          };
          const groupCompositeScoringType = getCompositeScoringFromGroup(g);
          this.groups[g.id] = { ['compositeScoringType']: groupCompositeScoringType };
          g.extension?.forEach(e => {
            if (
              e.url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-component' &&
              e.valueRelatedArtifact &&
              e.valueRelatedArtifact.resource &&
              g.id
            ) {
              // get weight for component or set to 1
              const weight = getWeightForComponentFromExtension(e);
              this.groups[g.id][e.valueRelatedArtifact.resource] = weight;
            }
          });
        }

        groupsForMeasureReport.push({
          id: g.id,
          population: [
            {
              count: 0,
              code: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                    code: 'denominator'
                  }
                ]
              }
            },
            {
              count: 0,
              code: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                    code: 'numerator'
                  }
                ]
              }
            }
          ]
        });
      });

      this.report = {
        resourceType: 'MeasureReport',
        id: uuidv4(),
        status: 'complete',
        type: 'summary',
        period: {
          start: this.options.measurementPeriodStart,
          end: this.options.measurementPeriodEnd
        },
        measure: compositeMeasure.url ?? 'UnknownMeasure',
        group: groupsForMeasureReport,
        evaluatedResource: []
      };
    } else {
      this.groups = {};
      this.compositeFraction = { numerator: 0, denominator: 0 };
      this.options = options;
      // mapping of component canonical to group(s) and weight(s), defined by CQFM extensions
      this.components = {};

      compositeMeasure.relatedArtifact?.forEach(ra => {
        if (ra.resource && ra.type === 'composed-of') {
          // gather group Id and weight extension values
          const groupId = getGroupIdForComponent(ra);
          const weight = getWeightForComponent(ra) || 1;

          if (groupId) {
            if (!(ra.resource in this.components)) {
              this.components[ra.resource] = { [groupId]: weight };
            } else {
              // cast to Record<string, number> since groupId is defined
              (this.components[ra.resource] as Record<string, number>)[groupId] = weight;
            }
          } else {
            this.components[ra.resource] = weight;
          }
        }
      });

      this.report = {
        resourceType: 'MeasureReport',
        id: uuidv4(),
        status: 'complete',
        type: 'summary',
        period: {
          start: this.options.measurementPeriodStart,
          end: this.options.measurementPeriodEnd
        },
        measure: compositeMeasure.url ?? 'UnknownMeasure',
        group: [
          {
            population: [
              {
                count: 0,
                code: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                      code: 'denominator'
                    }
                  ]
                }
              },
              {
                count: 0,
                code: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                      code: 'numerator'
                    }
                  ]
                }
              }
            ]
          }
        ],
        evaluatedResource: []
      };
    }
  }

  public addAllResults(results: ExecutionResult<T>[]) {
    // the weighted composite scoring type is component-based, but the others are individual-based
    if (this.groupDefinedCompositeMeasure === true) {
      // Add new methods in here for now rather than reuse old ones
      // go through all of the groups in this.groups
      for (const groupId of Object.keys(this.groups)) {
        const compositeGroupScoringType = this.groups[groupId]['compositeScoringType'];
        if (compositeGroupScoringType === 'weighted') {
          this.addWeightedResults(results, groupId);
        } else {
          results.forEach(result => {
            this.addPatientResults(result, groupId);
          });
        }
      }
    } else {
      if (this.compositeScoringType === 'weighted') {
        this.addWeightedResults(results);
      } else {
        results.forEach(result => {
          this.addPatientResults(result);
        });
      }
    }
  }

  private addWeightedResults(results: ExecutionResult<T>[], groupId?: string) {
    // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#weighted-scoring
    // map component canonical to its population results (if only one group exists), or map to a Record that
    // maps each component group to its corresponding weight
    const componentPopulationResults: Record<
      string,
      ComponentPopulationResults | Record<string, ComponentPopulationResults>
    > = {};

    results.forEach(result => {
      const componentResults = groupId
        ? filterComponentResults(this.groups[groupId], result.componentResults)
        : filterComponentResults(this.components, result.componentResults);

      componentResults.forEach(componentResult => {
        if (componentResult.componentCanonical) {
          const componentInfo = groupId
            ? this.groups[groupId][componentResult.componentCanonical]
            : this.components[componentResult.componentCanonical];
          const noGroupExt = typeof componentInfo === 'number';
          if (noGroupExt) {
            if (!(componentResult.componentCanonical in componentPopulationResults)) {
              componentPopulationResults[componentResult.componentCanonical] = {
                numerator: 0,
                denominator: 0,
                weight: componentInfo
              };
            }
          } else {
            // TODO: multiple group functionality for group-defined composite measures
            if (!groupId) {
              // multiple groups are specified for the component
              Object.keys(this.components[componentResult.componentCanonical]).forEach(gId => {
                if (componentResult.componentCanonical) {
                  const weight = (this.components[componentResult.componentCanonical] as Record<string, number>)[gId];
                  if (!(componentResult.componentCanonical in componentPopulationResults)) {
                    componentPopulationResults[componentResult.componentCanonical] = {
                      [gId]: {
                        numerator: 0,
                        denominator: 0,
                        weight: weight
                      }
                    };
                  } else {
                    if (!(gId in componentPopulationResults[componentResult.componentCanonical]))
                      (
                        componentPopulationResults[componentResult.componentCanonical] as Record<
                          string,
                          ComponentPopulationResults
                        >
                      )[gId] = {
                        numerator: 0,
                        denominator: 0,
                        weight: weight
                      };
                  }
                }
              });
            }
          }

          if (componentPopulationResults[componentResult.componentCanonical]) {
            if (
              componentResult.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result === true
            ) {
              if (groupId) {
                if (noGroupExt) {
                  (componentPopulationResults[componentResult.componentCanonical] as ComponentPopulationResults)
                    .numerator++;
                } else {
                  // TODO: handle multiple groups
                }
              } else {
                if (noGroupExt) {
                  (componentPopulationResults[componentResult.componentCanonical] as ComponentPopulationResults)
                    .numerator++;
                } else {
                  (
                    componentPopulationResults[componentResult.componentCanonical] as Record<
                      string,
                      ComponentPopulationResults
                    >
                  )[componentResult.groupId].numerator++;
                }
              }
            }
            if (
              componentResult.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result === true
            ) {
              if (groupId) {
                if (noGroupExt) {
                  (componentPopulationResults[componentResult.componentCanonical] as ComponentPopulationResults)
                    .denominator++;
                } else {
                  // TODO: handle multiple groups
                }
              } else {
                if (noGroupExt) {
                  (componentPopulationResults[componentResult.componentCanonical] as ComponentPopulationResults)
                    .denominator++;
                } else {
                  (
                    componentPopulationResults[componentResult.componentCanonical] as Record<
                      string,
                      ComponentPopulationResults
                    >
                  )[componentResult.groupId].denominator++;
                }
              }
            }
          }
        }
      });
      this.addEvaluatedResources(result);
    });

    // Multiply each of the component ratios by the weight associated with the component
    // TODO: this may need to change if an extension is created for non-integer counts on the measure report
    const isComponentResult = (obj: any): obj is ComponentPopulationResults => {
      return 'numerator' in obj;
    };

    Object.values(componentPopulationResults)
      .flatMap(e => (isComponentResult(e) ? e : Object.values(e)))
      .forEach(value => {
        if (groupId) {
          if (value.denominator !== 0) {
            (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId].numerator +=
              value.weight * (value.numerator / value.denominator);
          }
          (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId].denominator +=
            value.weight;
        } else {
          if (value.denominator !== 0) {
            (this.compositeFraction.numerator as number) += value.weight * (value.numerator / value.denominator);
          }
          (this.compositeFraction.denominator as number) += value.weight;
        }
      });
  }

  public addPatientResults(result: ExecutionResult<T>, groupId?: string) {
    const componentResults = groupId
      ? filterComponentResults(this.groups[groupId], result.componentResults)
      : filterComponentResults(this.components, result.componentResults);

    // all-or-nothing for both group-defined and not
    if (
      this.compositeScoringType === 'all-or-nothing' ||
      (groupId && this.groups[groupId]['compositeScoringType'] === 'all-or-nothing')
    ) {
      let inIpp = false;
      let inDenom = false;
      let inNumer = true;
      componentResults.forEach(componentResult => {
        const ippResult = componentResult.populationResults?.find(
          pop => pop.populationType === PopulationType.IPP
        )?.result;
        if (ippResult === true) {
          inIpp = true;
        }

        const denomResult = componentResult.populationResults?.find(
          pop => pop.populationType === PopulationType.DENOM
        )?.result;
        if (denomResult === true) {
          inDenom = true;
        }

        const numerResult = componentResult.populationResults?.find(
          pop => pop.populationType === PopulationType.NUMER
        )?.result;
        if (numerResult === false) {
          inNumer = false;
        }
      });

      if (inIpp) {
        if (inDenom) {
          if (groupId) {
            (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId]
              .denominator++;
            if (inNumer) {
              (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId]
                .numerator++;
            }
          } else {
            (this.compositeFraction.denominator as number)++;
            if (inNumer) {
              (this.compositeFraction.numerator as number)++;
            }
          }
        }
      }
    } else if (
      this.compositeScoringType === 'opportunity' ||
      (groupId && this.groups[groupId]['compositeScoringType'] === 'opportunity')
    ) {
      let inIpp = false;
      let inDenom = false;

      componentResults.forEach(componentResult => {
        const ippResult = componentResult.populationResults?.find(
          pop => pop.populationType === PopulationType.IPP
        )?.result;
        if (ippResult === true) {
          inIpp = true;
        }

        const denomResult = componentResult.populationResults?.find(
          pop => pop.populationType === PopulationType.DENOM
        )?.result;
        if (denomResult === true) {
          inDenom = true;
        }

        const numerResults = componentResult.populationResults
          ?.filter(pop => pop.populationType === PopulationType.NUMER)
          ?.map(r => r.result);

        if (inIpp) {
          if (groupId) {
            if (inDenom) {
              (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId]
                .denominator++;
            }
            numerResults?.forEach(result => {
              if (result) {
                (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId]
                  .numerator++;
              }
            });
          } else {
            if (inDenom) {
              (this.compositeFraction.denominator as number)++;
            }
            numerResults?.forEach(result => {
              if (result) {
                (this.compositeFraction.numerator as number)++;
              }
            });
          }
        }
      });
    } else if (
      this.compositeScoringType === 'linear' ||
      (groupId && this.groups[groupId]['compositeScoringType'] === 'linear')
    ) {
      // linear for both group-defined and not

      // Always increment the denominator for linear scoring when processing a patient result
      if (groupId) {
        (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId].denominator++;
      } else {
        (this.compositeFraction.denominator as number)++;
      }

      const [patientDenomCount, patientNumerCount] = componentResults.reduce(
        (sums, componentResult) => {
          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result === true
          ) {
            sums[0] += 1;
          }

          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result === true
          ) {
            sums[1] += 1;
          }

          return sums;
        },
        [0, 0]
      ) ?? [0, 0];

      if (patientDenomCount !== 0) {
        if (groupId) {
          (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[groupId].numerator +=
            (patientNumerCount * 1.0) / patientDenomCount;
        } else {
          (this.compositeFraction.numerator as number) += (patientNumerCount * 1.0) / patientDenomCount;
        }
      }
    } else if (
      this.compositeScoringType === 'weighted' ||
      (groupId && this.groups[groupId]['compositeScoringType'] === 'weighted')
    ) {
      // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#weighted-scoring
      throw new Error(
        'addPatientResults cannot be used for weighted scoring since it is a component-based composite measure scoring method, addAllResults should be used instead'
      );
    }

    this.addEvaluatedResources(result);
  }

  getReport(): CompositeMeasureReport {
    // Composite measure population list is a tuple of [denom, numer]

    if (this.groupDefinedCompositeMeasure === true) {
      for (const group of this.report.group) {
        if (group.id) {
          const index = this.report.group.findIndex(g => g.id === group.id);
          this.report.group[index].population[0].count = (
            this.compositeFraction as Record<string, { numerator: number; denominator: number }>
          )[group.id].denominator;
          this.report.group[index].population[1].count = (
            this.compositeFraction as Record<string, { numerator: number; denominator: number }>
          )[group.id].numerator;
          this.report.group[index].measureScore = {
            value:
              (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[group.id]
                .denominator > 0
                ? ((this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[group.id]
                    .numerator *
                    1.0) /
                  (this.compositeFraction as Record<string, { numerator: number; denominator: number }>)[group.id]
                    .denominator
                : 0
          };
        }
      }
    } else {
      this.report.group[0].population[0].count = this.compositeFraction.denominator as number;
      this.report.group[0].population[1].count = this.compositeFraction.numerator as number;
      this.report.group[0].measureScore = {
        value:
          (this.compositeFraction.denominator as number) > 0
            ? ((this.compositeFraction.numerator as number) * 1.0) / (this.compositeFraction.denominator as number)
            : 0
      };
    }

    return this.report;
  }
}
