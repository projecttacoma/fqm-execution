import { MeasureGroup, MeasureGroupPopulation } from 'fhir/r4';
import { MeasureBundleHelpers } from '../../src';
import { pruneDetailedResults, isDetailedResult, findObsMsrPopl } from '../../src/helpers/DetailedResultsHelpers';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult
} from '../../src/types/Calculator';
import { CQLPatient } from '../../src/types/CQLPatient';

describe('pruneDetailedResults', () => {
  test('should not change result with no detailedResults', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient'
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual(ers);
  });

  test('should persist patientObject and supplementalData', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        patientObject: {} as CQLPatient,
        supplementalData: []
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual(ers);
  });

  test('should remove html/clauseResults/statementResults/populationRelevance', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        detailedResults: [
          {
            groupId: 'group-0',
            statementResults: [],
            html: 'test',
            populationRelevance: [],
            clauseResults: [],
            stratifierResults: [],
            episodeResults: [],
            populationResults: []
          }
        ]
      }
    ];

    const pruned = pruneDetailedResults(ers);

    expect(pruned).toHaveLength(1);
    expect(pruned[0].detailedResults).toBeDefined();

    // Cast to any to allow assertions on pruned properties
    // Typescript will think they don't exist otherwise
    const [dr] = pruned[0].detailedResults as any;
    expect(dr).toBeDefined();

    // These should be removed
    expect(dr.statementResults).toBeUndefined();
    expect(dr.clauseResults).toBeUndefined();
    expect(dr.html).toBeUndefined();
    expect(dr.populationRelevance).toBeUndefined();

    // These should be persisted
    expect(dr.populationResults).toEqual([]);
    expect(dr.stratifierResults).toEqual([]);
    expect(dr.episodeResults).toEqual([]);
  });

  test('should remove evaluatedResource', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        evaluatedResource: []
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual([
      {
        patientId: 'test-patient'
      }
    ]);
  });
});

describe('isDetailedResult', () => {
  test('should return true for anything that contains statementResults', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains populationRelevance', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      populationRelevance: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains html', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      html: 'test'
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains clauseResults', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      clauseResults: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return false for only populationResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      populationResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });

  test('should return false for only stratifierResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      stratifierResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });

  test('should return false for only episodeResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      episodeResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });
});

describe('findObsMsrPopl', () => {
  test('should find basic measure population', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Measure Population' },
          code: {
            coding: [
              {
                code: 'measure-population',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Irrelevant' }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('measure-population');
  });

  test('should find numerator population for Numerator Observations', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Numerator' },
          code: {
            coding: [
              {
                code: 'numerator',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Numerator Observations' },
      code: {
        coding: [
          {
            code: 'measure-observation',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('numerator');
  });

  test('should find denominator population for Denominator Observations', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Denominator' },
          code: {
            coding: [
              {
                code: 'denominator',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Denominator Observations' },
      code: {
        coding: [
          {
            code: 'measure-observation',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('denominator');
  });
});
