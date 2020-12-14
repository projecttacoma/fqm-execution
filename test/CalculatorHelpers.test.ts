import { findRetrieves } from '../src/CalculatorHelpers';
import { DataTypeQuery } from '../src/types/Calculator';
import { getELMFixture } from './helpers/testHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_RESULTS: DataTypeQuery[] = [
  { dataType: '{http://hl7.org/fhir}Condition', valueSet: 'http://example.com/test-vs' }
];
const EXPECTED_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: '{http://hl7.org/fhir}Procedure',
    code: {
      system: 'EXAMPLE',
      code: 'test'
    }
  }
];
const EXPECTED_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  { dataType: '{http://hl7.org/fhir}Condition', valueSet: 'http://example.com/test-vs-2' }
];

describe('Find Numerator Queries', () => {
  test('simple valueset lookup', () => {
    const valueSetExpr = simpleQueryELM.library.statements.def[0]; // expression for valueset lookup
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], valueSetExpr.expression);
    expect(results).toEqual(EXPECTED_VS_RESULTS);
  });

  test('simple code lookup', () => {
    const codeExpr = simpleQueryELM.library.statements.def[1]; // expression for code lookup
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], codeExpr.expression);
    expect(results).toEqual(EXPECTED_CODE_RESULTS);
  });

  test('simple aliased query', () => {
    const queryExpr = simpleQueryELM.library.statements.def[2]; // expression with aliased query
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], queryExpr.expression);
    expect(results).toEqual(EXPECTED_VS_RESULTS);
  });

  test('simple expression ref', () => {
    const expressionRef = simpleQueryELM.library.statements.def[3]; // expression with local expression ref
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], expressionRef.expression);
    expect(results).toEqual(EXPECTED_VS_RESULTS);
  });

  test('dependent library expression ref', () => {
    const expressionRefDependency = simpleQueryELM.library.statements.def[4]; // expression with expression ref in dependent library
    const results = findRetrieves(simpleQueryELM, [simpleQueryELMDependency], expressionRefDependency.expression);
    expect(results).toEqual(EXPECTED_DEPENDENCY_RESULTS);
  });
});
