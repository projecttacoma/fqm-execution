import { R4 } from '@ahryman40k/ts-fhir-types';
import { group } from 'console';
import {
  findRetrieves,
  generateDetectedIssueResources,
  generateGapsInCareBundle,
  calculateNearMisses,
  groupGapQueries
} from '../src/GapsInCareHelpers';
import { DataTypeQuery, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { FinalResult, ImprovementNotation } from '../src/types/Enums';
import { getELMFixture, getJSONFixture } from './helpers/testHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_RETRIEVE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveHasResult: false,
    retrieveLocalId: '14',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '14',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ]
  }
];

const EXPECTED_VS_QUERY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveHasResult: false,
    retrieveLocalId: '18',
    parentQueryHasResult: false,
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
    ]
  }
];

const EXPECTED_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Procedure',
    code: {
      system: 'EXAMPLE',
      code: 'test'
    },
    retrieveHasResult: true,
    retrieveLocalId: '16',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    libraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '16',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ]
  }
];

const EXPECTED_EXPRESSIONREF_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveHasResult: false,
    retrieveLocalId: '14',
    parentQueryHasResult: false,
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
    ]
  }
];

const EXPECTED_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs-2',
    retrieveHasResult: false,
    retrieveLocalId: '4',
    parentQueryHasResult: false,
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
    ]
  }
];

const OR_GROUP_QUERIES: DataTypeQuery[] =[
  {
    dataType: 'Procedure',
    valueSet: 'http://example.com/test-vs-2',
    retrieveHasResult: false,
    retrieveLocalId: '4',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    libraryName: 'SimpleDep',
    expressionStack: [
      {
        localId: '29',
        libraryName: 'SimpleQueries',
        type: 'Or'
      },
      {
        localId: '4',
        libraryName: 'SimpleDep',
        type: 'Retrieve'
      }
    ]
  },
  {
    dataType: 'Procedure',
    valueSet: 'http://example.com/test-vs-4',
    retrieveHasResult: false,
    retrieveLocalId: '5',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    libraryName: 'SimpleDep',
    expressionStack: [
      {
        localId: '29',
        libraryName: 'SimpleQueries',
        type: 'Or'
      },
      {
        localId: '5',
        libraryName: 'SimpleDep',
        type: 'Retrieve'
      }
    ]
  },
  {
    dataType: 'Procedure',
    valueSet: 'http://example.com/test-vs-4',
    retrieveHasResult: false,
    retrieveLocalId: '6',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    libraryName: 'SimpleDep',
    expressionStack: [
      {
        localId: '44',
        libraryName: 'SimpleQueries',
        type: 'ExpressionRef'
      },
      {
        localId: '5',
        libraryName: 'SimpleDep',
        type: 'Retrieve'
      }
    ]
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

const SIMPLE_MEASURE_REPORT: R4.IMeasureReport = {
  resourceType: 'MeasureReport',
  id: 'example',
  measure: 'Measure/example',
  period: {
    start: '2020-01-01',
    end: '2020-12-31'
  }
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
    expect(results).toEqual(EXPECTED_EXPRESSIONREF_RESULTS);
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

    const resources = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.POSITIVE);

    resources.forEach(resource => {
      // id autogenerated at runtime in above function; do not consider for equality
      resource.id = 'example';
      // guidance response id is also autogenerated and used as an evidence detail reference
      const IDS = ['A', 'B', 'C', 'D'];
      resource.contained?.forEach(function (c, index) {
        c.id = IDS[index];
      });
      resource.evidence?.forEach(function (e, index) {
        if (Array.isArray(e.detail) && e.detail.length > 0) {
          e.detail[0].reference = '#' + IDS[index];
        }
      });
    });
    expect(resources).toEqual(EXAMPLE_DETECTED_ISSUE);
  });

  test('positive improvement retrieves with truthy parent query results should be filtered out', () => {
    // Parent query is truthy, should be ignored from DetectedIssue
    const queries: DataTypeQuery[] = [
      {
        dataType: 'Condition',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: true,
        libraryName: 'SimpleQueries'
      }
    ];

    const resource = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.POSITIVE);

    // above query should be filtered out, which should result in no DetectedIssue resources
    expect(resource).toHaveLength(0);
  });

  test('negative improvement retrieves with truthy parent query results not be filtered out', () => {
    const queries: DataTypeQuery[] = [
      {
        dataType: 'Condition',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: true,
        libraryName: 'SimpleQueries'
      }
    ];

    const resource = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.NEGATIVE);

    // above query should be present since queries with results are gaps
    expect(resource[0].evidence).toHaveLength(1);
  });
});

describe('Find grouped queries', () => {
  test('grouped OR Queries', () => {
    const queries = groupGapQueries(OR_GROUP_QUERIES);

    // should be 2 entries: 1 group of 2 queries, 1 ungrouped query
    expect(queries).toHaveLength(2);
    expect(queries[0]).toHaveLength(2);
    expect(queries[1]).toHaveLength(1);
  });
});

describe('Find Near misses', () => {
  test('simple query/retrieve discrepancy near miss', () => {
    const retrieves = calculateNearMisses(EXPECTED_CODE_RESULTS, ImprovementNotation.POSITIVE);
    retrieves.forEach(r => {
      expect(r.isNearMiss).toBeTruthy();
    });
  });

  test('retrieve false, not a near miss', () => {
    const retrieves = calculateNearMisses(EXPECTED_VS_RETRIEVE_RESULTS, ImprovementNotation.POSITIVE);
    retrieves.forEach(r => {
      expect(r.isNearMiss).toBeFalsy();
    });
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
    expect(bundle.entry).toHaveLength(7);

    expect(bundle.entry).toContainEqual(
      expect.objectContaining({
        resource: expect.objectContaining({
          resourceType: 'Composition',
          section: [
            expect.objectContaining({
              title: 'example',
              focus: {
                reference: 'MeasureReport/example'
              },
              entry: expect.arrayContaining([
                {
                  reference: 'DetectedIssue/example'
                },
                {
                  reference: 'DetectedIssue/example'
                },
                {
                  reference: 'DetectedIssue/example'
                },
                {
                  reference: 'DetectedIssue/example'
                }
              ])
            })
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

    EXAMPLE_DETECTED_ISSUE.forEach((e:R4.IDetectedIssue) => {
      expect(bundle.entry).toContainEqual(
        expect.objectContaining({
          resource: e
        })
      );
    })
  });
});
