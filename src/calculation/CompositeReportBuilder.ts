import { PopulationGroupResult, CalculationOptions, ExecutionResult } from '../types/Calculator';
import { getCompositeScoringFromMeasure, getGroupIdFromComponent } from '../helpers/MeasureBundleHelpers';
import { CompositeScoreType, PopulationType } from '../types/Enums';
import { v4 as uuidv4 } from 'uuid';
import { AbstractMeasureReportBuilder } from './AbstractMeasureReportBuilder';

export type CompositeMeasureReport = fhir4.MeasureReport & {
  group: [
    fhir4.MeasureReportGroup & {
      population: [
        fhir4.MeasureReportGroupPopulation & { count: number },
        fhir4.MeasureReportGroupPopulation & { count: number }
      ];
    }
  ];
};

export class CompositeReportBuilder<T extends PopulationGroupResult> extends AbstractMeasureReportBuilder<
  T,
  CompositeMeasureReport
> {
  report: CompositeMeasureReport;
  compositeScoringType: CompositeScoreType;
  compositeFraction: { numerator: number; denominator: number };
  weightedComponents: Record<string, number>;
  componentGroupIds: Record<string, string>;

  constructor(compositeMeasure: fhir4.Measure, options: CalculationOptions) {
    super(compositeMeasure, options);

    this.compositeScoringType = getCompositeScoringFromMeasure(compositeMeasure) ?? 'all-or-nothing';
    this.compositeFraction = { numerator: 0, denominator: 0 };
    this.options = options;
    this.weightedComponents = {};
    this.componentGroupIds = {};

    // if the weight is not specified, then we assume the weight is 1
    compositeMeasure.relatedArtifact?.forEach(ra => {
      if (ra.resource && ra.type === 'composed-of') {
        let weight = 1;
        const weightExtension = ra.extension?.find(
          ({ url }) => url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight'
        );

        if (weightExtension?.valueDecimal) {
          weight = weightExtension.valueDecimal;
        }

        this.weightedComponents[ra.resource] = weight;

        const groupId = getGroupIdFromComponent(ra);
        if (groupId) {
          this.componentGroupIds[ra.resource] = groupId;
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

  public addAllResults(results: ExecutionResult<T>[]) {
    // the weighted composite scoring type is component-based, but the others are individual-based
    if (this.compositeScoringType === 'weighted') {
      this.addWeightedResults(results);
    } else {
      results.forEach(result => {
        this.addPatientResults(result);
      });
    }
  }

  private addWeightedResults(results: ExecutionResult<T>[]) {
    // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#weighted-scoring
    const componentPopulationResults: Record<string, { numerator: number; denominator: number; weight: number }> = {};

    results.forEach(result => {
      result.componentResults?.forEach(componentResult => {
        if (componentResult.componentCanonical && !componentPopulationResults[componentResult.componentCanonical]) {
          componentPopulationResults[componentResult.componentCanonical] = {
            numerator: 0,
            denominator: 0,
            weight: this.weightedComponents[componentResult.componentCanonical]
          };
        }

        if (componentResult.componentCanonical && componentPopulationResults[componentResult.componentCanonical]) {
          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result === true
          ) {
            componentPopulationResults[componentResult.componentCanonical].numerator++;
          }

          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result === true
          ) {
            componentPopulationResults[componentResult.componentCanonical].denominator++;
          }
        }
      });

      this.addEvaluatedResources(result);
    });

    // Multiply each of the component ratios by the weight associated with the component
    // TODO: this may need to change if an extension is created for non-integer counts on the measure report
    Object.values(componentPopulationResults).forEach(value => {
      if (value.denominator !== 0) {
        this.compositeFraction.numerator += value.weight * (value.numerator / value.denominator);
      }
    });

    this.compositeFraction.denominator = Object.keys(componentPopulationResults).length;
  }

  public addPatientResults(result: ExecutionResult<T>) {
    // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#all-or-nothing-scoring
    if (this.compositeScoringType === 'all-or-nothing') {
      let inIpp = false;
      let inDenom = false;
      let inNumer = true;

      result.componentResults?.forEach(componentResult => {
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
          this.compositeFraction.denominator++;
          if (inNumer) {
            this.compositeFraction.numerator++;
          }
        }
      }
    } else if (this.compositeScoringType === 'opportunity') {
      // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#opportunity-scoring

      let inIpp = false;
      let inDenom = false;

      result.componentResults?.forEach(componentResult => {
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
          if (inDenom) {
            this.compositeFraction.denominator++;
          }
          numerResults?.forEach(result => {
            if (result) {
              this.compositeFraction.numerator++;
            }
          });
        }
      });
    } else if (this.compositeScoringType === 'linear') {
      // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#patient-level-linear-combination-scoring

      // Always increment the denominator for linear scoring when processing a patient result
      this.compositeFraction.denominator++;

      const [patientDenomCount, patientNumerCount] = result.componentResults?.reduce(
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
        this.compositeFraction.numerator += (patientNumerCount * 1.0) / patientDenomCount;
      }
    } else if (this.compositeScoringType === 'weighted') {
      // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#weighted-scoring
      throw new Error(
        'addPatientResults cannot be used for weighted scoring since it is a component-based composite measure scoring method, addAllResults should be used instead'
      );
    }

    this.addEvaluatedResources(result);
  }

  getReport(): CompositeMeasureReport {
    // Composite measure population list is a tuple of [denom, numer]
    this.report.group[0].population[0].count = this.compositeFraction.denominator;
    this.report.group[0].population[1].count = this.compositeFraction.numerator;
    this.report.group[0].measureScore = {
      value:
        this.compositeFraction.denominator > 0
          ? (this.compositeFraction.numerator * 1.0) / this.compositeFraction.denominator
          : 0
    };

    return this.report;
  }
}
