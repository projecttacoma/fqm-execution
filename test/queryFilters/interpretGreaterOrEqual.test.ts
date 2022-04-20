import { FHIRWrapper } from 'cql-exec-fhir';
import { CQLPatient } from '../../src/types/CQLPatient';
import { getELMFixture } from '../helpers/testHelpers';
import * as QueryFilter from '../../src/gaps/QueryFilterParser';
import { ELMGreaterOrEqual } from '../../src/types/ELMTypes';

import { DuringFilter, UnknownFilter } from '../../src/types/QueryFilterTypes';
import { removeIntervalFromFilter } from '../helpers/queryFilterTestHelpers';

// to use as a library parameter for tests
const EXTRA_QUERIES_ELM = getELMFixture('elm/queries/ExtraQueries.json');

/** From ExtraQueries.cql "GreaterThanOrEqual Birthdate at start of Observation" */
const GREATEROREQUAL_BIRTHDATE_START: ELMGreaterOrEqual = {
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

/** Modified From ExtraQueries.cql "GreaterThanOrEqual Birthdate at start of Observation" to look at end of observation */
const GREATEROREQUAL_BIRTHDATE_END: ELMGreaterOrEqual = {
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
          type: 'End',
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

/** Modified From ExtraQueries.cql "GreaterThanOrEqual Birthdate at start of Observation" to do something unexpected with sending the birthdate through NormalizeInterval */
const GREATEROREQUAL_BIRTHDATE_UNEXPECTED_OPERAND: ELMGreaterOrEqual = {
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
          type: 'FunctionRef',
          name: 'NormalizeInterval',
          libraryName: 'global',
          operand: [
            {
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
          ]
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

/** From ExtraQueries.cql "GreaterThanOrEqual Observation Value": */
const GREATEROREQUAL_VALUE: ELMGreaterOrEqual = {
  localId: '151',
  locator: '74:5-74:30',
  type: 'GreaterOrEqual',
  operand: [
    {
      name: 'ToQuantity',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Quantity',
          type: 'As',
          operand: {
            localId: '149',
            locator: '74:11-74:20',
            path: 'value',
            scope: 'Test',
            type: 'Property'
          }
        }
      ]
    },
    {
      localId: '150',
      locator: '74:25-74:30',
      value: 2,
      unit: 'mg',
      type: 'Quantity'
    }
  ]
};

/** Modified from ExtraQueries.cql "GreaterThanOrEqual Observation Value" to compare a literal to a quantity. This is to test unexpected first operand. */
const GREATEROREQUAL_LITERAL_TO_VALUE: ELMGreaterOrEqual = {
  localId: '151',
  locator: '74:5-74:30',
  type: 'GreaterOrEqual',
  operand: [
    {
      type: 'Literal',
      valueType: 'decimal',
      value: 3
    },
    {
      localId: '150',
      locator: '74:25-74:30',
      value: 2,
      unit: 'mg',
      type: 'Quantity'
    }
  ]
};

const PATIENT = FHIRWrapper.FHIRv401().wrap({
  resourceType: 'Patient',
  birthDate: '1988-09-08'
}) as CQLPatient;

const PATIENT_NO_BIRTHDATE = FHIRWrapper.FHIRv401().wrap({
  resourceType: 'Patient'
}) as CQLPatient;

describe('interpretGreaterOrEqual', () => {
  test('Start of parameter after 30th birthday', () => {
    let filter: DuringFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_BIRTHDATE_START,
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

  test('End of parameter after 30th birthday', () => {
    let filter: DuringFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_BIRTHDATE_END,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT
    ) as DuringFilter;
    filter = removeIntervalFromFilter(filter);
    expect(filter).toEqual({
      type: 'during',
      alias: 'HPVTest',
      attribute: 'effective.end',
      valuePeriod: {
        start: '2018-09-08T00:00:00.000Z'
      },
      localId: '143',
      notes: "Compares against the patient's birthDate (30 years)"
    });
  });

  test('patient has no birthdate results in unknown with a note', () => {
    const filter: UnknownFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_BIRTHDATE_START,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT_NO_BIRTHDATE
    ) as UnknownFilter;

    expect(filter).toEqual({
      type: 'unknown',
      alias: 'HPVTest',
      attribute: 'effective.start',
      localId: '143',
      notes: "Compares against the patient's birthDate. But patient did not have birthDate.",
      withError: { message: 'Patient data had no birthDate' }
    });
  });

  test('Unexpected operands in CalendarAgeInYearsAt gracefully fail', () => {
    const filter: UnknownFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_BIRTHDATE_UNEXPECTED_OPERAND,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT
    ) as UnknownFilter;

    expect(filter).toEqual({
      type: 'unknown',
      withError: { message: 'An unknown error occurred while interpreting greater or equal filter' }
    });
  });

  test('literal to quantity comparison is unexpected ELM should gracefully fail', () => {
    const filter: UnknownFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_LITERAL_TO_VALUE,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT
    ) as UnknownFilter;

    expect(filter).toEqual({
      type: 'unknown',
      withError: { message: 'could not resolve property ref for comparator: GreaterOrEqual' }
    });
  });

  test('attribute quantity comparison', () => {
    const filter: UnknownFilter = QueryFilter.interpretGreaterOrEqual(
      GREATEROREQUAL_VALUE,
      EXTRA_QUERIES_ELM,
      {},
      PATIENT
    ) as UnknownFilter;

    expect(filter).toEqual({
      type: 'value',
      alias: 'Test',
      comparator: 'ge',
      attribute: 'value',
      valueQuantity: {
        unit: 'mg',
        value: 2
      }
    });
  });
});
