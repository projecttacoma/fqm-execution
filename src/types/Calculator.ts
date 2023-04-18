import { PopulationType, FinalResult, Relevance, CareGapReasonCode } from './Enums';
import * as cql from './CQLTypes';
import { DataProvider } from 'cql-execution';
import { CQLPatient } from './CQLPatient';
import { ELM } from './ELMTypes';
import { QueryInfo } from './QueryFilterTypes';
import { GracefulError } from './errors/GracefulError';

/**
 * Options for calculation.
 */
export interface CalculationOptions {
  /** Option to include clause results. Defaults to false. */
  includeClauseResults?: boolean;
  /** Start of measurement period. */
  measurementPeriodStart?: string;
  /** End of measurement period */
  measurementPeriodEnd?: string;
  /** PatientSource to use. If provided, the patientBundles will not be required. */
  patientSource?: DataProvider;
  /** Include SDEs in calculation */
  calculateSDEs?: boolean;
  /** Include HTML structure for highlighting (defaults to logic highlighting) */
  calculateHTML?: boolean;
  /** Include HTML structure with clause coverage highlighting */
  calculateClauseCoverage?: boolean;
  /** Enable debug output including CQL, ELM, results */
  enableDebugOutput?: boolean;
  /** Enables the return of ELM Libraries and name of main library to be used for further processing. ex. gaps in care */
  returnELM?: boolean;
  /** API key, to be used to access a valueset API for downloading any missing valuesets */
  vsAPIKey?: string;
  /** The type of report to return, will default to individual. */
  reportType?: 'individual' | 'subject-list' | 'summary';
  /** If true, ValueSets retrieved from VSAC will be cached and used in subsequent runs where this is also true */
  useValueSetCaching?: boolean;
  /** If false, detailed results will only contain information necessary to interpreting simple population results */
  verboseCalculationResults?: boolean;
  /** if true trust the content of meta.profile as a source of truth for what profiles the data that cql-exec-fhir grabs validates against */
  trustMetaProfile?: boolean;
  /** if true, cache ELM JSONs and associated data for access in subsequent runs within 10 minutes */
  useElmJsonsCaching?: boolean;
  /** if true, clears ElmJsons cache before running calculation */
  clearElmJsonsCache?: boolean;
  /** Reference to root library (should be a canonical URL but resource ID will work if matching one exists in the bundle), to be used in calculateLibraryDataRequirements */
  rootLibRef?: string;
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
  /** Parameters used in execution. Useful for gaps in care processing. */
  parameters?: {
    [key: string]: any;
  };
  /** Cache of VSAC ValueSets */
  valueSetCache?: fhir4.ValueSet[];
}

/* Any group result */
export type PopulationGroupResult = SimplePopulationGroupResult | DetailedPopulationGroupResult;

/**
 * Execution result object. Contains the results for a single patient.
 */
export interface ExecutionResult<T extends PopulationGroupResult> {
  /** ID of the patient this calculation result belongs to. */
  patientId: string;
  /** FHIR MeasureReport of type 'individual' for this patient. */
  measureReport?: fhir4.MeasureReport;
  /** Detailed results for each population group and stratifier. */
  detailedResults?: T extends DetailedPopulationGroupResult
    ? DetailedPopulationGroupResult[]
    : SimplePopulationGroupResult[];
  /** SDE values, if specified for calculation */
  supplementalData?: SDEResult[];
  /** Resources evaluated during execution */
  evaluatedResource?: fhir4.Resource[];
  /**
   * Patient object found during execution. This is fetched from the "Patient" statement result that is implicitly
   * added to CQL.
   */
  patientObject?: CQLPatient;
}

/**
 * SDE Values
 */
export interface SDEResult {
  /** Name of the SDE */
  name?: string;
  /** Raw result of SDE clause */
  rawResult?: any;
  /** Pretty result for this SDE. */
  pretty?: string;
  /** The id of the SDE as defined in the measure. */
  id?: string;
  /** Criteria expression for this SDE. */
  criteriaExpression?: string;
  /** Measure data usage for this SDE. */
  usage?: SupplementalDataUsage;
}

export type SupplementalDataUsage = 'supplemental-data' | 'risk-adjustment-factor';

/**
 * Stripped-down version of verbose detailed results
 * Only includes minimal info needed to identify population
 */
export interface SimplePopulationGroupResult {
  /** Index of this population group id. */
  groupId: string;
  /**
   * Results for each stratifier in this population group. If this is an episode of care
   * measure these results will the overall results for each episode. i.e. if there is at
   * least one episode in a strata then its result will be true.
   */
  stratifierResults?: StratifierResult[];
  /** If this is an episode of care measure. Each episode found in IPP will have results. */
  episodeResults?: EpisodeResults[];
  /** Results for each population in this group. */
  populationResults?: PopulationResult[];
}

/**
 * Detailed results for a single population group for a single patient.
 */
export interface DetailedPopulationGroupResult extends SimplePopulationGroupResult {
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
  /** The relevance of this statement for the population group */
  relevance: Relevance;
  /** Raw result from the engine */
  raw?: any;
  /** Pretty result for this statement. */
  pretty?: string;
  /** TRUE if the statement is a function */
  isFunction?: boolean;
}

/**
 * Result for a particular stratifier for a patient or episode.
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
  strataId?: string;
}

/**
 * Result for a patient or episode for a population
 */
export interface PopulationResult {
  /* ID of the population, if defined in the Measure */
  populationId?: string;
  /* ID of the population referenced by the cqfm-criteriaReference extension in this population, if present */
  criteriaReferenceId?: string;
  /** Type of population matching http://hl7.org/fhir/ValueSet/measure-population */
  populationType: PopulationType;
  /** The population criteria expression, which may be used to further identify the population (i.e. a cql identifier) */
  criteriaExpression?: string;
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
    version?: string;
    display?: string;
  };
  /** localId in ELM for the retrieve statement */
  retrieveLocalId?: string;
  /** localId in ELM for the query statement */
  queryLocalId?: string;
  /** localId in ELM for comparison operator */
  valueComparisonLocalId?: string;
  /** name of the library where the statement can be looked up */
  retrieveLibraryName?: string;
  /** name of library where the outermost query is */
  queryLibraryName?: string;
  /** stack of expressions traversed during calculation */
  expressionStack?: ExpressionStackEntry[];
  /** path that the code or valueset object refers to */
  path?: string;
  /** Info about query and how it is filtered. */
  queryInfo?: QueryInfo;
}

export interface GapsDataTypeQuery extends DataTypeQuery {
  /** whether or not the retrieve was truthy */
  retrieveHasResult?: boolean;
  /** whether or not the entire query was truthy */
  parentQueryHasResult?: boolean;
  /** Info about the reason detail query */
  reasonDetail?: ReasonDetail;
}

/**
 * Detailed information about a reason detail query. Contains multiple reasons for why the query failed.
 */
export interface ReasonDetail {
  /** whether or not the query has a reason detail */
  hasReasonDetail: boolean;
  /** reasons with details on what was amiss about this query */
  reasons: ReasonDetailData[];
}

/**
 * Detailed data about a single reason why the query failed. This has the code and if there is a reference to a resource
 * and the path in the resource the code is relevant for, that is included too.
 */
export interface ReasonDetailData {
  /** The coded care gap reason. */
  code: CareGapReasonCode;
  /** The optional reference to the existing data on the patient with the gap. */
  reference?: string;
  /** The path in the resource were the gap exists. */
  path?: string;
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
  detailedResults?: ExecutionResult<DetailedPopulationGroupResult>[];
  measureReports?: fhir4.MeasureReport[];
  gaps?: {
    retrieves?: DataTypeQuery[];
    bundle?: fhir4.Bundle | fhir4.Bundle[];
  };
}

/*
 * Parent dataType for output of calculate functions
 */
export interface CalculatorFunctionOutput {
  results:
    | ExecutionResult<PopulationGroupResult>[]
    | fhir4.MeasureReport
    | fhir4.MeasureReport[]
    | cql.Results
    | string
    | fhir4.Bundle
    | fhir4.Bundle[]
    | fhir4.Library
    | DataTypeQuery[];
  debugOutput?: DebugOutput;
  valueSetCache?: fhir4.ValueSet[];
  withErrors?: GracefulError[];
}

/**
 * Generic used to identify when detailedResults are verbose or not
 */
type DetailedOrSimpleExecution<T extends CalculationOptions> = T extends CalculationOptions & {
  verboseCalculationResults: false;
}
  ? SimplePopulationGroupResult
  : DetailedPopulationGroupResult;

/**
 * dataType for calculate() function
 * uses calculationOptions to determine verbosity of ExecutionResults
 */
export interface CalculationOutput<T extends CalculationOptions> extends CalculatorFunctionOutput {
  results: ExecutionResult<DetailedOrSimpleExecution<T>>[];
  elmLibraries?: ELM[];
  mainLibraryName?: string;
  parameters?: { [key: string]: any };
  coverageHTML?: string;
  groupClauseCoverageHTML?: Record<string, string>;
}

/**
 * dataType for calculateMeasureReports() function
 */
export interface MRCalculationOutput extends CalculatorFunctionOutput {
  results: fhir4.MeasureReport | fhir4.MeasureReport[];
}

/**
 * dataType for calculateAggregateMeasureReports() function
 */
export interface AMRCalculationOutput extends MRCalculationOutput {
  results: fhir4.MeasureReport;
}

/**
 * dataType for calculateIndividualMeasureReports() function
 */
export interface IMRCalculationOutput extends MRCalculationOutput {
  results: fhir4.MeasureReport[];
}

/**
 * dataType for calculateRaw() function
 */
export interface RCalculationOutput extends CalculatorFunctionOutput {
  results: cql.Results | string;
}

/**
 * dataType for calculateGapsInCare() function
 */
export interface GICCalculationOutput<T extends OneOrMultiPatient> extends CalculatorFunctionOutput {
  results: OneOrManyBundles<T>;
}

/**
 * dataType for addValueSetsToMeasureBundle() function
 */
export interface valueSetOutput {
  results: fhir4.Bundle;
}

/**
 * type for declaring whether GICCalculation is for one or multiple patients
 */
export type OneOrMultiPatient = [fhir4.Bundle] | fhir4.Bundle[];

/**
 * conditional type to map OneOrMultiPatient into the return result of GIC calculation
 */
export type OneOrManyBundles<T extends OneOrMultiPatient> = T extends [fhir4.Bundle] ? fhir4.Bundle : fhir4.Bundle[];

/**
 * dataType for calculateDataRequirements() function
 */
export interface DRCalculationOutput extends Omit<CalculatorFunctionOutput, 'valueSetCache'> {
  results: fhir4.Library;
}

/**
 * dataType for calculateQueryInfo() function
 */
export interface QICalculationOutput extends CalculatorFunctionOutput {
  results: DataTypeQuery[];
}
