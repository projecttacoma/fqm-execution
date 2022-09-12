import { getELMFixture } from '../helpers/testHelpers';
import { parseQueryInfo } from '../../src/gaps/QueryFilterParser';
import { FHIRWrapper } from 'cql-exec-fhir';
import { DateTime, Interval } from 'cql-execution';
import { CQLPatient } from '../../src/types/CQLPatient';
import { QueryInfo, DuringFilter, AndFilter } from '../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';
import { ELMLast } from '../../src/types/ELMTypes';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');
const valueComparatorELM = getELMFixture('elm/queries/ValueQueries.json');

const allELM = [simpleQueryELM, complexQueryELM, simpleQueryELMDependency];

const START_MP = DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const PARAMETERS = { 'Measurement Period': new Interval(START_MP, END_MP, true, false) };

const EXPECTED_VS_WITH_ID_CHECK_QUERY: QueryInfo = {
  localId: '24',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '18',
      sourceLocalId: '19',
      alias: 'C',
      resourceType: 'Condition'
    }
  ],
  filter: {
    type: 'equals',
    alias: 'C',
    attribute: 'id',
    value: 'test',
    localId: '23',
    libraryName: 'SimpleQueries'
  }
};

const EXPECTED_CODE_AND_STARTS_DURING_MP: QueryInfo = {
  localId: '44',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '33',
      sourceLocalId: '34',
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
        localId: '38',
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
        localId: '42',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_STATUS_VALUE_EXISTS_DURING_MP: QueryInfo = {
  localId: '67',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '46',
      sourceLocalId: '47',
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
        localId: '55',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '58',
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
        localId: '65',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP: QueryInfo = {
  localId: '79',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '69',
      sourceLocalId: '70',
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
  localId: '96',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '81',
      sourceLocalId: '82',
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
        localId: '86',
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
        localId: '90',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'C',
        attribute: 'abatement',
        localId: '94',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_QUERY_REFERENCES_QUERY: QueryInfo = {
  localId: '46',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '33',
      sourceLocalId: '34',
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
        localId: '38',
        libraryName: 'SimpleQueries'
      },
      {
        type: 'notnull',
        alias: 'P',
        attribute: 'outcome',
        localId: '45',
        libraryName: 'SimpleQueries'
      }
    ]
  }
};

const EXPECTED_COMPLEX_QUERY_REF_QUERY: QueryInfo = {
  localId: '122',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '98',
      sourceLocalId: '99',
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
        localId: '107',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '110',
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
        localId: '121',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_COMPLEX_QUERY_REF_QUERY_ANDS_IN_BOTH: QueryInfo = {
  localId: '136',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '98',
      sourceLocalId: '99',
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
        localId: '107',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '110',
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
        localId: '131',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'bodySite',
        localId: '134',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY: QueryInfo = {
  localId: '65',
  libraryName: 'SimpleQueries',
  sources: [
    {
      retrieveLocalId: '6',
      sourceLocalId: '7',
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
        localId: '11',
        libraryName: 'SimpleDep'
      },
      {
        type: 'equals',
        alias: 'P',
        attribute: 'status',
        value: 'completed',
        localId: '64',
        libraryName: 'SimpleQueries'
      }
    ]
  }
};

const EXPECTED_INTERNAL_VALUE_COMPARISON_QUERY: QueryInfo = {
  localId: '39',
  sources: [
    {
      sourceLocalId: '24',
      retrieveLocalId: '23',
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
        localId: '31',
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
  localId: '13',
  fromExternalClause: true,
  sources: [
    {
      sourceLocalId: '5',
      retrieveLocalId: '4',
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
        localId: '12',
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
}) as CQLPatient;

describe('Parse Query Info', () => {
  test('simple valueset with id check', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('simple valueset with id check with no parameters passed in', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
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
      expect(e.message).toEqual('Clause 360 in SimpleQueries was not a Query or not found.');
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
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY);
  });

  test('simple - query references query in another library, combines filters', async () => {
    const queryLocalId = simpleQueryELM.library.statements.def[10].expression.localId; // In simple queries "Nested Query From Another Library"
    const queryInfo = await parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
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
      PATIENT
    );
    expect(queryInfo).toEqual(EXPECTED_EXTERNAL_VALUE_COMPARISON_QUERY);
  });

  test('Value Comparison queries produces value filter with tracked valueComparisonLocalId when comparison is done inside of a query', async () => {
    const queryLocalId = (valueComparatorELM.library.statements.def[3].expression as ELMLast).source.localId;
    const queryInfo = await parseQueryInfo(valueComparatorELM, [valueComparatorELM], queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_INTERNAL_VALUE_COMPARISON_QUERY);
  });
});
