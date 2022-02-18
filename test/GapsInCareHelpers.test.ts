import * as cql from 'cql-execution';
import { FHIRWrapper } from 'cql-exec-fhir';
import {
  processQueriesForGaps,
  generateDetectedIssueResources,
  generateGapsInCareBundle,
  calculateReasonDetail,
  groupGapQueries,
  generateGuidanceResponses,
  generateReasonCoding
} from '../src/gaps/GapsReportBuilder';
import {
  DataTypeQuery,
  DetailedPopulationGroupResult,
  ClauseResult,
  GapsDataTypeQuery,
  ReasonDetailData
} from '../src/types/Calculator';
import { FinalResult, ImprovementNotation, CareGapReasonCode } from '../src/types/Enums';
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

    const resource = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.POSITIVE)
      .detectedIssues;

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

    const resource = generateDetectedIssueResources(queries, SIMPLE_MEASURE_REPORT, ImprovementNotation.NEGATIVE)
      .detectedIssues;

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
    const baseQuery: GapsDataTypeQuery = {
      dataType: 'Procedure',
      valueSet: 'http://example.com/test-vs',
      retrieveHasResult: true,
      parentQueryHasResult: false,
      retrieveLibraryName: 'example',
      retrieveLocalId: 'procedure'
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
        }
      ],
      statementResults: []
    };

    test('retrieve with false attribute filter should be code INVALIDATTRIBUTE', () => {
      const q: GapsDataTypeQuery = {
        ...baseQuery,
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
        ...baseQuery,
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
              interval: new cql.Interval(cql.DateTime.parse(intervalStart), cql.DateTime.parse(intervalEnd))
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
              interval: new cql.Interval(cql.DateTime.parse(intervalStart), cql.DateTime.parse(intervalEnd))
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
        ...baseQuery,
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
        ...baseQuery,
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
                  interval: new cql.Interval(cql.DateTime.parse(intervalStart), cql.DateTime.parse(intervalEnd))
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
            url: 'http://example.com/dr-value',
            extension: [
              {
                url: 'dr-value-attribute',
                valueString: 'value'
              },
              {
                url: 'dr-value-filter',
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
            system: 'CareGapReasonCodeSystem',
            code: 'DateOutOfRange',
            display: 'Date is out of specified range',
            extension: [
              {
                url: 'ReasonDetail',
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
});

describe('Guidance Response ReasonCode Coding', () => {
  test('should handle reason detail without reference', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.MISSING
    };
    const expectedCoding: fhir4.Coding = {
      system: 'CareGapReasonCodeSystem',
      code: 'Missing',
      display: 'Missing Data Element'
    };
    expect(generateReasonCoding(reasonDetail)).toEqual(expectedCoding);
  });

  test('should handle reason detail with reference and no path', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.PRESENT,
      reference: 'Procedure/denom-EXM130-2'
    };
    const expectedCoding: fhir4.Coding = {
      system: 'CareGapReasonCodeSystem',
      code: 'Present',
      display: 'Data Element is Present',
      extension: [
        {
          url: 'ReasonDetail',
          extension: [
            {
              url: 'reference',
              valueReference: {
                reference: 'Procedure/denom-EXM130-2'
              }
            }
          ]
        }
      ]
    };
    expect(generateReasonCoding(reasonDetail)).toEqual(expectedCoding);
  });

  test('should handle reason detail with reference and path', () => {
    const reasonDetail: ReasonDetailData = {
      code: CareGapReasonCode.DATEOUTOFRANGE,
      reference: 'Procedure/denom-EXM130-2',
      path: 'performed.end'
    };
    const expectedCoding: fhir4.Coding = {
      system: 'CareGapReasonCodeSystem',
      code: 'DateOutOfRange',
      display: 'Date is out of specified range',
      extension: [
        {
          url: 'ReasonDetail',
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
    expect(generateReasonCoding(reasonDetail)).toEqual(expectedCoding);
  });
});
