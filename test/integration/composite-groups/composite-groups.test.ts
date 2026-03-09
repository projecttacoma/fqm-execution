import { getJSONFixture, getPopulationResultAssertion } from '../helpers/testHelpers';
import { calculate, calculateMeasureReports } from '../../../src/calculation/Calculator';
import { ComponentResults, PopulationType } from '../../../src';
import { CompositeMeasureReport } from '../../../src/calculation/CompositeReportBuilder';

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

  it('should calculate composite all-or-nothing (group 1) and weighted (group 2) measure report across both patients', async () => {
    const { results } = await calculateMeasureReports(
      MEASURE_BUNDLE,
      [PATIENT_COMP1_NUMER_COMP2_NUMER_COMP3_NUMER, PATIENT_COMP1_DENOM_COMP2_NUMER_COMP3_DENOM],
      {
        measurementPeriodStart: '2023-01-01',
        measurementPeriodEnd: '2023-12-31',
        reportType: 'summary'
      }
    );

    expect(results).toBeDefined();
    const result = results as CompositeMeasureReport;
    // all or nothing component
    expect(result.group[0].measureScore?.value).toBeDefined();
    // Expected numerator calculation: 1 patient
    expect(result.group[0].population[1].count).toEqual(1);
    // Expected denominator calculation: 2 patients
    expect(result.group[0].population[0].count).toEqual(2);
    // Expected measure score calculation: (numerator 1) / (denominator 2)
    expect(result.group[0].measureScore?.value).toEqual(0.5);

    // weighted component
    expect(result.group[1].measureScore?.value).toBeDefined();
    // Expected numerator calculation: (comp1weight 3) x (comp1score .5) + (comp2weight 1) x (comp2score 1)
    expect(result.group[1].population[1].count).toEqual(2.5);
    // Expected denominator calculation: (comp1weight 3) x 1 + (comp2weight 1) x 1
    expect(result.group[1].population[0].count).toEqual(4);
    // Expected measure score calculation: (numerator 2.5) / (denominator 4)
    expect(result.group[1].measureScore?.value).toEqual(0.625);
  });
});
