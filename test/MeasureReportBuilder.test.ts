/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { PatientSource } from 'cql-exec-fhir';
import MeasureReportBuilder from '../src/calculation/MeasureReportBuilder';
import { getJSONFixture } from './helpers/testHelpers';
import { ExecutionResult, CalculationOptions, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { PopulationType } from '../src/types/Enums';

const patient1 = getJSONFixture(
  'EXM130-8.0.000/EXM130-8.0.000-patients/numerator/Adeline686_Prohaska837_ee009b12-7dbe-4610-abc4-5f92ad5b2804.json'
);

const patient2 = getJSONFixture('EXM111-9.1.000/Armando772_Almanza534_08fc9439-b7ff-4309-b409-4d143388594c.json');

const patientSource = PatientSource.FHIRv401();
patientSource.loadBundles([patient1, patient2]);

// ids from fixture patients
const patient1Id = '3413754c-73f0-4559-9f67-df8e593ce7e1';
const patient2Id = '08fc9439-b7ff-4309-b409-4d143388594c';

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as fhir4.Measure;
const ratioMeasure = getJSONFixture('measure/ratio-measure.json') as fhir4.Measure;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as fhir4.Measure;

const simpleMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: simpleMeasure
    }
  ]
};

const ratioMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: ratioMeasure
    }
  ]
};

const cvMeasureBundle: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: cvMeasure
    }
  ]
};

const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
  {
    patientId: patient1Id,
    detailedResults: [
      {
        groupId: 'group-1',
        statementResults: [],
        populationResults: [
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: false
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          },
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.DENEX,
            criteriaExpression: 'Denominator Exclusion',
            result: false
          }
        ],
        html: 'example-html'
      }
    ],
    supplementalData: [
      {
        name: 'sde-code',
        rawResult: {
          isCode: true,
          code: 'example',
          system: 'http://example.com',
          display: 'Example'
        }
      }
    ]
  }
];

const ratioExecutionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
  {
    patientId: patient1Id,
    detailedResults: [
      {
        groupId: 'group-1',
        statementResults: [],
        populationResults: [
          {
            populationType: PopulationType.NUMER,
            criteriaExpression: 'Numerator',
            result: true
          },
          {
            populationType: PopulationType.DENOM,
            criteriaExpression: 'Denominator',
            result: true
          },
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'Denominator Observations',
            result: true
          },
          {
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'Numerator Observations',
            result: true
          }
        ],
        episodeResults: [
          {
            episodeId: '123',
            populationResults: [
              {
                populationType: PopulationType.NUMER,
                criteriaExpression: 'Numerator',
                result: true
              },
              {
                populationType: PopulationType.DENOM,
                criteriaExpression: 'Denominator',
                result: true
              },
              {
                populationType: PopulationType.IPP,
                criteriaExpression: 'Initial Population',
                result: true
              },
              {
                populationType: PopulationType.OBSERV,
                criteriaExpression: 'Denominator Observations',
                result: true,
                observations: [10]
              },
              {
                populationType: PopulationType.OBSERV,
                criteriaExpression: 'Numerator Observations',
                result: true,
                observations: [1]
              }
            ]
          }
        ],
        html: 'example-html'
      }
    ],
    supplementalData: [
      {
        name: 'sde-code',
        rawResult: {
          isCode: true,
          code: 'example',
          system: 'http://example.com',
          display: 'Example'
        }
      }
    ]
  }
];

const cvExecutionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
  {
    patientId: patient2Id,
    detailedResults: [
      {
        groupId: 'group-1',
        statementResults: [],
        populationResults: [
          {
            populationType: PopulationType.MSRPOPL,
            criteriaExpression: 'Measure Population',
            result: false
          },
          {
            populationType: PopulationType.MSRPOPLEX,
            criteriaExpression: 'Measure Population Exclusions',
            result: true
          },
          {
            populationType: PopulationType.IPP,
            criteriaExpression: 'Initial Population',
            result: true
          },
          {
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'MeasureObservation',
            result: false
          }
        ],
        html: 'example-html'
      }
    ],
    supplementalData: [
      {
        name: 'sde-code',
        rawResult: {
          isCode: true,
          code: 'example',
          system: 'http://example.com',
          display: 'Example'
        }
      }
    ]
  }
];

const calculationOptions: CalculationOptions = {
  measurementPeriodStart: '2021-01-01',
  measurementPeriodEnd: '2021-12-31',
  calculateHTML: true,
  calculateSDEs: true
};

describe('MeasureReportBuilder Static', () => {
  describe('Simple Measure Report', () => {
    let measureReports: fhir4.MeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        simpleMeasureBundle,
        executionResults,
        calculationOptions
      );
    });

    test('should generate 1 result', () => {
      expect(measureReports).toBeDefined();
      expect(measureReports).toHaveLength(1);
    });

    test('should set basic options correctly', () => {
      const [mr] = measureReports;

      expect(mr.status).toEqual('complete');
      expect(mr.type).toEqual('individual');

      expect(mr.period).toEqual({
        start: calculationOptions.measurementPeriodStart,
        end: calculationOptions.measurementPeriodEnd
      });

      expect(mr.text).toBeDefined();
      expect(mr.measure).toEqual(simpleMeasure.url);

      expect(mr.subject).toEqual({
        reference: `Patient/${patient1Id}`
      });
    });

    test('should contain proper populationResults', () => {
      const [mr] = measureReports;

      expect(mr.group).toBeDefined();
      expect(mr.group).toHaveLength(1);

      const [group] = mr.group!;
      const result = executionResults[0].detailedResults?.[0];

      expect(group.id).toEqual(result!.groupId);
      expect(group.measureScore).toBeDefined();
      expect(group.population).toBeDefined();

      result!.populationResults!.forEach(pr => {
        const populationResult = group.population?.find(p => p.code?.coding?.[0].code === pr.populationType);
        expect(populationResult).toBeDefined();
        expect(populationResult!.count).toEqual(pr.result === true ? 1 : 0);
      });
    });

    test('should include SDEs', () => {
      const [mr] = measureReports;

      // expect 1 SDE defined above
      expect(mr.contained).toBeDefined();
      expect(mr.contained).toHaveLength(1);

      const sde = mr.contained?.[0] as fhir4.Observation;

      expect(sde.status).toEqual('final');
      expect(sde.code).toEqual({
        text: 'sde-code'
      });

      expect(sde.valueCodeableConcept).toBeDefined();
      const result = executionResults[0].supplementalData?.[0];

      expect(sde.valueCodeableConcept).toEqual({
        coding: expect.arrayContaining([
          {
            code: result!.rawResult.code,
            system: result!.rawResult.system,
            display: result!.rawResult.display
          }
        ])
      });
    });
  });

  describe('Ratio Measure Report', () => {
    let measureReports: fhir4.MeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        ratioMeasureBundle,
        ratioExecutionResults,
        calculationOptions
      );
    });

    test('should generate measure report', () => {
      expect(measureReports).toBeDefined();
      expect(measureReports).toHaveLength(1);
    });

    test('should contain proper populationResults', () => {
      const [mr] = measureReports;

      expect(mr.group).toBeDefined();
      expect(mr.group).toHaveLength(1);

      const [group] = mr.group!;
      const result = ratioExecutionResults[0].detailedResults?.[0];

      expect(group.id).toEqual(result!.groupId);
      expect(group.measureScore).toBeDefined();
      expect(group.measureScore).toEqual({ value: 0.1 });
      expect(group.population).toBeDefined();

      result!.populationResults!.forEach(pr => {
        const populationResult = group.population?.find(p => p.code?.coding?.[0].code === pr.populationType);
        if (pr.populationType !== 'measure-observation') {
          expect(populationResult).toBeDefined();
        } else {
          expect(populationResult).not.toBeDefined();
        }
      });
    });
  });

  describe('CV stratifier Measure Report', () => {
    let measureReports: fhir4.MeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        cvMeasureBundle,
        cvExecutionResults,
        calculationOptions
      );
    });

    test('should generate MeasureReport', () => {
      expect(measureReports).toBeDefined();
      expect(measureReports).toHaveLength(1);
    });

    test('should include CV-specific properties', () => {
      const [mr] = measureReports;

      expect(mr.contained).toBeDefined();
      expect(mr.contained).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            resourceType: 'Observation',
            code: {
              text: 'MeasureObservation'
            }
          })
        ])
      );
    });

    test('should include stratifier in each group', () => {
      const [mr] = measureReports;

      expect(mr.group).toBeDefined();
      mr.group?.forEach(g => {
        expect(g.stratifier).toBeDefined();
      });
    });
  });
});

describe('MeasureReportBuilder Class', () => {
  let measureBundle: fhir4.Bundle;

  beforeAll(() => {
    measureBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: simpleMeasure }],
      type: 'transaction'
    };
  });

  test('should properly recognize individual propery', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'individual'
    });

    expect(builder.isIndividual).toBe(true);
  });

  test('should properly recognize summary propery', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'summary'
    });

    expect(builder.isIndividual).toBe(false);
  });

  test('should persist calculateSDEs for individual reports', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'individual',
      calculateSDEs: true
    });

    expect(builder.calculateSDEs).toBe(true);
  });

  test('should not calculateSDEs for summary reports', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'summary',
      calculateSDEs: true
    });

    expect(builder.calculateSDEs).toBe(false);
  });

  test('should add basic individual metadata', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'individual',
      calculateSDEs: true,
      calculateHTML: true,
      measurementPeriodStart: '2021-01-01',
      measurementPeriodEnd: '2021-12-31'
    });

    const { report } = builder;

    expect(report.period).toEqual({
      start: '2021-01-01',
      end: '2021-12-31'
    });

    expect(report.status).toEqual('complete');
    expect(report.type).toEqual('individual');

    expect(report.measure).toEqual(simpleMeasure.url);

    // Text should be defined when calculateHTML is true
    expect(report.text).toBeDefined();
  });

  test('should add basic summary metadata', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'summary',
      calculateSDEs: true,
      calculateHTML: true,
      measurementPeriodStart: '2021-01-01',
      measurementPeriodEnd: '2021-12-31'
    });

    const { report } = builder;

    expect(report.period).toEqual({
      start: '2021-01-01',
      end: '2021-12-31'
    });

    expect(report.status).toEqual('complete');
    expect(report.type).toEqual('summary');

    expect(report.measure).toEqual(simpleMeasure.url);

    // Text should be undefined for summary reports
    expect(report.text).toBeUndefined();
  });

  test('no detailed results should throw error', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'individual',
      measurementPeriodStart: '2021-01-01',
      measurementPeriodEnd: '2021-12-31'
    });

    expect(() =>
      builder.addPatientResults({
        patientId: patient1Id
      })
    ).toThrowError();
  });

  test('should add subject for individual report', () => {
    const builder = new MeasureReportBuilder(measureBundle, {
      reportType: 'individual',
      measurementPeriodStart: '2021-01-01',
      measurementPeriodEnd: '2021-12-31'
    });

    builder.addPatientResults({
      patientId: patient1Id,
      detailedResults: []
    });

    const report = builder.getReport();

    expect(report.subject).toEqual({
      reference: `Patient/${patient1Id}`
    });
  });
});
