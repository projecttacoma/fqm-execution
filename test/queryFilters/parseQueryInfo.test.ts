import { getELMFixture } from '../helpers/testHelpers';
import { parseQueryInfo } from '../../src/QueryFilterHelpers';
import * as cql from 'cql-execution';
import { QueryInfo, DuringFilter, AndFilter } from '../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const allELM = [simpleQueryELM, complexQueryELM, simpleQueryELMDependency];

const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const PARAMETERS = { 'Measurement Period': new cql.Interval(START_MP, END_MP, true, false) };

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
  localId: '42',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '31',
      sourceLocalId: '32',
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
        localId: '36',
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
        localId: '40',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_STATUS_VALUE_EXISTS_DURING_MP: QueryInfo = {
  localId: '65',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '44',
      sourceLocalId: '45',
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
        localId: '53',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '56',
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
        localId: '63',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP: QueryInfo = {
  localId: '77',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '67',
      sourceLocalId: '68',
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
  localId: '94',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '79',
      sourceLocalId: '80',
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
        localId: '84',
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
        localId: '88',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'C',
        attribute: 'abatement',
        localId: '92',
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
  localId: '120',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '96',
      sourceLocalId: '97',
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
        localId: '105',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '108',
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
        localId: '119',
        libraryName: 'ComplexQueries'
      }
    ]
  }
};

const EXPECTED_COMPLEX_QUERY_REF_QUERY_ANDS_IN_BOTH: QueryInfo = {
  localId: '134',
  libraryName: 'ComplexQueries',
  sources: [
    {
      retrieveLocalId: '96',
      sourceLocalId: '97',
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
        localId: '105',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '108',
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
        localId: '129',
        libraryName: 'ComplexQueries'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'bodySite',
        localId: '132',
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

const PATIENT: R4.IPatient = {
  resourceType: 'Patient',
  birthDate: '1988-09-08'
};

describe('Parse Query Info', () => {
  test('simple valueset with id check', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = parseQueryInfo(simpleQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('simple valueset with id check with no parameters passed in', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('complex - valueset with code AND interval check', () => {
    const statement = complexQueryELM.library.statements.def.find(def => def.name == 'Code And Starts During MP');
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_CODE_AND_STARTS_DURING_MP);
  });

  test('complex - valueset with status AND value exists AND interval check', () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Observation Status Value Exists and During MP'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_STATUS_VALUE_EXISTS_DURING_MP);
  });

  test('complex - valueset with period two years before end of MP', () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Encounter 2 Years Before End of MP'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);

    const filter = queryInfo.filter as AndFilter;

    filter.children = filter.children.map(f => {
      if (f.type === 'during') {
        return removeIntervalFromFilter(f as DuringFilter);
      }
      return f;
    });

    expect(queryInfo).toEqual(EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP);
  });

  test('complex - valueset with code OR interval check OR field not null', () => {
    const statement = complexQueryELM.library.statements.def.find(
      def => def.name == 'Code Active Or Starts During MP Or Abatement is not null'
    );
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_CODE_OR_STARTS_DURING_MP_OR_NOT_NULL);
  });

  test('incorrect localid should throw error', () => {
    expect(() => {
      parseQueryInfo(simpleQueryELM, allELM, '360', PARAMETERS, PATIENT);
    }).toThrow('Clause 360 in SimpleQueries was not a Query or not found.');
  });

  test('simple - query references query, combines filters', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[7].expression.localId; // query that references another query
    const queryInfo = parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY);
  });

  test('complex - query references query, combines filters', () => {
    const queryLocalId = complexQueryELM.library.statements.def[6].expression.localId; // query that references another query
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_COMPLEX_QUERY_REF_QUERY);
  });

  test('complex - query references query, combines filters with ands in both filters and differing alias names', () => {
    const queryLocalId = complexQueryELM.library.statements.def[7].expression.localId; // query that references another query
    const queryInfo = parseQueryInfo(complexQueryELM, allELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_COMPLEX_QUERY_REF_QUERY_ANDS_IN_BOTH);
  });

  test('simple - query references query in another library, combines filters', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[10].expression.localId; // In simple queries "Nested Query From Another Library"
    const queryInfo = parseQueryInfo(simpleQueryELM, allELM, queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_QUERY_REFERENCES_QUERY_IN_ANOTHER_LIBRARY);
  });
});
