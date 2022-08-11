import {
  generateHTML,
  objToCSS,
  cqlLogicClauseTrueStyle,
  cqlLogicClauseFalseStyle,
  cqlLogicClauseCoveredStyle
} from '../src/calculation/HTMLBuilder';
import { StatementResult, ClauseResult } from '../src/types/Calculator';
import { ELM, ELMStatement } from '../src/types/ELMTypes';
import { FinalResult, Relevance } from '../src/types/Enums';
import { getELMFixture, getHTMLFixture } from './helpers/testHelpers';

describe('HTMLGenerator', () => {
  let elm = <ELM>{};
  let simpleExpression: ELMStatement | undefined;
  let statementResults: StatementResult[];
  let trueClauseResults: ClauseResult[];
  let falseClauseResults: ClauseResult[];
  const desiredLocalId = '119';
  const trueStyleString = objToCSS(cqlLogicClauseTrueStyle);
  const falseStyleString = objToCSS(cqlLogicClauseFalseStyle);
  const coverageStyleString = objToCSS(cqlLogicClauseCoveredStyle);

  beforeEach(() => {
    elm = getELMFixture('elm/CMS723v0.json');
    simpleExpression = elm.library.statements.def.find(d => d.localId === desiredLocalId); // Simple expression for Denominator

    statementResults = [
      {
        statementName: simpleExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        final: FinalResult.TRUE,
        relevance: Relevance.TRUE
      }
    ];

    trueClauseResults = [
      {
        statementName: simpleExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: desiredLocalId,
        final: FinalResult.TRUE,
        raw: true
      }
    ];

    falseClauseResults = [
      {
        statementName: simpleExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: desiredLocalId,
        final: FinalResult.FALSE,
        raw: false
      }
    ];
  });

  test('simple HTML with generation with true clause', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleTrueAnnotation.html').replace(/\s/g, '');
    const res = generateHTML([elm], statementResults, trueClauseResults, 'test');

    expect(res.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.includes(trueStyleString)).toBeTruthy();
  });

  test('simple HTML with generation with false clause', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleFalseAnnotation.html').replace(/\s/g, '');
    const res = generateHTML([elm], statementResults, falseClauseResults, 'test');

    expect(res.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.includes(falseStyleString)).toBeTruthy();
  });

  test('simple HTML with generation with clause coverage styling', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleCoverageAnnotation.html').replace(/\s/g, '');
    const res = generateHTML([elm], statementResults, trueClauseResults, 'test', true);

    expect(res.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.includes(coverageStyleString)).toBeTruthy();
  });

  test('no library found should error', () => {
    elm.library.identifier.id = 'NOT REAL';

    expect(() => {
      generateHTML([elm], statementResults, trueClauseResults, 'test');
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
      generateHTML([elm], badStatementResults, [], 'test');
    }).toThrowError();
  });
});
