import * as CalculatorHelpers from '../src/CalculatorHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { getJSONFixture } from './helpers/testHelpers';
import { PopulationType } from '../src/types/Enums';
import { StatementResults } from '../src/types/CQLTypes';
import { PopulationResult } from '../src/types/Calculator';

type MeasureWithGroup = R4.IMeasure & {
  group: R4.IMeasure_Group[];
};

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as MeasureWithGroup;
const simpleMeasureGroup = simpleMeasure.group[0];
const cvMeasureGroup = cvMeasure.group[0];

describe('CalculatorHelpers', () => {
  describe('getAllDependentValuesets', () => {
    test('Finds all valuesets that are missing in the standard measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json');
      const vs = CalculatorHelpers.getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(0);
    });
    test('Finds all valuesets that are missing in the missingVS measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes-missingVS.json');
      const vs = CalculatorHelpers.getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(1);
      expect(vs[0]).toEqual('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016');
    });
  });

  describe('Population Values', () => {
    test('NUMER population not modified by inclusion in NUMEX', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': false,
        Numerator: true,
        'Numerator Exclusion': true
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: true }
      ];

      const results = CalculatorHelpers.createPopulationValues(simpleMeasure, simpleMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('NUMEX membership removed when not a member of NUMER', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': false,
        Numerator: false,
        'Numerator Exclusion': true
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(simpleMeasure, simpleMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('NUMEX membership removed when not a member of DENOM', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: false,
        'Denominator Exclusion': false,
        Numerator: false,
        'Numerator Exclusion': true
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(simpleMeasure, simpleMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('DENOM population not modified by inclusion in DENEX', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': true,
        Numerator: false,
        'Numerator Exclusion': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(simpleMeasure, simpleMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('DENEX membership removed when not a member of DENOM', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: false,
        'Denominator Exclusion': true,
        Numerator: false,
        'Numerator Exclusion': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(simpleMeasure, simpleMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('MSRPOPLEX should be 0 if MSRPOPL not satisfied', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        'Measure Population': false,
        'Measure Population Exclusion': true,
        'Measure Observation': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.MSRPOPL, result: false },
        { populationType: PopulationType.MSRPOPLEX, result: false },
        { populationType: PopulationType.OBSERV, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test.skip('MSRPOPLEX should be unchanged if MSRPOPL satisfied', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        'Measure Population': true,
        'Measure Population Exclusion': true,
        'Measure Observation': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.MSRPOPL, result: true },
        { populationType: PopulationType.MSRPOPLEX, result: true },
        { populationType: PopulationType.OBSERV, result: false }
      ];

      const results = CalculatorHelpers.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });
  });

  describe('ELM JSON Function', () => {
    test('should properly generate ELM JSON given name and parameter', () => {
      const exampleFunctionName = 'exampleFunction';
      const exampleParameterName = 'exampleParameter';
      const fn = CalculatorHelpers.generateELMJSONFunction(exampleFunctionName, exampleParameterName);

      expect(fn.name).toEqual(`obs_func_${exampleFunctionName}_${exampleParameterName}`);
      expect(fn.expression.source[0].expression.name).toEqual(exampleParameterName);
      expect(fn.expression.return).toBeDefined();
      expect(fn.expression.return.expression.type).toEqual('Tuple');
      expect(fn.expression.return.expression.element).toEqual(
        expect.arrayContaining([
          {
            name: 'observation',
            value: {
              name: exampleFunctionName,
              type: 'FunctionRef',
              operand: [
                {
                  name: 'MP',
                  type: 'AliasRef'
                }
              ]
            }
          }
        ])
      );
    });
  });
});
