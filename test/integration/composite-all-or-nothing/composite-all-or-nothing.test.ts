import { ComponentResults, PopulationType } from '../../../src';
import { calculate, calculateMeasureReports } from '../../../src/calculation/Calculator';
import { CompositeMeasureReport } from '../../../src/calculation/CompositeReportBuilder';
import { getJSONFixture, getPopulationResultAssertion } from '../helpers/testHelpers';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('composite-all-or-nothing/composite-all-or-nothing-bundle.json');
const PATIENT_COMP1_NUMER_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-numer-comp2-numer-bundle.json'
);
const PATIENT_COMP1_NUMER_COMP2_DENOM: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-numer-comp2-denom-bundle.json'
);
const PATIENT_COMP1_DENOM_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-denom-comp2-numer-bundle.json'
);
const PATIENT_COMP1_DENOM_COMP2_DENOM: fhir4.Bundle = getJSONFixture(
  'composite-all-or-nothing/patients/patient-comp1-denom-comp2-denom-bundle.json'
);

const COMPONENT_ONE_CANONICAL = 'http://example.com/Measure/measure-AllOrNothingComponentOne|0.0.1';
const COMPONENT_TWO_CANONICAL = 'http://example.com/Measure/measure-AllOrNothingComponentTwo|0.0.1';

describe('Composite measure all-or-nothing scoring', () => {
  it('should calculate overall numerator patient into numerator for both components', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_NUMER_COMP2_NUMER], {
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
        })
      ])
    );
  });

  it('should calculate comp1 numer comp2 denom into numer/denom for components', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_NUMER_COMP2_DENOM], {
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
            [PopulationType.NUMER]: false
          })
        })
      ])
    );
  });

  it('should calculate comp1 denom comp2 numer into denom/numer for components', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_DENOM_COMP2_NUMER], {
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
        })
      ])
    );
  });

  it('should calculate comp1 denom comp2 denom into denom/denom for components', async () => {
    const { results } = await calculate(MEASURE_BUNDLE, [PATIENT_COMP1_DENOM_COMP2_DENOM], {
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
            [PopulationType.NUMER]: false
          })
        })
      ])
    );
  });

  it('should calculate composite all-or-nothing measure report across all patients', async () => {
    const { results } = await calculateMeasureReports(
      MEASURE_BUNDLE,
      [
        PATIENT_COMP1_NUMER_COMP2_NUMER,
        PATIENT_COMP1_NUMER_COMP2_DENOM,
        PATIENT_COMP1_DENOM_COMP2_NUMER,
        PATIENT_COMP1_DENOM_COMP2_DENOM
      ],
      {
        measurementPeriodStart: '2023-01-01',
        measurementPeriodEnd: '2023-12-31',
        reportType: 'summary'
      }
    );

    expect(results).toBeDefined();
    const result = results as CompositeMeasureReport;
    // all or nothing results
    expect(result.group[0].measureScore?.value).toBeDefined();
    // Expected numerator calculation: 1 patient
    expect(result.group[0].population[1].count).toEqual(1);
    // Expected denominator calculation: 4 patients
    expect(result.group[0].population[0].count).toEqual(4);
    // Expected measure score calculation: (numerator 1) / (denominator 4)
    expect(result.group[0].measureScore?.value).toEqual(0.25);
  });
});
