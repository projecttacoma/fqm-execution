import * as QueryFilter from '../../src/QueryFilterHelpers';
import { ELMNot } from '../../src/types/ELMTypes';
import { UnknownFilter } from '../../src/types/QueryFilterTypes';

/** From ExtraQueries.cql "Function Result is not null": */
const NOT_FUNCTIONREF: ELMNot = {
  localId: '37',
  locator: '33:5-33:62',
  type: 'Not',
  operand: {
    locator: '33:11-33:62',
    type: 'IsNull',
    operand: {
      localId: '36',
      locator: '33:11-33:50',
      name: 'Normalize Interval',
      libraryName: 'Global',
      type: 'FunctionRef',
      operand: [
        {
          localId: '35',
          locator: '33:39-33:49',
          path: 'abatement',
          scope: 'C',
          type: 'Property'
        }
      ]
    }
  }
};

/** From ExtraQueries.cql "Random Interval Param end is not null" */
const NOT_END_OF_PARAM: ELMNot = {
  localId: '47',
  locator: '39:5-39:41',
  type: 'Not',
  operand: {
    locator: '39:11-39:41',
    type: 'IsNull',
    operand: {
      localId: '46',
      locator: '39:11-39:29',
      type: 'End',
      operand: {
        localId: '45',
        locator: '39:18-39:29',
        name: 'Index Date',
        type: 'ParameterRef'
      }
    }
  }
};

/** From ExtraQueries.cql "Not True" */
const NOT_LITERAL_TRUE: ELMNot = {
  localId: '51',
  locator: '42:3-42:10',
  type: 'Not',
  operand: {
    localId: '50',
    locator: '42:7-42:10',
    valueType: '{urn:hl7-org:elm-types:r1}Boolean',
    value: 'true',
    type: 'Literal'
  }
};

describe('interpretNot', () => {
  test('is not null of FunctionRef not supported', () => {
    const filter = QueryFilter.interpretNot(NOT_FUNCTIONREF) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });

  test('is not null of Parameter Ref of not "Measurement Period" not supported', () => {
    const filter = QueryFilter.interpretNot(NOT_END_OF_PARAM) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });

  test('not of expression type other than IsNull not supported', () => {
    const filter = QueryFilter.interpretNot(NOT_LITERAL_TRUE) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });
});
