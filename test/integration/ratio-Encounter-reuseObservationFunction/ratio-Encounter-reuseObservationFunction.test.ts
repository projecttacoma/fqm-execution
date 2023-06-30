import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions } from '../../../src/types/Calculator';
import { PopulationType } from '../../../src/types/Enums';
import {
  getJSONFixture,
  getGroupByIndex,
  assertGroupObservations,
  assertEpisodeObservations
} from '../helpers/testHelpers';

const CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2022-01-01',
  measurementPeriodEnd: '2022-12-31',
  enableDebugOutput: true
};

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/ratio-Encounter-reuseObservationFunction-bundle.json'
);

const PATIENT_2ENC_1IN_ALL: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-1in-all-1daylong.json'
);

const PATIENT_2ENC_1IN_NUMER_ONLY: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-1in-numer-only.json'
);

const PATIENT_2ENC_1IN_DENOM_ONLY: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-1in-denom-only.json'
);

const PATIENT_2ENC_2IN_DENOM_1IN_NUMER: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-2in-denom-1in-numer.json'
);

const PATIENT_2ENC_1IN_DENOM_1IN_NUMER: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-1in-denom-1in-numer.json'
);

const PATIENT_3ENC_1IN_ALL_2IN_DENOM: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-3enc-1in-all-2in-denom.json'
);

describe('ratio Encounter reuse observation function measure', () => {
  describe('encounter in NUMER and DENOM', () => {
    it('does not put all results on observation usage of a function on one observation in population results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_ALL], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [1], PopulationType.DENOM);
      assertGroupObservations(group, [1], PopulationType.NUMER);
    });

    it('does not put all results on observation usage of a function on one observation in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_ALL], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);
      const episodeId = 'bdeb8195-8324-45ba-973f-b9bc7f02b973';

      assertEpisodeObservations(group, episodeId, [1], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, [1], PopulationType.NUMER);
    });
  });

  describe('encounter in NUMER only', () => {
    it('allows for a NUMER only encounter', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_NUMER_ONLY], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, undefined, PopulationType.DENOM);
      assertGroupObservations(group, [1], PopulationType.NUMER);
    });

    it('allows for a NUMER only encounter in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_NUMER_ONLY], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);
      const episodeId = 'b989e830-eddb-48a7-b7a2-12991866ee5b';

      assertEpisodeObservations(group, episodeId, undefined, PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, [1], PopulationType.NUMER);
    });
  });

  describe('encounter in DENOM only', () => {
    it('allows for a DENOM only encounter', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_DENOM_ONLY], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [1], PopulationType.DENOM);
      assertGroupObservations(group, undefined, PopulationType.NUMER);
    });

    it('allows for a DENOM only encounter in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_DENOM_ONLY], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);
      const episodeId = 'e34c63d2-3bc9-43ff-bdf4-2edc06ed720e';

      assertEpisodeObservations(group, episodeId, [1], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, undefined, PopulationType.NUMER);
    });
  });

  describe('2 encounter in DENOM, 1 in NUMER', () => {
    it('allows for both in DENOM and one in NUMER', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_2IN_DENOM_1IN_NUMER], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [1, 3], PopulationType.DENOM);
      assertGroupObservations(group, [3], PopulationType.NUMER);
    });

    it('allows for both in DENOM and one in NUMER in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_2IN_DENOM_1IN_NUMER], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      const episodeIdDenomNumer = '1c99e052-c4f1-412b-b0e0-721bb275a091';
      assertEpisodeObservations(group, episodeIdDenomNumer, [3], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenomNumer, [3], PopulationType.NUMER);

      const episodeIdDenomOnly = 'e7f2b9f4-5be0-4a6b-8602-8721949f1885';
      assertEpisodeObservations(group, episodeIdDenomOnly, [1], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenomOnly, undefined, PopulationType.NUMER);
    });
  });

  describe('2 encounter, 1 in DENOM, 1 in NUMER', () => {
    it('allows for one in DENOM and one in NUMER', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_DENOM_1IN_NUMER], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [1], PopulationType.DENOM);
      assertGroupObservations(group, [3], PopulationType.NUMER);
    });

    it('allows for one in DENOM and one in NUMER in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_2ENC_1IN_DENOM_1IN_NUMER], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      const episodeIdDenomOnly = '99da356c-0344-496a-bd48-bee6f797e175';
      assertEpisodeObservations(group, episodeIdDenomOnly, [1], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenomOnly, undefined, PopulationType.NUMER);

      const episodeIdNumerOnly = 'f9de7f21-953a-4bf1-a17c-599eb0b8f533';
      assertEpisodeObservations(group, episodeIdNumerOnly, undefined, PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdNumerOnly, [3], PopulationType.NUMER);
    });
  });

  describe('3 encounter, 1 in DENOM/NUMER, 2 in DENOM', () => {
    it('allows for one in DENOM and one in NUMER', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_3ENC_1IN_ALL_2IN_DENOM], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [1, 3, 2], PopulationType.DENOM);
      assertGroupObservations(group, [1], PopulationType.NUMER);
    });

    it('allows for one in DENOM and one in NUMER in episode results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_3ENC_1IN_ALL_2IN_DENOM], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      const episodeIdDenomNumer = '73dd8d81-77d8-46e7-984c-a3db88797d43';
      assertEpisodeObservations(group, episodeIdDenomNumer, [1], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenomNumer, [1], PopulationType.NUMER);

      const episodeIdDenom1 = 'ae5a5635-f2ed-40d4-a1bd-ec93181ae30a';
      assertEpisodeObservations(group, episodeIdDenom1, [3], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenom1, undefined, PopulationType.NUMER);

      const episodeIdDenom2 = '4af3c69d-ada0-4a2e-99d2-dd53b7c0e16c';
      assertEpisodeObservations(group, episodeIdDenom2, [2], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeIdDenom2, undefined, PopulationType.NUMER);
    });

    it('shows pretty results for 3 encounter result', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT_3ENC_1IN_ALL_2IN_DENOM], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);
      const denomResult = group.statementResults.find(s => s.statementName === 'denom');

      expect(denomResult).toBeDefined();
      expect(denomResult?.pretty).toEqual(
        '[Encounter\nID: 73dd8d81-77d8-46e7-984c-a3db88797d43\nPERIOD: 10/08/2022 7:36 AM - 10/09/2022 7:36 AM\nTYPE: [exampleSystem exampleCode],\nEncounter\nID: ae5a5635-f2ed-40d4-a1bd-ec93181ae30a\nPERIOD: 03/11/2022 10:35 PM - 03/14/2022 10:35 PM\nTYPE: [exampleSystem exampleCode],\nEncounter\nID: 4af3c69d-ada0-4a2e-99d2-dd53b7c0e16c\nPERIOD: 03/06/2022 6:32 PM - 03/08/2022 6:32 PM\nTYPE: [exampleSystem exampleCode]]'
      );
    });
  });
});
