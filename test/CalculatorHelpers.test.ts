import { findRetrieves } from '../src/CalculatorHelpers';
import { DataTypeQuery, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { FinalResult } from '../src/types/Enums';
import { getELMFixture } from './helpers/testHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_RETRIEVE_RESULTS: DataTypeQuery[] = [
  {
    dataType: '{http://hl7.org/fhir}Condition',
    valueSet: 'http://example.com/test-vs',
    retreiveSatisfied: false,
    retrieveLocalId: '14',
    parentQuerySatisfied: false,
    queryLocalId: undefined
  }
];
const EXPECTED_VS_QUERY_RESULTS: DataTypeQuery[] = [
  {
    dataType: '{http://hl7.org/fhir}Condition',
    valueSet: 'http://example.com/test-vs',
    retreiveSatisfied: false,
    retrieveLocalId: '18',
    parentQuerySatisfied: false,
    queryLocalId: '24'
  }
];
const EXPECTED_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: '{http://hl7.org/fhir}Procedure',
    code: {
      system: 'EXAMPLE',
      code: 'test'
    },
    retreiveSatisfied: true,
    retrieveLocalId: '16',
    parentQuerySatisfied: false,
    queryLocalId: undefined
  }
];
const EXPECTED_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  {
    dataType: '{http://hl7.org/fhir}Condition',
    valueSet: 'http://example.com/test-vs-2',
    retreiveSatisfied: false,
    retrieveLocalId: '4',
    parentQuerySatisfied: false,
    queryLocalId: undefined
  }
];
const EXAMPLE_DETAILED_RESULTS: DetailedPopulationGroupResult = {
  groupId: 'example',
  statementResults: [],
  clauseResults: [
    {
      libraryName: 'SimpleQueries',
      statementName: 'SimpleVSRetrieve',
      final: FinalResult.FALSE,
      localId: '14',
      raw: []
    },
    {
      libraryName: 'SimpleQueries',
      statementName: 'SimpleCodeRetrieve',
      final: FinalResult.TRUE,
      localId: '16',
      raw: true
    },
    {
      libraryName: 'SimpleQueries',
      statementName: 'SimpleQuery',
      final: FinalResult.FALSE,
      localId: '24',
      raw: []
    },
    {
      libraryName: 'SimpleQueries',
      statementName: 'SimpleQuery',
      final: FinalResult.FALSE,
      localId: '18',
      raw: []
    },
    {
      libraryName: 'SimpleQueries',
      statementName: 'SimpleExpressionRef',
      final: FinalResult.FALSE,
      localId: '26',
      raw: []
    },
    {
      libraryName: 'SimpleQueries',
      statementName: 'DepExpressionRef',
      final: FinalResult.FALSE,
      localId: '29',
      raw: []
    },
    {
      libraryName: 'SimpleDep',
      statementName: 'SimpleRetrieve',
      final: FinalResult.FALSE,
      localId: '4',
      raw: []
    }
  ]
};

describe('Find Numerator Queries', () => {
  test('simple valueset lookup', () => {
    const valueSetExpr = simpleQueryELM.library.statements.def[0]; // expression for valueset lookup
    const results = findRetrieves(
      simpleQueryELM,
      [simpleQueryELMDependency],
      valueSetExpr.expression,
      EXAMPLE_DETAILED_RESULTS
    );
    expect(results).toEqual(EXPECTED_VS_RETRIEVE_RESULTS);
  });

  test('simple code lookup', () => {
    const codeExpr = simpleQueryELM.library.statements.def[1]; // expression for code lookup
    const results = findRetrieves(
      simpleQueryELM,
      [simpleQueryELMDependency],
      codeExpr.expression,
      EXAMPLE_DETAILED_RESULTS
    );
    expect(results).toEqual(EXPECTED_CODE_RESULTS);
  });

  test('simple aliased query', () => {
    const queryExpr = simpleQueryELM.library.statements.def[2]; // expression with aliased query
    const results = findRetrieves(
      simpleQueryELM,
      [simpleQueryELMDependency],
      queryExpr.expression,
      EXAMPLE_DETAILED_RESULTS
    );
    expect(results).toEqual(EXPECTED_VS_QUERY_RESULTS);
  });

  test('simple expression ref', () => {
    const expressionRef = simpleQueryELM.library.statements.def[3]; // expression with local expression ref
    const results = findRetrieves(
      simpleQueryELM,
      [simpleQueryELMDependency],
      expressionRef.expression,
      EXAMPLE_DETAILED_RESULTS
    );
    expect(results).toEqual(EXPECTED_VS_RETRIEVE_RESULTS);
  });

  test('dependent library expression ref', () => {
    const expressionRefDependency = simpleQueryELM.library.statements.def[4]; // expression with expression ref in dependent library
    const results = findRetrieves(
      simpleQueryELM,
      [simpleQueryELMDependency],
      expressionRefDependency.expression,
      EXAMPLE_DETAILED_RESULTS
    );
    expect(results).toEqual(EXPECTED_DEPENDENCY_RESULTS);
  });
});
