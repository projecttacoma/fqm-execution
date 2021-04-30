import { getELMFixture } from '../helpers/testHelpers';
import * as cql from 'cql-execution';
import * as QueryFilter from '../../src/QueryFilterHelpers';
import { ELMFunctionRef } from '../../src/types/ELMTypes';
import { UnknownFilter } from '../../src/types/QueryFilterTypes';

// to use as a library parameter for tests
const EXTRA_QUERIES_ELM = getELMFixture('elm/queries/ExtraQueries.json');
const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const MP_INTERVAL = new cql.Interval(START_MP, END_MP, true, false);

/** From ExtraQueries.cql "FunctionRef In Same library": */
const FUNCTIONREF_IN_SAME_LIBRARY: ELMFunctionRef = {
  localId: '64',
  locator: '46:11-46:64',
  name: 'A Function',
  type: 'FunctionRef',
  operand: [
    {
      localId: '58',
      locator: '46:24-46:63',
      name: 'Normalize Interval',
      libraryName: 'Global',
      type: 'FunctionRef',
      operand: [
        {
          localId: '57',
          locator: '46:52-46:62',
          path: 'abatement',
          scope: 'C',
          type: 'Property'
        }
      ]
    }
  ]
};

/** From ExtraQueries.cql. "FunctionRef With More Complexity in parameter" */
const FUNCTIONREF_WITH_PARAM_COMPLEXITY: ELMFunctionRef = {
  localId: '78',
  locator: '50:11-50:65',
  name: 'Normalize Interval',
  libraryName: 'Global',
  type: 'FunctionRef',
  operand: [
    {
      localId: '77',
      locator: '50:39-50:64',
      path: 'abatement',
      type: 'Property',
      source: {
        localId: '76',
        locator: '50:39-50:54',
        name: 'Passthrough',
        type: 'FunctionRef',
        operand: [
          {
            localId: '72',
            locator: '50:53',
            name: 'C',
            type: 'AliasRef'
          }
        ]
      }
    }
  ]
};

describe('interpretFunctionRef', () => {
  test('FunctionRef in same library not supported', () => {
    const functionRefRes = QueryFilter.interpretFunctionRef(FUNCTIONREF_IN_SAME_LIBRARY);
    expect(functionRefRes).toBeUndefined();
  });

  test.skip('FunctionRef with complexity in param of known function not supported', () => {
    const functionRefRes = QueryFilter.interpretFunctionRef(FUNCTIONREF_WITH_PARAM_COMPLEXITY);
    expect(functionRefRes).toBeUndefined();
  });
});
