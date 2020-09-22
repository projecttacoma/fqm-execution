import * as MeasureHelpers from './MeasureHelpers';
import * as ELMDependencyHelper from './ELMDependencyHelper';
import { ELM, LibraryDependencyInfo } from './types/ELMTypes';
import cql from 'cql-execution';
import moment from 'moment';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { FinalResult, PopulationType, Relevance } from './types/Enums';
import {
  ClauseResult,
  DetailedPopulationGroupResult,
  EpisodeResults,
  PopulationResult,
  SDEResult,
  StatementResult
} from './types/Calculator';

/**
 * Contains helpers that generate useful data for coverage and highlighing.
 */

/**
 * Builds the `statement_relevance` map. This map gets added to the Result attributes that the calculator returns.
 *
 * The statement_relevance map indicates which define statements were actually relevant to a population inclusion
 * consideration. This makes use of the 'population_relevance' map. This is actually a two level map. The top level is
 * a map of the CQL libraries, keyed by library name. The second level is a map for statement relevance in that library,
 * which maps each statement to its relevance status. The values in this map differ from the `population_relevance`
 * because we also need to track statements that are not used for any population calculation. Therefore the values are
 * a string that is one of the following: 'NA', 'TRUE', 'FALSE'. Here is what they mean:
 *
 * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
 *   for unused library statements or statements only used for other population sets.
 *
 * 'FALSE' - This statement is not relevant to any of this patient's population inclusion calculations.
 *
 * 'TRUE' - This statement is relevant for one or more of the population inclusion calculations.
 *
 * Here is an example structure this function returns. (the `statement_relevance` map)
 * {
 *   "Test158": {
 *     "Patient": "NA",
 *     "SDE Ethnicity": "NA",
 *     "SDE Payer": "NA",
 *     "SDE Race": "NA",
 *     "SDE Sex": "NA",
 *     "Most Recent Delivery": "TRUE",
 *     "Most Recent Delivery Overlaps Diagnosis": "TRUE",
 *     "Initial Population": "TRUE",
 *     "Numerator": "TRUE",
 *     "Denominator Exceptions": "FALSE"
 *   },
 *   "TestLibrary": {
 *     "Numer Helper": "TRUE",
 *     "Denom Excp Helper": "FALSE",
 *     "Unused statement": "NA"
 *   }
 * }
 *
 * This function relies heavily on the cql_statement_dependencies map on the Measure to recursively determine which
 * statements are used in the relevant population statements. It also uses the 'population_relevance' map to determine
 * the relevance of the population defining statement and its dependent statements.
 * @public
 * @param {PopulationResult[]} populationRelevance - The population relevance results, used at the starting point.
 * @param {Measure} measure - The measure.
 * @param {population} populationSet - The population set being calculated.
 * @returns {object} The `statement_relevance` map that maps each statement to its relevance status for a calculation.
 *   This structure is put in the Result object's attributes.
 */
export function buildStatementRelevanceMap(
  measure: R4.IMeasure,
  populationRelevanceSet: PopulationResult[],
  mainLibraryId: string,
  elmLibraries: ELM[],
  populationGroup: R4.IMeasure_Group,
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

  /* TODO: Deal with SDEs
  if (measure.calculate_sdes && populationSet.supplemental_data_elements) {
    for (const statement of Array.from(populationSet.supplemental_data_elements)) {
      // Mark all Supplemental Data Elements as relevant
      this.markStatementRelevant(
        measure.cql_libraries,
        statementRelevance,
        measure.main_cql_library,
        statement.statement_name,
        'TRUE'
      );
    }
  }
  */

  // build statement dependency maps to use for marking relevant statements
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

  populationGroup.population?.forEach(population => {
    const popType = MeasureHelpers.codeableConceptToPopulationType(population.code);
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
 * Recursive helper function for the _buildStatementRelevanceMap function. This marks a statement as relevant (or not
 * relevant but applicable) in the `statement_relevance` map. It recurses and marks dependent statements also relevant
 * unless they have already been marked as 'TRUE' for their relevance statue. This function will never be called on
 * statements that are 'NA'.
 * @private
 * @param {Array<CQLLibraries>} cqlLibraries - Dependency map from the measure object. The thing we recurse over
 *   even though it is flat, it represents a tree.
 * @param {object} statementRelevance - The `statement_relevance` map to mark.
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
 * Builds the result structures for the statements and the clauses. These are named `statement_results` and
 * `clause_results` respectively when added Result object's attributes.
 *
 * The `statement_results` structure indicates the result for each statement taking into account the statement
 * relevance in determining the result. This is a two level map just like `statement_relevance`. The first level key is
 * the library name and the second key level is the statement name. The value is an object that has three properties,
 * 'raw', 'final' and 'pretty'. 'raw' is the raw result from the execution engine for that statement. 'final' is the final
 * result that takes into account the relevance in this calculation. 'pretty' is a human readable description of the result
 * that is only generated if doPretty is true.
 * The value of 'final' will be one of the following strings:
 * 'NA', 'UNHIT', 'TRUE', 'FALSE'.
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
 * Here is an example of the `statement_results` structure: (raw results have been turned into "???" for this example)
 * {
 *   "Test158": {
 *     "Patient": { "raw": "???", "final": "NA", "pretty": "NA" },
 *     "SDE Ethnicity": { "raw": "???", "final": "NA", "pretty": "NA" },
 *     "SDE Payer": { "raw": "???", "final": "NA", "pretty": "NA" },
 *     "SDE Race": { "raw": "???", "final": "NA", "pretty": "NA" },
 *     "SDE Sex": { "raw": "???", "final": "NA", "pretty": "NA" },
 *     "Most Recent Delivery": { "raw": "???", "final": "TRUE", "pretty": "???" },
 *     "Most Recent Delivery Overlaps Diagnosis": { "raw": "???", "final": "TRUE", "pretty": "???" },
 *     "Initial Population": { "raw": "???", "final": "TRUE", "pretty": "???" },
 *     "Numerator": { "raw": "???", "final": "TRUE", "pretty": "???" },
 *     "Denominator Exceptions": { "raw": "???", "final": "UNHIT", "pretty": "UNHIT" },
 *   },
 *  "TestLibrary": {
 *     "Numer Helper": { "raw": "???", "final": "TRUE", "pretty": "???" },
 *     "Denom Excp Helper": { "raw": "???", "final": "UNHIT", "pretty": "UNHIT" },
 *     "Unused statement": { "raw": "???", "final": "NA", "pretty": "???" },
 *     "false statement": { "raw": "???", "final": "FALSE", "pretty": "FALSE: []" },
 *   }
 * }
 *
 *
 * The `clause_results` structure is the same as the `statement_results` but it indicates the result for each clause.
 * The second level key is the localId for the clause. The result object is the same with the same  'raw' and 'final'
 * properties but it also includes the name of the statement it resides in as 'statementName'.
 *
 * This function relies very heavily on the `statement_relevance` map to determine the final results. This function
 * returns the two structures together in an object ready to be added directly to the Result attributes.
 * @public
 * @param {R4.IMeasure} measure - The measure.
 * @param {ELM[]} elmLibraries - List of all ELM Library JSONs.
 * @param {any} rawClauseResults - The raw clause results from the calculation engine.
 * @param {StatementResult[]} statementResults - The `statement_relevance` map. Used to determine if they were hit or not.
 * @param {boolean} doPretty - If true, also generate pretty versions of result.
 * @returns {object} Object with the statement_results and clause_results structures, keyed as such.
 */
export function buildStatementAndClauseResults(
  measure: R4.IMeasure,
  elmLibraries: ELM[],
  rawClauseResults: any,
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

    //TODO: determine how SDEs should be handled
    //const isSDE = MeasureHelpers.isSupplementalDataElementStatement(measure.supplementalData, statement_name);
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
        if (MeasureHelpers.isStatementFunction(elmLibrary, statementResult.statementName)) {
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
      } else if (MeasureHelpers.isStatementFunction(elmLibrary, statementResult.statementName)) {
        if (doPretty) {
          statementResult.pretty = 'FUNCTION';
        }
      } else if (doPretty) {
        statementResult.pretty = `FALSE (${rawStatementResult})`;
      }
    }

    if (includeClauseResults) {
      // create clause results for all localIds in this statement
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(elmLibrary, statementResult.statementName);
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
  if (result instanceof cql.DateTime) {
    return moment.utc(result.toString()).format('MM/DD/YYYY h:mm A');
  } else if (result instanceof cql.Interval) {
    return `INTERVAL: ${prettyResult(result.low)} - ${prettyResult(result.high)}`;
  } else if (result instanceof cql.Code) {
    // TODO: Sort out a better way to have a friendly system display for FHIR codes
    return `CODE: ${result.system} ${result.code}`;
  } else if (result instanceof cql.Quantity) {
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
 * @param {object} rawClauseResults - The raw clause results from the engine.
 * @returns {(Array|object|Interval|??)} The raw result from the calculation engine for the given statement.
 */
export function findResultForStatementClause(elm: ELM, statementName: string, rawClauseResults: any): any {
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
  } else if (result instanceof cql.Interval) {
    // make it green if and Interval is returned
    return true;
    // Return false if an empty cql.Code is the result
  } else if (result instanceof cql.Code && result.code == null) {
    return false;
  } else if (result === null || result === undefined) {
    // Specifically no result
    return false;
  }
  return true;
}

/*
 * Iterate over episode results, call _buildPopulationRelevanceMap for each result
 * OR population relevances together so that populations are marked as relevant
 * based on all episodes instead of just one
 * @private
 * @param {episodeResults} result - Population_results for each episode
 * @returns {object} Map that tells if a population calculation was considered/relevant in any episode
 */
export function buildPopulationRelevanceForAllEpisodes(
  populationGroup: R4.IMeasure_Group,
  episodeResultsSet: EpisodeResults[]
): PopulationResult[] {
  const masterRelevanceResults: PopulationResult[] =
    populationGroup.population?.map(population => {
      return <PopulationResult>{
        populationType: MeasureHelpers.codeableConceptToPopulationType(population.code),
        result: false
      };
    }) || []; // Should not end up becoming an empty list.

  episodeResultsSet.forEach(episodeResults => {
    const episodeRelevance = buildPopulationRelevanceMap(episodeResults.populationResults);
    masterRelevanceResults.forEach(masterPopResults => {
      // find relevance in episode and if true, make master relevance true, only if not already true
      if (masterPopResults.result === false) {
        if (getResult(masterPopResults.populationType, episodeRelevance) === true) {
          masterPopResults.result = true;
        }
      }
    });
  });
  return masterRelevanceResults;
}

/**
 * Builds the `population_relevance` map. This map gets added to the Result attributes that the calculator returns.
 *
 * The population_relevance map indicates which populations the patient was actually considered for inclusion in. It
 * is a simple map of "POPNAME" to true or false. true if the population was relevant/considered, false if
 * NOT relevant/considered. This is used later to determine which define statements are relevant in the calculation.
 *
 * For example: If they aren't in the IPP then they are not going to be considered for any other population and all other
 * populations will be marked NOT relevant.
 *
 * Below is an example result of this function (the 'population_relevance' map). DENEXCEP is not relevant because in
 * the population_results the NUMER was greater than zero:
 * {
 *   "IPP": true,
 *   "DENOM": true,
 *   "NUMER": true,
 *   "DENEXCEP": false
 * }
 *
 * This function is extremely verbose because this is an important and confusing calculation to make. The verbosity
 * was kept to make it more maintainable.
 *
 * @param {PopulationResult[]} result - The population results list from
 * @returns {PopulationResult[]} Population results list that is the 'results' of which
 */
export function buildPopulationRelevanceMap(results: PopulationResult[]): PopulationResult[] {
  // Create initial results starting with all true to create the basis for relevance.
  const relevantResults: PopulationResult[] = results.map(result => {
    return {
      populationType: result.populationType,
      result: true
    };
  });

  /** TODO: Determine how Straifiers play here
  // If STRAT is 0 then everything else is not calculated
  if (hasResult(PopulationType.STRAT, results) && result.STRAT === 0) {
    if (hasResult(PopulationType.IPP, relevantResults)) {
      setResult(PopulationType.IPP, false, relevantResults);
    }
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
    if (relevantResults.observation_values != null) {
      relevantResults.observation_values = false;
    }
  }
  */

  // If IPP is false then everything else is not calculated
  if (getResult(PopulationType.IPP, results) === false) {
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
    // values is the OBSERVs
    if (hasResult(PopulationType.OBSERV, relevantResults)) {
      setResult(PopulationType.OBSERV, false, relevantResults);
    }
  }

  // If DENOM is false then DENEX, DENEXCEP, NUMER and NUMEX are not calculated
  if (hasResult(PopulationType.DENOM, results) && getResult(PopulationType.DENOM, results) === false) {
    if (hasResult(PopulationType.NUMER, relevantResults)) {
      setResult(PopulationType.NUMER, false, relevantResults);
    }
    if (hasResult(PopulationType.NUMEX, relevantResults)) {
      setResult(PopulationType.NUMEX, false, relevantResults);
    }
    if (hasResult(PopulationType.DENEX, relevantResults)) {
      setResult(PopulationType.DENEX, false, relevantResults);
    }
    if (hasResult(PopulationType.DENEXCEP, relevantResults)) {
      setResult(PopulationType.DENEXCEP, false, relevantResults);
    }
  }

  // If DENEX is truethen NUMER, NUMEX and DENEXCEP not calculated
  if (hasResult(PopulationType.DENEX, results) && getResult(PopulationType.DENEX, results) === true) {
    if (hasResult(PopulationType.NUMER, relevantResults)) {
      setResult(PopulationType.NUMER, false, relevantResults);
    }
    if (hasResult(PopulationType.NUMEX, relevantResults)) {
      setResult(PopulationType.NUMEX, false, relevantResults);
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
  if (hasResult(PopulationType.NUMER, results) && getResult(PopulationType.NUMER, results) === true) {
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

export function buildPopulationGroupRelevanceMap(
  group: R4.IMeasure_Group,
  results: DetailedPopulationGroupResult
): PopulationResult[] {
  // Episode of care measure
  if (results.episodeResults) {
    return buildPopulationRelevanceForAllEpisodes(group, results.episodeResults);

    // Normal patient based measure
  } else if (results.populationResults) {
    return buildPopulationRelevanceMap(results.populationResults);
  } else {
    // this shouldn't happen
    return [];
  }
}

export function hasResult(populationType: PopulationType, results: PopulationResult[]): boolean {
  return results.find(result => result.populationType == populationType) != null;
}

// If the given population result is in the given result list, return the result
export function getResult(populationType: PopulationType, results: PopulationResult[]): boolean {
  if (results.find(result => result.populationType == populationType)?.result == true) {
    return true;
  }
  return false;
}

// If the given value is in the given populationSet, set the result to the new result
export function setResult(populationType: PopulationType, newResult: boolean, results: PopulationResult[]): void {
  const popResult = results.find(result => result.populationType == populationType);
  if (popResult) {
    popResult.result = newResult;
  }
}

// Get raw results of matching SDE expressions for each SDE in the Measure
export function getSDEValues(measure: R4.IMeasure, statementResults: StatementResult[]): SDEResult[] {
  const results: SDEResult[] = [];
  if (measure.supplementalData) {
    measure.supplementalData.forEach(sde => {
      if (sde.criteria?.expression) {
        const matchingExpression = statementResults.find(res => res.statementName === sde.criteria.expression);
        if (matchingExpression) {
          results.push({
            name: matchingExpression.statementName,
            rawResult: matchingExpression.raw
          });
        }
      }
    });
  }
  return results;
}
