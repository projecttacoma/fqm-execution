import { getELMFixture } from '../helpers/testHelpers';
import {
  parseQueryInfo,
  generateDetailedCodeFilter,
  generateDetailedDateFilter,
  generateDetailedValueFilter,
  codeLookup,
  flattenFilters
} from '../../../src/helpers/elm/QueryFilterParser';
import { FHIRWrapper } from 'cql-exec-fhir';
import { DateTime, Interval } from 'cql-execution';
import { CQLPatient } from '../../../src/types/CQLPatient';
import {
  QueryInfo,
  DuringFilter,
  AndFilter,
  EqualsFilter,
  InFilter,
  NotNullFilter,
  IsNullFilter,
  ValueFilter,
  UnknownFilter
} from '../../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';
import { ELMLast } from '../../../src/types/ELMTypes';
import { GracefulError } from '../../../src/types/errors/GracefulError';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');
const valueComparatorELM = getELMFixture('elm/queries/ValueQueries.json');

const allELM = [simpleQueryELM, complexQueryELM, simpleQueryELMDependency];

const START_MP = DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const PARAMETERS = { 'Measurement Period': new Interval(START_MP, END_MP, true, false) };

const EXPECTED_VS_WITH_ID_CHECK_QUERY: QueryInfo = {
  localId: '262',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '252',
      sourceLocalId: '249',
      alias: 'C',
      resourceType: 'Condition'
    }
  ],
  filter: {
    type: 'equals',
    alias: 'C',
    attribute: 'id',
    value: 'test',
    localId: '256',
    libraryName: 'SimpleQueries'
  }
};

const EXPECTED_CODE_AND_STARTS_DURING_MP: QueryInfo = {
  localId: '296',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '277',
      sourceLocalId: '274',
      alias: 'C',
      resourceType: 'Condition'
    }
  ],
  filter: {
    type: 'and',
    libraryName: 'ComplexQueries',
    children: [
      {
        type: 'in',
        alias: 'C',
        attribute: 'clinicalStatus',
        valueCodingList: [
          { code: 'active', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' },
          { code: 'recurrence', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' },
          { code: 'relapse', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' }
        ],
        localId: '282',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'during',
        alias: 'C',
        attribute: 'onset',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '293',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_STATUS_VALUE_EXISTS_DURING_MP: QueryInfo = {
  localId: '334',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '303',
      sourceLocalId: '300',
      alias: 'Obs',
      resourceType: 'Observation'
    }
  ],
  filter: {
    type: 'and',
    libraryName: 'ComplexQueries',
    children: [
      {
        type: 'in',
        alias: 'Obs',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected', 'preliminary'],
        localId: '320',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '325',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'during',
        alias: 'Obs',
        attribute: 'effective',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '331',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP: QueryInfo = {
  localId: '372',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '341',
      sourceLocalId: '338',
      alias: 'Enc',
      resourceType: 'Encounter'
    }
  ],
  filter: {
    type: 'and',
    libraryName: 'ComplexQueries',
    children: [
      {
        type: 'during',
        alias: 'Enc',
        attribute: 'period.end',
        valuePeriod: {
          start: '2017-12-31T23:59:59.999Z',
          end: '2019-12-31T23:59:59.998Z'
        },
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_CODE_OR_STARTS_DURING_MP_OR_NOT_NULL: QueryInfo = {
  localId: '403',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '379',
      sourceLocalId: '376',
      alias: 'C',
      resourceType: 'Condition'
    }
  ],
  filter: {
    type: 'or',
    libraryName: 'ComplexQueries',
    children: [
      {
        type: 'in',
        alias: 'C',
        attribute: 'clinicalStatus',
        valueCodingList: [
          { code: 'active', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' },
          { code: 'recurrence', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' },
          { code: 'relapse', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' }
        ],
        localId: '385',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'during',
        alias: 'C',
        attribute: 'onset',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '396',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'C',
        attribute: 'abatement',
        localId: '402',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_QUERY_REFERENCES_QUERY: QueryInfo = {
  localId: '313',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '296',
      sourceLocalId: '293',
      alias: 'P',
      resourceType: 'Procedure'
    }
  ],
  filter: {
    type: 'and',
    notes: 'Combination of multiple queries',
    children: [
      {
        type: 'equals',
        alias: 'P',
        attribute: 'status',
        value: 'completed',
        localId: '300',
        libraryName: 'SimpleQueries'
      },
      {
        type: 'notnull',
        alias: 'P',
        attribute: 'outcome',
        localId: '312',
        libraryName: 'SimpleQueries'
      }
    ]
  }
};

const EXPECTED_COMPLEX_QUERY_REF_QUERY: QueryInfo = {
  localId: '447',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '410',
      sourceLocalId: '407',
      alias: 'Obs',
      resourceType: 'Observation'
    }
  ],
  filter: {
    type: 'and',
    notes: 'Combination of multiple queries',
    children: [
      {
        type: 'in',
        alias: 'Obs',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected', 'preliminary'],
        localId: '426',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '431',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'during',
        alias: 'Obs',
        attribute: 'effective',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '444',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_COMPLEX_QUERY_REF_QUERY_ANDS_IN_BOTH: QueryInfo = {
  localId: '467',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '410',
      sourceLocalId: '407',
      alias: 'Obs',
      resourceType: 'Observation'
    }
  ],
  filter: {
    type: 'and',
    notes: 'Combination of multiple queries',
    children: [
      {
        type: 'in',
        alias: 'Obs',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected', 'preliminary'],
        localId: '426',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '431',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'during',
        alias: 'Obs',
        attribute: 'effective',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '460',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'bodySite',
        localId: '466',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY: QueryInfo = {
  localId: '346',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '226',
      sourceLocalId: '223',
      alias: 'P',
      resourceType: 'Procedure'
    }
  ],
  filter: {
    type: 'and',
    notes: 'Combination of multiple queries',
    children: [
      {
        type: 'equals',
        alias: 'P',
        attribute: 'id',
        value: 'test-2',
        localId: '230',
        libraryName: 'SimpleDep'
      },
      {
        type: 'equals',
        alias: 'P',
        attribute: 'status',
        value: 'completed',
        localId: '340',
        libraryName: 'SimpleQueries'
      }
    ]
  }
};

const EXPECTED_INTERNAL_VALUE_COMPARISON_QUERY: QueryInfo = {
  localId: '280',
  sources: [
    {
      sourceLocalId: '254',
      retrieveLocalId: '257',
      alias: 'O',
      resourceType: 'Observation'
    }
  ],
  filter: {
    type: 'and',
    libraryName: 'ValueQuery',
    children: [
      {
        type: 'in',
        alias: 'O',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected'],
        localId: '271',
        libraryName: 'ValueQuery'
      },
      {
        type: 'value',
        alias: 'O',
        comparator: 'gt',
        valueQuantity: {
          value: 9,
          unit: '%'
        },
        attribute: 'value',
        libraryName: 'ValueQuery'
      }
    ]
  },
  libraryName: 'ValueQuery'
};

const EXPECTED_EXTERNAL_VALUE_COMPARISON_QUERY: QueryInfo = {
  localId: '242',
  fromExternalClause: true,
  sources: [
    {
      sourceLocalId: '224',
      retrieveLocalId: '227',
      alias: 'O',
      resourceType: 'Observation'
    }
  ],
  filter: {
    type: 'and',
    libraryName: 'ValueQuery',
    children: [
      {
        type: 'in',
        alias: 'O',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected'],
        localId: '240',
        libraryName: 'ValueQuery'
      },
      {
        type: 'value',
        comparator: 'gt',
        valueQuantity: {
          value: 9,
          unit: '%'
        },
        attribute: 'value',
        libraryName: 'ValueQuery'
      }
    ]
  },
  libraryName: 'ValueQuery'
};

const PATIENT = FHIRWrapper.FHIRv401().wrap({
  resourceType: 'Patient',
  birthDate: '1988-09-08'
}) as any as CQLPatient;

describe('Parse Query Info', () => {
  test('simple valueset with id check', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('simple valueset with id check with no parameters passed in', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, {}, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('complex - valueset with code AND interval check', async () => {
    const statement = complexQueryELM.library.statements.def.find(def => def.name == 'Code And Starts During MP');
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_CODE_AND_STARTS_DURING_MP);
  });

  test('complex - valueset with status AND value exists AND interval check', async () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Observation Status Value Exists and During MP'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_STATUS_VALUE_EXISTS_DURING_MP);
  });

  test('complex - valueset with period two years before end of MP', async () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Encounter 2 Years Before End of MP'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);

    const filter = queryInfo.filter as AndFilter;

    filter.children = filter.children.map(f => {
      if (f.type === 'during') {
        return removeIntervalFromFilter(f as DuringFilter);
      }
      return f;
    });

    expect(queryInfo).toEqual(EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP);
  });

  test('complex - valueset with code OR interval check OR field not null', async () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Code Active Or Starts During MP Or Abatement is not null'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_CODE_OR_STARTS_DURING_MP_OR_NOT_NULL);
  });

  test('incorrect localid should throw error', async () => {
    try {
      await parseQueryInfo(simpleQueryELM, allELM, '360', undefined, PARAMETERS, PATIENT);
      fail('parseQueryInfo failed to throw error when provided incorrect localid');
    } catch (e) {
      expect(e).toHaveProperty('message', 'Clause 360 in SimpleQueries was not a Query or not found.');
    }
  });

  test('simple - query references query, combines filters', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[7].expression.localId; // query that references another query
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY);
  });

  test('complex - query references query, combines filters', async () => {
    const queryLocalId = complexQueryELM.library.statements.def[6].expression.localId; // query that references another query
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_COMPLEX_QUERY_REF_QUERY);
  });

  test('complex - query references query, combines filters with ands in both filters and differing alias names', async () => {
    const queryLocalId = complexQueryELM.library.statements.def[7].expression.localId; // query that references another query
    const queryInfo = await parseQueryInfo(complexQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_COMPLEX_QUERY_REF_QUERY_ANDS_IN_BOTH);
  });

  test('simple - query references query in another library, combines filters', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[10].expression.localId; // In simple queries "Nested Query From Another Library"
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, {}, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY);
  });

  test('simple - query references query in another library, combines filters', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[10].expression.localId; // In simple queries "Nested Query From Another Library"
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, {}, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY);
  });

  test('Value Comparison queries produces value filter with tracked valueComparisonLocalId when comparison is done outside of a query', async () => {
    const valueComparisonLocalId = valueComparatorELM.library.statements.def[2].expression.localId;
    const queryLocalId = (valueComparatorELM.library.statements.def[1].expression as ELMLast).source.localId;
    const queryInfo = await parseQueryInfo(
      valueComparatorELM,
      [valueComparatorELM],
      queryLocalId,
      valueComparisonLocalId,
      {},
      PATIENT
    );
    expect(queryInfo).toEqual(EXPECTED_EXTERNAL_VALUE_COMPARISON_QUERY);
  });

  test('Value Comparison queries produces value filter with tracked valueComparisonLocalId when comparison is done inside of a query', async () => {
    const queryLocalId = (valueComparatorELM.library.statements.def[3].expression as ELMLast).source.localId;
    const queryInfo = await parseQueryInfo(
      valueComparatorELM,
      [valueComparatorELM],
      queryLocalId,
      undefined,
      {},
      PATIENT
    );
    expect(queryInfo).toEqual(EXPECTED_INTERNAL_VALUE_COMPARISON_QUERY);
  });
});

describe('Code Filters', () => {
  test('should return null for non equals or codeFilter', () => {
    const fakeFilter: any = {
      type: 'and'
    };

    expect(generateDetailedCodeFilter(fakeFilter)).toBeNull();
  });

  test('should return null for equals filter on non-string', () => {
    const ef: EqualsFilter = {
      type: 'equals',
      value: 10,
      attribute: 'attr-1',
      alias: 'R'
    };

    expect(generateDetailedCodeFilter(ef)).toBeNull();
  });
  test('equals filter should pull off attribute', () => {
    const ef: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'attr-1',
      value: 'value-1'
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'attr-1',
      code: [
        {
          code: 'value-1'
        }
      ]
    };

    expect(generateDetailedCodeFilter(ef)).toEqual(expectedCodeFilter);
  });

  test('IN filter should pull off all of valueList', () => {
    const inf: InFilter = {
      type: 'in',
      alias: 'R',
      attribute: 'attr-1',
      valueList: ['value-1', 'value-2', 'value-3']
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'attr-1',
      code: [
        {
          code: 'value-1'
        },
        {
          code: 'value-2'
        },
        {
          code: 'value-3'
        }
      ]
    };

    expect(generateDetailedCodeFilter(inf)).toEqual(expectedCodeFilter);
  });

  test('IN filter with non-string list should be ignored', () => {
    const inf: InFilter = {
      type: 'in',
      alias: 'R',
      attribute: 'attr-1',
      valueList: [10]
    };

    expect(generateDetailedCodeFilter(inf)).toBeNull();
  });

  test('IN filter should pass through valueCodingList', () => {
    const inf: InFilter = {
      type: 'in',
      alias: 'R',
      attribute: 'attr-1',
      valueCodingList: [
        {
          system: 'system-1',
          code: 'code-1',
          display: 'display-code-1'
        }
      ]
    };
    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'attr-1',
      code: [
        {
          system: 'system-1',
          code: 'code-1',
          display: 'display-code-1'
        }
      ]
    };

    expect(generateDetailedCodeFilter(inf)).toEqual(expectedCodeFilter);
  });

  test('Equals filter should not add system attribute to output object for inappropriate dataType', () => {
    const ef: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'status',
      value: 'value1'
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'status',
      code: [
        {
          code: 'value1'
        }
      ]
    };
    expect(generateDetailedCodeFilter(ef, 'inappropriateDataType')).toEqual(expectedCodeFilter);
  });

  test('Equals filter should add system attribute to output object', () => {
    const ef: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'status',
      value: 'value1'
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'status',
      code: [
        {
          code: 'value1',
          system: 'http://hl7.org/fhir/encounter-status'
        }
      ]
    };
    expect(generateDetailedCodeFilter(ef, 'Encounter')).toEqual(expectedCodeFilter);
  });

  test('IN filter should add system attribute to output object', () => {
    const inf: InFilter = {
      type: 'in',
      alias: 'R',
      attribute: 'status',
      valueList: ['value-1', 'value-2', 'value-3']
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'status',
      code: [
        {
          code: 'value-1',
          system: 'http://hl7.org/fhir/encounter-status'
        },
        {
          code: 'value-2',
          system: 'http://hl7.org/fhir/encounter-status'
        },
        {
          code: 'value-3',
          system: 'http://hl7.org/fhir/encounter-status'
        }
      ]
    };
    expect(generateDetailedCodeFilter(inf, 'Encounter')).toEqual(expectedCodeFilter);
  });
  test('In filter should not add system attribute to output object for inappropriate dataType', () => {
    const inf: InFilter = {
      type: 'in',
      alias: 'R',
      attribute: 'status',
      valueList: ['value1']
    };

    const expectedCodeFilter: fhir4.DataRequirementCodeFilter = {
      path: 'status',
      code: [
        {
          code: 'value1'
        }
      ]
    };
    expect(generateDetailedCodeFilter(inf, 'inappropriateDataType')).toEqual(expectedCodeFilter);
  });
});

describe('Date Filters', () => {
  test('should pass through date filter', () => {
    const df: DuringFilter = {
      type: 'during',
      alias: 'R',
      attribute: 'attr-1',
      valuePeriod: {
        start: '2021-01-01',
        end: '2021-12-31'
      }
    };

    const expectedDateFilter: fhir4.DataRequirementDateFilter = {
      path: 'attr-1',
      valuePeriod: {
        start: '2021-01-01',
        end: '2021-12-31'
      }
    };

    expect(generateDetailedDateFilter(df)).toEqual(expectedDateFilter);
  });
});

describe('Value Filters', () => {
  test('not null filter should create value filter', () => {
    const nnf: NotNullFilter = {
      type: 'notnull',
      alias: 'R',
      attribute: 'attr-1'
    };

    const expectedDetailFilter: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
      extension: [
        { url: 'path', valueString: 'attr-1' },
        { url: 'comparator', valueCode: 'eq' },
        { url: 'value', valueString: 'not null' }
      ]
    };

    expect(generateDetailedValueFilter(nnf)).toEqual(expectedDetailFilter);
  });
  test('is null filter should create value filter', () => {
    const inf: IsNullFilter = {
      type: 'isnull',
      alias: 'R',
      attribute: 'attr-1'
    };

    const expectedDetailFilter: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
      extension: [
        { url: 'path', valueString: 'attr-1' },
        { url: 'comparator', valueCode: 'eq' },
        { url: 'value', valueString: 'null' }
      ]
    };

    expect(generateDetailedValueFilter(inf)).toEqual(expectedDetailFilter);
  });
  test('filter of type value should create value filter', () => {
    const valueFilter: ValueFilter = {
      type: 'value',
      attribute: 'attr-1',
      comparator: 'gt',
      valueBoolean: true
    };
    const expectedDetailFilter: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
      extension: [
        { url: 'path', valueString: 'attr-1' },
        { url: 'comparator', valueCode: 'gt' },
        { url: 'value', valueBoolean: true }
      ]
    };
    expect(generateDetailedValueFilter(valueFilter)).toEqual(expectedDetailFilter);
  });

  test('unknown filter should create a null for filter creation', () => {
    const uf: UnknownFilter = {
      type: 'unknown',
      alias: 'R',
      attribute: 'attr-1'
    };
    const ge: GracefulError = { message: 'Detailed value filter is not yet supported for filter type unknown' };

    expect(generateDetailedValueFilter(uf)).toEqual(ge);
  });
});

describe('codeLookup', () => {
  test('dataType is invalid', () => {
    expect(codeLookup('invalid', 'invalid')).toBeNull();
  });
  test('retrieves correct system url for dataType: MedicationRequest and attribute: status', () => {
    expect(codeLookup('MedicationRequest', 'status')).toEqual(
      'http://hl7.org/fhir/CodeSystem/medicationrequest-status'
    );
  });
  test('retrieves correct system url for dataType: MedicationRequest and attribute: intent', () => {
    expect(codeLookup('MedicationRequest', 'intent')).toEqual(
      'http://hl7.org/fhir/CodeSystem/medicationrequest-intent'
    );
  });
  test('retrieves correct system url for dataType: MedicationRequest and attribute: priority', () => {
    expect(codeLookup('MedicationRequest', 'priority')).toEqual('http://hl7.org/fhir/request-priority');
  });
  test('retrieves correct system url for dataType: MedicationRequest and invalid attribute', () => {
    expect(codeLookup('MedicationRequest', 'nonsense')).toBeNull();
  });
  test('retrieves correct system url for dataType: Encounter and attribute: status', () => {
    expect(codeLookup('Encounter', 'status')).toEqual('http://hl7.org/fhir/encounter-status');
  });
  test('retrieves correct system url for dataType: Encounter and invalid attribute', () => {
    expect(codeLookup('Encounter', 'nonsense')).toBeNull();
  });

  test('retrieves correct system url when dataType is Observation and attribute is status', () => {
    expect(codeLookup('Observation', 'status')).toEqual('http://hl7.org/fhir/observation-status');
  });
  test('retrieves correct system url when dataType is Observation and attribute is invalid', () => {
    expect(codeLookup('Observation', 'nonsense')).toBeNull();
  });
  test('retrieves correct system url when dataType is Procedure and attribute is status', () => {
    expect(codeLookup('Procedure', 'status')).toEqual('http://hl7.org/fhir/event-status');
  });
  test('retrieves correct system url when dataType is Procedure and attribute is invalid', () => {
    expect(codeLookup('Procedure', 'nonsense')).toBeNull();
  });
});

describe('Flatten Filters', () => {
  test('should pass through standard equals filter', () => {
    const equalsFilter: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'attr-0',
      value: 'value-0'
    };

    const flattenedFilters = flattenFilters(equalsFilter);

    expect(flattenedFilters).toHaveLength(1);
    expect(flattenedFilters[0]).toEqual(equalsFilter);
  });

  test('should flatten AND filters', () => {
    const equalsFilter0: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'attr-0',
      value: 'value-0'
    };

    const equalsFilter1: EqualsFilter = {
      type: 'equals',
      alias: 'R',
      attribute: 'attr-1',
      value: 'value-1'
    };

    const duringFilter: DuringFilter = {
      type: 'during',
      alias: 'R',
      attribute: 'attr-3',
      valuePeriod: {
        start: '2021-01-01',
        end: '2021-12-01'
      }
    };

    const filter: AndFilter = {
      type: 'and',
      children: [equalsFilter0, duringFilter, equalsFilter1]
    };

    const flattenedFilters = flattenFilters(filter);

    expect(flattenedFilters).toHaveLength(3);
    expect(flattenedFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ...equalsFilter0 }),
        expect.objectContaining({ ...equalsFilter1 }),
        expect.objectContaining({ ...duringFilter })
      ])
    );
  });
});
