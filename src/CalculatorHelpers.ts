import { R4 } from '@ahryman40k/ts-fhir-types';
import { DetailedPopulationGroupResult, EpisodeResults, PopulationResult } from './types/Calculator';
import * as MeasureHelpers from '../src/MeasureHelpers';
import { getResult, hasResult, setResult } from '../src/ResultsHelpers';
import { ELM, ELMStatement } from './types/ELMTypes';
import moment from 'moment';
import { PopulationType } from './types/Enums';

/**
 * Create population values (aka results) for all populations in the population set using the results from the
 * calculator.
 * @param {R4.IMeasure} measure - The measure we are getting the values for.
 * @param {R4.IMeasure_Group} populationGroup - The population group that we are mapping results to.
 * @param {any} patientResults - The raw results object from the calculation engine for a patient.
 * @param {any[]} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
 * @returns {DetailedPopulationGroupResult} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
 *   their key is 'value' and value is an array of results. Second result is the the episode results keyed by
 *   episode id and with the value being a set just like the patient results.
 */
export function createPopulationValues(
  measure: R4.IMeasure,
  populationGroup: R4.IMeasure_Group,
  patientResults: any,
  observationDefs: any[]
): DetailedPopulationGroupResult {
  let populationResults: PopulationResult[] | undefined;
  let episodeResults: EpisodeResults[] | undefined;

  // patient based measure
  if (!MeasureHelpers.isEpisodeOfCareMeasure(measure)) {
    populationResults = [];
    populationResults = createPatientPopulationValues(populationGroup, patientResults);
    populationResults = handlePopulationValues(populationResults);
  } else {
    // episode of care based measure
    // collect results per episode
    episodeResults = createEpisodePopulationValues(populationGroup, patientResults, observationDefs);

    /*
    // initialize population counts
    Object.keys(populationGroup.populations.toObject()).forEach(popCode => {
      populationResults[popCode] = 0;
      if (populationGroup.observations.length > 0) {
        populationResults.observation_values = [];
      }
    });

    // count up all population results for a patient level count
    Object.keys(episodeResults).forEach(e => {
      const episodeResult = episodeResults[e];
      Object.keys(episodeResult).forEach(popCode => {
        const popResult = episodeResult[popCode];
        if (popCode === 'observation_values') {
          popResult.forEach(value => {
            populationResults.observation_values.push(value);
          });
        } else {
          populationResults[popCode] += popResult;
        }
      });
    });
    */
  }
  const detailedResult: DetailedPopulationGroupResult = {
    groupId: populationGroup.id || 'unknown',
    statementResults: [],
    populationResults: populationResults,
    episodeResults: episodeResults
  };
  return detailedResult;
}

/**
 * Takes in the initial values from result object and checks to see if some values should not be calculated. These
 * values that should not be considered calculated are zeroed out. ex. results 1 in NUMER but IPP is 0.
 * @param {PopulationResult[]} populationResults - The list of population results.
 * @returns {PopulationResult[]} Population results in the same structure as passed in, but the appropiate values are zeroed out.
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
   * Measure Poplation Exclusions (MSRPOPLEX): Identify that subset of the MSRPOPL that meet the MSRPOPLEX criteria.
   */
  const populationResultsHandled = populationResults;
  /* HOSSTODO: Stratifiers may be handled differently.
  if (populationResultsHandled.STRAT != null && !getResult('STRAT', populationResults)) {
    // Set all values to 0
    Object.keys(populationResults).forEach(key => {
      if (key === 'observation_values') {
        populationResultsHandled.observation_values = [];
      } else {
        populationResultsHandled[key] = 0;
      }
    });
  } else*/
  // Cannot be in all populations if not in IPP.
  if (!getResult(PopulationType.IPP, populationResults)) {
    populationResults.forEach(result => {
      if (result.populationType == PopulationType.OBSERV) {
        result.observations = [];
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
 * @param {R4.IMeasure_Group} populationGroup - The population group we are getting the values for.
 * @param {any} patientResults - The raw results object for a patient from the calculation engine.
 * @returns {PopulationResult[]} The population results. Map of "POPNAME" to Integer result. Except for OBSERVs,
 *   their key is 'value' and value is an array of results.
 */
export function createPatientPopulationValues(
  populationGroup: R4.IMeasure_Group,
  patientResults: any
): PopulationResult[] {
  const populationResults: PopulationResult[] = [];

  // Loop over all populations ("IPP", "DENOM", etc.)
  populationGroup.population?.forEach(population => {
    const cqlPopulation = population.criteria.expression;
    // Is there a patient result for this population? and does this populationCriteria contain the population
    // We need to check if the populationCriteria contains the population so that a STRAT is not set to zero if there is not a STRAT in the populationCriteria
    // Grab CQL result value and adjust for ECQME

    const populationType = MeasureHelpers.codeableConceptToPopulationType(population.code);
    // If this is a valid population type and there is a defined cql population pull out the values
    if (populationType != null && cqlPopulation != null) {
      const value = patientResults[cqlPopulation];
      let result;
      if (Array.isArray(value) && value.length > 0) {
        result = true;
      } else if (typeof value === 'boolean' && value) {
        result = false;
      } else {
        result = false;
      }
      const newPopulationResult: PopulationResult = {
        populationType: populationType,
        result: result
      };
      populationResults.push(newPopulationResult);
    }
  });

  //TODO: Support patient level observations.

  return populationResults;
}

/**
 * Create population values (aka results) for all episodes using the results from the calculator. This is
 * used only for the episode of care measures
 * @param {Population} populationSet - The populationSet we are getting the values for.
 * @param {Object} patientResults - The raw results object for the patient from the calculation engine.
 * @param {Array} observationDefs - List of observation defines we add to the elm for calculation OBSERVs.
 * @returns {Object} The episode results. Map of episode id to population results which is a map of "POPNAME"
 * to Integer result. Except for OBSERVs, their key is 'value' and value is an array of results.
 */
export function createEpisodePopulationValues(
  populationGroup: R4.IMeasure_Group,
  patientResults: any,
  observationDefs: any
): EpisodeResults[] {
  const episodeResultsSet: EpisodeResults[] = [];

  populationGroup.population?.forEach(population => {
    let newEpisode;
    const cqlPopulation = population.criteria.expression;
    const populationType = MeasureHelpers.codeableConceptToPopulationType(population.code);

    // If this is a valid population type and there is a defined cql population pull out the values
    if (populationType != null && cqlPopulation != null) {
      const rawEpisodeResults = patientResults[cqlPopulation];

      // Make sure the results are an array.
      if (Array.isArray(rawEpisodeResults)) {
        // Iterate over all episodes
        rawEpisodeResults.forEach((episodeResource: R4.IResource) => {
          if (episodeResource.id != null) {
            // if an episode has already been created set the result for the population to true
            const episodeResults = episodeResultsSet.find(
              episodeResults => episodeResults.episodeId == episodeResource.id
            );
            if (episodeResults) {
              setResult(populationType, true, episodeResults.populationResults);

              // else create a new episode using the list of all popcodes for the population
            } else {
              const newEpisodeResults: EpisodeResults = {
                episodeId: episodeResource.id,
                populationResults: []
              };
              populationGroup.population?.forEach(population => {
                newEpisodeResults.populationResults.push({
                  populationType: <PopulationType>MeasureHelpers.codeableConceptToPopulationType(population.code),
                  result: false
                });
              });

              // Set the result for the current episode to true
              setResult(populationType, true, newEpisodeResults.populationResults);
              episodeResultsSet.push(newEpisodeResults);
            }
          }
        });
      }
    } else {
      // TODO: Handle this situation of a malformed population
    }
  });

  // HOSSTODO: Get observations sorted out
  /*
  if ((observationDefs != null ? observationDefs.length : undefined) > 0) {
    // Handle observations using the names of the define statements that
    // were added to the ELM to call the observation functions.
    observationDefs.forEach(obDef => {
      // Observations only have one result, based on how the HQMF is
      // structured (note the single 'value' section in the
      // measureObservationDefinition clause).
      const obsResults = patientResults != null ? patientResults[obDef] : undefined;

      obsResults.forEach(obsResult => {
        let resultValue = null;
        const episodeId = obsResult.episode.id;
        // Add the single result value to the values array on the results of
        // this calculation (allowing for more than one possible observation).
        if (obsResult != null ? Object.prototype.hasOwnProperty.call(obsResult, 'value') : undefined) {
          // If result is a Cql.Quantity type, add its value
          resultValue = obsResult.observation.value;
        } else {
          // In all other cases, add result
          resultValue = obsResult.observation;
        }

        // if the episodeResult object already exist create or add to to the values structure
        if (episodeResults[episodeId] != null) {
          if (episodeResults[episodeId].observation_values != null) {
            episodeResults[episodeId].observation_values.push(resultValue);
          } else {
            episodeResults[episodeId].observation_values = [resultValue];
          }
          // else create a new episodeResult structure
        } else {
          const newEpisode = {};
          for (const pc in populationSet.populations.toObject()) {
            newEpisode[pc] = 0;
          }
          newEpisode.observation_values = [resultValue];
          episodeResults[episodeId] = newEpisode;
        }
      });
    });
  }
  */

  // Correct any inconsistencies. ex. In DENEX but also in NUMER using same function used for patients.
  episodeResultsSet.forEach(episodeResults => {
    episodeResults.populationResults = handlePopulationValues(episodeResults.populationResults);
  });

  return episodeResultsSet;
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
 * Create the code service valueset database that the cql-execution engine needs.
 *
 * NOTE: This uses the `compose` attribue of the ValueSet to get code. This is incorrect and
 * should be using the `expansion`. But current example measures have ValueSets with compose
 * only.
 *
 * @param valueSetResources FHIR ValueSets.
 * @returns The value set DB structure needed for the cql-execution CodeService.
 */
export function valueSetsForCodeService(valueSetResources: R4.IValueSet[]): any {
  const valueSets: any = {};
  valueSetResources.forEach(valueSet => {
    if (valueSet.compose && valueSet.url) {
      // Grab id for this valueset (should match FHIR ValueSet url)
      const valueSetId = valueSet.url;
      if (!valueSets[valueSetId]) {
        valueSets[valueSetId] = {};
      }

      // Grab ValueSet version. This usually is not used.
      let version = valueSet.version || '';
      if (version === 'N/A') {
        version = '';
      }

      // Create array for valueset members.
      if (!valueSets[valueSetId][version]) {
        valueSets[valueSetId][version] = [];
      }

      // NOTE: This should be using ValueSet.expansion as mentioned above.
      // Iterate over include components and add all concepts
      valueSet.compose.include.forEach(include => {
        include.concept?.forEach(concept => {
          valueSets[valueSetId][version].push({
            code: concept.code,
            system: include.system,
            version: include.version,
            display: concept.display
          });
        });
      });
    } else {
      // TODO: Handle situation when ValueSet does not have url or compose.
    }
  });
  return valueSets;
}

// Create Date from UTC string date and time using momentJS
export function parseTimeStringAsUTC(timeValue: string): Date {
  return moment.utc(timeValue, 'YYYYMDDHHmm').toDate();
}

// Create Date from UTC string date and time using momentJS, shifting to 11:59:59 of the given year
export function parseTimeStringAsUTCConvertingToEndOfYear(timeValue: string): Date {
  return moment.utc(timeValue, 'YYYYMDDHHmm').add(1, 'years').subtract(1, 'seconds').toDate();
}

/* These might not be needed as they copied population sets to make them stratified. This could be done
 in a better way.
export function deepCopyPopulationSet(original) {
  const copy = {};
  copy.title = original.title;
  copy.observations = original.observations;
  copy.populations = {};
  for (const popCode in original.populations.toObject()) {
    // skip codes starting with _ since they are mongoose metadata
    const copyPop = {};
    copyPop.library_name = original.populations[popCode].library_name;
    copyPop.statement_name = original.populations[popCode].statement_name;
    copy.populations[popCode] = copyPop;
  }
  return new CqmModels.PopulationSet(copy);
}

export function getStratificationsAsPopulationSets(measure) {
  const stratificationsAsPopulationSets = [];
  measure.population_sets.forEach(populationSet => {
    if (populationSet.stratifications) {
      populationSet.stratifications.forEach(stratification => {
        const clonedSet = this.deepCopyPopulationSet(populationSet);
        clonedSet.population_set_id = stratification.stratification_id;
        clonedSet.populations.STRAT = stratification.statement;
        stratificationsAsPopulationSets.push(clonedSet);
      });
    }
  });
  return stratificationsAsPopulationSets;
}
*/

// Returns a JSON function to add to the ELM before ELM JSON is used to calculate results
// This ELM template was generated by the CQL-to-ELM Translation Service.
export function generateELMJSONFunction(functionName: string, parameter: string): ELMStatement {
  const elmFunction: ELMStatement = {
    name: `obs_func_${functionName}`,
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
                    type: 'As',
                    operand: {
                      name: 'MP',
                      type: 'AliasRef'
                    }
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
