import { getELMFixture } from '../helpers/testHelpers';
import * as cql from 'cql-execution';
import * as QueryFilter from '../../src/gaps/QueryFilterParser';
import { ELMIncludedIn } from '../../src/types/ELMTypes';
import { DuringFilter, UnknownFilter } from '../../src/types/QueryFilterTypes';

// to use as a library parameter for tests
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const START_MP = cql.DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = cql.DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const MP_INTERVAL = new cql.Interval(START_MP, END_MP, true, false);

const INCLUDEDIN_MP: ELMIncludedIn = {
  localId: '40',
  locator: '33:11-33:45',
  type: 'IncludedIn',
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
            localId: '38',
            locator: '33:11-33:17',
            path: 'onset',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    },
    {
      localId: '39',
      locator: '33:26-33:45',
      name: 'Measurement Period',
      type: 'ParameterRef'
    }
  ]
};

const INCLUDEDIN_DIRECT_PROP_IN_MP: ELMIncludedIn = {
  localId: '40',
  locator: '33:11-33:45',
  type: 'IncludedIn',
  operand: [
    {
      localId: '38',
      locator: '33:11-33:17',
      path: 'onset',
      scope: 'C',
      type: 'Property'
    },
    {
      localId: '39',
      locator: '33:26-33:45',
      name: 'Measurement Period',
      type: 'ParameterRef'
    }
  ]
};

/** Abnormal order of operands. */
const INCLUDEDIN_MP_IN_PROPERTY: ELMIncludedIn = {
  localId: '40',
  locator: '33:11-33:45',
  type: 'IncludedIn',
  operand: [
    {
      localId: '39',
      locator: '33:26-33:45',
      name: 'Measurement Period',
      type: 'ParameterRef'
    },
    {
      name: 'ToInterval',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Period',
          type: 'As',
          operand: {
            localId: '38',
            locator: '33:11-33:17',
            path: 'onset',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    }
  ]
};

// Comparing against another attribute on the same resource. currently not supported.
const INCLUDEDIN_OTHER_ATTRIBUTE: ELMIncludedIn = {
  localId: '40',
  locator: '33:11-33:45',
  type: 'IncludedIn',
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
            localId: '38',
            locator: '33:11-33:17',
            path: 'onset',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    },
    {
      name: 'ToInterval',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          asType: '{http://hl7.org/fhir}Period',
          type: 'As',
          operand: {
            localId: '38',
            locator: '33:11-33:17',
            path: 'abatement',
            scope: 'C',
            type: 'Property'
          }
        }
      ]
    }
  ]
};

describe('interpretIncludedIn', () => {
  test('valid parameter interval ref', () => {
    const parameters = { 'Measurement Period': MP_INTERVAL };
    const filter = QueryFilter.interpretIncludedIn(INCLUDEDIN_MP, complexQueryELM, parameters) as DuringFilter;
    expect(filter.type).toEqual('during');
    expect(filter.valuePeriod).toEqual({
      start: '2019-01-01T00:00:00.000Z',
      end: '2019-12-31T23:59:59.999Z'
    });
    expect(filter.alias).toEqual('C');
    expect(filter.attribute).toEqual('onset');
  });

  test('valid parameter interval ref with direct to property', () => {
    const parameters = { 'Measurement Period': MP_INTERVAL };
    const filter = QueryFilter.interpretIncludedIn(
      INCLUDEDIN_DIRECT_PROP_IN_MP,
      complexQueryELM,
      parameters
    ) as DuringFilter;
    expect(filter.type).toEqual('during');
    expect(filter.valuePeriod).toEqual({
      start: '2019-01-01T00:00:00.000Z',
      end: '2019-12-31T23:59:59.999Z'
    });
    expect(filter.alias).toEqual('C');
    expect(filter.attribute).toEqual('onset');
  });

  test('Parameter in Property not supported', () => {
    const parameters = { 'Measurement Period': START_MP };
    const filter = QueryFilter.interpretIncludedIn(
      INCLUDEDIN_MP_IN_PROPERTY,
      complexQueryELM,
      parameters
    ) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
  });

  test('invalid type parameter interval ref', () => {
    const parameters = { 'Measurement Period': START_MP };
    const filter = QueryFilter.interpretIncludedIn(INCLUDEDIN_MP, complexQueryELM, parameters) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('C');
    expect(filter.attribute).toEqual('onset');
  });

  test('missing parameter interval ref', () => {
    const parameters = {};
    const filter = QueryFilter.interpretIncludedIn(INCLUDEDIN_MP, complexQueryELM, parameters) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('C');
    expect(filter.attribute).toEqual('onset');
  });

  test('comparison between two attributes. not supported', () => {
    const parameters = { 'Measurement Period': MP_INTERVAL };
    const filter = QueryFilter.interpretIncludedIn(
      INCLUDEDIN_OTHER_ATTRIBUTE,
      complexQueryELM,
      parameters
    ) as UnknownFilter;
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toBeUndefined();
    expect(filter.attribute).toBeUndefined();
  });
});
