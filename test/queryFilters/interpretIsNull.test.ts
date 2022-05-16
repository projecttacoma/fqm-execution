import * as QueryFilter from '../../src/gaps/QueryFilterParser';
import { ELMIsNull } from '../../src/types/ELMTypes';

// Copied from SimpleQueries.json "Last Of ReferencedQueryIsNull"
const IS_NULL_ELM: ELMIsNull = {
  localId: '70',
  locator: '56:3-56:42',
  type: 'IsNull',
  operand: {
    localId: '69',
    locator: '56:3-56:34',
    path: 'recordedDate',
    type: 'Property',
    source: {
      localId: '68',
      locator: '56:3-56:21',
      type: 'Last',
      source: {
        localId: '67',
        locator: '56:8-56:20',
        name: 'SimpleQuery',
        type: 'ExpressionRef'
      }
    }
  }
};

const IS_NULL_INVALID_TYPE_ELM: ELMIsNull = {
  localId: '70',
  locator: '56:3-56:42',
  type: 'IsNull',
  operand: {
    localId: '69',
    locator: '56:3-56:34',
    path: 'recordedDate',
    type: 'Property',
    source: {
      localId: '68',
      locator: '56:3-56:21',
      type: 'Last',
      source: {
        localId: '67',
        locator: '56:8-56:20',
        name: 'SimpleQuery',
        type: 'ExpressionRef'
      }
    }
  }
};

describe('interpretIsNull cases', () => {
  test('ELM with valid type returns proper filter', () => {
    expect(QueryFilter.interpretIsNull(IS_NULL_ELM)).toEqual({
      type: 'isnull',
      attribute: 'recordedDate',
      alias: '',
      localId: '70'
    });
  });
});
