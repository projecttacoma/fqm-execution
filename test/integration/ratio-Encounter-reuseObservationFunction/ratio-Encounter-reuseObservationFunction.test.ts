import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions } from '../../../src/types/Calculator';
import { PopulationType } from '../../../src/types/Enums';
import {
  getJSONFixture,
  getGroupByIndex,
  getGroupPopulationResult,
  getEpisodePopulationResult
} from '../helpers/testHelpers';

const CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2022-01-01',
  measurementPeriodEnd: '2022-12-31',
  enableDebugOutput: true
};

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/ratio-Encounter-reuseObservationFunction-bundle.json'
);

const PATIENT_BUNDLE: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-2enc-1in-all-1daylong.json'
);

describe('ratio Encounter reuse observation function measure', () => {
  it('does not put all results on observation usage of a function on one observation in population results', async () => {
    const results = await calculate(MEASURE_BUNDLE, [PATIENT_BUNDLE], CALCULATION_OPTIONS);
    const group = getGroupByIndex(0, results.results[0]);

    const numerResults = getGroupPopulationResult(group, PopulationType.NUMER);
    const denomResults = getGroupPopulationResult(group, PopulationType.DENOM);
    expect(numerResults.populationId).toBeDefined();
    expect(denomResults.populationId).toBeDefined();
    const numerObservResults = getGroupPopulationResult(group, PopulationType.OBSERV, numerResults.populationId);
    const denomObservResults = getGroupPopulationResult(group, PopulationType.OBSERV, denomResults.populationId);
    expect(numerObservResults?.observations).toEqual([1]);
    expect(denomObservResults?.observations).toEqual([1]);
  });

  it('does not put all results on observation usage of a function on one observation in episode results', async () => {
    const results = await calculate(MEASURE_BUNDLE, [PATIENT_BUNDLE], CALCULATION_OPTIONS);
    const group = getGroupByIndex(0, results.results[0]);
    const episodeId = 'bdeb8195-8324-45ba-973f-b9bc7f02b973';
    const numerResults = getEpisodePopulationResult(group, episodeId, PopulationType.NUMER);
    const denomResults = getEpisodePopulationResult(group, episodeId, PopulationType.DENOM);
    expect(numerResults.populationId).toBeDefined();
    expect(denomResults.populationId).toBeDefined();
    const numerObservResults = getEpisodePopulationResult(
      group,
      episodeId,
      PopulationType.OBSERV,
      numerResults.populationId
    );
    const denomObservResults = getEpisodePopulationResult(
      group,
      episodeId,
      PopulationType.OBSERV,
      denomResults.populationId
    );
    expect(numerObservResults?.observations).toEqual([1]);
    expect(denomObservResults?.observations).toEqual([1]);
  });
});
