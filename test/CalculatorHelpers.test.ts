import { R4 } from '@ahryman40k/ts-fhir-types';
import { findRetrieves, generateDetectedIssueResource, generateGapsInCareBundle } from '../src/CalculatorHelpers';
import { DataTypeQuery, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { FinalResult } from '../src/types/Enums';
import { getELMFixture, getJSONFixture } from './helpers/testHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_RETRIEVE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retreiveSatisfied: false,
    retrieveLocalId: '14',
    parentQuerySatisfied: false,
    queryLocalId: undefined,
    libraryName: 'SimpleQueries'
  }
];
const EXPECTED_VS_QUERY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retreiveSatisfied: false,
    retrieveLocalId: '18',
    parentQuerySatisfied: false,
    queryLocalId: '24',
    libraryName: 'SimpleQueries'
  }
];
const EXPECTED_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Procedure',
    code: {
      system: 'EXAMPLE',
      code: 'test'
    },
    retreiveSatisfied: true,
    retrieveLocalId: '16',
    parentQuerySatisfied: false,
    queryLocalId: undefined,
    libraryName: 'SimpleQueries'
  }
];
const EXPECTED_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs-2',
    retreiveSatisfied: false,
    retrieveLocalId: '4',
    parentQuerySatisfied: false,
    queryLocalId: undefined,
    libraryName: 'SimpleDep'
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

const EXAMPLE_DETECTED_ISSUE = getJSONFixture('gaps/example-detected-issue.json');
describe('Generate DetectedIssue Resource', () => {
  test('generates proper data requirements', () => {
    const queries: DataTypeQuery[] = [
      ...EXPECTED_VS_RETRIEVE_RESULTS,
      ...EXPECTED_VS_QUERY_RESULTS,
      ...EXPECTED_CODE_RESULTS,
      ...EXPECTED_DEPENDENCY_RESULTS
    ];

    const measureReport: R4.IMeasureReport = {
      resourceType: 'MeasureReport',
      id: 'example',
      measure: 'Measure/example',
      period: {
        start: '2020-01-01',
        end: '2020-12-31'
      }
    };

    const resource = generateDetectedIssueResource(queries, measureReport);

    // id autogenerated at runtime in above function; do not consider for equality
    resource.id = 'example';
    expect(resource).toEqual(EXAMPLE_DETECTED_ISSUE);
  });
});

const EXAMPLE_MEASURE_REPORT = getJSONFixture('./gaps/example-gaps-measurereport.json');
const EXAMPLE_GAPS_PATIENT = getJSONFixture(
  './EXM130-8.0.000/EXM130-8.0.000-patients/denominator/Abdul218_Fahey393_1c14630a-f7f6-49cd-9c38-b8c975b0864f.json'
);
describe('FHIR Bundle Generation', () => {
  test('generate gaps bundle', () => {
    const bundle = generateGapsInCareBundle(EXAMPLE_DETECTED_ISSUE, EXAMPLE_MEASURE_REPORT, EXAMPLE_GAPS_PATIENT);

    expect(bundle.entry).toBeDefined();
    expect(bundle.entry).toHaveLength(4);

    expect(bundle.entry).toContainEqual(
      expect.objectContaining({
        resource: expect.objectContaining({
          resourceType: 'Composition',
          section: [
            {
              title: 'example',
              focus: {
                reference: 'MeasureReport/example'
              },
              entry: [
                {
                  reference: 'DetectedIssue/example'
                }
              ]
            }
          ]
        })
      })
    );

    expect(bundle.entry).toContainEqual(
      expect.objectContaining({
        resource: EXAMPLE_MEASURE_REPORT
      })
    );

    expect(bundle.entry).toContainEqual(
      expect.objectContaining({
        resource: EXAMPLE_GAPS_PATIENT
      })
    );

    expect(bundle.entry).toContainEqual(
      expect.objectContaining({
        resource: EXAMPLE_DETECTED_ISSUE
      })
    );
  });
});
