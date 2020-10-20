import { generateHTML } from '../src/HTMLGenerator';
import { StatementResult } from '../src/types/Calculator';
import { ELM, ELMStatement } from '../src/types/ELMTypes';
import { FinalResult, Relevance } from '../src/types/Enums';
import { getELMFixture, getHTMLFixture } from './helpers/testHelpers';

describe('HTMLGenerator', () => {
  let elm = <ELM>{};
  let simpleExpression: ELMStatement | undefined;
  let statementResults: StatementResult[];
  beforeEach(() => {
    elm = getELMFixture('elm/CMS723v0.json');
    simpleExpression = elm.library.statements.def.find(d => d.localId === '119'); // Simple expression for Denominator

    statementResults = [
      {
        statementName: simpleExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        final: FinalResult.TRUE,
        relevance: Relevance.TRUE
      }
    ];
  });

  test('simple HTML generation', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleAnnotation.html').replace(/\s/g, '');
    const res = generateHTML([elm], statementResults, 'test');

    expect(res.replace(/\s/g, '')).toEqual(expectedHTML);
  });

  test('no library found should error', () => {
    elm.library.identifier.id = 'NOT REAL';

    expect(() => {
      generateHTML([elm], statementResults, 'test');
    }).toThrowError();
  });

  test('no statement found should error', () => {
    const badStatementResults = [
      {
        statementName: 'NOT REAL',
        libraryName: elm.library.identifier.id,
        final: FinalResult.TRUE,
        relevance: Relevance.TRUE
      }
    ];

    expect(() => {
      generateHTML([elm], badStatementResults, 'test');
    }).toThrowError();
  });
});
