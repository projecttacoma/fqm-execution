import { Interval, DateTime } from 'cql-execution';
import { FHIRWrapper } from 'cql-exec-fhir';
import {
  processQueriesForGaps,
  generateDetectedIssueResources,
  generateGapsInCareBundle,
  calculateReasonDetail,
  groupGapQueries,
  generateGuidanceResponses,
  generateReasonCode,
  hasDetailedReasonCode
} from '../../src/calculation/GapsReportBuilder';
import {
  DataTypeQuery,
  DetailedPopulationGroupResult,
  ClauseResult,
  GapsDataTypeQuery,
  ReasonDetailData
} from '../../src/types/Calculator';
import { ValueFilter } from '../../src/types/QueryFilterTypes';
import { FinalResult, ImprovementNotation, CareGapReasonCode } from '../../src/types/Enums';
import { getJSONFixture } from './helpers/testHelpers';

type DetailedResultWithClause = DetailedPopulationGroupResult & {
  clauseResults: ClauseResult[];
};

const BASE_VS_RETRIEVE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '14',
    queryLocalId: undefined,
    retrieveLibraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '14',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ]
  }
];

const BASE_VS_QUERY_RESULT: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '18',
    queryLocalId: '24',
    retrieveLibraryName: 'SimpleQueries',
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

const BASE_CODE_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Procedure',
    code: {
      system: 'EXAMPLE',
      code: 'test'
    },
    retrieveLocalId: '16',
    queryLocalId: undefined,
    retrieveLibraryName: 'SimpleQueries',
    expressionStack: [
      {
        localId: '16',
        libraryName: 'SimpleQueries',
        type: 'Retrieve'
      }
    ]
  }
];

const BASE_EXPRESSIONREF_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs',
    retrieveLocalId: '14',
    queryLocalId: undefined,
    retrieveLibraryName: 'SimpleQueries',
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

const BASE_DEPENDENCY_RESULTS: DataTypeQuery[] = [
  {
    dataType: 'Condition',
    valueSet: 'http://example.com/test-vs-2',
    retrieveLocalId: '4',
    queryLocalId: undefined,
    retrieveLibraryName: 'SimpleDep',
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

const OR_GROUP_QUERIES: GapsDataTypeQuery[] = [
  {
    dataType: 'Procedure',
    valueSet: 'http://example.com/test-vs-2',
    retrieveHasResult: false,
    retrieveLocalId: '4',
    parentQueryHasResult: false,
    queryLocalId: undefined,
    retrieveLibraryName: 'SimpleDep',
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
    retrieveLibraryName: 'SimpleDep',
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
    retrieveLibraryName: 'SimpleDep',
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

const SIMPLE_MEASURE_REPORT: fhir4.MeasureReport = {
  resourceType: 'MeasureReport',
  id: 'example',
  measure: 'Measure/example',
  period: {
    start: '2020-01-01',
    end: '2020-12-31'
  },
  status: 'complete',
  type: 'individual'
};

describe('Process detailed queries', () => {
  test('valueset expr should have false/false retrieve/query', () => {
    const results = processQueriesForGaps(BASE_VS_RETRIEVE_RESULTS, EXAMPLE_DETAILED_RESULTS);

    expect(results).toHaveLength(1);

    const [res] = results;

    expect(res.retrieveHasResult).toBe(false);
    expect(res.parentQueryHasResult).toBe(false);
  });

  test('aliased valueset expr should have false/false retrieve/query', () => {
    const results = processQueriesForGaps(BASE_VS_QUERY_RESULT, EXAMPLE_DETAILED_RESULTS);

    expect(results).toHaveLength(1);

    const [res] = results;

    expect(res.retrieveHasResult).toBe(false);
    expect(res.parentQueryHasResult).toBe(false);
  });

  test('code expr should have true/false retrieve/query', () => {
    const results = processQueriesForGaps(BASE_CODE_RESULTS, EXAMPLE_DETAILED_RESULTS);

    expect(results).toHaveLength(1);

    const [res] = results;

    expect(res.retrieveHasResult).toBe(true);
    expect(res.parentQueryHasResult).toBe(false);
  });

  test('simple expr ref should have false/false retrieve/query', () => {
    const results = processQueriesForGaps(BASE_EXPRESSIONREF_RESULTS, EXAMPLE_DETAILED_RESULTS);

    expect(results).toHaveLength(1);

    const [res] = results;

    expect(res.retrieveHasResult).toBe(false);
    expect(res.parentQueryHasResult).toBe(false);
  });

  test('dependent expr ref should have false/false retrieve/query', () => {
    const results = processQueriesForGaps(BASE_DEPENDENCY_RESULTS, EXAMPLE_DETAILED_RESULTS);

    expect(results).toHaveLength(1);

    const [res] = results;

    expect(res.retrieveHasResult).toBe(false);
    expect(res.parentQueryHasResult).toBe(false);
  });
});

const EXAMPLE_DETECTED_ISSUE = getJSONFixture('gaps/example-detected-issue.json');
describe('Generate DetectedIssue Resource', () => {
  test('generates proper data requirements', () => {
    const queries: DataTypeQuery[] = [
      ...BASE_VS_RETRIEVE_RESULTS,
      ...BASE_VS_QUERY_RESULT,
      ...BASE_CODE_RESULTS,
      ...BASE_DEPENDENCY_RESULTS
    ];

    const resources = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.POSITIVE);

    resources.detectedIssues.forEach(resource => {
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
    expect(resources.detectedIssues).toEqual(EXAMPLE_DETECTED_ISSUE);
  });

  test('positive improvement retrieves with truthy parent query results should be filtered out', () => {
    // Parent query is truthy, should be ignored from DetectedIssue
    const queries: GapsDataTypeQuery[] = [
      {
        dataType: 'Condition',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: true,
        retrieveLibraryName: 'SimpleQueries'
      }
    ];

    const resource = generateDetectedIssueResources(
      queries,
      SIMPLE_MEASURE_REPORT,
      ImprovementNotation.POSITIVE
    ).detectedIssues;

    // above query should be filtered out, which should result in no DetectedIssue resources
    expect(resource).toHaveLength(0);
  });

  test('negative improvement retrieves with truthy parent query results not be filtered out', () => {
    const queries: GapsDataTypeQuery[] = [
      {
        dataType: 'Condition',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: true,
        retrieveLibraryName: 'SimpleQueries'
      }
    ];

    const resource = generateDetectedIssueResources(
      queries,
      SIMPLE_MEASURE_REPORT,
      ImprovementNotation.NEGATIVE
    ).detectedIssues;

    // above query should be present since queries with results are gaps
    expect(resource[0].evidence).toHaveLength(1);
  });

  test('should filter duplicate dataRequirements and reasonCodes', () => {
    // Two ORed queries will generate identical data requirements
    const queries: GapsDataTypeQuery[] = [
      {
        dataType: 'Procedure',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: false,
        retrieveLibraryName: 'SimpleDep',
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
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: false,
        retrieveLibraryName: 'SimpleDep',
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
      }
    ];
    const resource = generateDetectedIssueResources(
      queries,
      SIMPLE_MEASURE_REPORT,
      ImprovementNotation.POSITIVE
    ).detectedIssues;

    expect(resource[0]).toBeDefined();
    expect(resource[0].evidence).toHaveLength(1);
  });

  test('should not filter GuidanceResponses when dataRequirements differ', () => {
    // Two ORed queries will generate identical data requirements
    const queries: GapsDataTypeQuery[] = [
      {
        dataType: 'Procedure',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: false,
        parentQueryHasResult: false,
        retrieveLibraryName: 'SimpleDep',
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
        valueSet: 'http://example.com/test-vs-2',
        retrieveHasResult: false,
        parentQueryHasResult: false,
        retrieveLibraryName: 'SimpleDep',
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
      }
    ];
    const resource = generateDetectedIssueResources(
      queries,
      SIMPLE_MEASURE_REPORT,
      ImprovementNotation.POSITIVE
    ).detectedIssues;

    expect(resource[0]).toBeDefined();
    expect(resource[0].evidence).toHaveLength(2);
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

describe('Find Reason Detail', () => {
  test('simple query/retrieve discrepancy near miss', () => {
    const gapQuery: GapsDataTypeQuery[] = BASE_CODE_RESULTS.map(q => ({
      ...q,
      parentQueryHasResult: false,
      retrieveHasResult: true
    }));

    const retrieves = calculateReasonDetail(gapQuery, ImprovementNotation.POSITIVE);
    retrieves.results.forEach(r => {
      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBeTruthy();
    });
  });

  test('retrieve false, not a near miss', () => {
    const retrieves = calculateReasonDetail(BASE_VS_RETRIEVE_RESULTS, ImprovementNotation.POSITIVE);
    retrieves.results.forEach(r => {
      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBeFalsy();
    });
  });

  describe('Reason Details', () => {
    const baseProcedureQuery: GapsDataTypeQuery = {
      dataType: 'Procedure',
      valueSet: 'http://example.com/test-vs',
      retrieveHasResult: true,
      parentQueryHasResult: false,
      retrieveLibraryName: 'example',
      retrieveLocalId: 'procedure'
    };

    const baseObservationQuery: GapsDataTypeQuery = {
      dataType: 'Observation',
      valueSet: 'http://example.com/test-vs',
      retrieveHasResult: true,
      parentQueryHasResult: true,
      retrieveLibraryName: 'example'
    };

    const dr: DetailedResultWithClause = {
      groupId: 'group-1',
      clauseResults: [
        {
          localId: 'false-clause',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.FALSE,
          raw: false
        },
        {
          localId: 'true-clause',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: true
        },
        {
          localId: 'procedure',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: [
            FHIRWrapper.FHIRv401().wrap({
              resourceType: 'Procedure',
              id: 'proc23',
              performedPeriod: {
                start: '2000-01-01',
                end: '2000-01-02' // out of range of desired interval
              }
            })
          ]
        },
        {
          localId: 'procedure-no-performed',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: [
            FHIRWrapper.FHIRv401().wrap({
              resourceType: 'Procedure',
              id: 'proc23'
            })
          ]
        },
        {
          localId: 'observation',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: [
            FHIRWrapper.FHIRv401().wrap({
              resourceType: 'Observation',
              id: 'obs12',
              valueBoolean: false
            })
          ]
        },
        {
          localId: 'obs-with-high-value',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: [
            FHIRWrapper.FHIRv401().wrap({
              resourceType: 'Observation',
              id: 'obs-with-high-value',
              valueQuantity: {
                value: 2.0,
                unit: '%'
              }
            })
          ]
        },
        {
          localId: 'obs-with-low-value',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: [
            FHIRWrapper.FHIRv401().wrap({
              resourceType: 'Observation',
              id: 'obs-with-low-value',
              valueQuantity: {
                value: 0.0,
                unit: '%'
              }
            })
          ]
        },
        {
          localId: 'external-value-compare',
          libraryName: 'example',
          statementName: '',
          final: FinalResult.TRUE,
          raw: true
        }
      ],
      statementResults: []
    };

    test('should report ValueOutOfRange for negative improvement high value', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'gt',
        valueQuantity: {
          value: 1.0,
          unit: '%'
        },
        localId: 'obs-with-high-value'
      };

      const q: GapsDataTypeQuery = {
        ...{ ...baseObservationQuery, retrieveLocalId: 'obs-with-high-value' },
        queryInfo: {
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };
      const [r] = calculateReasonDetail([q], ImprovementNotation.NEGATIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.VALUEOUTOFRANGE, path: 'value', reference: 'Observation/obs-with-high-value' }
      ]);
    });

    test('should report ValueOutOfRange for positive improvement low value', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'gt',
        valueQuantity: {
          value: 1.0,
          unit: '%'
        },
        localId: 'obs-with-low-value'
      };

      const q: GapsDataTypeQuery = {
        ...{ ...baseObservationQuery, retrieveLocalId: 'obs-with-low-value', parentQueryHasResult: false },
        queryInfo: {
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.VALUEOUTOFRANGE, path: 'value', reference: 'Observation/obs-with-low-value' }
      ]);
    });

    test('should report NotFound for positive improvement high value', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'gt',
        valueQuantity: {
          value: 1.0,
          unit: '%'
        },
        localId: 'obs-with-high-value'
      };

      const q: GapsDataTypeQuery = {
        ...{ ...baseObservationQuery, retrieveLocalId: 'obs-with-high-value', parentQueryHasResult: false },
        queryInfo: {
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);

      // There shouldn't be any out of range values computed by reasonDetail since the obs-with-high-value satisfies the requirements
      expect(r.reasonDetail?.reasons).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: CareGapReasonCode.VALUEOUTOFRANGE
          })
        ])
      );
    });

    test('should report ValueOutOfRange for negative improvement low value', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'lt',
        valueQuantity: {
          value: 5.0,
          unit: '%'
        },
        localId: 'obs-with-low-value'
      };

      const q: GapsDataTypeQuery = {
        ...{ ...baseObservationQuery, retrieveLocalId: 'obs-with-low-value' },
        queryInfo: {
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.NEGATIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.VALUEOUTOFRANGE, path: 'value', reference: 'Observation/obs-with-low-value' }
      ]);
    });

    test('should resolve value comparison from external clause for positive improvement', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'ge',
        valueQuantity: {
          value: 1.0,
          unit: '%'
        },
        localId: 'obs-with-low-value'
      };

      const q: GapsDataTypeQuery = {
        ...{
          ...baseObservationQuery,
          retrieveLocalId: 'obs-with-low-value',
          valueComparisonLocalId: 'false-clause',
          parentQueryHasResult: false
        },
        queryInfo: {
          fromExternalClause: true,
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.VALUEOUTOFRANGE, path: 'value', reference: 'Observation/obs-with-low-value' }
      ]);
    });

    test('should resolve value comparison from external clause for negative improvement', () => {
      const filter: ValueFilter = {
        type: 'value',
        attribute: 'value',
        alias: 'O',
        comparator: 'ge',
        valueQuantity: {
          value: 1.0,
          unit: '%'
        },
        localId: 'obs-with-high-value'
      };

      const q: GapsDataTypeQuery = {
        ...{
          ...baseObservationQuery,
          retrieveLocalId: 'obs-with-high-value',
          valueComparisonLocalId: 'true-clause'
        },
        queryInfo: {
          fromExternalClause: true,
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.NEGATIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.VALUEOUTOFRANGE, path: 'value', reference: 'Observation/obs-with-high-value' }
      ]);
    });

    test('retrieve with false attribute filter should be code INVALIDATTRIBUTE', () => {
      const q: GapsDataTypeQuery = {
        ...baseProcedureQuery,
        queryInfo: {
          sources: [
            {
              alias: 'P',
              resourceType: 'Procedure',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter: {
            type: 'equals',
            alias: 'P',
            value: 'completed',
            attribute: 'status',
            localId: 'false-clause'
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.INVALIDATTRIBUTE, path: 'status', reference: 'Procedure/proc23' }
      ]);
    });

    test('retrieve with false date filter should be code DATEOUTOFRANGE', () => {
      const intervalStart = '2009-12-31';
      const intervalEnd = '2019-12-31';

      const q: GapsDataTypeQuery = {
        ...baseProcedureQuery,
        queryInfo: {
          sources: [
            {
              alias: 'P',
              resourceType: 'Procedure',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter: {
            type: 'during',
            alias: 'P',
            attribute: 'performed.end',
            valuePeriod: {
              start: intervalStart,
              end: intervalEnd,
              interval: new Interval(DateTime.parse(intervalStart), DateTime.parse(intervalEnd))
            }
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.DATEOUTOFRANGE, path: 'performed.end', reference: 'Procedure/proc23' }
      ]);
    });

    test('retrieve with during filter but missing attribute in resource should be code NOTFOUND', () => {
      const intervalStart = '2009-12-31';
      const intervalEnd = '2019-12-31';

      const q: GapsDataTypeQuery = {
        dataType: 'Procedure',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: true,
        parentQueryHasResult: false,
        retrieveLibraryName: 'example',
        retrieveLocalId: 'procedure-no-performed',
        queryInfo: {
          sources: [
            {
              alias: 'P',
              resourceType: 'Procedure',
              retrieveLocalId: 'procedure-no-performed'
            }
          ],
          filter: {
            type: 'during',
            alias: 'P',
            attribute: 'performed.end',
            valuePeriod: {
              start: intervalStart,
              end: intervalEnd,
              interval: new Interval(DateTime.parse(intervalStart), DateTime.parse(intervalEnd))
            }
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.NOTFOUND, path: 'performed.end', reference: 'Procedure/proc23' }
      ]);
    });

    test('retrieve with false not null filter should be code NOTFOUND', () => {
      const q: GapsDataTypeQuery = {
        ...baseProcedureQuery,
        queryInfo: {
          sources: [
            {
              alias: 'P',
              resourceType: 'Procedure',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter: {
            type: 'notnull',
            alias: 'P',
            attribute: 'result'
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons).toEqual([
        { code: CareGapReasonCode.NOTFOUND, path: 'result', reference: 'Procedure/proc23' }
      ]);
    });

    test('retrieve with true not null filter should have default reason detail', () => {
      const q: GapsDataTypeQuery = {
        dataType: 'Observation',
        valueSet: 'http://example.com/test-vs',
        retrieveHasResult: true,
        parentQueryHasResult: false,
        retrieveLibraryName: 'example',
        retrieveLocalId: 'observation',
        queryInfo: {
          sources: [
            {
              alias: 'O',
              resourceType: 'Observation',
              retrieveLocalId: 'observation'
            }
          ],
          filter: {
            type: 'notnull',
            alias: 'O',
            attribute: 'value'
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      // If no specific reason details found, default is missing
      expect(r.reasonDetail?.reasons).toEqual([{ code: CareGapReasonCode.NOTFOUND }]);
    });

    test('retrieve with both false date and attribute filters should be code both INVALIDATTRIBUTE and DATEOUTOFRANGE', () => {
      const intervalStart = '2009-12-31';
      const intervalEnd = '2019-12-31';

      const q: GapsDataTypeQuery = {
        ...baseProcedureQuery,
        queryInfo: {
          sources: [
            {
              alias: 'P',
              resourceType: 'Procedure',
              retrieveLocalId: 'true-clause'
            }
          ],
          filter: {
            type: 'and',
            children: [
              {
                type: 'equals',
                alias: 'P',
                value: 'completed',
                attribute: 'status',
                localId: 'false-clause'
              },
              {
                type: 'during',
                alias: 'P',
                attribute: 'performed.end',
                valuePeriod: {
                  start: intervalStart,
                  end: intervalEnd,
                  interval: new Interval(DateTime.parse(intervalStart), DateTime.parse(intervalEnd))
                }
              }
            ]
          }
        }
      };

      const [r] = calculateReasonDetail([q], ImprovementNotation.POSITIVE, dr).results;

      expect(r.reasonDetail).toBeDefined();
      expect(r.reasonDetail?.hasReasonDetail).toBe(true);
      expect(r.reasonDetail?.reasons?.sort()).toEqual(
        [
          { code: CareGapReasonCode.INVALIDATTRIBUTE, path: 'status', reference: 'Procedure/proc23' },
          { code: CareGapReasonCode.DATEOUTOFRANGE, path: 'performed.end', reference: 'Procedure/proc23' }
        ].sort()
      );
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

    EXAMPLE_DETECTED_ISSUE.forEach((e: fhir4.DetectedIssue) => {
      expect(bundle.entry).toContainEqual(
        expect.objectContaining({
          resource: e
        })
      );
    });
  });
});

describe('Guidance Response', () => {
  const baseQuery: GapsDataTypeQuery = {
    dataType: 'Procedure',
    valueSet: 'http://example.com/test-vs',
    retrieveHasResult: true,
    parentQueryHasResult: false
  };

  test('should generate data requirement with equals attribute codeFilter', () => {
    const drWithAttributeFilter: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'equals',
          alias: 'P',
          value: 'completed',
          attribute: 'status'
        }
      }
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithAttributeFilter);
  });

  test('should generate data requirement with "in" attribute codeFilter', () => {
    const drWithAttributeFilter: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              },
              {
                code: 'amended',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'in',
          alias: 'P',
          valueList: ['completed', 'amended'],
          attribute: 'status'
        }
      }
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithAttributeFilter);
  });

  test('should generate data requirement with "in" codings attribute codeFilter', () => {
    const drWithAttributeFilter: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://example.com/system'
              },
              {
                code: 'amended',
                system: 'http://example.com/system'
              }
            ]
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'in',
          alias: 'P',
          valueCodingList: [
            {
              code: 'completed',
              system: 'http://example.com/system'
            },
            {
              code: 'amended',
              system: 'http://example.com/system'
            }
          ],
          attribute: 'status'
        }
      }
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithAttributeFilter);
  });

  test('should generate data requirement with dateFilter', () => {
    const drWithDate: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          }
        ],
        dateFilter: [
          {
            path: 'performed.end',
            valuePeriod: {
              start: '2009-12-31',
              end: '2019-12-31'
            }
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'during',
          alias: 'P',
          attribute: 'performed.end',
          valuePeriod: {
            start: '2009-12-31',
            end: '2019-12-31'
          }
        }
      }
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithDate);
  });

  test('should generate data requirement with valueFilter for not-null filter', () => {
    const drWithValue: fhir4.DataRequirement[] = [
      {
        type: 'Observation',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          }
        ],
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
            extension: [
              {
                url: 'path',
                valueString: 'value'
              },
              {
                url: 'comparator',
                valueCode: 'eq'
              },
              {
                url: 'value',
                valueString: 'not null'
              }
            ]
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      dataType: 'Observation',
      valueSet: 'http://example.com/test-vs',
      retrieveHasResult: true,
      parentQueryHasResult: false,
      queryInfo: {
        sources: [
          {
            alias: 'O',
            resourceType: 'Observation'
          }
        ],
        filter: {
          type: 'notnull',
          alias: 'O',
          attribute: 'value'
        }
      }
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithValue);
  });

  test('should generate combo data requirement with codeFilter and dateFilter. including reason detail', () => {
    const drWithDateAndCode: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ],
        dateFilter: [
          {
            path: 'performed.end',
            valuePeriod: {
              start: '2009-12-31',
              end: '2019-12-31'
            }
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'and',
          children: [
            {
              type: 'equals',
              alias: 'P',
              value: 'completed',
              attribute: 'status'
            },
            {
              type: 'during',
              alias: 'P',
              attribute: 'performed.end',
              valuePeriod: {
                start: '2009-12-31',
                end: '2019-12-31'
              }
            }
          ]
        }
      },
      reasonDetail: {
        hasReasonDetail: true,
        reasons: [
          {
            code: CareGapReasonCode.DATEOUTOFRANGE,
            reference: 'Procedure/denom-EXM130-2',
            path: 'performed.end'
          }
        ]
      }
    };

    const expectedReasonCodeableConcept: fhir4.CodeableConcept[] = [
      {
        coding: [
          {
            system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
            code: 'DateOutOfRange',
            display: 'Date is out of specified range'
          }
        ],
        extension: [
          {
            url: 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/reasonDetail',
            extension: [
              {
                url: 'reference',
                valueReference: {
                  reference: 'Procedure/denom-EXM130-2'
                }
              },
              {
                url: 'path',
                valueString: 'performed.end'
              }
            ]
          }
        ]
      }
    ];

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithDateAndCode);
    expect(gr.reasonCode).toBeDefined();
    expect(gr.reasonCode).toEqual(expectedReasonCodeableConcept);
  });

  test('should return one element in coding reasonCode array with the reason detail extension, and one without', () => {
    const drWithDateAndCode: fhir4.DataRequirement[] = [
      {
        type: 'Procedure',
        codeFilter: [
          {
            path: 'code',
            valueSet: 'http://example.com/test-vs'
          },
          {
            path: 'status',
            code: [
              {
                code: 'completed',
                system: 'http://hl7.org/fhir/event-status'
              }
            ]
          }
        ],
        dateFilter: [
          {
            path: 'performed.end',
            valuePeriod: {
              start: '2009-12-31',
              end: '2019-12-31'
            }
          }
        ]
      }
    ];

    const query: GapsDataTypeQuery = {
      ...baseQuery,
      queryInfo: {
        sources: [
          {
            alias: 'P',
            resourceType: 'Procedure'
          }
        ],
        filter: {
          type: 'and',
          children: [
            {
              type: 'equals',
              alias: 'P',
              value: 'completed',
              attribute: 'status'
            },
            {
              type: 'during',
              alias: 'P',
              attribute: 'performed.end',
              valuePeriod: {
                start: '2009-12-31',
                end: '2019-12-31'
              }
            }
          ]
        }
      },
      reasonDetail: {
        hasReasonDetail: true,
        reasons: [
          {
            code: CareGapReasonCode.DATEOUTOFRANGE,
            reference: 'Procedure/denom-EXM130-2',
            path: 'performed.end'
          },
          {
            code: CareGapReasonCode.PRESENT
          }
        ]
      }
    };

    const expectedCodingWithExtension = {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
          code: 'DateOutOfRange',
          display: 'Date is out of specified range'
        }
      ],
      extension: [
        {
          url: 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/reasonDetail',
          extension: [
            {
              url: 'reference',
              valueReference: {
                reference: 'Procedure/denom-EXM130-2'
              }
            },
            {
              url: 'path',
              valueString: 'performed.end'
            }
          ]
        }
      ]
    };

    const expectedCodingWithoutExt = {
      coding: [
        {
          code: 'Present',
          system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
          display: 'Data Element is Present'
        }
      ]
    };

    const grs = generateGuidanceResponses([query], '', ImprovementNotation.POSITIVE).guidanceResponses;

    expect(grs).toHaveLength(1);

    const [gr] = grs;

    expect(gr.dataRequirement).toEqual(drWithDateAndCode);
    expect(gr.reasonCode).toBeDefined();
    expect(gr.reasonCode).toContainEqual(expectedCodingWithExtension);
    expect(gr.reasonCode).toContainEqual(expectedCodingWithoutExt);
  });
});

describe('Guidance Response ReasonCode Coding', () => {
  test('should handle reason detail without reference', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.MISSING
    };
    const expectedReasonCode: fhir4.CodeableConcept = {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
          code: 'Missing',
          display: 'Missing Data Element'
        }
      ]
    };
    expect(generateReasonCode(reasonDetail)).toEqual(expectedReasonCode);
  });

  test('should handle reason detail with reference and no path', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.PRESENT,
      reference: 'Procedure/denom-EXM130-2'
    };

    const expectedCoding: fhir4.Coding = {
      system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
      code: 'Present',
      display: 'Data Element is Present'
    };

    const expectedDetailExt: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/reasonDetail',
      extension: [
        {
          url: 'reference',
          valueReference: {
            reference: 'Procedure/denom-EXM130-2'
          }
        }
      ]
    };

    const expectedReasonCode: fhir4.CodeableConcept = {
      coding: [expectedCoding],
      extension: [expectedDetailExt]
    };

    expect(generateReasonCode(reasonDetail)).toEqual(expectedReasonCode);
  });

  test('should handle reason detail with reference and path', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.DATEOUTOFRANGE,
      reference: 'Procedure/denom-EXM130-2',
      path: 'performed.end'
    };

    const expectedCoding: fhir4.Coding = {
      system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
      code: 'DateOutOfRange',
      display: 'Date is out of specified range'
    };

    const expectedDetailExt: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/reasonDetail',
      extension: [
        {
          url: 'reference',
          valueReference: {
            reference: 'Procedure/denom-EXM130-2'
          }
        },
        {
          url: 'path',
          valueString: 'performed.end'
        }
      ]
    };

    const expectedReasonCode: fhir4.CodeableConcept = {
      coding: [expectedCoding],
      extension: [expectedDetailExt]
    };

    expect(generateReasonCode(reasonDetail)).toEqual(expectedReasonCode);
  });

  describe('hasDetailedReasonCode', () => {
    test('should return false for empty reasonCode', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required',
        reasonCode: []
      };

      expect(hasDetailedReasonCode(gr)).toBe(false);
    });

    test('should return false for no reasonCode', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required'
      };

      expect(hasDetailedReasonCode(gr)).toBe(false);
    });

    test('should return true for GuidanceResponse with ValueOutOfRange', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required',
        reasonCode: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.VALUEOUTOFRANGE
              }
            ]
          }
        ]
      };

      expect(hasDetailedReasonCode(gr)).toBe(true);
    });

    test('should return false for GuidanceResponse with NotFound', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required',
        reasonCode: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.NOTFOUND
              }
            ]
          }
        ]
      };

      expect(hasDetailedReasonCode(gr)).toBe(false);
    });

    test('should return false for GuidanceResponse with Present', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required',
        reasonCode: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.PRESENT
              }
            ]
          }
        ]
      };

      expect(hasDetailedReasonCode(gr)).toBe(false);
    });

    test('should return true for GuidanceResponse with ValueOutOfRange and Present', () => {
      const gr: fhir4.GuidanceResponse = {
        resourceType: 'GuidanceResponse',
        status: 'data-required',
        reasonCode: [
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.VALUEOUTOFRANGE
              }
            ]
          },
          {
            coding: [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.PRESENT
              }
            ]
          }
        ]
      };

      expect(hasDetailedReasonCode(gr)).toBe(true);
    });
  });
});
