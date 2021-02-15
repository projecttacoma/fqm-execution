import { R4 } from '@ahryman40k/ts-fhir-types';
import { PopulationType, FinalResult, Relevance } from './Enums';
import * as cql from './CQLTypes';
import { ELM } from './ELMTypes';

/**
 * Options for calculation.
 */
export interface CalculationOptions {
  /** Option to include clause results. Defaults to false. */
  includeClauseResults?: boolean;
  /** Option to include pretty results on statement results. Defaults to false. */
  includePrettyResults?: boolean;
  /** Include highlighting in MeasureReport narrative. Defaults to false. */
  includeHighlighting?: boolean;
  /** Start of measurement period. */
  measurementPeriodStart?: string;
  /** End of measurement period */
  measurementPeriodEnd?: string;
  /** PatientSource to use. If provided, the patientBundles will not be required. */
  patientSource?: any;
  /** Include SDEs in calculation */
  calculateSDEs?: boolean;
  /** Include HTML structure for highlighting */
  calculateHTML?: boolean;
  /** Enable debug output including CQL, ELM, results */
  enableDebugOutput?: boolean;
  /** Enables the return of ELM Libraries and name of main library to be used for further processing. ex. gaps in care */
  returnELM?: boolean;
}

/**
 * Results object returned from the Execute function.
 */
export interface RawExecutionData {
  /** The cql clause-level results that come out of cql-execution */
  rawResults?: cql.Results;
  /** An error message; if not present, no error was caught in execution */
  errorMessage?: string;
  /** an array of the decoded ELM libraries used in execution. Useful for debugging and detailed result processing. */
  elmLibraries?: ELM[];
  /** the name of the "main" library used for execution. */
  mainLibraryName?: string;
}

/**
 * Execution result object. Contains the results for a single patient.
 */
export interface ExecutionResult {
  /** ID of the patient this calculation result belongs to. */
  patientId: string;
  /** FHIR MeasureReport of type 'individual' for this patient. */
  measureReport?: R4.IMeasureReport;
  /** Detailed results for each population group and stratifier. */
  detailedResults?: DetailedPopulationGroupResult[];
  /** SDE values, if specified for calculation */
  supplementalData?: SDEResult[];
  /** Resources evaluated during execution */
  evaluatedResources?: R4.IResourceList[];
}

/**
 * SDE Values
 */
export interface SDEResult {
  /** Name of the SDE */
  name: string;
  /** Raw result of SDE clause */
  rawResult?: any;
  /** Pretty result for this SDE. */
  pretty?: string;
}

/**
 * Detailed results for a single population group for a single patient.
 */
export interface DetailedPopulationGroupResult {
  /** Index of this population group id. */
  groupId: string;
  /**
   * Results for each stratifier in this population group. If this is an episode of care
   * measure these results will the overall results for each episode. i.e. if there is at
   * least one episode in a strata then its result will be true.
   */
  stratifierResults?: StratifierResult[];
  /**
   * Clause results for every CQL/ELM logic clause.
   * Each piece of logic (ex. `and`, `retrieve`, `before`, etc.) will have a result.
   */
  clauseResults?: ClauseResult[];
  /**
   * Statement results for every CQL define statement. Each `define "StatementName":`
   * in the CQL logic will have a result.
   */
  statementResults: StatementResult[];
  /** Population Relevance. Listing if each population was considered or not. */
  populationRelevance?: PopulationResult[];
  /** Results for each population in this group. */
  populationResults?: PopulationResult[];
  /** If this is an episode of care measure. Each episode found in IPP will have results. */
  episodeResults?: EpisodeResults[];
  /** HTML markup of the clauses */
  html?: string;
}

/**
 * Detailed results for an individual CQL/ELM clause. A clause is an individual piece of logic.
 * For example: `and`, `before`, `or`.
 */
export interface ClauseResult {
  /** Name of library this clause resides in */
  libraryName: string;
  /** Name of statement this clause resides in */
  statementName: string;
  /** LocalId of clause */
  localId: string;
  /** Final, processed result of raw calculation considering population membership. */
  final: FinalResult;
  /** Raw result from the engine */
  raw: any;
}

/**
 * Detailed result for a CQL define statement. This is any `define "StatementName":` in the
 * calculated CQL.
 */
export interface StatementResult {
  /** Name of library this statement resides in */
  libraryName: string;
  /** Name of statement */
  statementName: string;
  /** LocalId of the root CQL/ELM clause for this statement*/
  localId?: string;
  /** Final, processed result of raw calculation */
  final: FinalResult;
  /** The relevance of this statement for the poulation group */
  relevance: Relevance;
  /** Raw result from the engine */
  raw?: any;
  /** Pretty result for this statement. */
  pretty?: string;
}

/**
 * Result for a particular stratifer for a patient or episode.
 */
export interface StratifierResult {
  /**
   * The 'text' part from the stratifier.code.
   */
  strataCode: string;
  /**
   * True if patient or episode is in stratifier. False if not.
   */
  result: boolean;
}

/**
 * Result for a patient or episode for a population
 */
export interface PopulationResult {
  /** Type of population matching http://hl7.org/fhir/ValueSet/measure-population */
  populationType: PopulationType;
  /** True if this patient or episode calculates with membership in this population. */
  result: boolean;
  /** Observations made for this population. */
  observations?: any;
}

/**
 * Result set for an episode for a single population group.
 */
export interface EpisodeResults {
  /** ID of episode. */
  episodeId: string;
  /** Results for each population. */
  populationResults: PopulationResult[];
  /** Stratifier results for this episode. */
  stratifierResults?: StratifierResult[];
}

/**
 * Data type and query used in ELM
 */
export interface DataTypeQuery {
  /** FHIR data type of the retrieve */
  dataType: string;
  /** valueSet used, if applicable */
  valueSet?: string;
  /** code used, if applicable */
  code?: {
    system: string;
    code: string;
  };
  /** whether or not the retrieve was truthy */
  retrieveHasResult?: boolean;
  /** whether or not the entire query was truthy */
  parentQueryHasResult?: boolean;
  /** localId in ELM for the retrieve statement */
  retrieveLocalId?: string;
  /** localId in ELM for the query statement */
  queryLocalId?: string;
  /** name of the library where the statment can be looked up */
  libraryName?: string;
  /** stack of expressions traversed during calculation */
  expressionStack?: ExpressionStackEntry[];
}

/**
 * Expression stack tracked during gaps in care
 */
export interface ExpressionStackEntry {
  /** type of expression (e.g. 'Query') */
  type: string;
  /** localId of the expression */
  localId: string;
  /** library name where the expression lives */
  libraryName: string;
}

/*
 * Debug output if enabled
 */
export interface DebugOutput {
  cql?: { name: string; cql: string }[];
  elm?: ELM[];
  vs?: cql.ValueSetMap;
  html?: { name: string; html: string }[];
  rawResults?: cql.Results | string;
  detailedResults?: ExecutionResult[];
  measureReports?: R4.IMeasureReport[];
  gaps?: {
    retrieves: DataTypeQuery[];
    bundle: R4.IBundle;
  };
}
