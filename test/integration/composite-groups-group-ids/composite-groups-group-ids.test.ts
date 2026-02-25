import { getJSONFixture, getPopulationResultAssertion } from '../helpers/testHelpers';
import { calculate } from '../../../src/calculation/Calculator';
import { ComponentResults, PopulationType } from '../../../src';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture(
  'composite-groups-group-ids/composite-groups-group-ids-bundle.json'
);

const PATIENT_COMP1_1_DENOM_COMP1_2_NUMER_COMP2_DENOM: fhir4.Bundle = getJSONFixture(
  'composite-groups-group-ids/patients/patient-comp1-1-denom-comp1-2-numer-comp2-denom-bundle.json'
);
const PATIENT_COMP1_1_NUMER_COMP1_2_NUMER_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-groups-group-ids/patients/patient-comp1-1-numer-comp1-2-numer-comp2-numer-bundle.json'
);

const COMPONENT_ONE_CANONICAL = 'http://example.com/Measure/measure-GroupComponentOne|0.0.1';
const COMPONENT_TWO_CANONICAL = 'http://example.com/Measure/measure-GroupComponentTwo|0.0.1';

describe('Composite measure defined at the Measure.group level with groupId extensions', () => {
  it('should calculate overall numerator patient into numerator for all three components (two groups of one Measure and another Measure)', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_1_NUMER_COMP1_2_NUMER_COMP2_NUMER], {
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
          groupId: 'comp-1-group-1',
          componentCanonical: COMPONENT_ONE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: true
          })
        }),
        expect.objectContaining({
          groupId: 'comp-1-group-2',
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
        })
      ])
    );
  });

  it('should calculate comp1 group 1 denom comp1 group 2 numer comp2 denom patient into numerator for component 1 group 2 and into the denominator for component 1 group 1 and component 2', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_1_DENOM_COMP1_2_NUMER_COMP2_DENOM], {
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
          groupId: 'comp-1-group-1',
          componentCanonical: COMPONENT_ONE_CANONICAL,
          populationResults: getPopulationResultAssertion({
            [PopulationType.IPP]: true,
            [PopulationType.DENOM]: true,
            [PopulationType.NUMER]: false
          })
        }),
        expect.objectContaining({
          groupId: 'comp-1-group-2',
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
            [PopulationType.NUMER]: false
          })
        })
      ])
    );
  });
});
