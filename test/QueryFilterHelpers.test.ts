import { R4 } from '@ahryman40k/ts-fhir-types';
import { DataTypeQuery, DetailedPopulationGroupResult } from '../src/types/Calculator';
import { FinalResult } from '../src/types/Enums';
import { getELMFixture, getJSONFixture } from './helpers/testHelpers';
import { parseQueryInfo } from '../src/QueryFilterHelpers';

const simpleQueryELM = getELMFixture('elm/queries/SimpleQueries.json');
const simpleQueryELMDependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');

const EXPECTED_VS_WITH_ID_CHECK_QUERY = {
  localId: '24',
  sources: [
    {
      retrievelocalId: '18',
      sourceLocalId: '19',
      alias: 'C',
      resourceType: 'Condition',
      filters: [
        {
          attribute: 'id',
          value: 'test',
          localId: '23'
        }
      ]
    }
  ]
};

describe('Parse Query Info', () => {
  test('simple valueset lookup', () => {
    const valueSetExpr = simpleQueryELM.library.statements.def[0].expression; // expression for valueset lookup
  });

  test('simple code lookup', () => {
    const codeExpr = simpleQueryELM.library.statements.def[1].expression; // expression for code lookup
  });

  test('simple valueset with id check', () => {
    const queryLocalId = simpleQueryELM.library.statements.def[2].expression.localId; // expression with aliased query
    const queryInfo = parseQueryInfo(simpleQueryELM, queryLocalId);
    expect(queryInfo).toEqual(EXPECTED_VS_WITH_ID_CHECK_QUERY);
  });
});
