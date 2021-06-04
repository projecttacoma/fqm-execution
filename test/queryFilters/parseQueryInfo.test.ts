import { getELMFixture } from '../helpers/testHelpers';
import { parseQueryInfo } from '../../src/QueryFilterHelpers';
import * as cql from 'cql-execution';
import { QueryInfo, DuringFilter, AndFilter } from '../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');

const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const PARAMETERS = { 'Measurement Period': new cql.Interval(START_MP, END_MP, true, false) };

const EXPECTED_VS_WITH_ID_CHECK_QUERY: QueryInfo = {
  localId: '24',
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
    localId: '23'
  }
};

const EXPECTED_CODE_AND_STARTS_DURING_MP: QueryInfo = {
  localId: '42',
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
        localId: '36'
      },
      {
        type: 'during',
        alias: 'C',
        attribute: 'onset',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '40'
      }
    ]
  }
};

const EXPECTED_STATUS_VALUE_EXISTS_DURING_MP: QueryInfo = {
  localId: '65',
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
    children: [
      {
        type: 'in',
        alias: 'Obs',
        attribute: 'status',
        valueList: ['final', 'amended', 'corrected', 'preliminary'],
        localId: '53'
      },
      {
        type: 'notnull',
        alias: 'Obs',
        attribute: 'value',
        localId: '56'
      },
      {
        type: 'during',
        alias: 'Obs',
        attribute: 'effective',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '63'
      }
    ]
  }
};

const EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP: QueryInfo = {
  localId: '77',
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
    children: [
      {
        type: 'during',
        alias: 'Enc',
        attribute: 'period.end',
        valuePeriod: {
          start: '2017-12-31T23:59:59.999Z',
          end: '2019-12-31T23:59:59.998Z'
        }
      }
    ]
  }
};

const EXPECTED_CODE_OR_STARTS_DURING_MP_OR_NOT_NULL: QueryInfo = {
  localId: '94',
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
        localId: '84'
      },
      {
        type: 'during',
        alias: 'C',
        attribute: 'onset',
        valuePeriod: {
          start: '2019-01-01T00:00:00.000Z',
          end: '2019-12-31T23:59:59.999Z'
        },
        localId: '88'
      },
      {
        type: 'notnull',
        alias: 'C',
        attribute: 'abatement',
        localId: '92'
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
    const queryInfo = parseQueryInfo(simpleQueryELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('simple valueset with id check with no parameters passed in', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = parseQueryInfo(simpleQueryELM, queryLocalId, undefined, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('complex - valueset with code AND interval check', () => {
    const statement = complexQueryELM.library.statements.def.find(def => def.name == 'Code And Starts During MP');
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId, PARAMETERS, PATIENT);
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
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId, PARAMETERS, PATIENT);
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
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId, PARAMETERS, PATIENT);

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
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId, PARAMETERS, PATIENT);
    expect(queryInfo).toEqual(EXPECTED_CODE_OR_STARTS_DURING_MP_OR_NOT_NULL);
  });

  test('incorrect localid should throw error', () => {
    expect(() => {
      parseQueryInfo(simpleQueryELM, '360', PARAMETERS, PATIENT);
    }).toThrow('Clause 360 in SimpleQueries was not a Query or not found.');
  });
});
