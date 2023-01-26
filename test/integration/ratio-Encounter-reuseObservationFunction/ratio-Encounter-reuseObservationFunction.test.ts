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
});
