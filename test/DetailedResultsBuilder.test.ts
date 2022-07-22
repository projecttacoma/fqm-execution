import * as DetailedResultsBuilder from '../src/calculation/DetailedResultsBuilder';

import { getJSONFixture } from './helpers/testHelpers';
import { PopulationType } from '../src/types/Enums';
import { StatementResults } from '../src/types/CQLTypes';
import { PopulationResult } from '../src/types/Calculator';
import { ELMExpressionRef, ELMQuery, ELMTuple } from '../src/types/ELMTypes';

type MeasureWithGroup = fhir4.Measure & {
  group: fhir4.MeasureGroup[];
};

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as MeasureWithGroup;
const simpleMeasureGroup = simpleMeasure.group[0];
const cvMeasureGroup = cvMeasure.group[0];

describe('DetailedResultsBuilder', () => {
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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: true }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: false },
        {
          populationType: PopulationType.MSRPOPLEX,
          criteriaExpression: 'Measure Population Exclusions',
          result: false
        },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

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
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: true },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: true },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });
  });

  describe('ELM JSON Function', () => {
    test('should properly generate ELM JSON given name and parameter', () => {
      const exampleFunctionName = 'exampleFunction';
      const exampleParameterName = 'exampleParameter';
      const fn = DetailedResultsBuilder.generateELMJSONFunction(exampleFunctionName, exampleParameterName);

      expect(fn.name).toEqual(`obs_func_${exampleFunctionName}_${exampleParameterName}`);
      expect(((fn.expression as ELMQuery).source[0].expression as ELMExpressionRef).name).toEqual(exampleParameterName);
      expect((fn.expression as ELMQuery).return).toBeDefined();
      expect((fn.expression as ELMQuery).return?.expression?.type).toEqual('Tuple');
      expect(((fn.expression as ELMQuery).return?.expression as ELMTuple).element).toEqual(
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
