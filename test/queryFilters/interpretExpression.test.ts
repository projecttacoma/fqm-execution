import { getELMFixture } from '../helpers/testHelpers';
import * as cql from 'cql-execution';
import * as QueryFilter from '../../src/QueryFilterHelpers';
import { ELMExpression, ELMFunctionRef } from '../../src/types/ELMTypes';
import { DuringFilter, UnknownFilter } from '../../src/types/QueryFilterTypes';

// to use as a library parameter for tests
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const MP_INTERVAL = new cql.Interval(START_MP, END_MP, true, false);

describe('interpretExpression', () => {
  test('unknown expression type with property ref', () => {
    // using FunctionRef because it is not supported.
    const functionRef: ELMFunctionRef = {
      name: 'ToInterval',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Period',
          type: 'As',
          operand: {
            localId: '86',
            locator: '48:10-48:16',
            path: 'onset',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    };

    expect(QueryFilter.interpretExpression(functionRef, complexQueryELM, {})).toEqual({
      type: 'unknown',
      attribute: 'onset',
      alias: 'C'
    });
  });

  test('unknown expression type with no property ref', () => {
    // using FunctionRef because it is not supported.
    const functionRef: ELMFunctionRef = {
      name: 'ToInterval',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Period',
          type: 'As',
          operand: {
            localId: '86',
            locator: '48:10-48:16',
            name: 'Some Period Expression',
            type: 'ExpressionRef'
          }
        }
      ]
    };

    expect(QueryFilter.interpretExpression(functionRef, complexQueryELM, {})).toEqual({
      type: 'unknown'
    });
  });
});
