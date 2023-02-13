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
  'ratio-Encounter-fullyLoadedWithReuseObservationFunction/measureBundle.json'
);

const PATIENT: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-fullyLoadedWithReuseObservationFunction/patients/measureTestcase.json'
);

describe('ratio Encounter fully loaded measure', () => {
  describe('three encounters various status', () => {
    it('gets correct results', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      assertGroupObservations(group, [3, 3, 3], PopulationType.DENOM);
      assertGroupObservations(group, [3], PopulationType.NUMER);
    });

    it('gets correct results per encounter', async () => {
      const results = await calculate(MEASURE_BUNDLE, [PATIENT], CALCULATION_OPTIONS);
      const group = getGroupByIndex(0, results.results[0]);

      let episodeId = 'Encounter-1';
      assertEpisodeObservations(group, episodeId, [3], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, [3], PopulationType.NUMER);

      episodeId = 'Encounter-2';
      assertEpisodeObservations(group, episodeId, [3], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, undefined, PopulationType.NUMER);

      episodeId = 'Encounter-3';
      assertEpisodeObservations(group, episodeId, [3], PopulationType.DENOM);
      assertEpisodeObservations(group, episodeId, undefined, PopulationType.NUMER);
    });
  });
});
