import * as DataRequirementHelpers from '../../src/helpers/DataRequirementHelpers';

import { CalculationOptions, DataTypeQuery } from '../../src/types/Calculator';
import { DataRequirement } from 'fhir/r4';
import { DateTime, Interval } from 'cql-execution';
import moment from 'moment';
import { ELM, ELMAliasedQuerySource, ELMQuery } from '../../src';

describe('DataRequirementHelpers', () => {
  describe('generateDataRequirement', () => {
    test('can create DataRequirement with profile', () => {
      const dtq: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'a.path',
        templateId: 'http://hl7.org/fhir/StructureDefinition/fhir_type'
      };

      const expectedDataReq: fhir4.DataRequirement = {
        type: dtq.dataType,
        profile: ['http://hl7.org/fhir/StructureDefinition/fhir_type']
      };

      expect(DataRequirementHelpers.generateDataRequirement(dtq)).toEqual(expectedDataReq);
    });

    test('can create DataRequirement with valueSet filter', () => {
      const dtq: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'a.path',
        valueSet: 'http://example.com/valueset'
      };

      const expectedDataReq: fhir4.DataRequirement = {
        type: dtq.dataType,
        codeFilter: [
          {
            path: dtq.path,
            valueSet: dtq.valueSet
          }
        ]
      };

      expect(DataRequirementHelpers.generateDataRequirement(dtq)).toEqual(expectedDataReq);
    });

    test('can create DataRequirement with code filter', () => {
      const dtq: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'a.path',
        code: { code: 'a_code', system: 'http://example.com/system' }
      };

      const expectedDataReq: fhir4.DataRequirement = {
        type: dtq.dataType,
        codeFilter: [
          {
            path: dtq.path,
            code: [dtq.code as fhir4.Coding]
          }
        ]
      };

      expect(DataRequirementHelpers.generateDataRequirement(dtq)).toEqual(expectedDataReq);
    });

    test('can create DataRequirement with out vs or code filters', () => {
      const dtq: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'a.path'
      };

      const expectedDataReq: fhir4.DataRequirement = {
        type: dtq.dataType
      };

      expect(DataRequirementHelpers.generateDataRequirement(dtq)).toEqual(expectedDataReq);
    });
  });

  describe('addFhirQueryPatternToDataRequirements', () => {
    test('add fhirQueryPattern extension with CodeFilter codes and valueSets', () => {
      const testDataReq: DataRequirement = {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ]
      };

      DataRequirementHelpers.addFhirQueryPatternToDataRequirements(testDataReq);
      // Procedure should have 2 extensions (there are 2 ways for Procedure to reference Patient)
      expect(testDataReq.extension?.length).toEqual(2);
      if (testDataReq.extension) {
        expect(testDataReq.extension[0].valueString).toEqual(
          '/Procedure?code:in=http://example.com&status=completed&patient=Patient/{{context.patientId}}'
        );
        expect(testDataReq.extension[1].valueString).toEqual(
          '/Procedure?code:in=http://example.com&status=completed&performer=Patient/{{context.patientId}}'
        );
      }
    });

    test('add fhirQueryPattern extension with CodeFilter codes and valueSets, and date filters', () => {
      const testDataReqWithDateFilter: DataRequirement = {
        type: 'ServiceRequest',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://example.com'
              }
            ]
          }
        ],
        dateFilter: [
          {
            path: 'authoredOn.end',
            valuePeriod: {
              start: '2019-01-01',
              end: '2019-12-31'
            }
          },
          {
            path: 'occurrence.start',
            valuePeriod: {
              start: '2019-01-01',
              end: '2019-12-31'
            }
          }
        ]
      };
      DataRequirementHelpers.addFhirQueryPatternToDataRequirements(testDataReqWithDateFilter);
      expect(testDataReqWithDateFilter.extension?.length).toEqual(2);
      expect(testDataReqWithDateFilter.extension?.[0].valueString).toEqual(
        '/ServiceRequest?code:in=http://example.com&status=completed&authored=ge2019-01-01&authored=le2019-12-31&occurrence=ge2019-01-01&occurrence=le2019-12-31&subject=Patient/{{context.patientId}}'
      );
      expect(testDataReqWithDateFilter.extension?.[1].valueString).toEqual(
        '/ServiceRequest?code:in=http://example.com&status=completed&authored=ge2019-01-01&authored=le2019-12-31&occurrence=ge2019-01-01&occurrence=le2019-12-31&performer=Patient/{{context.patientId}}'
      );
    });

    test('add fhirQueryPattern extension with dateTime and duration date filters', () => {
      const testDataReqWithDateFilter: DataRequirement = {
        type: 'ServiceRequest',
        dateFilter: [
          {
            path: 'authoredOn',
            valueDateTime: '2019-01-01'
          },
          {
            path: 'occurrence', // Note: duration is probably not a practical measure of occurrence here
            valueDuration: {
              unit: 'days',
              value: 10
            }
          }
        ]
      };
      DataRequirementHelpers.addFhirQueryPatternToDataRequirements(testDataReqWithDateFilter);
      expect(testDataReqWithDateFilter.extension?.length).toEqual(2);
      expect(testDataReqWithDateFilter.extension?.[0].valueString).toEqual(
        '/ServiceRequest?authored=2019-01-01&occurrence=10&subject=Patient/{{context.patientId}}'
      );
      expect(testDataReqWithDateFilter.extension?.[1].valueString).toEqual(
        '/ServiceRequest?authored=2019-01-01&occurrence=10&performer=Patient/{{context.patientId}}'
      );
    });

    test('add fhirQueryPattern extension with incorrect path date filter ignores date filter', () => {
      const testDataReqWithDateFilter: DataRequirement = {
        type: 'Procedure',
        dateFilter: [
          {
            path: 'wrong.end',
            valuePeriod: {
              start: '2019-01-01',
              end: '2019-12-31'
            }
          }
        ]
      };
      DataRequirementHelpers.addFhirQueryPatternToDataRequirements(testDataReqWithDateFilter);
      expect(testDataReqWithDateFilter.extension?.length).toEqual(2);
      if (testDataReqWithDateFilter.extension) {
        expect(testDataReqWithDateFilter.extension[0].valueString).toEqual(
          '/Procedure?patient=Patient/{{context.patientId}}'
        );
        expect(testDataReqWithDateFilter.extension[1].valueString).toEqual(
          '/Procedure?performer=Patient/{{context.patientId}}'
        );
      }
    });

    test('add fhirQueryPattern extension to data requirement of type Coverage with CodeFilter codes and valueSets', () => {
      const testCoverageDataReq: DataRequirement = {
        type: 'Coverage',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ]
      };
      DataRequirementHelpers.addFhirQueryPatternToDataRequirements(testCoverageDataReq);
      expect(testCoverageDataReq.extension?.length).toEqual(4);
      if (testCoverageDataReq.extension) {
        expect(testCoverageDataReq.extension[0].valueString).toEqual(
          '/Coverage?code:in=http://example.com&status=completed&policy-holder=Patient/{{context.patientId}}'
        );
        expect(testCoverageDataReq.extension[1].valueString).toEqual(
          '/Coverage?code:in=http://example.com&status=completed&subscriber=Patient/{{context.patientId}}'
        );
        expect(testCoverageDataReq.extension[2].valueString).toEqual(
          '/Coverage?code:in=http://example.com&status=completed&beneficiary=Patient/{{context.patientId}}'
        );
        expect(testCoverageDataReq.extension[3].valueString).toEqual(
          '/Coverage?code:in=http://example.com&status=completed&payor=Patient/{{context.patientId}}'
        );
      }
    });
  });

  describe('extractDataRequirementsMeasurementPeriod', () => {
    test('returns an empty object when no measurement info provided', () => {
      expect(DataRequirementHelpers.extractDataRequirementsMeasurementPeriod({}, {})).toEqual({});
    });

    test('uses measurement period from options when both provided', () => {
      const start = '2019-01-01';
      const end = '2020-01-01';
      const startCql = DateTime.fromJSDate(moment.utc(start, 'YYYYMDDHHmm').toDate(), 0);
      const endCql = DateTime.fromJSDate(moment.utc(end, 'YYYYMDDHHmm').toDate(), 0);
      const options: CalculationOptions = { measurementPeriodStart: start, measurementPeriodEnd: end };
      const mp: fhir4.Period = { start: '2000-01-01', end: '2001-01-01' };

      expect(DataRequirementHelpers.extractDataRequirementsMeasurementPeriod(options, mp)).toEqual({
        'Measurement Period': new Interval(startCql, endCql)
      });
    });
  });

  test('uses measurement period from Measure when options not provided', () => {
    const start = '2019-01-01';
    const end = '2020-01-01';
    const startCql = DateTime.fromJSDate(moment.utc(start, 'YYYYMDDHHmm').toDate(), 0);
    const endCql = DateTime.fromJSDate(moment.utc(end, 'YYYYMDDHHmm').toDate(), 0);
    const mp: fhir4.Period = { start, end };

    expect(DataRequirementHelpers.extractDataRequirementsMeasurementPeriod({}, mp)).toEqual({
      'Measurement Period': new Interval(startCql, endCql)
    });
  });

  describe('createIntervalFromEndpoints', () => {
    test('returns interval from start to end if both provided', () => {
      const start = '2019-01-01';
      const end = '2022-01-01';
      const startCql = DateTime.fromJSDate(moment.utc(start, 'YYYYMDDHHmm').toDate(), 0);
      const endCql = DateTime.fromJSDate(moment.utc(end, 'YYYYMDDHHmm').toDate(), 0);

      expect(DataRequirementHelpers.createIntervalFromEndpoints(start, end)).toEqual(new Interval(startCql, endCql));
    });

    test('returns interval from start with duration 1 year if end not provided', () => {
      const start = '2019-01-01';
      const expectedEnd = '2020-01-01';
      const startCql = DateTime.fromJSDate(moment.utc(start, 'YYYYMDDHHmm').toDate(), 0);
      const endCql = DateTime.fromJSDate(moment.utc(expectedEnd, 'YYYYMDDHHmm').toDate(), 0);

      expect(DataRequirementHelpers.createIntervalFromEndpoints(start, undefined)).toEqual(
        new Interval(startCql, endCql)
      );
    });

    test('returns interval up to end with duration 1 year if start not provided', () => {
      const expectedStart = '2019-01-01';
      const end = '2020-01-01';
      const startCql = DateTime.fromJSDate(moment.utc(expectedStart, 'YYYYMDDHHmm').toDate(), 0);
      const endCql = DateTime.fromJSDate(moment.utc(end, 'YYYYMDDHHmm').toDate(), 0);

      expect(DataRequirementHelpers.createIntervalFromEndpoints(undefined, end)).toEqual(
        new Interval(startCql, endCql)
      );
    });
  });
  describe('findPropertyExpressions', () => {
    test('find properties in array', () => {
      const expression = {
        type: 'anyType',
        localId: '0',
        anyField: [
          {
            localId: '1',
            type: 'Property'
          },
          {
            localId: '2',
            type: 'Other'
          },
          {
            localId: '3',
            type: 'Property'
          }
        ]
      };
      const elm: ELM = {
        library: {
          identifier: {
            id: 'libraryId',
            version: 'libraryVersion'
          },
          schemaIdentifier: {
            id: 'schemaId',
            version: 'schemaVersion'
          },
          usings: {},
          statements: {
            def: [
              {
                name: 'testStatement',
                context: 'Patient',
                expression: expression
              }
            ]
          }
        }
      };
      const propertyExpressions = DataRequirementHelpers.findPropertyExpressions(expression, [], elm, [elm]);
      const expectedPropertyExpressions = [
        {
          property: {
            localId: '1',
            type: 'Property'
          },
          stack: [
            {
              type: 'anyType',
              localId: '0',
              libraryName: 'libraryId'
            }
          ]
        },
        {
          property: {
            localId: '3',
            type: 'Property'
          },
          stack: [
            {
              type: 'anyType',
              localId: '0',
              libraryName: 'libraryId'
            }
          ]
        }
      ];

      expect(propertyExpressions).toEqual(expectedPropertyExpressions);
    });

    test('find properties in object', () => {
      const expression = {
        type: 'anyType',
        localId: '0',
        anyField1: {
          localId: '1',
          type: 'Property'
        },
        anyField2: {
          localId: '2',
          type: 'Other'
        },
        anyField3: {
          localId: '3',
          type: 'Property'
        }
      };
      const elm: ELM = {
        library: {
          identifier: {
            id: 'libraryId',
            version: 'libraryVersion'
          },
          schemaIdentifier: {
            id: 'schemaId',
            version: 'schemaVersion'
          },
          usings: {},
          statements: {
            def: [
              {
                name: 'testStatement',
                context: 'Patient',
                expression: expression
              }
            ]
          }
        }
      };
      const propertyExpressions = DataRequirementHelpers.findPropertyExpressions(expression, [], elm, [elm]);
      const expectedPropertyExpressions = [
        {
          property: {
            localId: '1',
            type: 'Property'
          },
          stack: [
            {
              type: 'anyType',
              localId: '0',
              libraryName: 'libraryId'
            }
          ]
        },
        {
          property: {
            localId: '3',
            type: 'Property'
          },
          stack: [
            {
              type: 'anyType',
              localId: '0',
              libraryName: 'libraryId'
            }
          ]
        }
      ];

      expect(propertyExpressions).toEqual(expectedPropertyExpressions);
    });
  });

  describe('findRetrieveMatches', () => {
    test('simple retrieve match', () => {
      const stack = [
        {
          type: 'Query',
          localId: '0',
          libraryName: 'libraryId'
        }
      ];
      const retrieve: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'status',
        templateId: 'http://hl7.org/fhir/StructureDefinition/fhir_type',
        expressionStack: stack,
        retrieveLocalId: '1'
      };
      const property: DataRequirementHelpers.PropertyTracker = {
        property: {
          localId: '2',
          type: 'Property',
          path: 'status',
          scope: 'TestScope'
        },
        stack: stack
      };
      const expression: ELMQuery = {
        type: 'Query',
        localId: '0',
        source: [
          {
            alias: 'TestScope',
            expression: {
              type: 'Retrieve',
              localId: '1'
            }
          }
        ],
        relationship: [],
        where: property.property
      };
      const elm: ELM = {
        library: {
          identifier: {
            id: 'libraryId',
            version: 'libraryVersion'
          },
          schemaIdentifier: {
            id: 'schemaId',
            version: 'schemaVersion'
          },
          usings: {},
          statements: {
            def: [
              {
                name: 'testStatement',
                context: 'Patient',
                expression: expression
              }
            ]
          }
        }
      };
      const expectedRetrieveMatches = [retrieve];
      const retrieveMatches = DataRequirementHelpers.findRetrieveMatches(property, [retrieve], [elm]);
      expect(retrieveMatches).toEqual(expectedRetrieveMatches);
    });
  });

  describe('findSourceWithScope', () => {
    test('simple source', () => {
      const source: ELMAliasedQuerySource = {
        expression: {
          type: 'AnyType',
          localId: '1'
        },
        alias: 'testScope'
      };
      const expression: ELMQuery = {
        type: 'Query',
        localId: '0',
        relationship: [],
        source: [source]
      };

      expect(DataRequirementHelpers.findSourcewithScope(expression, 'testScope')).toEqual(source);
    });
  });
});
