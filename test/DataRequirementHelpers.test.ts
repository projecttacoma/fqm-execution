import * as DataRequirementHelpers from '../src/DataRequirementHelpers';
import { AndFilter, EqualsFilter, DuringFilter } from '../src/types/QueryFilterTypes';

describe('DataRequirementHelpers', () => {
  test('should pass through standard equals filter', () => {
    const equalsFilter: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'attr-0',
      value: 'value-0'
    };

    const flattenedFilters = DataRequirementHelpers.flattenFilters(equalsFilter);

    expect(flattenedFilters).toHaveLength(1);
    expect(flattenedFilters).toEqual(expect.arrayContaining([expect.objectContaining({ ...equalsFilter })]));
  });

  test('should flatten and filters', () => {
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
