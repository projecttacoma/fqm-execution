import { MeasureBundleHelpers } from '..';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult,
  PopulationGroupResult,
  PopulationResult
} from '../types/Calculator';
import { PopulationType } from '../types/Enums';
import { getCriteriaReferenceIdFromPopulation, getCriteriaRefMeasureObs } from './MeasureBundleHelpers';

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
  group: fhir4.MeasureGroup,
  obsrvPop: fhir4.MeasureGroupPopulation
): fhir4.MeasureGroupPopulation | undefined {
  let msrPop = group.population?.find(
    population => MeasureBundleHelpers.codeableConceptToPopulationType(population.code) === PopulationType.MSRPOPL
  );

  // Measure populations may also use 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference' extension to reference another population within the same group
  // In this case, we can identify the population that is being observed by looking through the entire group for a population with an ID that matches the valueString of this extension
  if (!msrPop) {
    const criteriaRefId = getCriteriaReferenceIdFromPopulation(obsrvPop);

    if (criteriaRefId != null) {
      msrPop = group.population?.find(p => p.id === criteriaRefId);
    } else {
      // If not using an extension to reference the relevant populations, fallback to assumption approach of the string literals
      // for "Denominator Observations" or "Numerator Observations" that was used in some other ratio measures
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
  }
  return msrPop;
}

export function addIdsToPopulationResult(populationResult: PopulationResult, population: fhir4.MeasureGroupPopulation) {
  if (population.id) {
    populationResult.populationId = population.id;
  }

  if (population.extension) {
    const criteriaRefId = MeasureBundleHelpers.getCriteriaReferenceIdFromPopulation(population);
    if (criteriaRefId) {
      populationResult.criteriaReferenceId = criteriaRefId;
    }
  }
}

/**
 * Finds the measure observation that reference the desired population in their criteria reference. If one exists,
 *  sets the result to false and the observations to null
 */
export function nullCriteriaRefMeasureObs(
  group: fhir4.MeasureGroup,
  populationResults: PopulationResult[],
  desiredPopulationType: PopulationType
): void {
  const popResults = populationResults.filter(result => result.populationType === PopulationType.OBSERV);
  if (desiredPopulationType === PopulationType.NUMER && popResults.length === 1) {
    // If only one measure-observation population, we know it relates to numerator
    popResults[0].result = false;
    popResults[0].observations = null;
  } else {
    const measureObs = getCriteriaRefMeasureObs(group, popResults, desiredPopulationType);
    if (measureObs) {
      measureObs.result = false;
      measureObs.observations = null;
    }
  }
}
