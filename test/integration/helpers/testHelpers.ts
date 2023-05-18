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

export function getPopulationResultAssertion(expectedPopulations: Partial<Record<PopulationType, boolean>>) {
  return expect.arrayContaining(
    Object.entries(expectedPopulations).map(([popType, value]) =>
      expect.objectContaining({
        populationType: popType as PopulationType,
        result: value
      })
    )
  );
}

/**
 * Formats expectedPopulations object into an array of objects which can be passed into an
 * expect.arrayContaining and compared with result
 */
export function assertPopulationResults(
  result: DetailedPopulationGroupResult,
  expectedPopulations: Partial<Record<PopulationType, boolean>>
) {
  const expectedPopulationResults = getPopulationResultAssertion(expectedPopulations);
  expect(result).toEqual(
    expect.objectContaining({
      populationResults: expectedPopulationResults
    })
  );
}

/**
 * Finds the PopulationResult from the group results for given an populationType and optional criteria reference id.
 */
export function getGroupPopulationResult(
  result: DetailedPopulationGroupResult,
  populationType: PopulationType,
  criteriaReferenceId?: string
): PopulationResult {
  expect(result.populationResults).toBeDefined();
  const popResult = getPopulationResult(
    result?.populationResults as PopulationResult[],
    populationType,
    criteriaReferenceId
  );
  return popResult as PopulationResult;
}

/**
 * Finds the episode PopulationResult from the group results for given an episodeId, populationType and optional criteria reference id.
 */
export function getEpisodePopulationResult(
  result: DetailedPopulationGroupResult,
  episodeId: string,
  populationType: PopulationType,
  criteriaReferenceId?: string
): PopulationResult {
  expect(result.episodeResults).toBeDefined();
  const episodeResult = result.episodeResults?.find(r => r.episodeId === episodeId);
  expect(episodeResult?.populationResults).toBeDefined();
  const popResult = getPopulationResult(
    episodeResult?.populationResults as PopulationResult[],
    populationType,
    criteriaReferenceId
  );
  return popResult as PopulationResult;
}

/**
 * Finds the PopulationResult from a list of results given a populationType and optional criteria reference id.
 */
function getPopulationResult(
  populationResults: PopulationResult[],
  populationType: PopulationType,
  criteriaReferenceId?: string
): PopulationResult {
  const popResult = populationResults?.find(
    r =>
      r.populationType === populationType &&
      (criteriaReferenceId != undefined ? r.criteriaReferenceId === criteriaReferenceId : true)
  );
  expect(popResult).toBeDefined();
  return popResult as PopulationResult;
}

/**
 * Asserts the observations for a specific episode, optionally looking for the correct observation population
 * by the population type of the criteria it references.
 */
export function assertEpisodeObservations(
  result: DetailedPopulationGroupResult,
  episodeId: string,
  observations?: any[],
  criteriaReferencePopulationType?: PopulationType
) {
  expect(result.episodeResults).toBeDefined();
  const episodeResult = result.episodeResults?.find(r => r.episodeId === episodeId);
  expect(episodeResult?.populationResults).toBeDefined();
  assertObservations(
    episodeResult?.populationResults as PopulationResult[],
    observations,
    criteriaReferencePopulationType
  );
}

/**
 * Asserts the observations in a group, optionally looking for the correct observation population
 * by the population type of the criteria it references.
 */
export function assertGroupObservations(
  result: DetailedPopulationGroupResult,
  observations?: any[],
  criteriaReferencePopulationType?: PopulationType
) {
  expect(result.populationResults).toBeDefined();
  assertObservations(result.populationResults as PopulationResult[], observations, criteriaReferencePopulationType);
}

/**
 * Asserts the observations on a set of PopulationResults, optionally looking for the correct observation population
 * by the population type of the criteria it references.
 */
function assertObservations(
  populationResults: PopulationResult[],
  observations?: any[],
  criteriaReferencePopulationType?: PopulationType
) {
  // if criteria ref type is passed in find the population id of it
  const criteriaReferenceId =
    criteriaReferencePopulationType != undefined
      ? findPopulationId(populationResults, criteriaReferencePopulationType)
      : undefined;

  const observResult = getPopulationResult(populationResults, PopulationType.OBSERV, criteriaReferenceId);
  if (observations != undefined) {
    expect(observResult.observations).toEqual(observations);
  } else {
    expect(observResult.observations).toBeFalsy();
  }
}

/**
 * Finds the populationId for a population in a list of PopulationResults by type. Used when needing to
 * reference a population as the criteriaReferenceId for another one.
 */
function findPopulationId(populationResults: PopulationResult[], populationType: PopulationType): string {
  const popResult = getPopulationResult(populationResults, populationType);
  expect(popResult.populationId).toBeDefined();
  return popResult.populationId as string;
}
