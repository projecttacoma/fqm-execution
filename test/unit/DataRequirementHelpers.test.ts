import * as DataRequirementHelpers from '../../src/helpers/DataRequirementHelpers';
import {
  AndFilter,
  EqualsFilter,
  DuringFilter,
  InFilter,
  NotNullFilter,
  IsNullFilter,
  UnknownFilter,
  ValueFilter
} from '../../src/types/QueryFilterTypes';

import { CalculationOptions, DataTypeQuery } from '../../src/types/Calculator';
import { GracefulError } from '../../src/types/errors/GracefulError';
import { DataRequirement } from 'fhir/r4';
import { DateTime, Interval } from 'cql-execution';
import moment from 'moment';

describe('DataRequirementHelpers', () => {
  describe('Flatten Filters', () => {
    test('should pass through standard equals filter', () => {
      const equalsFilter: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'attr-0',
        value: 'value-0'
      };

      const flattenedFilters = DataRequirementHelpers.flattenFilters(equalsFilter);

      expect(flattenedFilters).toHaveLength(1);
      expect(flattenedFilters[0]).toEqual(equalsFilter);
    });

    test('should flatten AND filters', () => {
      const equalsFilter0: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'attr-0',
        value: 'value-0'
      };

      const equalsFilter1: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'attr-1',
        value: 'value-1'
      };

      const duringFilter: DuringFilter = {
        type: 'during',
        alias: 'R',
        attribute: 'attr-3',
        valuePeriod: {
          start: '2021-01-01',
          end: '2021-12-01'
        }
      };

      const filter: AndFilter = {
        type: 'and',
        children: [equalsFilter0, duringFilter, equalsFilter1]
      };

      const flattenedFilters = DataRequirementHelpers.flattenFilters(filter);

      expect(flattenedFilters).toHaveLength(3);
      expect(flattenedFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ...equalsFilter0 }),
          expect.objectContaining({ ...equalsFilter1 }),
          expect.objectContaining({ ...duringFilter })
        ])
      );
    });
  });

  describe('Code Filters', () => {
    test('should return null for non equals or codeFilter', () => {
      const fakeFilter: any = {
        type: 'and'
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(fakeFilter)).toBeNull();
    });

    test('should return null for equals filter on non-string', () => {
      const ef: EqualsFilter = {
        type: 'equals',
        value: 10,
        attribute: 'attr-1',
        alias: 'R'
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(ef)).toBeNull();
    });
    test('equals filter should pull off attribute', () => {
      const ef: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'attr-1',
        value: 'value-1'
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'attr-1',
        code: [
          {
            code: 'value-1'
          }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(ef)).toEqual(expectedCodeFilter);
    });

    test('IN filter should pull off all of valueList', () => {
      const inf: InFilter = {
        type: 'in',
        alias: 'R',
        attribute: 'attr-1',
        valueList: ['value-1', 'value-2', 'value-3']
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'attr-1',
        code: [
          {
            code: 'value-1'
          },
          {
            code: 'value-2'
          },
          {
            code: 'value-3'
          }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(inf)).toEqual(expectedCodeFilter);
    });

    test('IN filter with non-string list should be ignored', () => {
      const inf: InFilter = {
        type: 'in',
        alias: 'R',
        attribute: 'attr-1',
        valueList: [10]
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(inf)).toBeNull();
    });

    test('IN filter should pass through valueCodingList', () => {
      const inf: InFilter = {
        type: 'in',
        alias: 'R',
        attribute: 'attr-1',
        valueCodingList: [
          {
            system: 'system-1',
            code: 'code-1',
            display: 'display-code-1'
          }
        ]
      };
      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'attr-1',
        code: [
          {
            system: 'system-1',
            code: 'code-1',
            display: 'display-code-1'
          }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedCodeFilter(inf)).toEqual(expectedCodeFilter);
    });

    test('Equals filter should not add system attribute to output object for inappropriate dataType', () => {
      const ef: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'status',
        value: 'value1'
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'status',
        code: [
          {
            code: 'value1'
          }
        ]
      };
      expect(DataRequirementHelpers.generateDetailedCodeFilter(ef, 'inappropriateDataType')).toEqual(
        expectedCodeFilter
      );
    });

    test('Equals filter should add system attribute to output object', () => {
      const ef: EqualsFilter = {
        type: 'equals',
        alias: 'R',
        attribute: 'status',
        value: 'value1'
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'status',
        code: [
          {
            code: 'value1',
            system: 'http://hl7.org/fhir/encounter-status'
          }
        ]
      };
      expect(DataRequirementHelpers.generateDetailedCodeFilter(ef, 'Encounter')).toEqual(expectedCodeFilter);
    });

    test('IN filter should add system attribute to output object', () => {
      const inf: InFilter = {
        type: 'in',
        alias: 'R',
        attribute: 'status',
        valueList: ['value-1', 'value-2', 'value-3']
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'status',
        code: [
          {
            code: 'value-1',
            system: 'http://hl7.org/fhir/encounter-status'
          },
          {
            code: 'value-2',
            system: 'http://hl7.org/fhir/encounter-status'
          },
          {
            code: 'value-3',
            system: 'http://hl7.org/fhir/encounter-status'
          }
        ]
      };
      expect(DataRequirementHelpers.generateDetailedCodeFilter(inf, 'Encounter')).toEqual(expectedCodeFilter);
    });
    test('In filter should not add system attribute to output object for inappropriate dataType', () => {
      const inf: InFilter = {
        type: 'in',
        alias: 'R',
        attribute: 'status',
        valueList: ['value1']
      };

      const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
        path: 'status',
        code: [
          {
            code: 'value1'
          }
        ]
      };
      expect(DataRequirementHelpers.generateDetailedCodeFilter(inf, 'inappropriateDataType')).toEqual(
        expectedCodeFilter
      );
    });
  });

  describe('Date Filters', () => {
    test('should pass through date filter', () => {
      const df: DuringFilter = {
        type: 'during',
        alias: 'R',
        attribute: 'attr-1',
        valuePeriod: {
          start: '2021-01-01',
          end: '2021-12-31'
        }
      };

      const expectedDateFilter: fhir4.DataRequirementDateFilter = {
        path: 'attr-1',
        valuePeriod: {
          start: '2021-01-01',
          end: '2021-12-31'
        }
      };

      expect(DataRequirementHelpers.generateDetailedDateFilter(df)).toEqual(expectedDateFilter);
    });
  });

  describe('Value Filters', () => {
    test('not null filter should create value filter', () => {
      const nnf: NotNullFilter = {
        type: 'notnull',
        alias: 'R',
        attribute: 'attr-1'
      };

      const expectedDetailFilter: fhir4.Extension = {
        url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
        extension: [
          { url: 'path', valueString: 'attr-1' },
          { url: 'comparator', valueCode: 'eq' },
          { url: 'value', valueString: 'not null' }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedValueFilter(nnf)).toEqual(expectedDetailFilter);
    });
    test('is null filter should create value filter', () => {
      const inf: IsNullFilter = {
        type: 'isnull',
        alias: 'R',
        attribute: 'attr-1'
      };

      const expectedDetailFilter: fhir4.Extension = {
        url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
        extension: [
          { url: 'path', valueString: 'attr-1' },
          { url: 'comparator', valueCode: 'eq' },
          { url: 'value', valueString: 'null' }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedValueFilter(inf)).toEqual(expectedDetailFilter);
    });
    test('filter of type value should create value filter', () => {
      const valueFilter: ValueFilter = {
        type: 'value',
        attribute: 'attr-1',
        comparator: 'gt',
        valueBoolean: true
      };
      const expectedDetailFilter: fhir4.Extension = {
        url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
        extension: [
          { url: 'path', valueString: 'attr-1' },
          { url: 'comparator', valueCode: 'gt' },
          { url: 'value', valueBoolean: true }
        ]
      };
      expect(DataRequirementHelpers.generateDetailedValueFilter(valueFilter)).toEqual(expectedDetailFilter);
    });

    test('unknown filter should create a null for filter creation', () => {
      const uf: UnknownFilter = {
        type: 'unknown',
        alias: 'R',
        attribute: 'attr-1'
      };
      const ge: GracefulError = { message: 'Detailed value filter is not yet supported for filter type unknown' };

      expect(DataRequirementHelpers.generateDetailedValueFilter(uf)).toEqual(ge);
    });
  });

  describe('generateDataRequirement', () => {
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

  describe('codeLookup', () => {
    test('dataType is invalid', () => {
      expect(DataRequirementHelpers.codeLookup('invalid', 'invalid')).toBeNull();
    });
    test('retireves correct system url for dataType: MedicationRequest and attribute: status', () => {
      expect(DataRequirementHelpers.codeLookup('MedicationRequest', 'status')).toEqual(
        'http://hl7.org/fhir/CodeSystem/medicationrequest-status'
      );
    });
    test('retireves correct system url for dataType: MedicationRequest and attribute: intent', () => {
      expect(DataRequirementHelpers.codeLookup('MedicationRequest', 'intent')).toEqual(
        'http://hl7.org/fhir/CodeSystem/medicationrequest-intent'
      );
    });
    test('retireves correct system url for dataType: MedicationRequest and attribute: priority', () => {
      expect(DataRequirementHelpers.codeLookup('MedicationRequest', 'priority')).toEqual(
        'http://hl7.org/fhir/request-priority'
      );
    });
    test('retireves correct system url for dataType: MedicationRequest and invalid attribute', () => {
      expect(DataRequirementHelpers.codeLookup('MedicationRequest', 'nonsense')).toBeNull();
    });
    test('retireves correct system url for dataType: Encounter and attribute: status', () => {
      expect(DataRequirementHelpers.codeLookup('Encounter', 'status')).toEqual('http://hl7.org/fhir/encounter-status');
    });
    test('retireves correct system url for dataType: Encounter and invalid attribute', () => {
      expect(DataRequirementHelpers.codeLookup('Encounter', 'nonsense')).toBeNull();
    });

    test('retrieves correct system url when dataType is Observation and attribute is status', () => {
      expect(DataRequirementHelpers.codeLookup('Observation', 'status')).toEqual(
        'http://hl7.org/fhir/observation-status'
      );
    });
    test('retrieves correct system url when dataType is Observation and attribute is invalid', () => {
      expect(DataRequirementHelpers.codeLookup('Observation', 'nonsense')).toBeNull();
    });
    test('retrieves correct system url when dataType is Procedure and attribute is status', () => {
      expect(DataRequirementHelpers.codeLookup('Procedure', 'status')).toEqual('http://hl7.org/fhir/event-status');
    });
    test('retrieves correct system url when dataType is Procedure and attribute is invalid', () => {
      expect(DataRequirementHelpers.codeLookup('Procedure', 'nonsense')).toBeNull();
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
});
