/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { PatientSource } from 'cql-exec-fhir';
import MeasureReportBuilder from '../../src/calculation/MeasureReportBuilder';
import { getJSONFixture } from './helpers/testHelpers';
import {
  ExecutionResult,
  CalculationOptions,
  DetailedPopulationGroupResult,
  PopulationGroupResult
} from '../../src/types/Calculator';
import { PopulationType } from '../../src/types/Enums';

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
const propWithStratMeasure = getJSONFixture('measure/proportion-measure-with-stratifiers.json') as fhir4.Measure;
const ratioMeasure = getJSONFixture('measure/ratio-measure.json') as fhir4.Measure;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as fhir4.Measure;
const cvMeasureScoringOnGroup = getJSONFixture('measure/group-score-cv-measure.json');

function buildTestMeasureBundle(measure: fhir4.Measure): fhir4.Bundle {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      {
        resource: measure
      }
    ]
  };
}
const simpleMeasureBundle = buildTestMeasureBundle(simpleMeasure);
const propWithStratMeasureBundle = buildTestMeasureBundle(propWithStratMeasure);
const ratioMeasureBundle = buildTestMeasureBundle(ratioMeasure);
const cvMeasureBundle = buildTestMeasureBundle(cvMeasure);

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
        },
        id: 'sde-id',
        criteriaExpression: 'SDE',
        usage: 'supplemental-data'
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
        },
        id: 'sde-id',
        criteriaExpression: 'SDE',
        usage: 'supplemental-data'
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
        },
        id: 'sde-id',
        criteriaExpression: 'SDE',
        usage: 'supplemental-data'
      }
    ]
  }
];

const propWithStratExecutionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
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
        stratifierResults: [
          {
            strataCode: '93f5f1c7-8638-40a4-a596-8b5831599209',
            result: false,
            strataId: '93f5f1c7-8638-40a4-a596-8b5831599209'
          },
          {
            strataCode: '5baf37c7-8887-4576-837e-ea20a8938282',
            result: false,
            strataId: '5baf37c7-8887-4576-837e-ea20a8938282'
          },
          {
            strataCode: '125b3d95-2d00-455f-8a6e-d53614a2a50e',
            result: false,
            strataId: '125b3d95-2d00-455f-8a6e-d53614a2a50e'
          },
          {
            strataCode: 'c06647b9-e134-4189-858d-80cee23c0f8d',
            result: false,
            strataId: 'c06647b9-e134-4189-858d-80cee23c0f8d'
          }
        ],
        html: 'example-html'
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

  describe('Measure Report from Proportion Measure with stratifiers', () => {
    let measureReports: fhir4.MeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        propWithStratMeasureBundle,
        propWithStratExecutionResults,
        calculationOptions
      );
    });

    test('should generate 1 result', () => {
      expect(measureReports).toBeDefined();
      expect(measureReports).toHaveLength(1);
    });

    test('should contain proper stratifierResults', () => {
      const [mr] = measureReports;

      expect(mr.group).toBeDefined();
      expect(mr.group).toHaveLength(1);

      const [group] = mr.group!;
      const result = propWithStratExecutionResults[0].detailedResults?.[0];

      expect(group.id).toEqual(result!.groupId);
      expect(group.measureScore).toBeDefined();
      expect(group.population).toBeDefined();

      result!.populationResults!.forEach(pr => {
        const populationResult = group.population?.find(p => p.code?.coding?.[0].code === pr.populationType);
        expect(populationResult).toBeDefined();
        expect(populationResult!.count).toEqual(pr.result === true ? 1 : 0);
      });

      result!.stratifierResults!.forEach(sr => {
        const stratifierResult = group.stratifier?.find(s => s.id === sr.strataId);
        expect(stratifierResult).toBeDefined();
        expect(stratifierResult!.stratum?.[0].population?.length).toEqual(1);
        expect(stratifierResult!.stratum?.[0].measureScore?.value).toEqual(0);
      });
    });
  });

  describe('Measure Report from Proportion Measure with stratifiers and two patient results', () => {
    let builder: MeasureReportBuilder<PopulationGroupResult>;
    beforeAll(() => {
      builder = new MeasureReportBuilder(propWithStratMeasure, {
        reportType: 'summary',
        measurementPeriodStart: '2021-01-01',
        measurementPeriodEnd: '2021-12-31'
      });

      builder.addPatientResults({
        patientId: patient1Id,
        detailedResults: [
          {
            groupId: 'group-1',
            stratifierResults: [
              {
                strataCode: '93f5f1c7-8638-40a4-a596-8b5831599209',
                result: false,
                strataId: '93f5f1c7-8638-40a4-a596-8b5831599209'
              },
              {
                strataCode: '5baf37c7-8887-4576-837e-ea20a8938282',
                result: false,
                strataId: '5baf37c7-8887-4576-837e-ea20a8938282'
              }
            ]
          }
        ]
      });

      builder.addPatientResults({
        patientId: patient2Id,
        detailedResults: [
          {
            groupId: 'group-1',
            stratifierResults: [
              {
                strataCode: '125b3d95-2d00-455f-8a6e-d53614a2a50e',
                result: false,
                strataId: '125b3d95-2d00-455f-8a6e-d53614a2a50e'
              },
              {
                strataCode: 'c06647b9-e134-4189-858d-80cee23c0f8d',
                result: false,
                strataId: 'c06647b9-e134-4189-858d-80cee23c0f8d'
              }
            ]
          }
        ]
      });
    });

    test('should generate a summary MeasureReport whose stratifierResults only contain one population in the stratum', () => {
      const { report } = builder;
      expect(report).toBeDefined();
      expect(report.group?.[0].stratifier?.[0].stratum?.[0].population?.length).toEqual(1);
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

describe('Measure with specified group CV scoring', () => {
  let measureReports: fhir4.MeasureReport[];
  beforeAll(() => {
    measureReports = MeasureReportBuilder.buildMeasureReports(
      buildTestMeasureBundle(cvMeasureScoringOnGroup),
      cvExecutionResults,
      calculationOptions
    );
  });

  test('should generate MeasureReport', () => {
    expect(measureReports).toBeDefined();
    expect(measureReports).toHaveLength(1);
  });

  test('should include CV-specific properties despite ratio scoring on measure', () => {
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

describe('MeasureReportBuilder Class', () => {
  test('should properly recognize individual propery', () => {
    const builder = new MeasureReportBuilder(simpleMeasure, {
      reportType: 'individual'
    });

    expect(builder.isIndividual).toBe(true);
  });

  test('should properly recognize summary propery', () => {
    const builder = new MeasureReportBuilder(simpleMeasure, {
      reportType: 'summary'
    });

    expect(builder.isIndividual).toBe(false);
  });

  test('should persist calculateSDEs for individual reports', () => {
    const builder = new MeasureReportBuilder(simpleMeasure, {
      reportType: 'individual',
      calculateSDEs: true
    });

    expect(builder.calculateSDEs).toBe(true);
  });

  test('should not calculateSDEs for summary reports', () => {
    const builder = new MeasureReportBuilder(simpleMeasure, {
      reportType: 'summary',
      calculateSDEs: true
    });

    expect(builder.calculateSDEs).toBe(false);
  });

  test('should add basic individual metadata', () => {
    const builder = new MeasureReportBuilder(simpleMeasure, {
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
    const builder = new MeasureReportBuilder(simpleMeasure, {
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
    const builder = new MeasureReportBuilder(simpleMeasure, {
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
    const builder = new MeasureReportBuilder(simpleMeasure, {
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
