import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult,
  PopulationGroupResult
} from '../types/Calculator';

export function pruneDetailedResults(
  executionResults: ExecutionResult<DetailedPopulationGroupResult>[]
): ExecutionResult<SimplePopulationGroupResult>[] {
  const prunedExecutionResults: ExecutionResult<SimplePopulationGroupResult>[] = [];
  executionResults.forEach(er => {
    if (er.evaluatedResource) {
      delete er.evaluatedResource;
    }

    if (er.detailedResults) {
      const prunedDetailedResults: SimplePopulationGroupResult[] = er.detailedResults.map(dr => {
        return {
          groupId: dr.groupId,
          ...(dr.populationResults ? { populationResults: dr.populationResults } : {}),
          ...(dr.episodeResults ? { episodeResults: dr.episodeResults } : {}),
          ...(dr.stratifierResults ? { stratifierResults: dr.stratifierResults } : {})
        };
      });

      const newEr: ExecutionResult<SimplePopulationGroupResult> = {
        ...er,
        detailedResults: prunedDetailedResults
      };

      prunedExecutionResults.push(newEr);
    } else {
      // If detailed results don't exist, there's nothing to prune.
      // we can pass through a casted version of `er`
      prunedExecutionResults.push(er as ExecutionResult<SimplePopulationGroupResult>);
    }
  });

  return prunedExecutionResults;
}

export function isDetailedResult(result: PopulationGroupResult): result is DetailedPopulationGroupResult {
  const candidate = result as DetailedPopulationGroupResult;
  return (
    candidate.html != null ||
    candidate.populationRelevance != null ||
    candidate.clauseResults != null ||
    candidate.statementResults != null
  );
}
