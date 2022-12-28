import { readFileSync } from 'fs';
import { DetailedPopulationGroupResult, ExecutionResult, PopulationResult } from '../../../src/types/Calculator';
import { PopulationType } from '../../../src/types/Enums';

/**
 * Retrieves JSON fixture from the integration directory for easier ts casting in test files
 */
export function getJSONFixture(path: string): any {
  return JSON.parse(readFileSync(`test/integration/${path}`).toString());
}

/**
 * Parses through the execution result and asserts that the population group at the specified index exists.
 * Returns that group if so
 */
export function getGroupByIndex(
  index: number,
  results: ExecutionResult<DetailedPopulationGroupResult>
): DetailedPopulationGroupResult {
  expect(results?.detailedResults?.length).toBeGreaterThan(index);
  const resultsGroup = results?.detailedResults?.[index];
  expect(resultsGroup).toBeDefined();
  return resultsGroup as DetailedPopulationGroupResult;
}

/**
 * Formats expectedPopulations object into an array of objects which can be passed into an
 * expect.arrayContaining and compared with result
 */
export function assertPopulationResults(
  result: DetailedPopulationGroupResult,
  expectedPopulations: Partial<Record<PopulationType, boolean>>
) {
  const expectedPopulationResults: PopulationResult[] = Object.entries(expectedPopulations).map(([popType, value]) =>
    expect.objectContaining({
      populationType: popType as PopulationType,
      result: value
    })
  );
  expect(result).toEqual(
    expect.objectContaining({
      populationResults: expect.arrayContaining(expectedPopulationResults)
    })
  );
}
