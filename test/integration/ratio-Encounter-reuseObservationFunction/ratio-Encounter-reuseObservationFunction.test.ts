import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions, PopulationResult } from '../../../src/types/Calculator';
import { PopulationType } from '../../../src/types/Enums';
import { getJSONFixture } from '../helpers/testHelpers';

const CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2023-01-01',
  measurementPeriodEnd: '2023-12-31',
  enableDebugOutput: true
};

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/ratio-Encounter-reuseObservationFunction-bundle.json'
);

const PATIENT_BUNDLE: fhir4.Bundle = getJSONFixture(
  'ratio-Encounter-reuseObservationFunction/patients/patient-bundle.json'
);

describe('ratio Encounter reuse observation function measure', () => {
  it('does not put all results on observation usage of a function on one observation', async () => {
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
    const numerObervResults = popResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === numerResults.populationId
    );
    expect(numerObervResults?.observations).toEqual([1]);
    const denomObervResults = popResults.find(
      r => r.populationType === PopulationType.OBSERV && r.criteriaReferenceId === denomResults.populationId
    );
    expect(denomObervResults?.observations).toEqual([1]);
  });
});
