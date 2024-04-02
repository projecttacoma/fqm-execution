import { Annotation, ELM } from '../types/ELMTypes';
import Handlebars from 'handlebars';
import {
  CalculationOptions,
  ClauseCoverageDetails,
  ClauseResult,
  DetailedPopulationGroupResult,
  ExecutionResult,
  StatementResult
} from '../types/Calculator';
import { FinalResult, PopulationType, Relevance } from '../types/Enums';
import mainTemplate from '../templates/main';
import clauseTemplate from '../templates/clause';
import { UnexpectedProperty, UnexpectedResource } from '../types/errors/CustomErrors';
import { uniqWith } from 'lodash';

export const cqlLogicClauseTrueStyle = {
  'background-color': '#ccebe0',
  color: '#20744c',
  'border-bottom-color': '#20744c',
  'border-bottom-style': 'solid',
  'border-bottom-width': '0.35em'
};

export const cqlLogicClauseFalseStyle = {
  'background-color': '#edd8d0',
  color: '#a63b12',
  'border-bottom-color': '#a63b12',
  'border-bottom-style': 'double',
  'border-bottom-width': '0.35em'
};

export const cqlLogicClauseCoveredStyle = {
  'background-color': '#daeaf5',
  color: '#004e82'
};

export const cqlLogicUncoveredClauseStyle = {
  'background-color': 'white',
  color: 'black'
};

/**
 * Convert JS object to CSS Style string
 *
 * @param obj JS object representing CSS styles
 * @returns semi-colon separated string of CSS styles for style attribute
 */
export function objToCSS(obj: { [key: string]: string }): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

const main = Handlebars.compile(mainTemplate);
Handlebars.registerPartial('clause', clauseTemplate);

// text values in annotations show up as an array of strings
Handlebars.registerHelper('concat', s => s.join(''));

// apply highlighting style based on clause result
Handlebars.registerHelper('highlightClause', (localId, context) => {
  const libraryName: string = context.data.root.libraryName;
  const clauseResults: ClauseResult[] = context.data.root.clauseResults;

  const clauseResult = clauseResults.find(result => result.libraryName === libraryName && result.localId === localId);
  if (clauseResult) {
    if (clauseResult.final === FinalResult.TRUE) {
      return objToCSS(cqlLogicClauseTrueStyle);
    } else if (clauseResult.final === FinalResult.FALSE) {
      return objToCSS(cqlLogicClauseFalseStyle);
    }
  }
  return '';
});

// apply highlighting style to covered clauses
Handlebars.registerHelper('highlightCoverage', (localId, context) => {
  const libraryName: string = context.data.root.libraryName;
  const clauseResults: ClauseResult[] = context.data.root.clauseResults;

  const clauseResult = clauseResults.filter(result => result.libraryName === libraryName && result.localId === localId);
  if (clauseResult) {
    if (clauseResult.some(c => c.final === FinalResult.TRUE)) {
      return objToCSS(cqlLogicClauseCoveredStyle);
    } else if (clauseResult.every(c => c.final === FinalResult.FALSE || c.final === FinalResult.UNHIT)) {
      return objToCSS(cqlLogicUncoveredClauseStyle);
    }
  }
  return '';
});

// apply highlighting style to uncovered clauses
Handlebars.registerHelper('highlightUncoverage', (localId, context) => {
  const libraryName: string = context.data.root.libraryName;

  if (
    (context.data.root.uncoveredClauses as ClauseResult[]).some(
      result => result.libraryName === libraryName && result.localId === localId
    )
  ) {
    // Mark with red styling if clause is found in uncoverage list
    return objToCSS(cqlLogicClauseFalseStyle);
  } else if (
    (context.data.root.coveredClauses as ClauseResult[]).some(
      result => result.libraryName === libraryName && result.localId === localId
    )
  ) {
    // Mark with white (clear out styling) if the clause is in coverage list
    return objToCSS(cqlLogicUncoveredClauseStyle);
  }
  // If this clause has no results then it should not be styled
  return '';
});

/**
 * Sort statements into population, then non-functions, then functions
 */
export function sortStatements(measure: fhir4.Measure, groupId: string, statements: StatementResult[]) {
  const group = measure.group?.find(g => g.id === groupId) || measure.group?.[0];
  const populationOrder = [
    PopulationType.IPP,
    PopulationType.DENOM,
    PopulationType.DENEX,
    PopulationType.DENEXCEP,
    PopulationType.NUMER,
    PopulationType.NUMEX,
    PopulationType.MSRPOPL,
    PopulationType.MSRPOPLEX,
    PopulationType.OBSERV
  ];

  // this is a lookup of cql expression identifier -> population type
  const populationIdentifiers: Record<string, PopulationType> = {};
  group?.population?.forEach(p => {
    if (p.code?.coding?.[0].code !== undefined) {
      populationIdentifiers[p.criteria.expression as string] = p.code.coding[0].code as PopulationType;
    }
  });

  function populationCompare(a: StatementResult, b: StatementResult) {
    return (
      populationOrder.indexOf(populationIdentifiers[a.statementName]) -
      populationOrder.indexOf(populationIdentifiers[b.statementName])
    );
  }

  function alphaCompare(a: StatementResult, b: StatementResult) {
    return a.statementName <= b.statementName ? -1 : 1;
  }

  statements.sort((a, b) => {
    // if population statement, use population or send to beginning
    if (a.statementName in populationIdentifiers) {
      return b.statementName in populationIdentifiers ? populationCompare(a, b) : -1;
    }
    if (b.statementName in populationIdentifiers) return 1;

    // if function, alphabetize or send to end
    if (a.isFunction) {
      return b.isFunction ? alphaCompare(a, b) : 1;
    }
    if (b.isFunction) return -1;

    // if no function or population statement, alphabetize
    return alphaCompare(a, b);
  });
}

/**
 * Generate HTML structure based on ELM annotations in relevant statements
 *
 * @param measure measure used for calculation
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param statementResults StatementResult array from calculation
 * @param clauseResults ClauseResult array from calculation
 * @param groupId ID of population group
 * @param options Calculation Options
 * @returns string of HTML representing the clauses for this group
 */
export function generateHTML(
  measure: fhir4.Measure,
  elmLibraries: ELM[],
  statementResults: StatementResult[],
  clauseResults: ClauseResult[],
  groupId: string,
  options?: CalculationOptions
): string {
  const relevantStatements = statementResults.filter(s => s.relevance !== Relevance.NA);
  if (!options?.disableHTMLOrdering) {
    sortStatements(measure, groupId, relevantStatements);
  }

  let overallHTML = `<div><h2>Population Group: ${groupId}</h2>`;

  relevantStatements.forEach(s => {
    const matchingLibrary = elmLibraries.find(e => e.library.identifier.id === s.libraryName);
    if (!matchingLibrary) {
      throw new UnexpectedResource(`Could not find library ${s.libraryName} for statement ${s.statementName}`);
    }

    const matchingExpression = matchingLibrary.library.statements.def.find(e => e.name === s.statementName);
    if (!matchingExpression) {
      throw new UnexpectedProperty(`No statement ${s.statementName} found in library ${s.libraryName}`);
    }

    if (matchingExpression.annotation) {
      const statementHTML = main({
        libraryName: s.libraryName,
        statementName: s.statementName,
        clauseResults: clauseResults,
        ...matchingExpression.annotation[0].s
      });
      overallHTML += statementHTML;
      if (options?.buildStatementLevelHTML) {
        s.statementLevelHTML = statementHTML;
      }
    }
  });

  overallHTML += '</div>';
  return overallHTML;
}

/**
 * Generate HTML structure with clause coverage highlighting for all clauses
 * based on ELM annotations in relevant statements
 *
 * @param measure measure used for calculation
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param executionResults array of detailed population group results across
 * all patients
 * @param disableHTMLOrdering disables CQL statement sorting
 * @returns a lookup object where the key is the groupId and the value is the
 * clause coverage HTML
 */
export function generateClauseCoverageHTML<T extends CalculationOptions>(
  measure: fhir4.Measure,
  elmLibraries: ELM[],
  executionResults: ExecutionResult<DetailedPopulationGroupResult>[],
  options: T
): {
  coverage: Record<string, string>;
  uncoverage?: Record<string, string>;
  details?: Record<string, ClauseCoverageDetails>;
} {
  const groupResultLookup: Record<string, DetailedPopulationGroupResult[]> = {};
  const coverageHtmlGroupLookup: Record<string, string> = {};
  const uncoverageHtmlGroupLookup: Record<string, string> = {};
  const coverageDetailsGroupLookup: Record<string, ClauseCoverageDetails> = {};

  // get the detailed result for each group within each patient and add it
  // to the key in groupResults that matches the groupId
  executionResults.forEach(result => {
    result.detailedResults?.forEach(detailedResult => {
      if (!groupResultLookup[detailedResult.groupId]) {
        groupResultLookup[detailedResult.groupId] = [detailedResult];
      } else {
        groupResultLookup[detailedResult.groupId].push(detailedResult);
      }
    });
  });

  // go through the lookup object of each of the groups with their total
  // detailedResults and calculate the clause coverage html for each group
  Object.entries(groupResultLookup).forEach(([groupId, detailedResults]) => {
    // Grab the statement results from just the first patient since just only need the names
    // of the statements and whether or not their relevance is NA
    const flattenedStatementResults = detailedResults[0].statementResults;
    const flattenedClauseResults = detailedResults.flatMap(c => (c.clauseResults ? c.clauseResults : []));

    // Filter out any statement results where the statement relevance is NA
    const uniqueRelevantStatements = flattenedStatementResults.filter(s => s.relevance !== Relevance.NA);

    if (!options.disableHTMLOrdering) {
      sortStatements(measure, groupId, uniqueRelevantStatements);
    }

    // assemble array of statement annotations to be templated to HTML
    const statementAnnotations: { libraryName: string; statementName: string; annotation: Annotation[] }[] = [];
    uniqueRelevantStatements.forEach(s => {
      const matchingLibrary = elmLibraries.find(e => e.library.identifier.id === s.libraryName);
      if (!matchingLibrary) {
        throw new UnexpectedResource(`Could not find library ${s.libraryName} for statement ${s.statementName}`);
      }

      const matchingExpression = matchingLibrary.library.statements.def.find(e => e.name === s.statementName);
      if (!matchingExpression) {
        throw new UnexpectedProperty(`No statement ${s.statementName} found in library ${s.libraryName}`);
      }

      if (matchingExpression.annotation) {
        statementAnnotations.push({
          libraryName: s.libraryName,
          statementName: s.statementName,
          annotation: matchingExpression.annotation
        });
      }
    });

    const clauseCoverage = calculateClauseCoverage(uniqueRelevantStatements, flattenedClauseResults);
    const uniqueCoverageClauses = clauseCoverage.coveredClauses.concat(clauseCoverage.uncoveredClauses);

    // setup initial html for coverage
    let coverageHtmlString = `<div><h2> ${groupId} Clause Coverage: ${clauseCoverage.percentage}%</h2>`;

    // setup initial html for uncoverage
    let uncoverageHtmlString = '';
    if (options.calculateClauseUncoverage) {
      uncoverageHtmlString = `<div><h2> ${groupId} Clause Uncoverage: ${clauseCoverage.uncoveredClauses.length} of ${
        clauseCoverage.coveredClauses.length + clauseCoverage.uncoveredClauses.length
      } clauses</h2>`;
    }

    // generate HTML clauses using hbs template for each annotation
    statementAnnotations.forEach(a => {
      coverageHtmlString += main({
        libraryName: a.libraryName,
        statementName: a.statementName,
        clauseResults: uniqueCoverageClauses,
        ...a.annotation[0].s,
        highlightCoverage: true
      });

      // calculate for uncoverage
      if (options.calculateClauseUncoverage) {
        uncoverageHtmlString += main({
          libraryName: a.libraryName,
          statementName: a.statementName,
          uncoveredClauses: clauseCoverage.uncoveredClauses,
          coveredClauses: clauseCoverage.coveredClauses,
          ...a.annotation[0].s,
          highlightUncoverage: true
        });
      }
    });
    coverageHtmlString += '</div>';
    uncoverageHtmlString += '</div>';

    coverageHtmlGroupLookup[groupId] = coverageHtmlString;
    if (options.calculateClauseUncoverage) {
      uncoverageHtmlGroupLookup[groupId] = uncoverageHtmlString;
    }

    // If details on coverage are requested, tally them up and add them to the map.
    if (options.calculateCoverageDetails) {
      coverageDetailsGroupLookup[groupId] = {
        totalClauseCount: clauseCoverage.coveredClauses.length + clauseCoverage.uncoveredClauses.length,
        coveredClauseCount: clauseCoverage.coveredClauses.length,
        uncoveredClauseCount: clauseCoverage.uncoveredClauses.length,
        uncoveredClauses: clauseCoverage.uncoveredClauses.map(uncoveredClause => {
          return {
            localId: uncoveredClause.localId,
            libraryName: uncoveredClause.libraryName,
            statementName: uncoveredClause.statementName
          };
        })
      };
    }
  });

  return {
    coverage: coverageHtmlGroupLookup,
    ...(options.calculateClauseUncoverage && { uncoverage: uncoverageHtmlGroupLookup }),
    ...(options.calculateCoverageDetails && { details: coverageDetailsGroupLookup })
  };
}

/**
 * Calculates clause coverage as the percentage of relevant clauses with FinalResult.TRUE
 * out of all relevant clauses.
 * @param relevantStatements StatementResults array from calculation filtered to relevant statements
 * @param clauseResults ClauseResult array from calculation
 * @returns percentage out of 100, represented as a string
 */
export function calculateClauseCoverage(
  relevantStatements: StatementResult[],
  clauseResults: ClauseResult[]
): { percentage: string; coveredClauses: ClauseResult[]; uncoveredClauses: ClauseResult[] } {
  // find all relevant clauses using statementName and libraryName from relevant statements
  const allRelevantClauses = clauseResults.filter(c =>
    relevantStatements.some(
      s => s.statementName === c.statementName && s.libraryName === c.libraryName && !s.isFunction
    )
  );
  // get all unique clauses to use as denominator in percentage calculation
  const allUniqueClauses = uniqWith(
    allRelevantClauses,
    (c1, c2) => c1.libraryName === c2.libraryName && c1.localId === c2.localId
  );
  const coveredClauses = uniqWith(
    allRelevantClauses.filter(clause => clause.final === FinalResult.TRUE),
    (c1, c2) => c1.libraryName === c2.libraryName && c1.localId === c2.localId
  );

  const uncoveredClauses = allUniqueClauses.filter(c => {
    return !coveredClauses.find(coveredC => c.libraryName === coveredC.libraryName && c.localId === coveredC.localId);
  });

  return {
    percentage: ((coveredClauses.length / allUniqueClauses.length) * 100).toPrecision(3),
    coveredClauses,
    uncoveredClauses
  };
}
