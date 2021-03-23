import { R4 } from '@ahryman40k/ts-fhir-types';
import { DataTypeQuery, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { FinalResult } from '../src/types/Enums';
import { getELMFixture, getJSONFixture } from './helpers/testHelpers';
import { parseQueryInfo } from '../src/QueryFilterHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_WITH_ID_CHECK_QUERY = {
  localId: '24',
  sources: [
    {
      retrieveLocalId: '18',
      sourceLocalId: '19',
      alias: 'C',
      resourceType: 'Condition',
      filters: {
        type: 'equals',
        alias: 'C',
        attribute: 'id',
        value: 'test',
        localId: '23'
      }
    }
  ]
};

const EXPECTED_CODE_AND_STARTS_DURING_MP = {
  localId: '42',
  sources: [
    {
      retrieveLocalId: '31',
      sourceLocalId: '32',
      alias: 'C',
      resourceType: 'Condition',
      filters: {
        type: 'and',
        children: [
          {
            type: 'in',
            alias: 'C',
            attribute: 'clinicalStatus',
            valueList: [
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
              ref: 'Measurement Period'
            },
            localId: '40'
          }
        ]
      }
    }
  ]
};

const EXPECTED_STATUS_VALUE_EXISTS_DURING_MP = {
  localId: '65',
  sources: [
    {
      retrieveLocalId: '44',
      sourceLocalId: '45',
      alias: 'Obs',
      resourceType: 'Observation',
      filters: {
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
              ref: 'Measurement Period'
            },
            localId: '63'
          }
        ]
      }
    }
  ]
};

const EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP = {
  localId: '77',
  sources: [
    {
      retrieveLocalId: '67',
      sourceLocalId: '68',
      alias: 'Enc',
      resourceType: 'Encounter',
      filters: {
        type: 'and',
        children: [
          {
            type: 'during',
            alias: 'Enc',
            attribute: 'period',
            valuePeriod: {
              ref: 'Measurement Period'
            }
          }
        ]
      }
    }
  ]
};

describe('Parse Query Info', () => {
  test('simple valueset with id check', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = parseQueryInfo(simpleQueryELM, queryLocalId);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });

  test('complex - valueset with code AND interval check', () => {
    const statement = complexQueryELM.library.statements.def.find(def => def.name == 'Code And Starts During MP');
    if (!statement) {
      fail('Could not find statement.');
    }
    const queryLocalId = statement.expression.localId;
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId);
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
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId);
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
    const queryInfo = parseQueryInfo(complexQueryELM, queryLocalId);
    expect(queryInfo).toEqual(EXPECTED_ENC_TWO_YEAR_BEFORE_END_OF_MP);
  });
});
