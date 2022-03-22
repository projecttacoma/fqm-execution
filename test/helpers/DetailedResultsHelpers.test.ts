import { pruneDetailedResults, isDetailedResult } from '../../src/helpers/DetailedResultsHelpers';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult
} from '../../src/types/Calculator';

describe('pruneDetailedResults', () => {
  test('should not change result with no detailedResults', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient'
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
    (pruned[0].detailedResults as any[]).forEach(er => {
      // These should be removed
      expect(er.statementResults).toBeUndefined();
      expect(er.clauseResults).toBeUndefined();
      expect(er.html).toBeUndefined();
      expect(er.populationRelevance).toBeUndefined();

      // These should be persisted
      expect(er.populationResults).toEqual([]);
      expect(er.stratifierResults).toEqual([]);
      expect(er.episodeResults).toEqual([]);
    });
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
