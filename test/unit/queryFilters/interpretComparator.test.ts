import {
  AnyELMExpression,
  ELMComparator,
  ELMGreater,
  ELMLess,
  ELMLessOrEqual,
  ELMLiteral,
  ELMQuantity,
  ELMRatio
} from '../../../src/types/ELMTypes';
import * as QueryFilter from '../../../src/gaps/QueryFilterParser';
import { getELMFixture } from '../helpers/testHelpers';

const ValueQueries = getELMFixture('elm/queries/ValueQueries.json');

const COMPARATOR_FILTER_TEMPLATE: ELMComparator = {
  localId: '21',
  locator: '12:3-12:56',
  type: 'Greater',
  operand: [
    {
      name: 'ToQuantity',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          localId: '19',
          locator: '12:3-12:48',
          type: 'As',
          operand: {
            localId: '17',
            locator: '12:4-12:35',
            path: 'value',
            type: 'Property',
            source: {
              localId: '16',
              locator: '12:4-12:29',
              name: 'Simple Observation Query',
              type: 'ExpressionRef'
            }
          },
          asTypeSpecifier: {
            localId: '18',
            locator: '12:40-12:47',
            name: '{http://hl7.org/fhir}Quantity',
            type: 'NamedTypeSpecifier'
          }
        }
      ]
    },
    {
      localId: '20',
      locator: '12:52-12:56',
      value: 9,
      unit: '%',
      type: 'Quantity'
    }
  ]
};

const quantityOperand: ELMQuantity = {
  localId: '20',
  locator: '12:52-12:56',
  value: 9,
  unit: '%',
  type: 'Quantity'
};

const ratioOperand: ELMRatio = {
  localId: '20',
  locator: '12:52-12:56',
  numerator: quantityOperand,
  denominator: quantityOperand,
  type: 'Ratio'
};

const stringOperand: ELMLiteral = {
  localId: '20',
  locator: '12:52-12:56',
  valueType: 'String',
  value: 'test',
  type: 'Literal'
};

const numberOperand: ELMLiteral = {
  localId: '20',
  locator: '12:52-12:56',
  valueType: 'Integer',
  value: 1,
  type: 'Literal'
};

const boolOperand: ELMLiteral = {
  localId: '20',
  locator: '12:52-12:56',
  valueType: 'Boolean',
  value: true,
  type: 'Literal'
};

const invalidOperand = {
  localId: '20',
  locator: '12:52-12:56',
  value: 9,
  type: 'Invalid'
};

const populateComparatorFilter = (
  comparatorType: 'Greater' | 'Less' | 'GreaterOrEqual' | 'LessOrEqual',
  operand: AnyELMExpression
): ELMComparator => {
  const populatedFilter = COMPARATOR_FILTER_TEMPLATE as ELMComparator;
  populatedFilter.type = comparatorType;
  populatedFilter.operand[1] = operand;
  return populatedFilter;
};

describe('interpretComparator cases', () => {
  test('interpretComparator with type Greater returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('Greater', quantityOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'gt');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'gt',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
  test('interpretComparator with type Less returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('Less', quantityOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'lt');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'lt',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
  test('interpretComparator with type GreaterOrEqual returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('GreaterOrEqual', quantityOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'ge');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'ge',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
  test('interpretComparator with type LessOrEqual returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('LessOrEqual', quantityOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'le');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
  test('interpretComparator with string literal operand returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('LessOrEqual', stringOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'le');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueString: 'test'
    });
  });
  test('interpretComparator with integer literal operand returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('LessOrEqual', numberOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'le');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueInteger: 1
    });
  });
  test('interpretComparator with bool literal operand returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('LessOrEqual', boolOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'le');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueBoolean: true
    });
  });
  test('interpretComparator with ratio operand returns correct filter', () => {
    const validGreaterFilter = populateComparatorFilter('LessOrEqual', ratioOperand);
    const valueFilter = QueryFilter.interpretComparator(validGreaterFilter, ValueQueries, 'le');
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueRatio: {
        denominator: { localId: '20', locator: '12:52-12:56', value: 9, unit: '%', type: 'Quantity' },
        numerator: { localId: '20', locator: '12:52-12:56', value: 9, unit: '%', type: 'Quantity' }
      }
    });
  });
  test('interpretComparator with invalid operand returns unknown filter with error', () => {
    const invalidGreaterFilter = populateComparatorFilter('Greater', invalidOperand);
    const valueFilter = QueryFilter.interpretComparator(invalidGreaterFilter, ValueQueries, 'gt');
    expect(valueFilter).toEqual({
      type: 'unknown',
      withError: { message: 'cannot handle unsupported operand type: Invalid in comparator: Greater' }
    });
  });
});

describe('interpretGreater cases', () => {
  test('interpretGreater returns correct value filter', () => {
    const validGreaterFilter: ELMGreater = populateComparatorFilter('Greater', quantityOperand) as ELMGreater;
    const valueFilter = QueryFilter.interpretGreater(validGreaterFilter, ValueQueries);
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'gt',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
});

describe('interpretLess cases', () => {
  test('interpretLess returns correct value filter', () => {
    const validLessFilter: ELMLess = populateComparatorFilter('Less', quantityOperand) as ELMLess;
    const valueFilter = QueryFilter.interpretLess(validLessFilter, ValueQueries);
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'lt',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
});

describe('interpretLessOrEqual cases', () => {
  test('interpretLessOrEqual returns correct value filter', () => {
    const validLessOrEqualFilter: ELMLessOrEqual = populateComparatorFilter('Less', quantityOperand) as ELMLessOrEqual;
    const valueFilter = QueryFilter.interpretLessOrEqual(validLessOrEqualFilter, ValueQueries);
    expect(valueFilter).toEqual({
      attribute: 'value',
      comparator: 'le',
      type: 'value',
      valueQuantity: {
        unit: '%',
        value: 9
      }
    });
  });
});
