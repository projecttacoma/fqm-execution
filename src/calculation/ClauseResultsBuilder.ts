import * as ClauseResultsHelpers from './ClauseResultsHelpers';
import * as MeasureBundleHelpers from '../helpers/MeasureBundleHelpers';
import * as ELMDependencyHelper from '../helpers/elm/ELMDependencyHelpers';
import { ELM, LibraryDependencyInfo } from '../types/ELMTypes';
import * as cql from '../types/CQLTypes';
import { Interval, DateTime, Code, Quantity } from 'cql-execution';
import moment from 'moment';

import { FinalResult, PopulationType, Relevance } from '../types/Enums';
import {
  ClauseResult,
  DetailedPopulationGroupResult,
  EpisodeResults,
  PopulationResult,
  SDEResult,
  StatementResult
} from '../types/Calculator';

/**
 * Contains helpers that generate useful data for coverage and highlighting.
 */

/**
 * Builds the initial list of StatementResult objects. This initializes the objects with ith statement relevance info.
 * This list gets added to the DetailedPopulationGroupResult for the given population group.
 *
 * The statement relevance indicates which define statements were actually relevant to a population inclusion
 * consideration. This makes use of the 'population relevance' info. The values for statement relevance differ from the
 * `population relevance` because we also need to track statements that are not used for any population calculation.
 * Therefore the values are a string/enum that is one of the following: 'NA', 'TRUE', 'FALSE'. Here is what they mean:
 *
 * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
 *   for unused library statements or statements only used for other population sets.
 *
 * 'FALSE' - This statement is not relevant to any of this patient's population inclusion calculations.
 *
 * 'TRUE' - This statement is relevant for one or more of the population inclusion calculations.
 *
 * This function relies heavily on the statement dependency map built in ELMDependencyHelper to recursively determine
 * which statements are used in the relevant population statements. It also uses the 'population_relevance' map to
 * determine the relevance of the population defining statement and its dependent statements.
 *
 * @public
 * @param {fhir4.Measure} measure - The measure.
 * @param {PopulationResult[]} populationRelevanceSet - The population relevance results, used at the starting point.
 * @param {string} mainLibraryId - The identifier of the main library.
 * @param {ELM[]} elmLibraries - All ELM libraries for the measure.
 * @param {fhir4.MeasureGroup} populationGroup - The population group being calculated.
 * @param {boolean} calculateSDEs - Wether or not to treat SDEs as calculed/relevant or not.
 * @returns {StatementResult[]} The StatementResults list for each statement with it its relevance status populated.
 */
export function buildStatementRelevanceMap(
  measure: fhir4.Measure,
  populationRelevanceSet: PopulationResult[],
  mainLibraryId: string,
  elmLibraries: ELM[],
  populationGroup: fhir4.MeasureGroup,
  calculateSDEs: boolean
): StatementResult[] {
  // build statement results defaulting to not applicable (NA)
  const statementResults: StatementResult[] = [];
  elmLibraries.forEach(elmLibrary => {
    elmLibrary.library.statements?.def.forEach(statement => {
      const statementResult: StatementResult = {
        libraryName: elmLibrary.library.identifier.id,
        statementName: statement.name,
        localId: statement.localId,
        final: FinalResult.NA,
        relevance: Relevance.NA
      };
      statementResults.push(statementResult);
    });
  });

  // build statement dependency maps to use for marking relevant statements
  // TODO: Move this out to only happen once per measure to improve performance.
  const statementDependencies = ELMDependencyHelper.buildStatementDependencyMaps(elmLibraries);

  // Calculate SDEs if specified
  if (calculateSDEs && measure.supplementalData) {
    measure.supplementalData.forEach(sde => {
      if (sde.criteria?.expression) {
        markStatementRelevant(
          elmLibraries,
          statementDependencies,
          statementResults,
          mainLibraryId,
          sde.criteria.expression,
          true
        );
      }
    });
  }

  // if we have stratifications, mark all strata statements relevant
  populationGroup.stratifier?.forEach(strata => {
    if (strata.criteria?.expression) {
      markStatementRelevant(
        elmLibraries,
        statementDependencies,
        statementResults,
        mainLibraryId,
        strata.criteria.expression,
        true
      );
    }
  });

  // Iterate over all populations in this group and mark their statements relevant.
  populationGroup.population?.forEach(population => {
    const popType = MeasureBundleHelpers.codeableConceptToPopulationType(population.code);
    if (popType) {
      // If the population is values, that means we need to mark relevance for the OBSERVs
      const relevance = getResult(popType, populationRelevanceSet);
      const relevantStatement = population.criteria.expression;
      if (relevantStatement) {
        markStatementRelevant(
          elmLibraries,
          statementDependencies,
          statementResults,
          mainLibraryId,
          relevantStatement,
          relevance
        );
      }
    }
  });

  return statementResults;
}

/**
 * Recursive helper function for the buildStatementRelevanceMap function. This marks a statement as relevant (or not
 * relevant but applicable) in the StatementResults list. It recurses and marks dependent statements also relevant
 * unless they have already been marked as 'TRUE' for their relevance statue. This function will never be called on
 * statements that are 'NA'.
 *
 * @private
 * @param {ELM[]} elmLibraries
 * @param {LibraryDependencyInfo[]} statementDependencies - dependency map from the measure object. The thing we recurse
 *   over to find dependent statements even though it is flat, it represents a tree.
 * @param {StatementResult[]} statementResults - The list of StatementResults to mark relevance in.
 * @param {string} libraryName - The library name of the statement we are marking.
 * @param {string} statementName - The name of the statement we are marking.
 * @param {boolean} relevant - true if the statement should be marked 'TRUE', false if it should be marked 'FALSE'.
 */
export function markStatementRelevant(
  elmLibraries: ELM[],
  statementDependencies: LibraryDependencyInfo[],
  statementResults: StatementResult[],
  libraryName: string,
  statementName: string,
  relevant: boolean
): void {
  // only mark the statement if it is currently 'NA' or 'FALSE'. Otherwise it already has been marked 'TRUE'
  const statementResult = getStatementResult(libraryName, statementName, statementResults);
  if (statementResult?.relevance == Relevance.NA || statementResult?.relevance == Relevance.FALSE) {
    statementResult.relevance = relevant ? Relevance.TRUE : Relevance.FALSE;

    // grab the dependency info for this statement
    const libraryInfo = statementDependencies.find(lib => lib.libraryId === libraryName);
    const statementInfo = libraryInfo?.statementDependencies.find(stat => stat.statementName === statementName);
    if (statementInfo) {
      statementInfo.statementReferences.forEach(dependentStatement => {
        markStatementRelevant(
          elmLibraries,
          statementDependencies,
          statementResults,
          dependentStatement.libraryId,
          dependentStatement.statementName,
          relevant
        );
      });
    }
  }
}

/**
 * Helper function to find the StatementResult object for a given statement.
 *
 * @param {string} libraryName - Name of libary.
 * @param {string} statementName - Name of statement.
 * @param {StatementResult[]} statementResults - List of statement results to find the result in.
 * @returns {StatementResult|undefined} The statement results if found.
 */
export function getStatementResult(
  libraryName: string,
  statementName: string,
  statementResults: StatementResult[]
): StatementResult | undefined {
  return statementResults.find(result => {
    return result.libraryName == libraryName && result.statementName == statementName;
  });
}

/**
 * Fills out the results attributes for the statements and builds clause results.
 *
 * The StatementResult `final` field indicates the result for the statement taking into account the statement
 * relevance in determining the result. The StatementResult also has the properties, 'raw', 'final' and 'pretty'. 'raw'
 * is the raw result from the execution engine for that statement. 'final' is the final result that takes into account
 * the relevance in this calculation. 'pretty' is a human readable description of the result that is only generated if
 * doPretty is true. The value of 'final' will be one of the following strings/enums: 'NA', 'UNHIT', 'TRUE', 'FALSE'.
 *
 * Here's what they mean:
 *
 * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
 *   for unused library statements or statements only used for other population sets.
 *   !!!IMPORTANT NOTE!!! All define function statements are marked 'NA' since we don't have a strategy for
 *        highlighting or coverage when it comes to functions.
 *
 * 'UNHIT' - This statement wasn't hit. This is most likely because the statement was not relevant to population
 *     calculation for this patient. i.e. 'FALSE' in the the `statement_relevance` map.
 *
 * 'TRUE' - This statement is relevant and has a truthy result.
 *
 * 'FALSE' - This statement is relevant and has a falsey result.
 *
 * The ClauseResult list is similar to the StatementResult list but it indicates the results for each clause.
 * The same 'raw' and 'final' fields are set, but for the the clause itself.
 *
 * This function relies very heavily on the StatementResult `relevance` field to determine the final results.
 *
 * @public
 * @param {fhir4.Measure} measure - The measure.
 * @param {ELM[]} elmLibraries - List of all ELM Library JSONs.
 * @param {any} rawClauseResults - The raw clause results from the calculation engine.
 * @param {StatementResult[]} statementResults - The `statement_relevance` map. Used to determine if they were hit or not.
 * @param {boolean} doPretty - If true, also generate pretty versions of result.
 * @returns {object} Object with the statement_results and clause_results structures, keyed as such.
 */
export function buildStatementAndClauseResults(
  measure: fhir4.Measure,
  elmLibraries: ELM[],
  rawClauseResults: cql.LocalIdResults,
  statementResults: StatementResult[],
  doPretty: boolean,
  includeClauseResults: boolean
): ClauseResult[] {
  if (doPretty == null) {
    doPretty = false;
  }

  const clauseResults: ClauseResult[] = [];

  // Iterate over statement results that already had relevance information populated and fill out
  // raw and final result information.
  statementResults.forEach(statementResult => {
    const elmLibrary = elmLibraries.find(library => library.library.identifier.id == statementResult.libraryName);

    // If the elm for the library is not found skip. Should never happen.
    if (!elmLibrary) {
      return;
    }

    const rawStatementResult = findResultForStatementClause(
      elmLibrary,
      statementResult.statementName,
      rawClauseResults
    );
    statementResult.raw = rawStatementResult;

    const isFunction = ClauseResultsHelpers.isStatementFunction(elmLibrary, statementResult.statementName);
    // set isFunction property so we can later filter out functions during clause coverage calculation
    statementResult.isFunction = isFunction;

    //TODO: determine how SDEs should be handled
    //const isSDE = ClauseResultsHelpers.isSupplementalDataElementStatement(measure.supplementalData, statement_name);
    if (/*(!measure.calculate_sdes && isSDE) || */ statementResult.relevance == Relevance.NA) {
      statementResult.final = FinalResult.NA;
      if (doPretty) {
        statementResult.pretty = 'NA';
      }
    } else if (statementResult.relevance == Relevance.FALSE || rawClauseResults[statementResult.libraryName] == null) {
      statementResult.final = FinalResult.UNHIT;
      // even if the statement wasn't hit, we want the pretty result to just
      // be FUNCTION for functions
      if (doPretty) {
        if (isFunction) {
          statementResult.pretty = 'FUNCTION';
        } else {
          statementResult.pretty = 'UNHIT';
        }
      }
    } else if (doesResultPass(rawStatementResult)) {
      statementResult.final = FinalResult.TRUE;
      if (doPretty) {
        statementResult.pretty = prettyResult(rawStatementResult);
      }
    } else {
      statementResult.final = FinalResult.FALSE;
      if (rawStatementResult instanceof Array && rawStatementResult.length === 0) {
        // Special case, handle empty array.
        if (doPretty) {
          statementResult.pretty = 'FALSE ([])';
        }
      } else if (isFunction) {
        if (doPretty) {
          statementResult.pretty = 'FUNCTION';
        }
      } else if (doPretty) {
        statementResult.pretty = `FALSE (${rawStatementResult})`;
      }
    }

    if (includeClauseResults) {
      // create clause results for all localIds in this statement
      const localIds = ClauseResultsHelpers.findAllLocalIdsInStatementByName(elmLibrary, statementResult.statementName);
      for (const localId in localIds) {
        const clause = localIds[localId];
        const rawClauseResult =
          rawClauseResults[statementResult.libraryName] != null
            ? rawClauseResults[statementResult.libraryName][
                clause.sourceLocalId != null ? clause.sourceLocalId : localId
              ]
            : undefined;

        const clauseResult: ClauseResult = {
          // if this clause is an alias or a usage of alias it will get the raw result from the sourceLocalId.
          raw: rawClauseResult,
          statementName: statementResult.statementName,
          libraryName: statementResult.libraryName,
          localId,
          final: FinalResult.NA
        };

        clauseResult.final = setFinalResults({
          rawClauseResults,
          statementRelevance: statementResult.relevance,
          libraryName: statementResult.libraryName,
          clause,
          rawResult: clauseResult.raw
        });
        clauseResults.push(clauseResult);
      }
    }
  });

  return clauseResults;
}

/**
 * Generates a pretty human readable representation of a result.
 *
 * @param {(Array|object|boolean|???)} result - The result from the calculation engine.
 * @param {number|undefined} indentLevel - For nested objects, the indentLevel indicates how far to indent.
 *                                Note that 1 is the base because Array(1).join ' ' returns ''.
 * @param {number|undefined} keyIndent - Indent count used for key indentation.
 * @returns {String} a pretty version of the given result
 */
export function prettyResult(result: any | null, indentLevel?: number, keyIndent?: number): string {
  // TODO: Sort out a better way to have a friendly system display for FHIR codes.
  //   This will need to be replaced with a canonical URL to code system name map.
  const nameOidHash = {
    '2.16.840.1.113883.6.96': 'SNOMEDCT',
    '2.16.840.1.113883.6.1': 'LOINC',
    '2.16.840.1.113883.6.238': 'CDCREC',
    '2.16.840.1.113883.6.14': 'HCP',
    '2.16.840.1.113883.6.285': 'HCPCS',
    '2.16.840.1.113883.6.103': 'ICD-9-CM',
    '2.16.840.1.113883.6.104': 'ICD-9-PCS',
    '2.16.840.1.113883.6.90': 'ICD-10-CM',
    '2.16.840.1.113883.6.4': 'ICD-10-PCS',
    '2.16.840.1.113883.6.88': 'RxNorm',
    '2.16.840.1.113883.3.221.5': 'Source of Payment Typology',
    '2.16.840.1.113883.6.12': 'CPT',
    '2.16.840.1.113883.5.1': 'AdministrativeGender',
    '2.16.840.1.113883.4.642.3.921': 'HL7 Relationship Code',
    '2.16.840.1.113883.5.2': 'HL7 Marital Status',
    '2.16.840.1.113883.12.292': 'CVX',
    '2.16.840.1.113883.5.83': 'HITSP C80 Observation Status',
    '2.16.840.1.113883.3.26.1.1': 'NCI Thesaurus',
    '2.16.840.1.113883.3.88.12.80.20': 'FDA',
    '2.16.840.1.113883.4.9': 'UNII',
    '2.16.840.1.113883.6.69': 'NDC',
    '2.16.840.1.113883.5.14': 'HL7 ActStatus',
    '2.16.840.1.113883.6.259': 'HL7 Healthcare Service Location',
    '2.16.840.1.113883.12.112': 'DischargeDisposition',
    '2.16.840.1.113883.5.4': 'HL7 Act Code',
    '2.16.840.1.113883.6.177': 'NLM MeSH',
    '2.16.840.1.113883.5.1076': 'Religious Affiliation',
    '2.16.840.1.113883.1.11.19717': 'HL7 ActNoImmunicationReason',
    '2.16.840.1.113883.3.88.12.80.33': 'NUBC',
    '2.16.840.1.113883.1.11.78': 'HL7 Observation Interpretation',
    '2.16.840.1.113883.6.13': 'CDT',
    '2.16.840.1.113883.18.2': 'AdministrativeSex'
  };
  let prettyResultReturn;
  if (indentLevel == null) {
    indentLevel = 1;
  }
  if (keyIndent == null) {
    keyIndent = 1;
  }
  const keyIndentation = Array(keyIndent).join(' ');
  const currentIndentation = Array(indentLevel).join(' ');
  if (result instanceof DateTime) {
    return moment.utc(result.toString()).format('MM/DD/YYYY h:mm A');
  } else if (result instanceof Interval) {
    return `INTERVAL: ${prettyResult(result.low)} - ${prettyResult(result.high)}`;
  } else if (result instanceof Code) {
    // TODO: Sort out a better way to have a friendly system display for FHIR codes
    return `CODE: ${result.system} ${result.code}`;
  } else if (result instanceof Quantity) {
    let quantityResult = `QUANTITY: ${result.value}`;
    if (result.unit) {
      quantityResult += ` ${result.unit}`;
    }
    return quantityResult;
  } else if (result && typeof result._type === 'string' && result._type.includes('QDM::')) {
    // If there isn't a description, use the type name as a fallback.  This mirrors the frontend where we do
    // result.constructor.name.
    const description = result.description ? `${result.description}\n` : `${result._type.replace('QDM::', '')}\n`;
    let startDateTime = null;
    let endDateTime = null;
    let startTimeString = '';
    let endTimeString = '';
    // Start time of data element is start of relevant period, if data element does not have relevant period, use authorDatetime
    if (result.relevantPeriod) {
      if (result.relevantPeriod.low) {
        startDateTime = result.relevantPeriod.low;
      }
      if (result.relevantPeriod.high) {
        endDateTime = result.relevantPeriod.high;
      }
    } else if (result.prevalencePeriod) {
      if (result.prevalencePeriod.low) {
        startDateTime = result.prevalencePeriod.low;
      }
      if (result.prevalencePeriod.high) {
        endDateTime = result.prevalencePeriod.high;
      }
    } else if (result.authorDatetime) {
      // TODO: start result string will need to be updated to AUTHORED once bonnie frontend
      // updates its pretty printer to do so.
      startDateTime = result.authorDatetime;
    }

    if (startDateTime) {
      startTimeString = `START: ${moment.utc(startDateTime.toString()).format('MM/DD/YYYY h:mm A')}\n`;
    }
    // If endTime is the infinity dateTime, clear it out because we do not want to export it
    if (endDateTime && endDateTime.year !== 9999) {
      endTimeString = `STOP: ${moment.utc(endDateTime.toString()).format('MM/DD/YYYY h:mm A')}\n`;
    }
    const system = result.dataElementCodes[0].system;
    // TODO: Sort out a better way to have a friendly system display for FHIR codes
    const codeDisplay =
      result.dataElementCodes && result.dataElementCodes[0] ? `CODE: ${system} ${result.dataElementCodes[0].code}` : '';
    // Add indentation
    const returnString = `${description}${startTimeString}${endTimeString}${codeDisplay}`;
    return returnString.replace(/\n/g, `\n${currentIndentation}${keyIndentation}`);
  } else if (result instanceof String || typeof result === 'string') {
    return `"${result}"`;
  } else if (result instanceof Array) {
    prettyResultReturn = result.map((value: any) => prettyResult(value, indentLevel, keyIndent));
    return `[${prettyResultReturn.join(`,\n${currentIndentation}${keyIndentation}`)}]`;
  } else if (result instanceof Object) {
    // if the object has it's own custom toString method, use that instead
    if (typeof result.toString === 'function' && result.toString !== Object.prototype.toString) {
      return result.toString();
    }
    prettyResultReturn = '{\n';
    const baseIndentation = Array(3).join(' ');
    // TODO: Update the this function to better handle FHIR objects instead of QDM objects.
    const sortedKeys = Object.keys(result)
      .sort()
      .filter(key => key !== '_type' && key !== 'qdmVersion');
    for (const key of sortedKeys) {
      // add 2 spaces per indent
      const value = result[key];
      const nextIndentLevel = indentLevel + 2;
      // key length + ': '
      keyIndent = key.length + 3;
      prettyResultReturn = prettyResultReturn.concat(
        `${baseIndentation}${currentIndentation}${key}: ${prettyResult(value, nextIndentLevel, keyIndent)}`
      );
      // append commas if it isn't the last key
      if (key === sortedKeys[sortedKeys.length - 1]) {
        prettyResultReturn += '\n';
      } else {
        prettyResultReturn += ',\n';
      }
    }
    prettyResultReturn += `${currentIndentation}}`;
    return prettyResultReturn;
  }
  if (result) {
    return JSON.stringify(result, null, 2);
  }
  return 'null';
}

/**
 * Determines the final result (for coloring and coverage) for a clause. The result fills the 'final' property for the
 * clause result. Look at the comments for buildStatementAndClauseResults to get a description of what each of the
 * string results of this function are.
 * @private
 * @param {object} rawClauseResults - The raw clause results from the calculation engine.
 * @param {object} statementRelevance - The statement relevance map.
 * @param {object} statement_name - The name of the statement the clause is in
 * @param {object} library_name - The name of the libarary the clause is in
 * @param {object} localId - The localId of the current clause
 * @param {object} clause - The clause we are getting the final result of
 * @param {Array|Object|Interval|??} rawResult - The raw result from the calculation engine.
 * @returns {string} The final result for the clause.
 */
export function setFinalResults(params: {
  rawClauseResults: any;
  statementRelevance: Relevance;
  libraryName: string;
  clause: any;
  rawResult: any;
}): FinalResult {
  let finalResult = FinalResult.FALSE;
  if (params.clause.isUnsupported != null) {
    finalResult = FinalResult.NA;
  } else if (params.statementRelevance == Relevance.NA) {
    finalResult = FinalResult.NA;
  } else if (params.statementRelevance == Relevance.FALSE || params.rawClauseResults[params.libraryName] == null) {
    finalResult = FinalResult.UNHIT;
  } else if (doesResultPass(params.rawResult)) {
    finalResult = FinalResult.TRUE;
  }
  return finalResult;
}

/**
 * Finds the clause localId for a statement and gets the raw result for it from the raw clause results.
 * @private
 * @param {ELM} library - The library
 * @param {string} statement - The statement
 * @param {cql.LocalIdResults} rawClauseResults - The raw clause results from the engine.
 * @returns {(Array|object|Interval|??)} The raw result from the calculation engine for the given statement.
 */
export function findResultForStatementClause(
  elm: ELM,
  statementName: string,
  rawClauseResults: cql.LocalIdResults
): any {
  const elmStatement = elm.library.statements.def.find(def => def.name === statementName);
  const libraryName = elm.library.identifier.id;
  const localId = elmStatement?.localId;
  if (localId != undefined) {
    return rawClauseResults[libraryName] != null ? rawClauseResults[libraryName][localId] : undefined;
  } else {
    return undefined;
  }
}

/**
 * Determines if a result (for a statement or clause) from the execution engine is a pass or fail.
 * @private
 * @param {(Array|object|boolean|???)} result - The result from the calculation engine.
 * @returns {boolean} true or false
 */
export function doesResultPass(result: any | null): boolean {
  if (result === true) {
    // Specifically a boolean true
    return true;
  } else if (result === false) {
    // Specifically a boolean false
    return false;
  } else if (Array.isArray(result)) {
    // Check if result is an array
    if (result.length === 0) {
      // Result is true if the array is not empty
      return false;
    } else if (result.length === 1 && result[0] === null) {
      // But if the array has one element that is null. Then we should make it red.
      return false;
    }
    return true;
  } else if (result instanceof Interval) {
    // make it green if and Interval is returned
    return true;
    // Return false if an empty CQL Code is the result
  } else if (result instanceof Code && result.code == null) {
    return false;
  } else if (result === null || result === undefined) {
    // Specifically no result
    return false;
  }
  return true;
}

/**
 * Iterate over episode results, call _buildPopulationRelevanceMap for each result then OR population relevances
 * together so that a patient level population relevance set can be made.
 *
 * @private
 * @param {EpisodeResults[]} episodeResultsSet - Results for each episode
 * @param {fhir4.MeasureGroup} populationGroup - The population group from the measure
 * @param {string} measureScoringCode - The scoring code for the measure (used if scoring code not provided at the group level)
 * @returns {PopulationResult[]} List denoting if population calculation was considered/relevant in any episode
 */
export function buildPopulationRelevanceForAllEpisodes(
  episodeResultsSet: EpisodeResults[],
  populationGroup: fhir4.MeasureGroup,
  measureScoringCode?: string
): PopulationResult[] {
  const masterRelevanceResults: PopulationResult[] =
    populationGroup.population?.map(population => {
      return <PopulationResult>{
        populationType: MeasureBundleHelpers.codeableConceptToPopulationType(population.code),
        criteriaExpression: population.criteria.expression,
        result: false
      };
    }) || []; // Should not end up becoming an empty list.

  episodeResultsSet.forEach(episodeResults => {
    const episodeRelevance = buildPopulationRelevanceMap(
      episodeResults.populationResults,
      populationGroup,
      measureScoringCode
    );
    masterRelevanceResults.forEach(masterPopResults => {
      // find relevance in episode and if true, make master relevance true, only if not already true
      if (masterPopResults.result === false) {
        const matchingEpisodeResult = findResult(
          masterPopResults.populationType,
          episodeRelevance,
          masterPopResults.criteriaExpression
        );
        if (matchingEpisodeResult) {
          if (matchingEpisodeResult.populationId) {
            masterPopResults.populationId = matchingEpisodeResult.populationId;
          }
          if (matchingEpisodeResult.criteriaReferenceId) {
            masterPopResults.criteriaReferenceId = matchingEpisodeResult.criteriaReferenceId;
          }
          if (matchingEpisodeResult.result === true) {
            masterPopResults.result = true;
          }
        }
      }
    });
  });
  return masterRelevanceResults;
}

/**
 * Builds the relevance results for each population. This creates the `populationRelevance` list that is put on
 * DetailedPopulationGroupResult
 *
 * For each population in the group it is set to true if the population was relevant/considered, false if
 * NOT relevant/considered. This is used later to determine which define statements are relevant in the calculation.
 *
 * For example: If they aren't in the IPP then they are not going to be considered for any other population and all other
 * populations will be marked NOT relevant.
 *
 * This function is extremely verbose because this is an important and confusing calculation to make. The verbosity
 * was kept to make it more maintainable.
 *
 * @param {PopulationResult[]} results - The population results list for the population results.
 * @param {fhir4.MeasureGroup} group - The full group of the Measure, which is useful for resolving references between different populations
 * @param {string} measureScoringCode - The scoring code for measure (used if scoring code not provided at the group level)
 * @returns {PopulationResult[]} The population relevance set.
 */
export function buildPopulationRelevanceMap(
  results: PopulationResult[],
  group?: fhir4.MeasureGroup,
  measureScoringCode?: string
): PopulationResult[] {
  // Create initial results starting with all true to create the basis for relevance.
  const relevantResults: PopulationResult[] = results.map(result => {
    return {
      ...(result.populationId ? { populationId: result.populationId } : {}),
      ...(result.criteriaReferenceId ? { criteriaReferenceId: result.criteriaReferenceId } : {}),
      populationType: result.populationType,
      criteriaExpression: result.criteriaExpression,
      result: true
    };
  });

  // If the group has multiple IPPs, they are treated independently
  // This means that a given IPP affects the numerator _only if_ that numerator uses a criteriaReference to reference that IPP
  // Same logic applies with denominator

  if (group && MeasureBundleHelpers.hasMultipleIPPs(group)) {
    const numerRelevantIPP = MeasureBundleHelpers.getRelevantIPPFromPopulation(group, PopulationType.NUMER);
    if (numerRelevantIPP) {
      if (getResult(PopulationType.IPP, results, numerRelevantIPP.criteria.expression) === false) {
        if (hasResult(PopulationType.NUMER, relevantResults)) {
          setResult(PopulationType.NUMER, false, relevantResults);
          setResult(PopulationType.NUMEX, false, relevantResults);
        }
      }
    }

    const denomRelevantIPP = MeasureBundleHelpers.getRelevantIPPFromPopulation(group, PopulationType.DENOM);
    if (denomRelevantIPP) {
      if (getResult(PopulationType.IPP, results, denomRelevantIPP.criteria.expression) === false) {
        if (hasResult(PopulationType.DENOM, relevantResults)) {
          setResult(PopulationType.DENOM, false, relevantResults);
          setResult(PopulationType.DENEX, false, relevantResults);
          setResult(PopulationType.DENEXCEP, false, relevantResults);
        }
      }
    }
  } else if (getResult(PopulationType.IPP, results) === false) {
    // If IPP is false then everything else is not calculated
    if (hasResult(PopulationType.NUMER, relevantResults)) {
      setResult(PopulationType.NUMER, false, relevantResults);
    }
    if (hasResult(PopulationType.NUMEX, relevantResults)) {
      setResult(PopulationType.NUMEX, false, relevantResults);
    }
    if (hasResult(PopulationType.DENOM, relevantResults)) {
      setResult(PopulationType.DENOM, false, relevantResults);
    }
    if (hasResult(PopulationType.DENEX, relevantResults)) {
      setResult(PopulationType.DENEX, false, relevantResults);
    }
    if (hasResult(PopulationType.DENEXCEP, relevantResults)) {
      setResult(PopulationType.DENEXCEP, false, relevantResults);
    }
    if (hasResult(PopulationType.MSRPOPL, relevantResults)) {
      setResult(PopulationType.MSRPOPL, false, relevantResults);
    }
    if (hasResult(PopulationType.MSRPOPLEX, relevantResults)) {
      setResult(PopulationType.MSRPOPLEX, false, relevantResults);
    }
    if (hasResult(PopulationType.OBSERV, relevantResults)) {
      setResult(PopulationType.OBSERV, false, relevantResults);
    }
  }

  // If DENOM is false then DENEX, DENEXCEP, NUMER and NUMEX are not calculated
  if (hasResult(PopulationType.DENOM, results) && getResult(PopulationType.DENOM, results) === false) {
    // Do not apply this to ratio measures (numerator and denominator are independent from each other)
    if (!MeasureBundleHelpers.isRatioMeasure(group, measureScoringCode)) {
      if (hasResult(PopulationType.NUMER, relevantResults)) {
        setResult(PopulationType.NUMER, false, relevantResults);
      }
      if (hasResult(PopulationType.NUMEX, relevantResults)) {
        setResult(PopulationType.NUMEX, false, relevantResults);
      }
    }
    if (hasResult(PopulationType.DENEX, relevantResults)) {
      setResult(PopulationType.DENEX, false, relevantResults);
    }
    if (hasResult(PopulationType.DENEXCEP, relevantResults)) {
      setResult(PopulationType.DENEXCEP, false, relevantResults);
    }
  }

  // If DENEX is true then NUMER, NUMEX and DENEXCEP not calculated
  if (hasResult(PopulationType.DENEX, results) && getResult(PopulationType.DENEX, results) === true) {
    // Do not apply this to ratio measures (numerator and denominator are independent from each other)
    if (!MeasureBundleHelpers.isRatioMeasure(group, measureScoringCode)) {
      if (hasResult(PopulationType.NUMER, relevantResults)) {
        setResult(PopulationType.NUMER, false, relevantResults);
      }
      if (hasResult(PopulationType.NUMEX, relevantResults)) {
        setResult(PopulationType.NUMEX, false, relevantResults);
      }
    }
    if (hasResult(PopulationType.DENEXCEP, relevantResults)) {
      setResult(PopulationType.DENEXCEP, false, relevantResults);
    }
  }

  // If NUMER is false then NUMEX is not calculated
  if (hasResult(PopulationType.NUMER, results) && getResult(PopulationType.NUMER, results) === false) {
    if (hasResult(PopulationType.NUMEX, relevantResults)) {
      setResult(PopulationType.NUMEX, false, relevantResults);
    }
  }

  // If NUMER is true then DENEXCEP is not calculated
  // Do not apply this to ratio measures (numerator and denominator are independent from each other)
  if (
    hasResult(PopulationType.NUMER, results) &&
    getResult(PopulationType.NUMER, results) === true &&
    !MeasureBundleHelpers.isRatioMeasure(group, measureScoringCode)
  ) {
    if (hasResult(PopulationType.DENEXCEP, relevantResults)) {
      setResult(PopulationType.DENEXCEP, false, relevantResults);
    }
  }

  // If MSRPOPL is false then OBSERVs and MSRPOPLEX are not calculateed
  if (hasResult(PopulationType.MSRPOPL, results) && getResult(PopulationType.MSRPOPL, results) === false) {
    // values is the OBSERVs
    if (hasResult(PopulationType.OBSERV, relevantResults)) {
      setResult(PopulationType.OBSERV, false, relevantResults);
    }
    if (hasResult(PopulationType.MSRPOPLEX, relevantResults)) {
      setResult(PopulationType.MSRPOPLEX, false, relevantResults);
    }
  }

  // If MSRPOPLEX is true then OBSERVs are not calculated
  if (hasResult(PopulationType.MSRPOPLEX, results) && getResult(PopulationType.MSRPOPLEX, results) === true) {
    if (hasResult(PopulationType.OBSERV, relevantResults)) {
      setResult(PopulationType.OBSERV, false, relevantResults);
    }
  }

  return relevantResults;
}

/**
 * Wrapper function that builds population relevance either for all episodes (if the measure is episode-based) or for each
 * population (if patient-based).
 * @param results - The detailed results (used to pull off episode results for episode of care measure, or population results for
 * patient-based measure)
 * @param group - The full group of the Measure
 * @param measureScoringCode - The scoring code for measure (used if scoring code not provided at the group level)
 * @returns The population relevance set.
 */
export function buildPopulationGroupRelevanceMap(
  results: DetailedPopulationGroupResult,
  group: fhir4.MeasureGroup,
  measureScoringCode?: string
): PopulationResult[] {
  // Episode of care measure
  if (results.episodeResults) {
    return buildPopulationRelevanceForAllEpisodes(results.episodeResults, group, measureScoringCode);

    // Normal patient based measure
  } else if (results.populationResults) {
    return buildPopulationRelevanceMap(results.populationResults, group, measureScoringCode);
  } else {
    // this shouldn't happen
    return [];
  }
}

/*
 * Find a matching result by populationType and (optionally) criteriaExpression
 * Using criteriaExpression and criteriaReferenceId is useful in cases where populationType is not specific enough
 *  (e.g. multiple IPPs or observations that use the same function)
 */
export function findResult(
  populationType: PopulationType,
  results: PopulationResult[],
  criteriaExpression?: string,
  criteriaReferenceId?: string
) {
  return results.find(result => {
    if (result.populationType === populationType) {
      return (
        (criteriaExpression ? result.criteriaExpression === criteriaExpression : true) &&
        (criteriaReferenceId ? result.criteriaReferenceId === criteriaReferenceId : true)
      );
    }

    return false;
  });
}

export function hasResult(populationType: PopulationType, results: PopulationResult[], criteriaExpression?: string) {
  return findResult(populationType, results, criteriaExpression) != null;
}

// If the given population result is in the given result list, return the result
export function getResult(populationType: PopulationType, results: PopulationResult[], criteriaExpression?: string) {
  const popResult = findResult(populationType, results, criteriaExpression);

  return popResult?.result === true;
}

// If the given value is in the given populationSet, set the result to the new result
export function setResult(
  populationType: PopulationType,
  newResult: boolean,
  results: PopulationResult[],
  criteriaExpression?: string,
  criteriaReferenceId?: string
) {
  const popResult = findResult(populationType, results, criteriaExpression, criteriaReferenceId);
  if (popResult) {
    popResult.result = newResult;
  }
}

// create a result for the given population type and result or update the existing value to true if newResult is true
export function createOrSetResult(
  populationType: PopulationType,
  newResult: boolean,
  results: PopulationResult[],
  criteriaExpression?: string,
  populationId?: string,
  criteriaReferenceId?: string,
  observations?: string[]
) {
  const popResult = findResult(populationType, results, criteriaExpression, criteriaReferenceId);
  if (popResult) {
    if (newResult === true) {
      popResult.result = true;
    }
  } else {
    results.push({
      populationType,
      criteriaExpression,
      result: newResult,
      ...(populationId ? { populationId } : {}),
      ...(criteriaReferenceId ? { criteriaReferenceId } : {}),
      ...(observations && { observations })
    });
  }
}

// Get raw results of matching SDE expressions for each SDE in the Measure
export function getSDEValues(measure: fhir4.Measure, statementResults: cql.StatementResults): SDEResult[] {
  const results: SDEResult[] = [];
  if (measure.supplementalData) {
    measure.supplementalData.forEach(sde => {
      if (sde.criteria?.expression) {
        const expression = sde.criteria.expression;
        const result = statementResults[expression];
        results.push({
          name: sde.code?.text || expression,
          rawResult: result,
          pretty: prettyResult(result)
        });
      }
    });
  }
  return results;
}
