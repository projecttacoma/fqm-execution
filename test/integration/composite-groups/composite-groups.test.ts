import { getJSONFixture, getPopulationResultAssertion } from '../helpers/testHelpers';
import { calculate } from '../../../src/calculation/Calculator';
import { ComponentResults, PopulationType } from '../../../src';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('composite-groups/composite-groups-bundle.json');

const PATIENT_COMP1_DENOM_COMP2_NUMER_COMP3_DENOM: fhir4.Bundle = getJSONFixture(
  'composite-groups/patients/patient-comp1-denom-comp2-numer-comp3-denom-bundle.json'
);
const PATIENT_COMP1_NUMER_COMP2_NUMER_COMP3_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-groups/patients/patient-comp1-numer-comp2-numer-comp3-numer-bundle.json'
);

const COMPONENT_ONE_CANONICAL = 'http://example.com/Measure/measure-GroupComponentOne|0.0.1';
const COMPONENT_TWO_CANONICAL = 'http://example.com/Measure/measure-GroupComponentTwo|0.0.1';
const COMPONENT_THREE_CANONICAL = 'http://example.com/Measure/measure-GroupComponentThree|0.0.1';

describe('Composite measure defined at the Measure.group level', () => {
  it('should calculate overall numerator patient into numerator for all three components', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_NUMER_COMP2_NUMER_COMP3_NUMER], {
      measurementPeriodStart: '2023-01-01',
      measurementPeriodEnd: '2023-12-31'
    });

    expect(results).toHaveLength(1);

    const patientResult = results[0];
    expect(patientResult).toBeDefined();
    expect(patientResult.componentResults).toBeDefined();

    const componentResults = patientResult.componentResults as ComponentResults[];

    expect(componentResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentCanonical: COMPONENT_ONE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: true
          })
        }),
        expect.objectContaining({
          componentCanonical: COMPONENT_TWO_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: true
          })
        }),
        expect.objectContaining({
          componentCanonical: COMPONENT_THREE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: true
          })
        })
      ])
    );
  });

  it('should calculate comp1 denom comp2 numer comp3 denom patient into numerator for component 2 and into the denominator for components 1 and 3', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_DENOM_COMP2_NUMER_COMP3_DENOM], {
      measurementPeriodStart: '2023-01-01',
      measurementPeriodEnd: '2023-12-31'
    });

    expect(results).toHaveLength(1);

    const patientResult = results[0];
    expect(patientResult).toBeDefined();
    expect(patientResult.componentResults).toBeDefined();

    const componentResults = patientResult.componentResults as ComponentResults[];

    expect(componentResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentCanonical: COMPONENT_ONE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: false
          })
        }),
        expect.objectContaining({
          componentCanonical: COMPONENT_TWO_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: true
          })
        }),
        expect.objectContaining({
          componentCanonical: COMPONENT_THREE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: false
          })
        })
      ])
    );
  });
});
