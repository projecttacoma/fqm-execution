import { MeasureGroup, MeasureGroupPopulation } from 'fhir/r4';
import { MeasureBundleHelpers } from '..';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult,
  PopulationGroupResult
} from '../types/Calculator';
import { PopulationType } from '../types/Enums';

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

export function findObsMsrPopl(
  group: MeasureGroup,
  obsrvPop: MeasureGroupPopulation
): MeasureGroupPopulation | undefined {
  let msrPop = group.population?.find(
    population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.MSRPOPL
  );
  // special handling of ratio measure without specified populations for the observations
  if (!msrPop) {
    if (obsrvPop.criteria.expression === 'Denominator Observations') {
      // denominator assumed population
      msrPop = group.population?.find(
        population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.DENOM
      );
    } else if (obsrvPop.criteria.expression === 'Numerator Observations') {
      // numerator assumed population
      msrPop = group.population?.find(
        population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.NUMER
      );
    }
  }
  return msrPop;
}
