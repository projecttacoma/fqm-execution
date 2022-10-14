import { DetailedPopulationGroupResult, EpisodeResults, PopulationResult, StratifierResult } from '../types/Calculator';
import * as MeasureBundleHelpers from '../helpers/MeasureBundleHelpers';
import * as DetailedResultsHelpers from '../helpers/DetailedResultsHelpers';
import { getResult, hasResult, setResult, createOrSetResult } from './ClauseResultsBuilder';
import { ELM, ELMStatement } from '../types/ELMTypes';
import { PopulationType } from '../types/Enums';
import * as cql from '../types/CQLTypes';

/**
 * Create population values (aka results) for all populations in the population group using the results from the
 * calculator. This creates the DetailedPopulationGroupResult for the patient that will be filed my most of the
 * results processing functions.
 *
 * @param {fhir4.Measure} measure - The measure we are getting the values for.
 * @param {fhir4.MeasureGroup} populationGroup - The population group that we are creating results to.
 * @param {cql.StatementResults} patientResults - The raw results object from the calculation engine for a patient.
 * @returns {DetailedPopulationGroupResult} The population group results object with the populationResults, stratifierResults,
 *   and episodeResults (if episode of care measure) populated.
 */
export function createPopulationValues(
  measure: fhir4.Measure,
  populationGroup: fhir4.MeasureGroup,
  patientResults: cql.StatementResults
): DetailedPopulationGroupResult {
  let populationResults: PopulationResult[] = [];
  let stratifierResults: StratifierResult[] | undefined;
  let episodeResults: EpisodeResults[] | undefined;

  // patient based measure
  if (!MeasureBundleHelpers.isEpisodeOfCareGroup(measure, populationGroup)) {
    const popAndStratResults = createPatientPopulationValues(populationGroup, patientResults);
    populationResults = popAndStratResults.populationResults;
    stratifierResults = popAndStratResults.stratifierResults;
    populationResults = handlePopulationValues(populationResults);
  } else {
    // episode of care based measure
    // collect results per episode
    episodeResults = createEpisodePopulationValues(populationGroup, patientResults);

    // if no episodes were found we need default populationResults/stratifier results. just use the patient
    // level logic for this
    if (episodeResults == undefined || episodeResults.length == 0) {
      episodeResults = [];
      const popAndStratResults = createPatientPopulationValues(populationGroup, patientResults);
      populationResults = popAndStratResults.populationResults;
      stratifierResults = popAndStratResults.stratifierResults;
    } else {
      populationResults = [];
      stratifierResults = [];
      // create patient level population and stratifier results based on episodes
      episodeResults.forEach(episodeResult => {
        episodeResult.populationResults.forEach(popResult => {
          createOrSetResult(
            popResult.populationType,
            popResult.criteriaExpression,
            popResult.result,
            populationResults
          );
        });

        episodeResult.stratifierResults?.forEach(strat => {
          const stratRes = stratifierResults?.find(stratRes => stratRes.strataCode === strat.strataCode);
          if (stratRes) {
            if (strat.result === true) {
              stratRes.result = true;
            }
          } else {
            stratifierResults?.push({
              result: strat.result,
              strataCode: strat.strataCode
            });
          }
        });
      });
    }
  }
  const detailedResult: DetailedPopulationGroupResult = {
    groupId: populationGroup.id || 'unknown',
    statementResults: [],
    populationResults: populationResults,
    episodeResults: episodeResults,
    stratifierResults: stratifierResults
  };
  return detailedResult;
}

/**
 * Takes in the initial values from the population and checks to see if some values should not be calculated. These
 * values that should not be considered calculated are zeroed out. ex. results NUMER is true but IPP is false.
 * @param {PopulationResult[]} populationResults - The list of population results.
 * @returns {PopulationResult[]} Population results in the list as passed in, but the appropiate values are zeroed out.
 */
export function handlePopulationValues(populationResults: PopulationResult[]): PopulationResult[] {
  /* Setting values of populations if the correct populations are not set based on the following logic guidelines
   * Initial Population (IPP): The set of patients or episodes of care to be evaluated by the measure.
   * Denominator (DENOM): A subset of the IPP.
   * Denominator Exclusions (DENEX): A subset of the Denominator that should not be considered for inclusion in the Numerator.
   * Denominator Exceptions (DEXCEP): A subset of the Denominator. Only those members of the Denominator that are considered
   * for Numerator membership and are not included are considered for membership in the Denominator Exceptions.
   * Numerator (NUMER): A subset of the Denominator. The Numerator criteria are the processes or outcomes expected for each patient,
   * procedure, or other unit of measurement defined in the Denominator.
   * Numerator Exclusions (NUMEX): A subset of the Numerator that should not be considered for calculation.
   * Measure Population Exclusions (MSRPOPLEX): Identify that subset of the MSRPOPL that meet the MSRPOPLEX criteria.
   */
  const populationResultsHandled = populationResults;
  // Cannot be in all populations if not in IPP.
  if (!getResult(PopulationType.IPP, populationResults)) {
    populationResults.forEach(result => {
      if (result.populationType == PopulationType.OBSERV) {
        result.observations = null;
      }
      result.result = false;
    });

    // Cannot be in most populations if not in DENOM or MSRPOPL
  } else if (
    (hasResult(PopulationType.DENOM, populationResults) && !getResult(PopulationType.DENOM, populationResults)) ||
    (hasResult(PopulationType.MSRPOPL, populationResults) && !getResult(PopulationType.MSRPOPL, populationResults))
  ) {
    setResult(PopulationType.DENEX, false, populationResults);
    setResult(PopulationType.DENEXCEP, false, populationResults);
    setResult(PopulationType.NUMER, false, populationResults);
    setResult(PopulationType.NUMEX, false, populationResults);
    setResult(PopulationType.MSRPOPLEX, false, populationResults);
    const popResult = populationResults.find(result => result.populationType == PopulationType.OBSERV);
    if (popResult) {
      popResult.result = false;
      popResult.observations = null;
    }

    // Cannot be in the numerator if they are excluded from the denominator
  } else if (getResult(PopulationType.DENEX, populationResults)) {
    setResult(PopulationType.NUMER, false, populationResults);
    setResult(PopulationType.NUMEX, false, populationResults);
    setResult(PopulationType.DENEXCEP, false, populationResults);

    // Cannot have observations if in the MSRPOPLEX
  } else if (getResult(PopulationType.MSRPOPLEX, populationResults)) {
    const popResult = populationResults.find(result => result.populationType == PopulationType.OBSERV);
    if (popResult) {
      popResult.result = false;
      popResult.observations = null;
    }

    // Cannot be in the NUMEX if not in the NUMER
  } else if (!getResult(PopulationType.NUMER, populationResults)) {
    setResult(PopulationType.NUMEX, false, populationResults);

    // Cannot be in the DENEXCEP if in the NUMER
  } else if (getResult(PopulationType.NUMER, populationResults)) {
    setResult(PopulationType.DENEXCEP, false, populationResults);
  }
  return populationResultsHandled;
}

/**
 * Create patient population values (aka results) for all populations in the population group using the results from the
 * calculator.
 * @param {fhir4.MeasureGroup} populationGroup - The population group we are getting the values for.
 * @param {cql.StatementResults} patientResults - The raw results object for a patient from the calculation engine.
 * @returns {PopulationResult[]} The population results list.
 */
export function createPatientPopulationValues(
  populationGroup: fhir4.MeasureGroup,
  patientResults: cql.StatementResults
): {
  populationResults: PopulationResult[];
  stratifierResults?: StratifierResult[];
} {
  const populationResults: PopulationResult[] = [];

  // Loop over all populations ("IPP", "DENOM", etc.)
  populationGroup.population?.forEach(population => {
    const cqlPopulation = population.criteria.expression;
    // Is there a patient result for this population? and does this populationCriteria contain the population
    // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
    // Grab CQL result value and adjust for ECQME

    const populationType = MeasureBundleHelpers.codeableConceptToPopulationType(population.code);

    // If this is a valid population type and there is a defined cql population pull out the values
    if (populationType != null && cqlPopulation != null) {
      // For measure observations observing a boolean population, match the result with the population it is observing
      // and pull the observations from the generated ELM JSON function with no parameters
      if (populationType === PopulationType.OBSERV) {
        const observingPopulation = DetailedResultsHelpers.findObsMsrPopl(populationGroup, population);
        const value = observingPopulation?.criteria.expression
          ? patientResults[observingPopulation.criteria.expression]
          : null;
        const result = isStatementValueTruthy(value);

        const observRawResult = patientResults[`obs_func_${cqlPopulation}`];
        const newPopulationResult: PopulationResult = {
          populationType: populationType,
          criteriaExpression: population.criteria.expression,
          result
        };

        if (observRawResult) {
          newPopulationResult.observations = [observRawResult];
        }

        populationResults.push(newPopulationResult);
      } else {
        const value = patientResults[cqlPopulation];
        const result = isStatementValueTruthy(value);
        const newPopulationResult: PopulationResult = {
          populationType: populationType,
          criteriaExpression: population.criteria.expression,
          result: result
        };
        populationResults.push(newPopulationResult);
      }
    }
  });

  // Loop over all stratifiers if there are any an collect results
  let stratifierResults: StratifierResult[] | undefined;
  if (populationGroup.stratifier) {
    stratifierResults = [];
    // index used in case the text for the stratifier could not be found
    let strataIndex = 1;
    populationGroup.stratifier.forEach(strata => {
      if (strata.criteria?.expression) {
        const value = patientResults[strata.criteria?.expression];
        const result = isStatementValueTruthy(value);
        stratifierResults?.push({
          strataCode: strata.code?.text ?? `strata-${strataIndex++}`,
          result
        });
      }
    });
  }

  //TODO: Support patient level observations.

  return {
    populationResults,
    stratifierResults
  };
}

function isStatementValueTruthy(value: any): boolean {
  if (Array.isArray(value) && value.length > 0) {
    return true;
  } else if (typeof value === 'boolean' && value === true) {
    return true;
  } else {
    return false;
  }
}

/**
 * Create population results for all episodes using the results from the calculator. This is
 * used only for the episode of care measures.
 * @param {fhir4.MeasureGroup} populationGroup - The population group we are getting the values for.
 * @param {cql.StatementResults} patientResults - The raw results object for the patient from the calculation engine.
 * @returns {EpisodeResults[]} The episode results list. Structure with episode id population results for each episode.
 *   If this is a continuous variable measure the observations are included.
 */
export function createEpisodePopulationValues(
  populationGroup: fhir4.MeasureGroup,
  patientResults: cql.StatementResults
): EpisodeResults[] {
  const episodeResultsSet: EpisodeResults[] = [];

  populationGroup.population?.forEach(population => {
    const cqlPopulation = population.criteria.expression;
    const populationType = MeasureBundleHelpers.codeableConceptToPopulationType(population.code);

    // If this is a valid population type and there is a defined cql population pull out the values
    if (populationType != null && cqlPopulation != null) {
      // handle observation population
      if (populationType === PopulationType.OBSERV) {
        // find the MSRPOPL for this population because we need to know its name
        const msrPopl = DetailedResultsHelpers.findObsMsrPopl(populationGroup, population);
        if (msrPopl?.criteria.expression) {
          const episodesRawResults = patientResults[`obs_func_${cqlPopulation}_${msrPopl?.criteria.expression}`];
          // loop through observation results and create observations
          if (Array.isArray(episodesRawResults)) {
            episodesRawResults.forEach(rawEpisodeResult => {
              const episodeId: string = rawEpisodeResult.episode.id.value;
              const observation = rawEpisodeResult.observation;
              // find existing episode result if any
              let episodeResult = episodeResultsSet.find(episodeResult => episodeResult.episodeId === episodeId);
              if (!episodeResult) {
                episodeResult = {
                  episodeId,
                  populationResults: []
                };
                episodeResultsSet.push(episodeResult);
              }

              // check if there is already an observation result with this cqlPopulation
              const observResult = episodeResult.populationResults.find(
                result => result.populationType == populationType && result.criteriaExpression == cqlPopulation
              );
              if (observResult !== undefined) {
                // push obs onto an existing populationResult
                if (!observResult.observations) {
                  observResult.observations = [];
                }
                observResult.observations.push(observation);
                observResult.result = true;
              } else {
                // create new populationResult with obs
                episodeResult.populationResults.push({
                  populationType: PopulationType.OBSERV,
                  criteriaExpression: cqlPopulation,
                  result: true,
                  observations: [observation]
                });
              }
            });
          }
        }
      } else {
        // Handle non observation results.
        const rawEpisodeResults = patientResults[cqlPopulation];
        createOrSetValueOfEpisodes(rawEpisodeResults, episodeResultsSet, populationGroup, populationType);
      }
    } else {
      // TODO: Handle this situation of a malformed population
    }
  });

  // loop over stratifications and collect episode results for the strata
  let strataIndex = 1;
  populationGroup.stratifier?.forEach(strata => {
    const strataCode = strata.code?.text ?? `strata-${strataIndex++}`;
    if (strata.criteria?.expression) {
      const rawEpisodeResults = patientResults[strata.criteria?.expression];
      createOrSetValueOfEpisodes(rawEpisodeResults, episodeResultsSet, populationGroup, undefined, strataCode);
    }
  });

  // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
  episodeResultsSet.forEach(episodeResults => {
    episodeResults.populationResults = handlePopulationValues(episodeResults.populationResults);
  });

  // TODO: Remove any episode that don't fall in any populations or stratifications after the above code

  return episodeResultsSet;
}

/**
 * Process the raw results from an episode of care population defining statement and fill or create the appropriate
 * entry in the episodeResultsSet
 *
 * @param {any} rawEpisodeResults - Raw population defining statement result. This result should be a list.
 * @param {EpisodeResults[]} episodeResultsSet - EpisodeResults set to populate.
 * @param {fhir4.MeasureGroup} populationGroup - The population group. Used to populate default values for a new encounter.
 * @param {PopulationType} populationType - If this is a regular population the type must be provided.
 * @param {string} strataCode - If this is a stratifier result, the code of the strata must be provided.
 */
function createOrSetValueOfEpisodes(
  rawEpisodeResults: any,
  episodeResultsSet: EpisodeResults[],
  populationGroup: fhir4.MeasureGroup,
  populationType?: PopulationType,
  strataCode?: string
): void {
  // Make sure the results are an array.
  if (Array.isArray(rawEpisodeResults)) {
    // Iterate over all episodes
    rawEpisodeResults.forEach((episodeResource: any) => {
      if (episodeResource.id.value != null) {
        // if an episode has already been created set the result for the population to true
        const episodeResults = episodeResultsSet.find(
          episodeResults => episodeResults.episodeId == episodeResource.id.value
        );
        if (episodeResults) {
          // set population value
          if (populationType) {
            setResult(populationType, true, episodeResults.populationResults);

            // set strata value
          } else if (strataCode) {
            if (episodeResults.stratifierResults) {
              const strataResult = episodeResults.stratifierResults.find(strataResult => {
                return strataResult.strataCode == strataCode;
              });
              if (strataResult) {
                strataResult.result = true;
              }
            }
          }

          // else create a new episode using the list of all popcodes for the population
        } else {
          const newEpisodeResults: EpisodeResults = {
            episodeId: episodeResource.id.value,
            populationResults: []
          };
          populationGroup.population?.forEach(population => {
            newEpisodeResults.populationResults.push({
              populationType: <PopulationType>MeasureBundleHelpers.codeableConceptToPopulationType(population.code),
              criteriaExpression: population.criteria.expression,
              result: false
            });
          });

          if (populationGroup.stratifier) {
            newEpisodeResults.stratifierResults = [];
            let strataIndex = 1;
            populationGroup.stratifier?.forEach(strata => {
              const newStrataCode = strata.code?.text ?? `strata-${strataIndex++}`;
              newEpisodeResults.stratifierResults?.push({
                strataCode: newStrataCode,
                result: newStrataCode == strataCode ? true : false
              });
            });
          }

          // Set the result for the current episode to true
          if (populationType) {
            setResult(populationType, true, newEpisodeResults.populationResults);
          }

          episodeResultsSet.push(newEpisodeResults);
        }
      }
    });
  }
}

/**
 * Set all value set versions to 'undefined' so the execution engine does not grab the specified
 * version in the ELM
 *
 * @param elm List of elm libraries to remove valueSet versions from.
 * @returns The list passed in.
 */
export function setValueSetVersionsToUndefined(elm: ELM[]): ELM[] {
  elm.forEach(elmLibrary => {
    if (elmLibrary.library.valueSets != null) {
      elmLibrary.library.valueSets.def.forEach(valueSet => {
        if (valueSet.version != null) {
          valueSet.version = undefined;
        }
      });
    }
  });
  return elm;
}

/**
 * Returns an ELM function to add to the ELM before it is used for calculation. This function is generated
 * for each observation on the measure. It returns a list of tuples, with each episode being observed and the
 * observation for the episode.
 *
 * @param {string} functionName - Name of the observation function. Usually "Measure Observation".
 * @param {string} parameter - Name of the define statement to use as the parameter list. Usually "Measure Population".
 * @returns {ELMStatement} The ELM function to inject into the ELM library before executing.
 */
export function generateEpisodeELMJSONFunction(functionName: string, parameter: string): ELMStatement {
  const elmFunction: ELMStatement = {
    name: `obs_func_${functionName}_${parameter}`,
    context: 'Patient',
    accessLevel: 'Public',
    expression: {
      type: 'Query',
      source: [
        {
          alias: 'MP',
          expression: {
            name: parameter,
            type: 'ExpressionRef'
          }
        }
      ],
      relationship: [],
      return: {
        distinct: false,
        expression: {
          type: 'Tuple',
          element: [
            {
              name: 'episode',
              value: {
                name: 'MP',
                type: 'AliasRef'
              }
            },
            {
              name: 'observation',
              value: {
                name: functionName,
                type: 'FunctionRef',
                operand: [
                  {
                    name: 'MP',
                    type: 'AliasRef'
                  }
                ]
              }
            }
          ]
        }
      }
    }
  };
  return elmFunction;
}

/*
 * This is used for boolean-based measures that do a measure observation
 * In this case, the function will not have any arguments, so we simplify the generation of
 * this ELM JSON function to simply just call the function rather than do a query
 */
export function generateBooleanELMJSONFunction(functionName: string) {
  const elmFunction: ELMStatement = {
    name: `obs_func_${functionName}`,
    context: 'Patient',
    accessLevel: 'Public',
    expression: {
      type: 'FunctionRef',
      name: functionName,
      operand: []
    }
  };

  return elmFunction;
}
