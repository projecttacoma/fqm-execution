import { getELMFixture } from './helpers/testHelpers';
import { findRetrieves } from '../src/helpers/RetrievesHelper';
import { DataTypeQuery } from '../src/types/Calculator';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_RETRIEVE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '14',
    queryLocalId: undefined,
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '14',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ],
    path: 'code'
  }
];

const EXPECTED_VS_QUERY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '18',
    queryLocalId: '24',
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '24',
        libraryName: 'SimpleQueries',
        type: 'Query'
      },
      {
        localId: '18',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ],
    path: 'code'
  }
];

const EXPECTED_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Procedure',
    code: {
      system: 'http://example.com',
      code: 'test'
    },
    retrieveLocalId: '16',
    queryLocalId: undefined,
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '16',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ],
    path: 'code'
  }
];

const EXPECTED_EXPRESSIONREF_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '14',
    queryLocalId: undefined,
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '26',
        libraryName: 'SimpleQueries',
        type: 'ExpressionRef'
      },
      {
        localId: '14',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ],
    path: 'code'
  }
];

const EXPECTED_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs-2',
    retrieveLocalId: '4',
    queryLocalId: undefined,
    libraryName: 'SimpleDep',
    expressionStack: [
      {
        localId: '29',
        libraryName: 'SimpleQueries',
        type: 'ExpressionRef'
      },
      {
        localId: '4',
        libraryName: 'SimpleDep',
        type: 'Retrieve'
      }
    ],
    path: 'code'
  }
];

describe('Find Numerator Queries', () => {
  test('simple valueset lookup', () => {
    const valueSetExpr = simpleQueryELM.library.statements.def[0]; // expression for valueset lookup
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], valueSetExpr.expression);
    expect(results).toEqual(EXPECTED_VS_RETRIEVE_RESULTS);
  });

  test('simple code lookup', () => {
    const codeExpr = simpleQueryELM.library.statements.def[1]; // expression for code lookup
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], codeExpr.expression);
    expect(results).toEqual(EXPECTED_CODE_RESULTS);
  });

  test('simple aliased query', () => {
    const queryExpr = simpleQueryELM.library.statements.def[2]; // expression with aliased query
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], queryExpr.expression);
    expect(results).toEqual(EXPECTED_VS_QUERY_RESULTS);
  });

  test('simple expression ref', () => {
    const expressionRef = simpleQueryELM.library.statements.def[3]; // expression with local expression ref
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], expressionRef.expression);
    expect(results).toEqual(EXPECTED_EXPRESSIONREF_RESULTS);
  });

  test('dependent library expression ref', () => {
    const expressionRefDependency = simpleQueryELM.library.statements.def[4]; // expression with expression ref in dependent library
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], expressionRefDependency.expression);
    expect(results).toEqual(EXPECTED_DEPENDENCY_RESULTS);
  });
});
