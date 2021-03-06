/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { R4 } from '@ahryman40k/ts-fhir-types';
import MeasureReportBuilder from '../src/MeasureReportBuilder';
import { getJSONFixture } from './helpers/testHelpers';
import { ExecutionResult, CalculationOptions } from '../src/types/Calculator';
import { PopulationType } from '../src/types/Enums';

const patient1 = getJSONFixture(
  'EXM130-8.0.000/EXM130-8.0.000-patients/numerator/Adeline686_Prohaska837_ee009b12-7dbe-4610-abc4-5f92ad5b2804.json'
);

const patient2 = getJSONFixture('EXM111-9.1.000/Armando772_Almanza534_08fc9439-b7ff-4309-b409-4d143388594c.json');

// ids from fixture patients
const patient1Id = '3413754c-73f0-4559-9f67-df8e593ce7e1';
const patient2Id = '08fc9439-b7ff-4309-b409-4d143388594c';

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as R4.IMeasure;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as R4.IMeasure;

const simpleMeasureBundle: R4.IBundle = {
  resourceType: 'Bundle',
  type: R4.BundleTypeKind._collection,
  entry: [
    {
      resource: simpleMeasure
    }
  ]
};

const cvMeasureBundle: R4.IBundle = {
  resourceType: 'Bundle',
  type: R4.BundleTypeKind._collection,
  entry: [
    {
      resource: cvMeasure
    }
  ]
};

const executionResults: ExecutionResult[] = [
  {
    patientId: patient1Id,
    detailedResults: [
      {
        groupId: 'group-1',
        statementResults: [],
        populationResults: [
          {
            populationType: PopulationType.NUMER,
            result: false
          },
          {
            populationType: PopulationType.DENOM,
            result: true
          },
          {
            populationType: PopulationType.IPP,
            result: true
          },
          {
            populationType: PopulationType.DENEX,
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

const cvExecutionResults: ExecutionResult[] = [
  {
    patientId: patient2Id,
    detailedResults: [
      {
        groupId: 'group-1',
        statementResults: [],
        populationResults: [
          {
            populationType: PopulationType.MSRPOPL,
            result: false
          },
          {
            populationType: PopulationType.MSRPOPLEX,
            result: true
          },
          {
            populationType: PopulationType.IPP,
            result: true
          },
          {
            populationType: PopulationType.OBSERV,
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
    let measureReports: R4.IMeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        simpleMeasureBundle,
        [patient1],
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

      expect(mr.status).toEqual(R4.MeasureReportStatusKind._complete);
      expect(mr.type).toEqual(R4.MeasureReportTypeKind._individual);

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

      const sde = mr.contained?.[0] as R4.IObservation;

      expect(sde.status).toEqual(R4.ObservationStatusKind._final);
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

  describe('CV stratifier Measure Report', () => {
    let measureReports: R4.IMeasureReport[];
    beforeAll(() => {
      measureReports = MeasureReportBuilder.buildMeasureReports(
        cvMeasureBundle,
        [patient2],
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
  let measureBundle: R4.IBundle;
  let patientResource: R4.IPatient;
  beforeAll(() => {
    measureBundle = {
      resourceType: 'Bundle',
      entry: [{ resource: simpleMeasure }]
    };

    patientResource = patient1.entry[0].resource;
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

    expect(report.status).toEqual(R4.MeasureReportStatusKind._complete);
    expect(report.type).toEqual(R4.MeasureReportTypeKind._individual);

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

    expect(report.status).toEqual(R4.MeasureReportStatusKind._complete);
    expect(report.type).toEqual(R4.MeasureReportTypeKind._summary);

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
      builder.addPatientResults(patientResource, {
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

    builder.addPatientResults(patientResource, {
      patientId: patient1Id,
      detailedResults: []
    });

    const report = builder.getReport();

    expect(report.subject).toEqual({
      reference: `Patient/${patient1Id}`
    });
  });
});
