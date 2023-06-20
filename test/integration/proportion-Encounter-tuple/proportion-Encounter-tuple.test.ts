import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions } from '../../../src/types/Calculator';
import { getJSONFixture, getGroupByIndex } from '../helpers/testHelpers';

const CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2022-01-01',
  measurementPeriodEnd: '2022-12-31',
  enableDebugOutput: true
};

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture(
  'proportion-Encounter-tuple/proportion-Encounter-tuple-bundle.json'
);

const PATIENT_2ENC_1DAY_3DAY: fhir4.Bundle = getJSONFixture(
  'proportion-Encounter-tuple/patients/patient-2Enc-1day-3day.json'
);

describe('proportion Encounter tuple usage', () => {
  describe('encounter with one day and encounter with 3 days', () => {
    it('calculates raw results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1DAY_3DAY], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      // grab the tuple resulting statement and check the durationDays part of the tuples are right.
      const tupleResult = group.statementResults.find(s => s.statementName === 'Enc with Durations');
      expect(tupleResult).toBeDefined();
      expect(tupleResult?.raw[0].durationDays).toEqual(1);
      expect(tupleResult?.raw[1].durationDays).toEqual(3);
    });
  });
});
