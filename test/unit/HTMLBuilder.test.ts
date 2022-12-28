import {
  generateHTML,
  generateClauseCoverageHTML,
  objToCSS,
  cqlLogicClauseTrueStyle,
  cqlLogicClauseFalseStyle,
  cqlLogicClauseCoveredStyle,
  calculateClauseCoverage
} from '../../src/calculation/HTMLBuilder';
import {
  StatementResult,
  ClauseResult,
  ExecutionResult,
  DetailedPopulationGroupResult
} from '../../src/types/Calculator';
import { ELM, ELMStatement } from '../../src/types/ELMTypes';
import { FinalResult, Relevance } from '../../src/types/Enums';
import { getELMFixture, getHTMLFixture } from './helpers/testHelpers';

describe('HTMLBuilder', () => {
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
        relevance: Relevance.TRUE,
        localId: desiredLocalId
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
    const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'testid',
        detailedResults: [
          {
            statementResults: statementResults,
            clauseResults: [trueClauseResults[0], falseClauseResults[0]],
            groupId: 'test'
          }
        ]
      }
    ];
    const res = generateClauseCoverageHTML([elm], executionResults);

    expect(res.test.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.test.includes(coverageStyleString)).toBeTruthy();
  });

  test('simple HTML for two groups with generation with clause coverage styling', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleCoverageAnnotation.html').replace(/\s/g, '');
    const expectedHTML2 = getHTMLFixture('simpleCoverageAnnotation2.html').replace(/\s/g, '');
    const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'testid',
        detailedResults: [
          {
            statementResults: statementResults,
            clauseResults: [trueClauseResults[0], falseClauseResults[0]],
            groupId: 'test'
          },
          {
            statementResults: statementResults,
            clauseResults: [trueClauseResults[0], falseClauseResults[0]],
            groupId: 'test2'
          }
        ]
      }
    ];
    const res = generateClauseCoverageHTML([elm], executionResults);

    expect(res.test.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.test2.replace(/\s/g, '')).toEqual(expectedHTML2);
    expect(res.test.includes(coverageStyleString)).toBeTruthy();
    expect(res.test2.includes(coverageStyleString)).toBeTruthy();
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
  test('clause coverage percent with a function ignores function in calculation', () => {
    statementResults = [
      {
        libraryName: 'testLib',
        statementName: 'testFunc',
        localId: 'test-id-1',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE,
        raw: undefined,
        isFunction: 'TRUE',
        pretty: 'FUNCTION'
      },
      {
        libraryName: 'testLib',
        statementName: 'testStatement',
        localId: 'test-id-2',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE,
        raw: false,
        isFunction: 'FALSE',
        pretty: 'FALSE (false)'
      }
    ];
    const clauseResults = [
      {
        raw: undefined,
        statementName: 'testFunc',
        libraryName: 'testLib',
        localId: 'test-id-1',
        final: FinalResult.NA
      },
      {
        raw: undefined,
        statementName: 'testStatement',
        libraryName: 'testLib',
        localId: 'test-id-2',
        final: FinalResult.TRUE
      }
    ];
    const results = calculateClauseCoverage(statementResults, clauseResults);
    expect(results).toEqual('100');
  });
});
