import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions, DetailedPopulationGroupResult } from '../../../src/types/Calculator';
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
    let group: DetailedPopulationGroupResult;
    beforeAll(async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1DAY_3DAY], CALCULATION_OPTIONS);
      group = getGroupByIndex(0, results.results[0]);
    });
    it('calculates raw Tuple results', () => {
      // grab the tuple resulting statement
      const tupleResult = group.statementResults.find(s => s.statementName === 'Enc with Durations');
      // check the raw durationDays part of the tuples are correct
      expect(tupleResult).toBeDefined();
      expect(tupleResult?.raw[0].durationDays).toEqual(1);
      expect(tupleResult?.raw[1].durationDays).toEqual(3);
    });

    it('calculates pretty Tuple', () => {
      // grab the tuple resulting statement
      const tupleResult = group.statementResults.find(s => s.statementName === 'Enc with Durations');
      // check pretty does appropriate brackets and spacing
      expect(tupleResult).toBeDefined();
      expect(tupleResult?.pretty).toEqual(
        '[{\n  durationDays: 1,\n  encounter: ENCOUNTER\n             ID: enc-1-day\n             PERIOD: 09/17/2022 4:16 AM - 09/18/2022 4:16 AM\n             TYPE: [exampleSystem exampleCode]\n},\n{\n  durationDays: 3,\n  encounter: ENCOUNTER\n             ID: enc-3-day\n             PERIOD: 04/15/2022 3:15 PM - 04/18/2022 3:15 PM\n             TYPE: [exampleSystem exampleCode]\n}]'
      );
    });

    it('calculates pretty Coding', () => {
      // grab the Coding result statement
      const codingResult = group.statementResults.find(s => s.statementName === 'Coding Result');
      expect(codingResult).toBeDefined();
      expect(codingResult?.pretty).toEqual('CODE: ActCode AMB, ambulatory');
    });

    it('calculates pretty CodeableConcept', () => {
      // grab the CodeableConcept result statement
      const codeableConceptResult = group.statementResults.find(s => s.statementName === 'CodeableConcept Result');
      expect(codeableConceptResult).toBeDefined();
      expect(codeableConceptResult?.pretty).toEqual('CONCEPT: exampleConcept\n  [CODE: exampleSystem exampleCode]');
    });
  });
});
