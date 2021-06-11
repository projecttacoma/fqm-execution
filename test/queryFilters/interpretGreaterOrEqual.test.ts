import { getELMFixture } from '../helpers/testHelpers';
import * as QueryFilter from '../../src/QueryFilterHelpers';
import { ELMGreaterOrEqual } from '../../src/types/ELMTypes';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { DuringFilter } from '../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';

// to use as a library parameter for tests
const EXTRA_QUERIES_ELM = getELMFixture('elm/queries/ExtraQueries.json');

/** From ExtraQueries.cql "GreaterThanOrEqual Birthdate at start of Observation": */
const GREATEROREQUAL_BIRTHDATE: ELMGreaterOrEqual = {
  localId: '143',
  locator: '70:5-70:140',
  type: 'GreaterOrEqual',
  operand: [
    {
      localId: '141',
      locator: '70:11-70:135',
      name: 'CalendarAgeInYearsAt',
      libraryName: 'Global',
      type: 'FunctionRef',
      operand: [
        {
          type: 'ToDateTime',
          operand: {
            localId: '135',
            locator: '70:41-70:77',
            name: 'ToDate',
            libraryName: 'FHIRHelpers',
            type: 'FunctionRef',
            operand: [
              {
                localId: '134',
                locator: '70:60-70:76',
                path: 'birthDate',
                type: 'Property',
                source: {
                  localId: '133',
                  locator: '70:60-70:66',
                  name: 'Patient',
                  type: 'ExpressionRef'
                }
              }
            ]
          }
        },
        {
          localId: '140',
          locator: '70:80-70:134',
          type: 'Start',
          operand: {
            localId: '139',
            locator: '70:89-70:134',
            name: 'Normalize Interval',
            libraryName: 'Global',
            type: 'FunctionRef',
            operand: [
              {
                localId: '138',
                locator: '70:117-70:133',
                path: 'effective',
                scope: 'HPVTest',
                type: 'Property'
              }
            ]
          }
        }
      ]
    },
    {
      localId: '142',
      locator: '70:139-70:140',
      valueType: '{urn:hl7-org:elm-types:r1}Integer',
      value: '30',
      type: 'Literal'
    }
  ]
};

const PATIENT: R4.IPatient = {
  resourceType: 'Patient',
  birthDate: '1988-09-08'
};

describe('interpretGreaterOrEqual', () => {
  test('Start of parameter after 30th birthday', () => {
    let filter: DuringFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_BIRTHDATE,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT
    ) as DuringFilter;
    filter = removeIntervalFromFilter(filter);
    expect(filter).toEqual({
      type: 'during',
      alias: 'HPVTest',
      attribute: 'effective.start',
      valuePeriod: {
        start: '2018-09-08T00:00:00.000Z'
      },
      localId: '143',
      notes: "Compares against the patient's birthDate (30 years)"
    });
  });
});
