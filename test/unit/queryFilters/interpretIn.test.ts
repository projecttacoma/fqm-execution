import { getELMFixture } from '../helpers/testHelpers';
import { DateTime, Interval } from 'cql-execution';
import * as QueryFilter from '../../../src/gaps/QueryFilterParser';
import { ELMIn } from '../../../src/types/ELMTypes';
import { DuringFilter } from '../../../src/types/QueryFilterTypes';

// to use as a library parameter for tests
const complexQueryELM = getELMFixture('elm/queries/ComplexQueries.json');
const START_MP = DateTime.fromJSDate(new Date('2019-01-01T00:00:00Z'), 0);
const END_MP = DateTime.fromJSDate(new Date('2020-01-01T00:00:00Z'), 0);
const MP_INTERVAL = new Interval(START_MP, END_MP, true, false);
const EXEC_PARAMS = { 'Measurement Period': MP_INTERVAL };

/** From ExtraQueries.cql. "Encounter Starts 2 Years Or Less Before MP" */
const IN_STARTS_CALC_AGAINST_MP: any = {
  locator: '58:58-58:72',
  type: 'In',
  operand: [
    {
      locator: '58:51-58:56',
      type: 'Start',
      operand: {
        localId: '96',
        locator: '58:11-58:49',
        name: 'Normalize Interval',
        libraryName: 'Global',
        type: 'FunctionRef',
        operand: [
          {
            type: 'As',
            operand: {
              localId: '95',
              locator: '58:39-58:48',
              path: 'period',
              scope: 'Enc',
              type: 'Property'
            },
            asTypeSpecifier: {
              type: 'ChoiceTypeSpecifier',
              choice: [
                {
                  name: '{http://hl7.org/fhir}dateTime',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}Period',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}Timing',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}instant',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}string',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}Age',
                  type: 'NamedTypeSpecifier'
                },
                {
                  name: '{http://hl7.org/fhir}Range',
                  type: 'NamedTypeSpecifier'
                }
              ]
            }
          }
        ]
      }
    },
    {
      locator: '58:58-58:72',
      lowClosed: true,
      highClosed: false,
      type: 'Interval',
      low: {
        locator: '58:81-58:107',
        type: 'Subtract',
        operand: [
          {
            localId: '98',
            locator: '58:81-58:107',
            type: 'End',
            operand: {
              localId: '97',
              locator: '58:88-58:107',
              name: 'Measurement Period',
              type: 'ParameterRef'
            }
          },
          {
            localId: '99',
            locator: '58:58-58:64',
            value: 2,
            unit: 'years',
            type: 'Quantity'
          }
        ]
      },
      high: {
        localId: '98',
        locator: '58:81-58:107',
        type: 'End',
        operand: {
          localId: '97',
          locator: '58:88-58:107',
          name: 'Measurement Period',
          type: 'ParameterRef'
        }
      }
    }
  ]
};

/** From ExtraQueries.cql "Encounter In MP". This a nonsensical ToList call on the "Measurement Period" */
const IN_PROP_IN_MP_TOLIST = {
  localId: '110',
  locator: '62:5-62:73',
  type: 'In',
  operand: [
    {
      localId: '108',
      locator: '62:11-62:49',
      name: 'Normalize Interval',
      libraryName: 'Global',
      type: 'FunctionRef',
      operand: [
        {
          type: 'As',
          operand: {
            localId: '107',
            locator: '62:39-62:48',
            path: 'period',
            scope: 'Enc',
            type: 'Property'
          },
          asTypeSpecifier: {
            type: 'ChoiceTypeSpecifier',
            choice: [
              {
                name: '{http://hl7.org/fhir}dateTime',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}Period',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}Timing',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}instant',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}string',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}Age',
                type: 'NamedTypeSpecifier'
              },
              {
                name: '{http://hl7.org/fhir}Range',
                type: 'NamedTypeSpecifier'
              }
            ]
          }
        }
      ]
    },
    {
      type: 'ToList',
      operand: {
        localId: '109',
        locator: '62:54-62:73',
        name: 'Measurement Period',
        type: 'ParameterRef'
      }
    }
  ]
};

/** Slightly modified from ExtraQueries.cql "Function call in Interval" */
const FUNCTION_REF_IN_INTERVAL = {
  localId: '126',
  locator: '66:5-66:104',
  type: 'In',
  operand: [
    {
      localId: '122',
      locator: '66:11-66:44',
      name: 'Interval From Period',
      type: 'FunctionRef',
      operand: [
        {
          localId: '116',
          locator: '66:34-66:43',
          path: 'period',
          scope: 'Enc',
          type: 'Property'
        }
      ]
    },
    {
      localId: '125',
      locator: '66:49-66:104',
      lowClosed: true,
      highClosed: false,
      type: 'Interval',
      low: {
        localId: '123',
        locator: '66:58-66:79',
        type: 'DateTime',
        year: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '2019',
          type: 'Literal'
        },
        month: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '1',
          type: 'Literal'
        },
        day: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '1',
          type: 'Literal'
        },
        hour: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        minute: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        second: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        millisecond: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        }
      },
      high: {
        localId: '124',
        locator: '66:82-66:103',
        type: 'DateTime',
        year: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '2020',
          type: 'Literal'
        },
        month: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '1',
          type: 'Literal'
        },
        day: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '1',
          type: 'Literal'
        },
        hour: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        minute: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        second: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        },
        millisecond: {
          valueType: '{urn:hl7-org:elm-types:r1}Integer',
          value: '0',
          type: 'Literal'
        }
      }
    }
  ]
};

/** Same as in IncludedIn to accommodate sometimes interval comparison creates an "In" type, i.e. "Latest" */
const IN_MP: ELMIn = {
  localId: '40',
  locator: '33:11-33:45',
  type: 'In',
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

/** From ExtraQueries.cql "Observation Issued During First 10 min of Encounter" */
const OBSERVATION_ISSUED_DURING_ENCOUNTER: ELMIn = {
  localId: '172',
  locator: '78:17-78:91',
  type: 'In',
  operand: [
    {
      name: 'ToDateTime',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          localId: '159',
          locator: '78:17-78:26',
          path: 'issued',
          scope: 'Obs',
          type: 'Property'
        }
      ]
    },
    {
      localId: '171',
      locator: '78:35-78:91',
      lowClosed: true,
      highClosed: true,
      type: 'Interval',
      low: {
        localId: '166',
        locator: '78:44-78:60',
        name: 'startTime',
        type: 'FunctionRef',
        operand: [
          {
            localId: '160',
            locator: '78:44-78:46',
            name: 'Enc',
            type: 'AliasRef'
          }
        ]
      },
      high: {
        localId: '170',
        locator: '78:63-78:90',
        type: 'Add',
        operand: [
          {
            localId: '168',
            locator: '78:63-78:79',
            name: 'startTime',
            type: 'FunctionRef',
            operand: [
              {
                localId: '167',
                locator: '78:63-78:65',
                name: 'Enc',
                type: 'AliasRef'
              }
            ]
          },
          {
            localId: '169',
            locator: '78:83-78:90',
            value: 10,
            unit: 'min',
            type: 'Quantity'
          }
        ]
      }
    }
  ]
};

const OBSERVATION_ISSUED_BETWEEN_MP_AND_ENCOUNTER: ELMIn = {
  localId: '188',
  locator: '83:17-83:94',
  type: 'In',
  operand: [
    {
      name: 'ToDateTime',
      libraryName: 'FHIRHelpers',
      type: 'FunctionRef',
      operand: [
        {
          localId: '181',
          locator: '83:17-83:26',
          path: 'issued',
          scope: 'Obs',
          type: 'Property'
        }
      ]
    },
    {
      localId: '187',
      locator: '83:35-83:94',
      lowClosed: true,
      highClosed: true,
      type: 'Interval',
      low: {
        localId: '183',
        locator: '83:44-83:72',
        type: 'Start',
        operand: {
          localId: '182',
          locator: '83:53-83:72',
          name: 'Measurement Period',
          type: 'ParameterRef'
        }
      },
      high: {
        localId: '186',
        locator: '83:75-83:93',
        type: 'Start',
        operand: {
          name: 'ToInterval',
          libraryName: 'FHIRHelpers',
          type: 'FunctionRef',
          operand: [
            {
              localId: '185',
              locator: '83:84-83:93',
              path: 'period',
              scope: 'Enc',
              type: 'Property'
            }
          ]
        }
      }
    }
  ]
};

describe('interpretIn', () => {
  test('valid parameter interval ref', async () => {
    // Note: Global.Latest generates type:In instead of type:IncludedIn
    // - > We might want to look at why it generates that way, but this case can account for it for now

    const parameters = { 'Measurement Period': MP_INTERVAL };
    const filter = (await QueryFilter.interpretIn(IN_MP, complexQueryELM, parameters)) as DuringFilter;
    expect(filter.type).toEqual('during');
    expect(filter.valuePeriod).toEqual({
      start: '2019-01-01T00:00:00.000Z',
      end: '2019-12-31T23:59:59.999Z'
    });
    expect(filter.alias).toEqual('C');
    expect(filter.attribute).toEqual('onset');
  });

  test('Property starts during two years before end of MP', async () => {
    const filter = (await QueryFilter.interpretIn(
      IN_STARTS_CALC_AGAINST_MP,
      complexQueryELM,
      EXEC_PARAMS
    )) as DuringFilter;
    if (filter.valuePeriod.interval) {
      delete filter.valuePeriod.interval;
    }
    expect(filter.type).toEqual('during');
    expect(filter.valuePeriod).toEqual({
      start: '2017-12-31T23:59:59.999Z',
      end: '2019-12-31T23:59:59.998Z'
    });
    expect(filter.alias).toEqual('Enc');
    expect(filter.attribute).toEqual('period.start');
  });

  test('Null measurement period causes an unknown filter to be returned', async () => {
    const parameters = { 'Measurement Period': null };
    const filter = await QueryFilter.interpretIn(IN_STARTS_CALC_AGAINST_MP, complexQueryELM, parameters);
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('Enc');
    expect(filter.attribute).toEqual('period.start');
  });

  test('does not support non-sensical call to ToList for second operand.', async () => {
    const filter = await QueryFilter.interpretIn(IN_PROP_IN_MP_TOLIST as ELMIn, complexQueryELM, EXEC_PARAMS);
    expect(filter.type).toEqual('unknown');
  });

  test('function call to unknown function as first operand not supported but identifies attribute', async () => {
    const filter = await QueryFilter.interpretIn(FUNCTION_REF_IN_INTERVAL as ELMIn, complexQueryELM, EXEC_PARAMS);
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('Enc');
    expect(filter.attribute).toEqual('period');
  });

  test('does not support creating interval based on alias usage in a function ref for low', async () => {
    const filter = await QueryFilter.interpretIn(OBSERVATION_ISSUED_DURING_ENCOUNTER, complexQueryELM, EXEC_PARAMS);
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('Obs');
  });

  test('does not support creating interval based on property usage for high', async () => {
    const filter = await QueryFilter.interpretIn(
      OBSERVATION_ISSUED_BETWEEN_MP_AND_ENCOUNTER,
      complexQueryELM,
      EXEC_PARAMS
    );
    expect(filter.type).toEqual('unknown');
    expect(filter.alias).toEqual('Obs');
  });
});
