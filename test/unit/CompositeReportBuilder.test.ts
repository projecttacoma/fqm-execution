import {
  CalculationOptions,
  DetailedPopulationGroupResult,
  ExecutionResult,
  PopulationGroupResult,
  PopulationType
} from '../../src';
import { CompositeMeasureReport, CompositeReportBuilder } from '../../src/calculation/CompositeReportBuilder';
import { getJSONFixture } from './helpers/testHelpers';

const simpleCompositeMeasure = getJSONFixture('measure/simple-composite-measure.json') as fhir4.Measure;
const simpleCompositeMeasureWeightedScoring = getJSONFixture(
  'measure/simple-composite-measure-weighted-scoring.json'
) as fhir4.Measure;

const compositeExecutionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
  {
    patientId: 'patient-1',
    componentResults: [
      {
        groupId: 'group-1',
        componentCanonical: 'http://example.com/Measure/example-component-one|0.0.1',
        populationResults: [
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: false
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          }
        ]
      },
      {
        groupId: 'group-2',
        componentCanonical: 'http://example.com/Measure/example-component-two|0.0.1',
        populationResults: [
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: true
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          }
        ]
      }
    ]
  },
  {
    patientId: 'patient-2',
    componentResults: [
      {
        groupId: 'group-1',
        componentCanonical: 'http://example.com/Measure/example-component-one|0.0.1',
        populationResults: [
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: true
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          }
        ]
      },
      {
        groupId: 'group-2',
        componentCanonical: 'http://example.com/Measure/example-component-two|0.0.1',
        populationResults: [
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: true
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          }
        ]
      }
    ]
  }
];

const calculationOptions: CalculationOptions = {
  measurementPeriodStart: '2023-01-01',
  measurementPeriodEnd: '2023-12-31'
};
describe('CompositeReportBuilder constructor', () => {
  let compositeReportBuilder: CompositeReportBuilder<PopulationGroupResult>;
  let compositeMeasureReport: CompositeMeasureReport;
  beforeAll(() => {
    compositeReportBuilder = new CompositeReportBuilder(simpleCompositeMeasure, calculationOptions);
    compositeMeasureReport = compositeReportBuilder.getReport();
  });
  it('defines a composite scoring type', () => {
    expect(compositeReportBuilder.compositeScoringType).toBeDefined();
  });

  it('initializes a composite fraction', () => {
    expect(compositeReportBuilder.compositeFraction).toBeDefined();
    expect(compositeReportBuilder.compositeFraction.denominator).toEqual(0);
    expect(compositeReportBuilder.compositeFraction.numerator).toEqual(0);
  });

  describe('initial field values are appropriately defined on the report', () => {
    it('has status "complete"', () => {
      expect(compositeMeasureReport.status).toEqual('complete');
    });

    it('has type "summary"', () => {
      expect(compositeMeasureReport.type).toEqual('summary');
    });

    it('has a measure defined', () => {
      expect(compositeMeasureReport.measure).toBeDefined();
      expect(compositeMeasureReport.measure).toEqual('http://example.com/Measure/Measure/example-composite-measure');
    });

    it('has a defined measurement period based on calculation options', () => {
      expect(compositeMeasureReport.period).toEqual({
        start: calculationOptions.measurementPeriodStart,
        end: calculationOptions.measurementPeriodEnd
      });
    });

    it('defines a single group with numerator and denominator populations', () => {
      expect(compositeMeasureReport.group.length).toEqual(1);
      expect(compositeMeasureReport.group[0].population.length).toEqual(2);

      const denomPopulation = compositeMeasureReport.group[0].population[0];
      const numerPopulation = compositeMeasureReport.group[0].population[1];

      expect(denomPopulation.code?.coding?.[0].code).toEqual('denominator');
      expect(numerPopulation.code?.coding?.[0].code).toEqual('numerator');
    });
  });
});

describe('addPatientResults', () => {
  let compositeReportBuilder: CompositeReportBuilder<PopulationGroupResult>;
  beforeEach(() => {
    compositeReportBuilder = new CompositeReportBuilder(simpleCompositeMeasure, calculationOptions);
  });

  it('increments numerator and denominator for all-or-nothing scoring', () => {
    compositeReportBuilder.addResults(compositeExecutionResults);
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.5);
    expect(compositeReportBuilder.compositeFraction.numerator).toEqual(1);
    expect(compositeReportBuilder.compositeFraction.denominator).toEqual(2);
  });

  it('increments numerator and denominator for opportunity scoring', () => {
    compositeReportBuilder.compositeScoringType = 'opportunity';
    compositeReportBuilder.addResults(compositeExecutionResults);
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.75);
    expect(compositeReportBuilder.compositeFraction.numerator).toEqual(3);
    expect(compositeReportBuilder.compositeFraction.denominator).toEqual(4);
  });

  it('increments numerator and denominator for linear scoring', () => {
    compositeReportBuilder.compositeScoringType = 'linear';
    compositeReportBuilder.addResults(compositeExecutionResults);
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.75);
    expect(compositeReportBuilder.compositeFraction.numerator).toEqual(1.5);
    expect(compositeReportBuilder.compositeFraction.denominator).toEqual(2);
  });
});

describe('addComponentResults', () => {
  let compositeReportBuilderWithWeights: CompositeReportBuilder<PopulationGroupResult>;
  let compositeReportBuilder: CompositeReportBuilder<PopulationGroupResult>;

  it('increments numerator and denominator for weighted scoring when a weight is specified on both artifacts', () => {
    compositeReportBuilderWithWeights = new CompositeReportBuilder(
      simpleCompositeMeasureWeightedScoring,
      calculationOptions
    );
    compositeReportBuilderWithWeights.addResults(compositeExecutionResults);
    const report = compositeReportBuilderWithWeights.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.2);
    expect(compositeReportBuilderWithWeights.compositeFraction.numerator).toEqual(0.4);
    expect(compositeReportBuilderWithWeights.compositeFraction.denominator).toEqual(2);
  });

  it('increments numerator and denominator for weighted scoring when a weight is not specified so it is treated as 1', () => {
    compositeReportBuilder = new CompositeReportBuilder(simpleCompositeMeasure, calculationOptions);
    compositeReportBuilder.compositeScoringType = 'weighted';
    compositeReportBuilder.addResults(compositeExecutionResults);
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.75);
    expect(compositeReportBuilder.compositeFraction.numerator).toEqual(1.5);
    expect(compositeReportBuilder.compositeFraction.denominator).toEqual(2);
  });
});

describe('getReport', () => {
  let compositeReportBuilder: CompositeReportBuilder<PopulationGroupResult>;
  beforeAll(() => {
    compositeReportBuilder = new CompositeReportBuilder(simpleCompositeMeasure, calculationOptions);
  });

  it('returns a defined composite measure report', () => {
    expect(compositeReportBuilder.getReport()).toBeDefined();
  });

  it('contains a measure score of 0 when the denominator is 0', () => {
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0);
  });

  it('computes a measure score between 0 and 1', () => {
    compositeReportBuilder.compositeFraction.numerator = 1;
    compositeReportBuilder.compositeFraction.denominator = 2;
    const report = compositeReportBuilder.getReport();
    expect(report.group[0].measureScore?.value).toEqual(0.5);
  });
});
