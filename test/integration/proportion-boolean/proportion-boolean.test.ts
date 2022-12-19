import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions } from '../../../src/types/Calculator';
import { assertPopulationResults, getJSONFixture } from '../helpers/testHelpers';

const DEFAULT_CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2022-01-01',
  measurementPeriodEnd: '2022-12-31'
};

const EARLIER_PERIOD_CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2020-01-01',
  measurementPeriodEnd: '2020-12-31'
};

const IPP_PATIENT_BUNDLE: fhir4.Bundle = getJSONFixture('proportion-boolean/patients/patient-ipp-bundle.json');
const DENOM_PATIENT_BUNDLE: fhir4.Bundle = getJSONFixture('proportion-boolean/patients/patient-denom-bundle.json');
const NUMER_PATIENT_BUNDLE: fhir4.Bundle = getJSONFixture('proportion-boolean/patients/patient-numer-bundle.json');
const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('proportion-boolean/proportion-boolean-bundle.json');

describe('proportion boolean measure', () => {
  it('calculates ipp patient into ipp', async () => {
    const results = await calculate(MEASURE_BUNDLE, [IPP_PATIENT_BUNDLE], DEFAULT_CALCULATION_OPTIONS);
    assertPopulationResults(results.results[0], { 'initial-population': true, denominator: false, numerator: false });
  });

  it('calculates denom patient into denom', async () => {
    const results = await calculate(MEASURE_BUNDLE, [DENOM_PATIENT_BUNDLE], DEFAULT_CALCULATION_OPTIONS);
    assertPopulationResults(results.results[0], { 'initial-population': true, denominator: true, numerator: false });
  });

  it('calculates numer patient into numer', async () => {
    const results = await calculate(MEASURE_BUNDLE, [NUMER_PATIENT_BUNDLE], DEFAULT_CALCULATION_OPTIONS);
    assertPopulationResults(results.results[0], { 'initial-population': true, denominator: true, numerator: true });
  });

  it('calculates numer into denom for different measurement period', async () => {
    const results = await calculate(MEASURE_BUNDLE, [IPP_PATIENT_BUNDLE], EARLIER_PERIOD_CALCULATION_OPTIONS);
    assertPopulationResults(results.results[0], { 'initial-population': false, denominator: false, numerator: false });
  });
});
