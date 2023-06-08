import { MeasureReport } from 'fhir/r4';
import { calculateMeasureReports } from '../../../src/calculation/Calculator';
import { getJSONFixture } from '../helpers/testHelpers';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('composite-weighted/composite-weighted-bundle.json');
const PATIENT_COMP1_NUMER_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-numer-comp2-numer-bundle.json'
);
const PATIENT_COMP1_DENOM_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-denom-comp2-numer-bundle.json'
);

describe('Composite measure weighted scoring', () => {
  it('should calculate weighted result for components', async () => {
    const { results } = await calculateMeasureReports(
      MEASURE_BUNDLE,
      [PATIENT_COMP1_NUMER_COMP2_NUMER, PATIENT_COMP1_DENOM_COMP2_NUMER],
      {
        measurementPeriodStart: '2023-01-01',
        measurementPeriodEnd: '2023-12-31',
        reportType: 'summary'
      }
    );

    expect(results).toBeDefined();
    const result = results as MeasureReport;
    expect(result.group?.[0].measureScore?.value).toBeDefined();
    expect(result.group?.[0].measureScore?.value).toEqual(0.625);
    // expect(patientResult).toBeDefined();
    // expect(patientResult.componentResults).toBeDefined();

    // const componentResults = patientResult.componentResults as ComponentResults[];

    // expect(componentResults).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       componentCanonical: COMPONENT_ONE_CANONICAL,
    //       populationResults: getPopulationResultAssertion({
    //         [PopulationType.IPP]: true,
    //         [PopulationType.DENOM]: true,
    //         [PopulationType.NUMER]: true
    //       })
    //     }),
    //     expect.objectContaining({
    //       componentCanonical: COMPONENT_TWO_CANONICAL,
    //       populationResults: getPopulationResultAssertion({
    //         [PopulationType.IPP]: true,
    //         [PopulationType.DENOM]: true,
    //         [PopulationType.NUMER]: true
    //       })
    //     })
    //   ])
    // );
  });
});
