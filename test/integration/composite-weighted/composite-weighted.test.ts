import { calculateMeasureReports } from '../../../src/calculation/Calculator';
import { getJSONFixture } from '../helpers/testHelpers';
import { CompositeMeasureReport } from '../../../src/calculation/CompositeReportBuilder';

const MEASURE_BUNDLE: fhir4.Bundle = getJSONFixture('composite-weighted/composite-weighted-bundle.json');
const PATIENT_COMP1_NUMER_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-weighted/patients/patient-comp1-numer-comp2-numer-bundle.json'
);
const PATIENT_COMP1_DENOM_COMP2_NUMER: fhir4.Bundle = getJSONFixture(
  'composite-weighted/patients/patient-comp1-denom-comp2-numer-bundle.json'
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
    const result = results as CompositeMeasureReport;
    expect(result.group[0].measureScore?.value).toBeDefined();
    // Expected numerator calculation: (comp1weight 3) x (comp1score .5) + (comp2weight 1) x (comp2score 1)
    expect(result.group[0].population?.find(e => e.code?.coding?.[0].code === 'numerator')?.count).toEqual(2.5);
    // Expected denominator calculation: (comp1weight 3) + (comp2score 1)
    expect(result.group[0].population?.find(e => e.code?.coding?.[0].code === 'denominator')?.count).toEqual(4);
    // Expected measure score calculation: (numerator 2.5) / (denominator 4)
    expect(result.group[0].measureScore?.value).toEqual(0.625);
  });
});
