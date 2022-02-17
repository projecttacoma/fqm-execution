/**
 * Enum for measure score types. Matching http://terminology.hl7.org/CodeSystem/measure-scoring
 */
export enum MeasureScoreType {
  PROP = 'proportion',
  RATIO = 'ratio',
  CV = 'continuous-variable',
  COHORT = 'cohort'
}

/**
 * Enum for measure aggregation types. Matching // http://build.fhir.org/ig/HL7/cqf-measures/ValueSet-aggregate-method.html
 */
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MEDIAN = 'median',
  MIN = 'minimum',
  MAX = 'maximum',
  COUNT = 'count'
}

/**
 * Enum for population types. Matching http://hl7.org/fhir/valueset-measure-population.html
 */
export enum PopulationType {
  IPP = 'initial-population',
  DENOM = 'denominator',
  DENEX = 'denominator-exclusion',
  DENEXCEP = 'denominator-exception',
  NUMER = 'numerator',
  NUMEX = 'numerator-exclusion',
  MSRPOPL = 'measure-population',
  MSRPOPLEX = 'measure-population-exclusion',
  OBSERV = 'measure-observation'
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
export enum FinalResult {
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
export enum Relevance {
  NA = 'NA',
  TRUE = 'TRUE',
  FALSE = 'FALSE'
}

/**
 * https://terminology.hl7.org/2.0.0/CodeSystem-measure-improvement-notation.html
 *
 * 'POSITIVE': Improvement is indicated as an increase in the score or measurement (e.g. Higher score indicates better quality).
 *
 * 'NEGATIVE': Improvement is indicated as a decrease in the score or measurement (e.g. Lower score indicates better quality).
 */
export enum ImprovementNotation {
  POSITIVE = 'increase',
  NEGATIVE = 'decrease'
}

/**
 * URL to be defined
 *
 * 'MISSING': Gap is due to missing data
 * 'PRESENT': Gap is due to present data
 * 'DATEOUTOFRANGE': Gap is due to a date being out of range
 * 'VALUEOUTOFRANGE': Gap is due to a value being out of range
 * 'COUNTOUTOFRANGE': Gap is due to a count of resources being out of range
 *
 */
export enum CareGapReasonCode {
  NOTFOUND = 'NotFound',
  MISSING = 'Missing',
  PRESENT = 'Present',
  INVALIDATTRIBUTE = 'InvalidAttribute',
  DATEINRANGE = 'DateInRange',
  DATEOUTOFRANGE = 'DateOutOfRange',
  VALUEINRANGE = 'ValueInRange',
  VALUEOUTOFRANGE = 'ValueOutOfRange',
  COUNTINRANGE = 'CountInRange',
  COUNTOUTOFRANGE = 'CountOutOfRange',
  NOTALLOWED = 'NotAllowed'
}

/**
 * Lookup object for CareGapReasonCode to display text
 */
export const CareGapReasonCodeDisplay = {
  [CareGapReasonCode.NOTFOUND]: 'Data Element Not Found',
  [CareGapReasonCode.MISSING]: 'Missing Data Element',
  [CareGapReasonCode.PRESENT]: 'Data Element is Present',
  [CareGapReasonCode.INVALIDATTRIBUTE]: 'Attribute is Invalid',
  [CareGapReasonCode.DATEINRANGE]: 'Date is within specified range',
  [CareGapReasonCode.DATEOUTOFRANGE]: 'Date is out of specified range',
  [CareGapReasonCode.VALUEINRANGE]: 'Value is within specified range',
  [CareGapReasonCode.VALUEOUTOFRANGE]: 'Value is out of specified range',
  [CareGapReasonCode.COUNTINRANGE]: 'Count is within specified range',
  [CareGapReasonCode.COUNTOUTOFRANGE]: 'Count of data elements was not in the expected range',
  [CareGapReasonCode.NOTALLOWED]: 'Data Element was not used in care gap calculation due to an external requirement'
};
