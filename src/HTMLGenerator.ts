import { Annotation, ELM } from './types/ELMTypes';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { StatementResult } from './types/Calculator';
import { Relevance } from './types/Enums';

const mainTemplate = fs.readFileSync(path.join(__dirname, './templates/main.hbs'), 'utf8');
const clauseTemplate = fs.readFileSync(path.join(__dirname, './templates/clause.hbs'), 'utf8');

const main = Handlebars.compile(mainTemplate);
Handlebars.registerPartial('clause', clauseTemplate);

// text values in annotations show up as an array of strings
Handlebars.registerHelper('concat', s => s.join(''));

/**
 * Generate HTML structure based on ELM annotations in relevant statements
 *
 * @param elmLibraries main ELM and dependencies to lookup statements
 * @param statementResults StatementResult array from calculation
 * @param groupId ID of population group
 */
export function generateHTML(elmLibraries: ELM[], statementResults: StatementResult[], groupId: string): string {
  const relevantStatements = statementResults.filter(s => s.relevance === Relevance.TRUE);

  // assemble array of annotations to be templated to HTML
  let annotations: Annotation[] = [];
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
      annotations = annotations.concat(matchingExpression.annotation);
    }
  });

  let result = `<div><h2>Population Group: ${groupId}</h2>`;

  // generate HTML clauses using hbs template for each annotation
  annotations.forEach(a => {
    const res = main({ groupId, ...a.s });
    result += res;
  });

  result += '</div>';
  return result;
}
