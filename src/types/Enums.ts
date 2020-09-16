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
