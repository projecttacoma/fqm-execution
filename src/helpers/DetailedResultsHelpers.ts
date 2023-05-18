import { MeasureBundleHelpers } from '..';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult,
  PopulationGroupResult,
  PopulationResult
} from '../types/Calculator';
import { PopulationType } from '../types/Enums';
import { getCriteriaReferenceIdFromPopulation, getObservationResultForPopulation } from './MeasureBundleHelpers';

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
          ...(dr.componentCanonical && { componentCanonical: dr.componentCanonical }),
          ...(dr.populationResults && { populationResults: dr.populationResults }),
          ...(dr.episodeResults && { episodeResults: dr.episodeResults }),
          ...(dr.stratifierResults && { stratifierResults: dr.stratifierResults })
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
 * Finds the measure observation that references the desired population in its criteria reference. If one exists,
 *  sets the result to false and the observations to null
 *
 *  NOTE: the usage of criteriaReference to identify a measure observation only really applies for Ratio measures
 *  where observations can be done on both the numerator and the denominator. For logic relating to CV measures that have a measure-population,
 *  the nulling of irrelevant observations happens already via `handlePopulationValues`
 */
export function nullCriteriaRefMeasureObs(
  group: fhir4.MeasureGroup,
  populationResults: PopulationResult[],
  desiredPopulationType: PopulationType
) {
  const measureObservationResults = populationResults.filter(result => result.populationType === PopulationType.OBSERV);

  // We need to do a lookup based on the criteriaReference extension, and only null out that relevant observation
  const relevantObservationResult = getObservationResultForPopulation(
    group,
    measureObservationResults,
    desiredPopulationType
  );
  if (relevantObservationResult) {
    relevantObservationResult.result = false;
    relevantObservationResult.observations = null;
  }
}
