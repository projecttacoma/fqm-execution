import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions, PopulationResult } from '../../../src/types/Calculator';
import { PopulationType } from '../../../src/types/Enums';
import { getJSONFixture } from '../helpers/testHelpers';

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
    if (!results.results[0].detailedResults) {
      fail('Population DetailedResults not found');
    }
    const popResults = results.results[0].detailedResults[0].populationResults as PopulationResult[];
    const numerResults = popResults.find(r => r.populationType === PopulationType.NUMER);
    const denomResults = popResults.find(r => r.populationType === PopulationType.DENOM);
    if (!numerResults || !denomResults) {
      fail('NUMER or DENOM results not found');
    }
    expect(numerResults.populationId).toBeDefined();
    expect(denomResults.populationId).toBeDefined();
    const numerObservResults = popResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === numerResults.populationId
    );
    const denomObservResults = popResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === denomResults.populationId
    );
    expect(numerObservResults).toBeDefined();
    expect(denomObservResults).toBeDefined();
    expect(numerObservResults?.observations).toEqual([1]);
    expect(denomObservResults?.observations).toEqual([1]);
  });

  it('does not put all results on observation usage of a function on one observation in episode results', async () => {
    const results = await calculate(MEASURE_BUNDLE, [PATIENT_BUNDLE], CALCULATION_OPTIONS);
    if (!results.results[0].detailedResults) {
      fail('Population DetailedResults not found');
    }
    const episodeResults = results.results[0].detailedResults[0].episodeResults?.find(
      r => r.episodeId === 'bdeb8195-8324-45ba-973f-b9bc7f02b973'
    );
    if (!episodeResults) {
      fail('Could not find results for Encounter episode with id "bdeb8195-8324-45ba-973f-b9bc7f02b973"');
    }

    const numerResults = episodeResults.populationResults.find(r => r.populationType === PopulationType.NUMER);
    const denomResults = episodeResults.populationResults.find(r => r.populationType === PopulationType.DENOM);
    if (!numerResults || !denomResults) {
      fail('NUMER or DENOM results not found');
    }
    expect(numerResults.populationId).toBeDefined();
    expect(denomResults.populationId).toBeDefined();
    const numerObervResults = episodeResults.populationResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === numerResults.populationId
    );
    const denomObervResults = episodeResults.populationResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === denomResults.populationId
    );
    expect(numerObervResults?.observations).toEqual([1]);
    expect(denomObervResults?.observations).toEqual([1]);
  });
});
