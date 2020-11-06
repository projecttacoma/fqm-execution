import { Annotation, ELM } from './types/ELMTypes';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { ClauseResult, StatementResult } from './types/Calculator';
import { FinalResult, Relevance } from './types/Enums';

const mainTemplate = fs.readFileSync(path.join(__dirname, './templates/main.hbs'), 'utf8');
const clauseTemplate = fs.readFileSync(path.join(__dirname, './templates/clause.hbs'), 'utf8');

const main = Handlebars.compile(mainTemplate);
Handlebars.registerPartial('clause', clauseTemplate);

// text values in annotations show up as an array of strings
Handlebars.registerHelper('concat', s => s.join(''));

Handlebars.registerHelper('highlightClass', (localId: string, context) => {
  const libraryName: string = context.data.root.libraryName;
  const clauseResults: ClauseResult[] = context.data.root.clauseResults;

  const clauseResult = clauseResults.find(result => result.libraryName === libraryName && result.localId == localId);

  if (clauseResult) {
    if (clauseResult.final === FinalResult.TRUE) {
      return 'clause-true';
    } else if (clauseResult.final === FinalResult.FALSE) {
      return 'clause-false';
    }
  }
  return '';
});

/**
 * Generate HTML structure based on ELM annotations in relevant statements
 *
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param statementResults StatementResult array from calculation
 * @param groupId ID of population group
 */
export function generateHTML(
  elmLibraries: ELM[],
  statementResults: StatementResult[],
  clauseResults: ClauseResult[],
  groupId: string
): string {
  const relevantStatements = statementResults.filter(s => s.relevance === Relevance.TRUE);

  // assemble array of statement annotations to be templated to HTML
  const statementAnnotations: { libraryName: string; annotation: Annotation[] }[] = [];
  relevantStatements.forEach(s => {
    const matchingLibrary = elmLibraries.find(e => e.library.identifier.id === s.libraryName);
    if (!matchingLibrary) {
      throw new Error(`Could not find library ${s.libraryName} for statement ${s.statementName}`);
    }

    const matchingExpression = matchingLibrary.library.statements.def.find(e => e.name === s.statementName);
    if (!matchingExpression) {
      throw new Error(`No statement ${s.statementName} found in library ${s.libraryName}`);
    }

    if (matchingExpression.annotation) {
      statementAnnotations.push({
        libraryName: s.libraryName,
        annotation: matchingExpression.annotation
      });
    }
  });

  let result = `<div><h2>Population Group: ${groupId}</h2>`;

  // generate HTML clauses using hbs template for each annotation
  statementAnnotations.forEach(a => {
    const res = main({ libraryName: a.libraryName, clauseResults: clauseResults, s: a.annotation[0] });
    result += res;
  });

  result += '</div>';
  return result;
}
