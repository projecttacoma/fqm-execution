import { Annotation, ELM } from '../types/ELMTypes';
import Handlebars from 'handlebars';
import { ClauseResult, StatementResult } from '../types/Calculator';
import { FinalResult, Relevance } from '../types/Enums';
import mainTemplate from '../templates/main';
import clauseTemplate from '../templates/clause';
import { UnexpectedProperty, UnexpectedResource } from '../types/errors/CustomErrors';

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

  const clauseResult = clauseResults.find(result => result.libraryName === libraryName && result.localId === localId);
  if (clauseResult) {
    if (clauseResult.final === FinalResult.TRUE) {
      return objToCSS(cqlLogicClauseCoveredStyle);
    }
  }
  return '';
});

/**
 * Generate HTML structure based on ELM annotations in relevant statements
 *
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param statementResults StatementResult array from calculation
 * @param clauseResults ClauseResult array from calculation
 * @param groupId ID of population group
 * @param highlightingType string representing whether to apply coverage highlighting
 * @returns string of HTML representing the clauses for this group
 */
export function generateHTML(
  elmLibraries: ELM[],
  statementResults: StatementResult[],
  clauseResults: ClauseResult[],
  groupId: string,
  highlightingType: string | undefined
): string {
  const relevantStatements = statementResults.filter(s => s.relevance === Relevance.TRUE);

  // assemble array of statement annotations to be templated to HTML
  const statementAnnotations: { libraryName: string; annotation: Annotation[] }[] = [];
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
        annotation: matchingExpression.annotation
      });
    }
  });

  let result = `<div><h2>Population Group: ${groupId}</h2>`;
  if (highlightingType === 'coverage') {
    result += '<h2> Clause Coverage: XX%</h2>';
  }

  // generate HTML clauses using hbs template for each annotation
  statementAnnotations.forEach(a => {
    const res = main({ libraryName: a.libraryName, clauseResults: clauseResults, ...a.annotation[0].s, highlight: highlightingType});
    result += res;
  });

  result += '</div>';
  return result;
}
