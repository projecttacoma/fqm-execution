import { calculate } from '../../../src/calculation/Calculator';
import { CalculationOptions, DetailedPopulationGroupResult } from '../../../src/types/Calculator';
import { getJSONFixture, getGroupByIndex } from '../helpers/testHelpers';

const CALCULATION_OPTIONS: CalculationOptions = {
  measurementPeriodStart: '2022-01-01',
  measurementPeriodEnd: '2022-12-31'
};

const MEASURE: fhir4.Bundle = getJSONFixture('pretty-various-types/pretty-various-types-bundle.json');

const PATIENT: fhir4.Bundle = getJSONFixture('pretty-various-types/patients/detailed-encounter.json');

describe('calculates pretty results for various types', () => {
  let group: DetailedPopulationGroupResult;
  beforeAll(async () => {
    const results = await calculate(MEASURE, [PATIENT], CALCULATION_OPTIONS);
    group = getGroupByIndex(0, results.results[0]);
  });

  it('calculates pretty resource list', () => {
    const resourceListResult = group.statementResults.find(s => s.statementName === 'FHIR Encounter List');
    expect(resourceListResult).toBeDefined();
    expect(resourceListResult?.pretty).toEqual(
      '[Encounter\nID: test-enc\nPERIOD: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM\nTYPE: [[https://loinc.org asdf,\n      https://loinc.org zxcv]]]'
    );
  });

  it('calculates pretty resource singleton', () => {
    const resourceSingleResult = group.statementResults.find(s => s.statementName === 'FHIR Encounter Single');
    expect(resourceSingleResult).toBeDefined();
    expect(resourceSingleResult?.pretty).toEqual(
      'Encounter\nID: test-enc\nPERIOD: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM\nTYPE: [[https://loinc.org asdf,\n      https://loinc.org zxcv]]'
    );
  });

  it('calculates pretty codeable concept', () => {
    const codeableConceptResult = group.statementResults.find(s => s.statementName === 'FHIR CodeableConcept');
    expect(codeableConceptResult).toBeDefined();
    expect(codeableConceptResult?.pretty).toEqual(
      'CONCEPT: \n  [CODE: https://loinc.org asdf,\n   CODE: https://loinc.org zxcv]'
    );
  });

  it('calculates pretty coding', () => {
    const codingResult = group.statementResults.find(s => s.statementName === 'FHIR Coding');
    expect(codingResult).toBeDefined();
    expect(codingResult?.pretty).toEqual('CODE: https://loinc.org asdf');
  });

  it('calculates pretty dateTime', () => {
    const dateTimeResult = group.statementResults.find(s => s.statementName === 'FHIR DateTime');
    expect(dateTimeResult).toBeDefined();
    expect(dateTimeResult?.pretty).toEqual('01/01/2022 12:00:00 AM');
  });

  it('calculates pretty date', () => {
    const dateResult = group.statementResults.find(s => s.statementName === 'FHIR Date');
    expect(dateResult).toBeDefined();
    expect(dateResult?.pretty).toEqual('01/01/2001');
  });

  it('calculates pretty period', () => {
    const periodResult = group.statementResults.find(s => s.statementName === 'FHIR Period');
    expect(periodResult).toBeDefined();
    expect(periodResult?.pretty).toEqual('PERIOD: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM');
  });

  it('calculates pretty code', () => {
    const codeResult = group.statementResults.find(s => s.statementName === 'FHIR code');
    expect(codeResult).toBeDefined();
    expect(codeResult?.pretty).toEqual('ENCOUNTERSTATUS: final');
  });

  it('calculates pretty duration', () => {
    const durationResult = group.statementResults.find(s => s.statementName === 'FHIR duration');
    expect(durationResult).toBeDefined();
    expect(durationResult?.pretty).toEqual('DURATION: 1 days');
  });

  it('calculates pretty identifier', () => {
    const identifierResult = group.statementResults.find(s => s.statementName === 'FHIR Identifier');
    expect(identifierResult).toBeDefined();
    expect(identifierResult?.pretty).toEqual('IDENTIFIER: test-patient-dcc365cd-3327-4fe9-b045-467428a201af');
  });

  it('calculates pretty reference', () => {
    const referenceResult = group.statementResults.find(s => s.statementName === 'FHIR Reference');
    expect(referenceResult).toBeDefined();
    expect(referenceResult?.pretty).toEqual(
      '(atypical type) REFERENCE: \n{\n  "reference": {\n    "value": "Patient/123"\n  }\n}'
    );
  });

  it('calculates pretty string', () => {
    const stringResult = group.statementResults.find(s => s.statementName === 'FHIR String');
    expect(stringResult).toBeDefined();
    expect(stringResult?.pretty).toEqual('STRING: Schamberger741');
  });

  it('calculates pretty ratio', () => {
    const ratioResult = group.statementResults.find(s => s.statementName === 'FHIR Ratio');
    expect(ratioResult).toBeDefined();
    expect(ratioResult?.pretty).toEqual('RATIO: (2.7 mmol/l)/(6.3 mmol/l)');
  });

  it('calculates nested, complex fhir object', () => {
    const complexResult = group.statementResults.find(s => s.statementName === 'Kitchen Sink');
    expect(complexResult).toBeDefined();
    expect(complexResult?.pretty).toEqual(
      '{\n  fhirCode: final,\n  fhirCodeableConcept: [https://loinc.org asdf,\n                       https://loinc.org zxcv],\n  fhirCoding: https://loinc.org asdf,\n  fhirDate: 01/01/2001,\n  fhirDateTime: 01/01/2022 12:00:00 AM,\n  fhirDuration: 1 days,\n  fhirEncounterList: [Encounter\n                     ID: test-enc\n                     PERIOD: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM\n                     TYPE: [[https://loinc.org asdf,\n                           https://loinc.org zxcv]]],\n  fhirEncounterSingle: Encounter\n                       ID: test-enc\n                       PERIOD: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM\n                       TYPE: [[https://loinc.org asdf,\n                             https://loinc.org zxcv]],\n  fhirIdentifier: test-patient-dcc365cd-3327-4fe9-b045-467428a201af,\n  fhirPeriod: 01/01/2022 12:00:00 AM - 01/03/2022 12:00:00 AM,\n  fhirRatio: (2.7 mmol/l)/(6.3 mmol/l),\n  fhirReference: (atypical type) \n{\n  "reference": {\n    "value": "Patient/123"\n  }\n},\n  fhirString: Schamberger741,\n  systemCode: http://example.com asdf, A S D F,\n  systemDateTime: 01/01/2022 12:00:00 AM,\n  systemInterval: 01/01/2022 12:00:00 AM - 12/31/2022 12:00:00 AM,\n  systemTyple: [{\n    id: test-enc\n  }]\n}'
    );
  });
});
