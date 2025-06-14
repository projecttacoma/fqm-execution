/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { PatientSource } from 'cql-exec-fhir';
import MeasureReportBuilder from '../../src/calculation/MeasureReportBuilder';
import { getJSONFixture } from './helpers/testHelpers';
import { ExecutionResult, DetailedPopulationGroupResult } from '../../src/types/Calculator';
import { PopulationType } from '../../src/types/Enums';

const patient1 = getJSONFixture(
  'EXM130-8.0.000/EXM130-8.0.000-patients/numerator/Adeline686_Prohaska837_ee009b12-7dbe-4610-abc4-5f92ad5b2804.json'
);
const patientSource = PatientSource.FHIRv401();
patientSource.loadBundles([patient1]);
// ids from fixture patients
const patient1Id = '3413754c-73f0-4559-9f67-df8e593ce7e1';

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as fhir4.Measure;

const executionResultsTemplate: ExecutionResult<DetailedPopulationGroupResult>[] = [
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

describe('MeasureReportBuilder Class', () => {
  let builder: MeasureReportBuilder<DetailedPopulationGroupResult>;
  let executionResult: ExecutionResult<DetailedPopulationGroupResult>;
  beforeEach(() => {
    builder = new MeasureReportBuilder(simpleMeasure, {
      reportType: 'individual',
      calculateSDEs: true,
      calculateRAVs: true
    });
    executionResult = JSON.parse(JSON.stringify(executionResultsTemplate[0]));
  });

  describe('addSDE', () => {
    test('Should allow for SDE Results to be single CQL system code', () => {
      executionResult.supplementalData = [
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
      ];
      executionResult.riskAdjustment = [];
      builder.addPatientResults(executionResult);
      const report = builder.getReport();

      expect(report.contained as fhir4.FhirResource[]).toHaveLength(1);

      const sdeObserv = (report.contained as fhir4.FhirResource[])[0] as fhir4.Observation;
      expect(sdeObserv.code.text).toBe('sde-code');
      expect(sdeObserv.valueCodeableConcept).toEqual({
        coding: [
          {
            system: 'http://example.com',
            code: 'example',
            display: 'Example'
          }
        ]
      });
    });

    test('Should allow for SDE Results to be list of CQL system code', () => {
      executionResult.supplementalData = [
        {
          name: 'sde-code',
          rawResult: [
            {
              isCode: true,
              code: 'example',
              system: 'http://example.com',
              display: 'Example'
            }
          ],
          id: 'sde-id',
          criteriaExpression: 'SDE',
          usage: 'supplemental-data'
        }
      ];
      executionResult.riskAdjustment = [];
      builder.addPatientResults(executionResult);
      const report = builder.getReport();

      expect(report.contained as fhir4.FhirResource[]).toHaveLength(1);

      const sdeObserv = (report.contained as fhir4.FhirResource[])[0] as fhir4.Observation;
      expect(sdeObserv.code.text).toBe('sde-code');
      expect(sdeObserv.valueCodeableConcept).toEqual({
        coding: [
          {
            system: 'http://example.com',
            code: 'example',
            display: 'Example'
          }
        ]
      });
    });

    test('Should allow for SDE Results to be list of FHIR coding', () => {
      executionResult.supplementalData = [
        {
          name: 'sde-code',
          rawResult: [
            {
              system: {
                value: 'urn:oid:2.16.840.1.113883.6.238'
              },
              code: {
                value: '2028-9'
              },
              display: {
                value: 'Asian'
              }
            }
          ],
          id: 'sde-id',
          criteriaExpression: 'SDE',
          usage: 'supplemental-data'
        }
      ];
      executionResult.riskAdjustment = [];
      builder.addPatientResults(executionResult);
      const report = builder.getReport();

      expect(report.contained as fhir4.FhirResource[]).toHaveLength(1);

      const sdeObserv = (report.contained as fhir4.FhirResource[])[0] as fhir4.Observation;
      expect(sdeObserv.code.text).toBe('sde-code');
      expect(sdeObserv.valueCodeableConcept).toEqual({
        coding: [
          {
            system: 'urn:oid:2.16.840.1.113883.6.238',
            code: '2028-9',
            display: 'Asian'
          }
        ]
      });
    });

    test('Should create observation only if SDE and SDE raw results are defined', () => {
      executionResult.supplementalData = [
        {
          name: 'sde-code',
          rawResult: undefined,
          id: 'sde-id',
          criteriaExpression: 'SDE',
          usage: 'supplemental-data'
        }
      ];
      executionResult.riskAdjustment = [];
      builder.addPatientResults(executionResult);
      const report = builder.getReport();

      expect(report.contained as fhir4.FhirResource[]).toHaveLength(0);
    });

    test('Should allow for RAV supplemental data Results to be list of FHIR coding', () => {
      executionResult.riskAdjustment = [
        {
          name: 'rav-code',
          rawResult: [
            {
              system: {
                value: 'urn:oid:2.16.840.1.113883.6.238'
              },
              code: {
                value: '2028-9'
              },
              display: {
                value: 'Asian'
              }
            }
          ],
          id: 'rav-id',
          criteriaExpression: 'RAV',
          usage: 'risk-adjustment-factor'
        }
      ];
      executionResult.supplementalData = [];
      builder.addPatientResults(executionResult);
      const report = builder.getReport();

      expect(report.contained as fhir4.FhirResource[]).toHaveLength(1);

      const sdeObserv = (report.contained as fhir4.FhirResource[])[0] as fhir4.Observation;
      expect(sdeObserv.code.text).toBe('rav-code');
      expect(sdeObserv.valueCodeableConcept).toEqual({
        coding: [
          {
            system: 'urn:oid:2.16.840.1.113883.6.238',
            code: '2028-9',
            display: 'Asian'
          }
        ]
      });
    });
  });
});
