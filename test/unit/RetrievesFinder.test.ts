import { getELMFixture } from './helpers/testHelpers';
import { findRetrieves } from '../../src/helpers/elm/RetrievesHelper';
import { DataTypeQuery } from '../../src/types/Calculator';
import { GracefulError } from '../../src/types/errors/GracefulError';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');

const allELM = [simpleQueryELM, simpleQueryELMDependency];

const EXPECTED_VS_RETRIEVE_RESULTS: { results: DataTypeQuery[]; withErrors: GracefulError[] } = {
  results: [
    {
      dataType: 'Condition',
      valueSet: 'http://example.com/test-vs',
      retrieveLocalId: '232',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Condition',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '232',
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
      retrieveLocalId: '252',
      queryLocalId: '262',
      retrieveLibraryName: 'SimpleQueries',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Condition',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '262',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '252',
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
      retrieveLocalId: '240',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Procedure',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '240',
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
      retrieveLocalId: '232',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleQueries',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Condition',
      queryLibraryName: 'SimpleQueries',
      expressionStack: [
        {
          localId: '266',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '232',
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
      retrieveLocalId: '217',
      queryLocalId: undefined,
      retrieveLibraryName: 'SimpleDep',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Condition',
      queryLibraryName: 'SimpleDep',
      expressionStack: [
        {
          localId: '271',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '217',
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
      retrieveLocalId: '296',
      queryLocalId: '313',
      retrieveLibraryName: 'SimpleQueries',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Procedure',
      queryLibraryName: 'SimpleQueries',
      path: 'code',
      expressionStack: [
        {
          localId: '285',
          libraryName: 'SimpleQueries',
          type: 'Exists'
        },
        {
          localId: '314',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '313',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '307',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '306',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '296',
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
      retrieveLocalId: '226',
      queryLocalId: '346',
      retrieveLibraryName: 'SimpleDep',
      templateId: 'http://hl7.org/fhir/StructureDefinition/Procedure',
      queryLibraryName: 'SimpleQueries',
      path: 'code',
      expressionStack: [
        {
          localId: '346',
          libraryName: 'SimpleQueries',
          type: 'Query'
        },
        {
          localId: '338',
          libraryName: 'SimpleQueries',
          type: 'ExpressionRef'
        },
        {
          localId: '236',
          libraryName: 'SimpleDep',
          type: 'Query'
        },
        {
          localId: '226',
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

  describe('Nested Query Tests', () => {
    it('should find retrieve for query using with', () => {
      const expressionRef = complexQueryELM.library.statements.def[8];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Procedure',
            valueSet: 'http://example.com/test-vs2'
          })
        ])
      );
    });

    it('should find retrieve for query using with and union', () => {
      const expressionRef = complexQueryELM.library.statements.def[9];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(3);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Procedure',
            valueSet: 'http://example.com/test-vs2'
          }),
          expect.objectContaining({
            dataType: 'Procedure',
            valueSet: 'http://example.com/test-vs3'
          })
        ])
      );
    });

    it('should find retrieve for query using without', () => {
      const expressionRef = complexQueryELM.library.statements.def[10];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Procedure',
            valueSet: 'http://example.com/test-vs2'
          })
        ])
      );
    });

    it('should find retrieve for query using retrieve in a such that', () => {
      const expressionRef = complexQueryELM.library.statements.def[11];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(3);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Procedure',
            valueSet: 'http://example.com/test-vs2'
          }),
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs3'
          })
        ])
      );
    });

    it('should find retrieve for query nested within a where', () => {
      const expressionRef = complexQueryELM.library.statements.def[12];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs2'
          })
        ])
      );
    });

    it('should find retrieve for query using let', () => {
      const expressionRef = complexQueryELM.library.statements.def[13];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs2'
          })
        ])
      );
    });

    it('should find retrieve for query with a query in the return', () => {
      const expressionRef = complexQueryELM.library.statements.def[14];
      const { results } = findRetrieves(complexQueryELM, [complexQueryELM], expressionRef.expression);

      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs'
          }),
          expect.objectContaining({
            dataType: 'Encounter',
            valueSet: 'http://example.com/test-vs2'
          })
        ])
      );
    });
  });
});
