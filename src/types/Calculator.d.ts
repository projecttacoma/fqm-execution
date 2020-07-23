import { R4 } from '@ahryman40k/ts-fhir-types';

/**
 * Options for calculation.
 */
export interface CalculationOptions {
  /** Option to include clause results. Defaults to false. */
  includeClauseResults?: boolean;
  /** Option to include pretty results on statement results. Defaults to false. */
  includePrettyResults?: boolean;
  /** Start of measurement period. */
  measurementPeriodStart?: Date;
  /** End of measurement period */
  measurementPeriodEnd?: Date;
  /** PatientSource to use. If provided, the patientBundles will not be required. */
  patientSource?: any;
}

/**
 * Execution result object. Contains the results for a single patient.
 */
export interface ExecutionResult {
  /** ID of the patient this calculation result belongs to. */
  patientId: string;
  /** FHIR MeasureReport of type 'individual' for this patient. */
  measureReport: R4.IMeasureReport;
  /** Detailed results for each population group and stratification. */
  detailedResults?: DetailedPopulationGroupResult[];
}

/**
 * Detailed results for a single population group for a single patient.
 */
interface DetailedPopulationGroupResult {
  /** Index */
  groupId: string;
  strataId?: string;
  clauseResults: ClauseResult[];
  statementResults: StatementResult[];
  populationResults?: PopulationResult[];
  episodeResults?: EpisodeResults[];
}

/**
 * Detailed results for an individual CQL clause.
 */
interface ClauseResult {
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
 * Detailed result for a CQL define statement.
 */
interface StatementResult {
  /** Name of library this clause resides in */
  libraryName: string;
  /** Name of statement this clause resides in */
  statementName: string;
  /** LocalId of clause */
  localId: string;
  /** Final, processed result of raw calculation */
  final: FinalResult;
  /** The relevance of this statement for the poulation group */
  relevance: Relevance;
  /** Raw result from the engine */
  raw: any;
}

/**
 * Result for a patient or episode for a population
 */
interface PopulationResult {
  populationType: string;
  result: boolean;
  observations?: any[];
}

/**
 * Result set for an episode for a single population group.
 */
interface EpisodeResults {
  episodeId: string;
  populationResults: PopulationResult[];
}

/**
 * Final result for a clause or statement.
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
 */
enum FinalResult {
  NA = 'NA',
  UNHIT = 'UNHIT',
  TRUE = 'TRUE',
  FALSE = 'FALSE'
}

/**
 * 'NA' - Not applicable. This statement is not relevant to any population calculation in this population_set. Common
 *   for unused library statements or statements only used for other population sets.
 *
 * 'FALSE' - This statement is not relevant to any of this patient's population inclusion calculations.
 *
 * 'TRUE' - This statement is relevant for one or more of the population inclusion calculations.
 */
enum Relevance {
  NA = 'NA',
  TRUE = 'TRUE',
  FALSE = 'FALSE'
}
