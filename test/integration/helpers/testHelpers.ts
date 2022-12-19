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
 * Formats expectedPopulations object into an array of objects which can be passed into an
 * expect.arrayContaining and compared with result
 */
export function assertPopulationResults(
  result: ExecutionResult<DetailedPopulationGroupResult>,
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
      detailedResults: expect.arrayContaining([
        expect.objectContaining({
          populationResults: expectedPopulationResults
        })
      ])
    })
  );
}
