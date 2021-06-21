import * as DataRequirementHelpers from '../src/helpers/DataRequirementHelpers';
import { AndFilter, EqualsFilter, DuringFilter, InFilter, NotNullFilter } from '../src/types/QueryFilterTypes';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { DataTypeQuery } from '../src/types/Calculator';

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

      const expectedCodeFilter: R4.IDataRequirement_CodeFilter = {
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

      const expectedCodeFilter: R4.IDataRequirement_CodeFilter = {
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

      const expectedCodeFilter: R4.IDataRequirement_CodeFilter = {
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

      const expectedDateFilter: R4.IDataRequirement_DateFilter = {
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

      const expectedDetailFilter: R4.IExtension = {
        url: 'http://example.com/dr-value',
        extension: [
          { url: 'dr-value-attribute', valueString: 'attr-1' },
          { url: 'dr-value-filter', valueString: 'not null' }
        ]
      };

      expect(DataRequirementHelpers.generateDetailedValueFilter(nnf)).toEqual(expectedDetailFilter);
    });
  });

  describe('generateDataRequirement', () => {
    test('can create DataRequirement with valueSet filter', () => {
      const dtq: DataTypeQuery = {
        dataType: 'fhir_type',
        path: 'a.path',
        valueSet: 'http://example.com/valueset'
      };

      const expectedDataReq: R4.IDataRequirement = {
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

      const expectedDataReq: R4.IDataRequirement = {
        type: dtq.dataType,
        codeFilter: [
          {
            path: dtq.path,
            code: [dtq.code as R4.ICoding]
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

      const expectedDataReq: R4.IDataRequirement = {
        type: dtq.dataType
      };

      expect(DataRequirementHelpers.generateDataRequirement(dtq)).toEqual(expectedDataReq);
    });
  });
});
