import { getELMFixture } from './helpers/testHelpers';
import { findRetrieves } from '../src/gaps/RetrievesFinder';
import { DataTypeQuery } from '../src/types/Calculator';
import { GracefulError } from '../src/types/errors/GracefulError';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const allELM = [simpleQueryELM, simpleQueryELMDependency];

const EXPECTED_VS_RETRIEVE_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Condition',
      valueSet: 'http://example.com/test-vs',
      retrieveLocalId: '14',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '14',
          libraryName: 'SimpleQueries',
          type: 'Retrieve'
        }
      ],
      path: 'code'
    }
  ],
  withErrors: []
};

const EXPECTED_VS_QUERY_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Condition',
      valueSet: 'http://example.com/test-vs',
      retrieveLocalId: '18',
      queryLocalId: '24',
      retrieveLibraryName: 'SimpleQueries',
      queryLibraryName: 'SimpleQueries',
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
  ],
  withErrors: []
};

const EXPECTED_CODE_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Procedure',
      code: {
        system: 'http://example.com',
        code: 'test'
      },
      retrieveLocalId: '16',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '16',
          libraryName: 'SimpleQueries',
          type: 'Retrieve'
        }
      ],
      path: 'code'
    }
  ],
  withErrors: []
};

const EXPECTED_EXPRESSIONREF_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Condition',
      valueSet: 'http://example.com/test-vs',
      retrieveLocalId: '14',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      queryLibraryName: 'SimpleQueries',
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
  ],
  withErrors: []
};

const EXPECTED_DEPENDENCY_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Condition',
      valueSet: 'http://example.com/test-vs-2',
      retrieveLocalId: '4',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleDep',
      queryLibraryName: 'SimpleDep',
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
  ],
  withErrors: []
};

const EXPECTED_QUERY_REFERENCING_QUERY_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Procedure',
      valueSet: 'http://example.com/test-vs',
      retrieveLocalId: '33',
      queryLocalId: '46',
      retrieveLibraryName: 'SimpleQueries',
      queryLibraryName: 'SimpleQueries',
      path: 'code',
      expressionStack: [
        {
          localId: '49',
          libraryName: 'SimpleQueries',
          type: 'Exists'
        },
        {
          localId: '48',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '46',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '41',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '39',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '33',
          libraryName: 'SimpleQueries',
          type: 'Retrieve'
        }
      ]
    }
  ],
  withErrors: []
};

const EXPECTED_QUERY_REFERENCING_QUERY_IN_ANOTHER_LIBRARY_RESULTS: {
  results: DataTypeQuery[];
  withErrors: GracefulError[];
} = {
  results: [
    {
      dataType: 'Procedure',
      valueSet: 'http://example.com/test-vs-2',
      retrieveLocalId: '6',
      queryLocalId: '65',
      retrieveLibraryName: 'SimpleDep',
      queryLibraryName: 'SimpleQueries',
      path: 'code',
      expressionStack: [
        {
          localId: '65',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '59',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '12',
          libraryName: 'SimpleDep',
          type: 'Query'
        },
        {
          localId: '6',
          libraryName: 'SimpleDep',
          type: 'Retrieve'
        }
      ]
    }
  ],
  withErrors: []
};

describe('Find Numerator Queries', () => {
  test('simple valueset lookup', () => {
    const valueSetExpr = simpleQueryELM.library.statements.def[0]; // expression for valueset lookup
    const results = findRetrieves(simpleQueryELM, allELM, valueSetExpr.expression);
    expect(results).toEqual(EXPECTED_VS_RETRIEVE_RESULTS);
  });

  test('simple code lookup', () => {
    const codeExpr = simpleQueryELM.library.statements.def[1]; // expression for code lookup
    const results = findRetrieves(simpleQueryELM, allELM, codeExpr.expression);
    expect(results).toEqual(EXPECTED_CODE_RESULTS);
  });

  test('simple aliased query', () => {
    const queryExpr = simpleQueryELM.library.statements.def[2]; // expression with aliased query
    const results = findRetrieves(simpleQueryELM, allELM, queryExpr.expression);
    expect(results).toEqual(EXPECTED_VS_QUERY_RESULTS);
  });

  test('simple expression ref', () => {
    const expressionRef = simpleQueryELM.library.statements.def[3]; // expression with local expression ref
    const results = findRetrieves(simpleQueryELM, allELM, expressionRef.expression);
    expect(results).toEqual(EXPECTED_EXPRESSIONREF_RESULTS);
  });

  test('dependent library expression ref', () => {
    const expressionRefDependency = simpleQueryELM.library.statements.def[4]; // expression with expression ref in dependent library
    const results = findRetrieves(simpleQueryELM, allELM, expressionRefDependency.expression);
    expect(results).toEqual(EXPECTED_DEPENDENCY_RESULTS);
  });

  test('query is further filtered by another query', () => {
    const expressionRef = simpleQueryELM.library.statements.def[8];
    const results = findRetrieves(simpleQueryELM, allELM, expressionRef.expression);
    expect(results).toEqual(EXPECTED_QUERY_REFERENCING_QUERY_RESULTS);
  });

  test('query is further filtered by another query from another library', () => {
    const expressionRef = simpleQueryELM.library.statements.def[10];
    const results = findRetrieves(simpleQueryELM, allELM, expressionRef.expression);
    expect(results).toEqual(EXPECTED_QUERY_REFERENCING_QUERY_IN_ANOTHER_LIBRARY_RESULTS);
  });
});
