import { Annotation, ELM } from '../types/ELMTypes';
import Handlebars from 'handlebars';
import { ClauseResult, DetailedPopulationGroupResult, ExecutionResult, StatementResult } from '../types/Calculator';
import { FinalResult, Relevance } from '../types/Enums';
import mainTemplate from '../templates/main';
import clauseTemplate from '../templates/clause';
import { UnexpectedProperty, UnexpectedResource } from '../types/errors/CustomErrors';
import { uniqWith } from 'lodash';

export const cqlLogicClauseTrueStyle = {
  'background-color': '#ccebe0',
  color: '#20744c',
  'border-bottom-color': '#20744c',
  'border-bottom-style': 'solid'
};

export const cqlLogicClauseFalseStyle = {
  'background-color': '#edd8d0',
  color: '#a63b12',
  'border-bottom-color': '#a63b12',
  'border-bottom-style': 'double'
};

export const cqlLogicClauseCoveredStyle = {
  'background-color': '#daeaf5',
  color: '#004e82',
  'border-bottom-color': '#006cb4',
  'border-bottom-style': 'dashed'
};

export const cqlLogicUncoveredClauseStyle = {
  'background-color': 'white',
  color: 'black',
  'border-bottom-color': 'white',
  'border-bottom-style': 'solid'
};

type StatementAnnotation = { libraryName: string; annotation: Annotation[]; statementName: string };

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
    } else if (clauseResult.every(c => c.final === FinalResult.FALSE)) {
      return objToCSS(cqlLogicUncoveredClauseStyle);
    }
  }
  return '';
});

/**
 * Sort statements into population, then non-functions, then functions
 */
export function sortStatements(measure: fhir4.Measure, groupId: string, statements: StatementResult[]) {
  const group = measure.group?.find(g => g.id === groupId) || measure.group?.[0];
  const populationSet = new Set(group?.population?.map(p => p.criteria.expression));
  function alphaCompare(a: StatementResult, b: StatementResult) {
    return a.statementName <= b.statementName ? -1 : 1;
  }
  statements.sort((a, b) => {
    // if function, alphabetize or send to end
    if (a.isFunction) {
      return b.isFunction ? alphaCompare(a, b) : 1;
    }
    if (b.isFunction) return -1;

    // if population statement, leave order or send to beginning
    if (populationSet.has(a.statementName)) {
      return populationSet.has(b.statementName) ? 0 : -1;
    }
    if (populationSet.has(b.statementName)) return 1;

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
 * @returns string of HTML representing the clauses for this group
 */
export function generateHTML(
  measure: fhir4.Measure,
  elmLibraries: ELM[],
  statementResults: StatementResult[],
  clauseResults: ClauseResult[],
  groupId: string
): string {
  const relevantStatements = statementResults.filter(s => s.relevance !== Relevance.NA);
  sortStatements(measure, groupId, relevantStatements);

  // assemble array of statement annotations to be templated to HTML
  const statementAnnotations: StatementAnnotation[] = [];
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
      statementAnnotations.push({
        libraryName: s.libraryName,
        statementName: s.statementName,
        annotation: matchingExpression.annotation
      });
    }
  });

  let result = `<div><h2>Population Group: ${groupId}</h2>`;

  // generate HTML clauses using hbs template for each annotation
  statementAnnotations.forEach(a => {
    const res = main({
      libraryName: a.libraryName,
      statementName: a.statementName,
      clauseResults: clauseResults,
      ...a.annotation[0].s
    });
    result += res;
  });

  result += '</div>';
  return result;
}

/**
 * Generate HTML structure with clause coverage highlighting for all clauses
 * based on ELM annotations in relevant statements
 *
 * @param measure measure used for calculation
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param executionResults array of detailed population group results across
 * all patients
 * @returns a lookup object where the key is the groupId and the value is the
 * clause coverage HTML
 */
export function generateClauseCoverageHTML(
  measure: fhir4.Measure,
  elmLibraries: ELM[],
  executionResults: ExecutionResult<DetailedPopulationGroupResult>[]
): Record<string, string> {
  const groupResultLookup: Record<string, DetailedPopulationGroupResult[]> = {};
  const htmlGroupLookup: Record<string, string> = {};

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
    const flattenedStatementResults = detailedResults.flatMap(s => s.statementResults);
    const flattenedClauseResults = detailedResults.flatMap(c => (c.clauseResults ? c.clauseResults : []));

    // Grab every statement with any relevance other than N/A
    // There may be multiple entries for a given statement across the results,
    // but we know that non of them can be irrelevant
    const relevantStatements = uniqWith(
      flattenedStatementResults,
      (s1, s2) => s1.libraryName === s2.libraryName && s1.localId === s2.localId && s1.relevance === s2.relevance
    ).filter(s => s.relevance !== Relevance.NA);

    // From all the relevant ones, filter out any duplicate statements
    // uniqWith appears to pick the first element it encounters that matches the uniqueness condition
    // when iterating, which is fine because the relevance not being N/A is the only thing that matters now
    const uniqueRelevantStatements = uniqWith(
      relevantStatements,
      (s1, s2) => s1.libraryName === s2.libraryName && s1.localId === s2.localId
    );

    sortStatements(measure, groupId, uniqueRelevantStatements);

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

    let htmlString = `<div><h2> ${groupId} Clause Coverage: ${calculateClauseCoverage(
      uniqueRelevantStatements,
      flattenedClauseResults
    )}%</h2>`;

    // generate HTML clauses using hbs template for each annotation
    statementAnnotations.forEach(a => {
      const res = main({
        libraryName: a.libraryName,
        statementName: a.statementName,
        clauseResults: flattenedClauseResults,
        ...a.annotation[0].s,
        highlightCoverage: true
      });
      htmlString += res;
    });
    htmlString += '</div>';

    htmlGroupLookup[groupId] = htmlString;
  });

  return htmlGroupLookup;
}

/**
 * Calculates clause coverage as the percentage of relevant clauses with FinalResult.TRUE
 * out of all relevant clauses.
 * @param relevantStatements StatementResults array from calculation filtered to relevant statements
 * @param clauseResults ClauseResult array from calculation
 * @returns percentage out of 100, represented as a string
 */
export function calculateClauseCoverage(relevantStatements: StatementResult[], clauseResults: ClauseResult[]): string {
  // find all relevant clauses using localId and libraryName from relevant statements
  const allRelevantClauses = clauseResults.filter(c =>
    relevantStatements.some(s => s.localId === c.localId && s.libraryName === c.libraryName && !s.isFunction)
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
  return ((coveredClauses.length / allUniqueClauses.length) * 100).toPrecision(3);
}
