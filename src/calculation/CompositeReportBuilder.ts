import { PopulationGroupResult, CalculationOptions, ExecutionResult } from '../types/Calculator';
import { getCompositeScoringFromMeasure } from '../helpers/MeasureBundleHelpers';
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

  constructor(compositeMeasure: fhir4.Measure, options: CalculationOptions) {
    super(compositeMeasure, options);

    this.compositeScoringType = getCompositeScoringFromMeasure(compositeMeasure) ?? 'all-or-nothing';
    this.compositeFraction = { numerator: 0, denominator: 0 };
    this.options = options;
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
      ]
    };
  }

  public addPatientResults(results: ExecutionResult<T>) {
    // https://build.fhir.org/ig/HL7/cqf-measures/composite-measures.html#all-or-nothing-scoring
    if (this.compositeScoringType === 'all-or-nothing') {
      let inIpp = false;
      let inDenom = false;
      let inNumer = true;

      results.componentResults?.forEach(componentResult => {
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

      results.componentResults?.forEach(componentResult => {
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

      const [patientNumerCount, patientDenomCount] = results.componentResults?.reduce(
        (sums, componentResult) => {
          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.NUMER)?.result === true
          ) {
            sums[0] += 1;
          }

          if (
            componentResult.populationResults?.find(pr => pr.populationType === PopulationType.DENOM)?.result === true
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
      throw new Error('Weighted scoring not implemented for composite measures');
    }

    if (results.evaluatedResource) {
      results.evaluatedResource.forEach(resource => {
        const reference: fhir4.Reference = {
          reference: `${resource.resourceType}/${resource.id}`
        };
        if (!this.report.evaluatedResource?.some(r => r.reference === reference.reference)) {
          if (!this.report.evaluatedResource) {
            this.report.evaluatedResource = [reference];
          } else {
            this.report.evaluatedResource.push(reference);
          }
        }
      });
    }
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
