import { getELMFixture } from '../helpers/testHelpers';
import * as QueryFilter from '../../src/gaps/QueryFilterParser';
import { ELMFunctionRef } from '../../src/types/ELMTypes';

// to use as a library parameter for tests
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');

const PATIENT: fhir4.Patient = {
  resourceType: 'Patient',
  birthDate: '1988-09-08'
};

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

    expect(QueryFilter.interpretExpression(functionRef, complexQueryELM, {}, PATIENT)).toEqual({
      libraryName: 'ComplexQueries',
      localId: undefined,
      type: 'unknown',
      attribute: 'onset',
      alias: 'C',
      withError: { message: "Don't know how to parse FunctionRef expression." }
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

    expect(QueryFilter.interpretExpression(functionRef, complexQueryELM, {}, PATIENT)).toEqual({
      libraryName: 'ComplexQueries',
      localId: undefined,
      type: 'unknown',
      withError: { message: "Don't know how to parse FunctionRef expression." }
    });
  });
});
