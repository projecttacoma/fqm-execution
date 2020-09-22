import { R4 } from '@ahryman40k/ts-fhir-types';
import { PopulationType, FinalResult, Relevance } from './Enums';

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
}

/**
 * SDE Values
 */
interface SDEResult {
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
interface DetailedPopulationGroupResult {
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
}

/**
 * Detailed results for an individual CQL/ELM clause. A clause is an individual piece of logic.
 * For example: `and`, `before`, `or`.
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
 * Detailed result for a CQL define statement. This is any `define "StatementName":` in the
 * calculated CQL.
 */
interface StatementResult {
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
interface StratifierResult {
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
interface PopulationResult {
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
interface EpisodeResults {
  /** ID of episode. */
  episodeId: string;
  /** Results for each population. */
  populationResults: PopulationResult[];
  /** Stratifier results for this episode. */
  stratifierResults?: StratifierResult[];
}
