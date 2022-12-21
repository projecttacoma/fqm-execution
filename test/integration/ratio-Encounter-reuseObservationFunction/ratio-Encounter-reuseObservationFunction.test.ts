import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions } from '../../../src/types/Calculator';
import { readFileSync } from 'fs';

/**
 * Retrieves JSON fixture from the integration directory for easier ts casting in test files
 */
export function getJSONFixture(path: string): any {
  return JSON.parse(readFileSync(`test/integration/${path}`).toString());
}

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
  it('calculates ipp patient into ipp', async () => {
    const results = await calculate(MEASURE_BUNDLE, [PATIENT_BUNDLE], CALCULATION_OPTIONS);
    if (results.results[0].detailedResults) {
      console.log(results.results[0].detailedResults[0].populationResults);
    }
    debugger;
  });
});
