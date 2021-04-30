import { getELMFixture } from '../helpers/testHelpers';
import * as cql from 'cql-execution';
import * as QueryFilter from '../../src/QueryFilterHelpers';
import { ELMEquivalent, ELMFunctionRef } from '../../src/types/ELMTypes';
import { UnknownFilter } from '../../src/types/QueryFilterTypes';

// to use as a library parameter for tests
const EXTRA_QUERIES_ELM = getELMFixture('elm/queries/ExtraQueries.json');
const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const MP_INTERVAL = new cql.Interval(START_MP, END_MP, true, false);
const EXEC_PARAMS = { 'Measurement Period': MP_INTERVAL };

/** From ExtraQueries.cql "FunctionRef In Same library": */
const EQUIVALENT_WITH_PARAMREF: ELMEquivalent = {
  localId: '88',
  locator: '54:5-54:40',
  type: 'Equivalent',
  operand: [
    {
      name: 'ToInterval',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Period',
          type: 'As',
          operand: {
            localId: '86',
            locator: '54:11-54:17',
            path: 'onset',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    },
    {
      localId: '87',
      locator: '54:21-54:40',
      name: 'Measurement Period',
      type: 'ParameterRef'
    }
  ]
};

/** Hand crafted ELM for C.id ~ 'condition'. This is not common with FHIR CQL. */
const EQUIVALENT_DIRECT_PROPERTY: ELMEquivalent = {
  localId: '88',
  locator: '54:5-54:40',
  type: 'Equivalent',
  operand: [
    {
      localId: '86',
      locator: '54:11-54:17',
      path: 'id',
      scope: 'C',
      type: 'Property'
    },
    {
      localId: '87',
      locator: '54:21-54:40',
      type: 'Literal',
      value: 'condition'
    }
  ]
};

/** Hand crafted ELM for 'condition' ~ C.id. This is not common with FHIR CQL and written backwards. */
const EQUIVALENT_PROPERTY_SECOND_PARAM: ELMEquivalent = {
  localId: '88',
  locator: '54:5-54:40',
  type: 'Equivalent',
  operand: [
    {
      localId: '87',
      locator: '54:21-54:40',
      type: 'Literal',
      value: 'condition'
    },
    {
      localId: '86',
      locator: '54:11-54:17',
      path: 'id',
      scope: 'C',
      type: 'Property'
    }
  ]
};

describe('interpretFunctionRef', () => {
  test('Equivalent with parameter not supported', () => {
    const filter = QueryFilter.interpretEquivalent(EQUIVALENT_WITH_PARAMREF, EXTRA_QUERIES_ELM);
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });

  test('Equivalent against direct parameter supported', () => {
    const filter = QueryFilter.interpretEquivalent(EQUIVALENT_DIRECT_PROPERTY, EXTRA_QUERIES_ELM);
    expect(filter).toEqual({
      type: 'equals',
      alias: 'C',
      attribute: 'id',
      value: 'condition',
      localId: '88'
    });
  });

  test('Equivalent with property at second operand position not supported', () => {
    const filter = QueryFilter.interpretEquivalent(EQUIVALENT_PROPERTY_SECOND_PARAM, EXTRA_QUERIES_ELM);
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });
});
