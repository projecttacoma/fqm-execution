import { getCQLIntervalEndpoints } from '../../src/execution/Execution';
import { DEFAULT_MEASUREMENT_PERIOD_END } from '../../src/constants';

describe('Execution', () => {
  describe('getCQLIntervalEndpoints', () => {
    // A measurement period end is inclusive of the period it names, and the README documents all
    // three FHIR `date` precisions as valid input here.
    test.each([
      ['a full date', '2019-12-31', '2019-12-31T23:59:59.999Z'],
      ['a year-month', '2019-12', '2019-12-31T23:59:59.999Z'],
      ['a year', '2019', '2019-12-31T23:59:59.999Z'],
      ['a short month', '2019-04', '2019-04-30T23:59:59.999Z'],
      ['February in a leap year', '2020-02', '2020-02-29T23:59:59.999Z'],
      ['February in a non-leap year', '2019-02', '2019-02-28T23:59:59.999Z'],
      ['a leap day', '2020-02-29', '2020-02-29T23:59:59.999Z']
    ])('resolves %s measurementPeriodEnd to the last millisecond of the period it names', (_, end, expected) => {
      const { endCql } = getCQLIntervalEndpoints({ measurementPeriodEnd: end });

      expect(endCql.toJSDate().toISOString()).toEqual(expected);
    });

    test('leaves a measurementPeriodEnd that already carries a time untouched', () => {
      const { endCql } = getCQLIntervalEndpoints({ measurementPeriodEnd: '2019-12-31T08:30:00.000Z' });

      expect(endCql.toJSDate().toISOString()).toEqual('2019-12-31T08:30:00.000Z');
    });

    test('resolves the default measurementPeriodEnd to end of day, since the default is date-only', () => {
      expect(DEFAULT_MEASUREMENT_PERIOD_END).toEqual('2019-12-31');

      const { endCql } = getCQLIntervalEndpoints({});

      expect(endCql.toJSDate().toISOString()).toEqual('2019-12-31T23:59:59.999Z');
    });

    // The start is the opposite case and is already correct: "2019-01-01" means from the very
    // beginning of that day, so it stays at midnight.
    test.each([
      ['a full date', '2019-01-01', '2019-01-01T00:00:00.000Z'],
      ['a year', '2019', '2019-01-01T00:00:00.000Z']
    ])('leaves %s measurementPeriodStart at the start of the period it names', (_, start, expected) => {
      const { startCql } = getCQLIntervalEndpoints({ measurementPeriodStart: start });

      expect(startCql.toJSDate().toISOString()).toEqual(expected);
    });
  });
});
