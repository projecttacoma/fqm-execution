import {
  generateHTML,
  generateClauseCoverageHTML,
  objToCSS,
  cqlLogicClauseTrueStyle,
  cqlLogicClauseFalseStyle,
  cqlLogicClauseCoveredStyle,
  calculateClauseCoverage,
  sortStatements
} from '../../src/calculation/HTMLBuilder';
import {
  StatementResult,
  ClauseResult,
  ExecutionResult,
  DetailedPopulationGroupResult
} from '../../src/types/Calculator';
import { ELM, ELMStatement } from '../../src/types/ELMTypes';
import { FinalResult, Relevance } from '../../src/types/Enums';
import { getELMFixture, getHTMLFixture, getJSONFixture } from './helpers/testHelpers';

describe('HTMLBuilder', () => {
  let elm = <ELM>{};
  let denominatorExpression: ELMStatement | undefined;
  let numeratorExpression: ELMStatement | undefined;
  let statementResults: StatementResult[];
  let trueClauseResults: ClauseResult[];
  let falseClauseResults: ClauseResult[];
  const denominatorLocalId = '119';
  const numeratorLocalId = '135';
  const trueStyleString = objToCSS(cqlLogicClauseTrueStyle);
  const falseStyleString = objToCSS(cqlLogicClauseFalseStyle);
  const coverageStyleString = objToCSS(cqlLogicClauseCoveredStyle);
  const simpleMeasure = getJSONFixture('measure/simple-measure.json') as fhir4.Measure;
  const cvMeasure = getJSONFixture('measure/cv-measure.json') as fhir4.Measure;
  const singlePopMeasure = <fhir4.Measure>{
    resourceType: 'Measure',
    status: 'unknown',
    group: [
      {
        population: [
          {
            id: 'initial-population-id',
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'initial-population'
                }
              ]
            },
            criteria: {
              expression: 'ipp',
              language: 'text/cql'
            }
          }
        ]
      }
    ]
  };
  const popRetrieveFuncElm = getELMFixture('elm/declarations/PopRetrieveFunc.json');
  const prfStatementResults = [
    {
      libraryName: 'Test',
      statementName: 'A Function',
      localId: 'test-id-1',
      final: FinalResult.FALSE,
      relevance: Relevance.TRUE,
      raw: undefined,
      isFunction: true,
      pretty: 'FUNCTION'
    },
    {
      libraryName: 'Test',
      statementName: 'SimpleVSRetrieve',
      localId: 'test-id-2',
      final: FinalResult.FALSE,
      relevance: Relevance.TRUE,
      raw: false,
      isFunction: false,
      pretty: 'FALSE (false)'
    },
    {
      libraryName: 'Test',
      statementName: 'ipp',
      localId: 'test-id-3',
      final: FinalResult.FALSE,
      relevance: Relevance.TRUE,
      raw: undefined,
      isFunction: false,
      pretty: 'IPP'
    }
  ];
  const prfClauseResults = [
    {
      raw: undefined,
      statementName: 'A Function',
      libraryName: 'Test',
      localId: 'test-id-1',
      final: FinalResult.NA
    },
    {
      raw: undefined,
      statementName: 'SimpleVSRetrieve',
      libraryName: 'Test',
      localId: 'test-id-2',
      final: FinalResult.TRUE
    },
    {
      raw: undefined,
      statementName: 'ipp',
      libraryName: 'Test',
      localId: 'test-id-3',
      final: FinalResult.TRUE
    }
  ];

  beforeEach(() => {
    elm = getELMFixture('elm/libraries/CMS723v0.json');
    denominatorExpression = elm.library.statements.def.find(d => d.localId === denominatorLocalId); // Simple expression for Denominator
    numeratorExpression = elm.library.statements.def.find(d => d.localId === numeratorLocalId); // Simple expression for Denominator

    //
    statementResults = [
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        final: FinalResult.TRUE,
        relevance: Relevance.TRUE,
        localId: denominatorLocalId
      },
      {
        statementName: numeratorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        final: FinalResult.UNHIT,
        relevance: Relevance.FALSE,
        localId: numeratorLocalId
      }
    ];

    trueClauseResults = [
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: denominatorLocalId,
        final: FinalResult.TRUE,
        raw: true
      },
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: '118',
        final: FinalResult.TRUE,
        raw: [{ resourceType: 'foo' }]
      },
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: '116',
        final: FinalResult.TRUE,
        raw: [{ resourceType: 'foo' }]
      },
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: '115',
        final: FinalResult.TRUE,
        raw: [{ resourceType: 'foo' }]
      }
    ];

    falseClauseResults = [
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: denominatorLocalId,
        final: FinalResult.FALSE,
        raw: false
      },
      {
        statementName: denominatorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: '117',
        final: FinalResult.FALSE,
        raw: []
      },
      // specifically not including this result to make this clause have no coverage styling.
      // This simulates a clause that only exists in the annotation.
      // {
      //   statementName: simpleExpression?.name ?? '',
      //   libraryName: elm.library.identifier.id,
      //   localId: '101',
      //   final: FinalResult.FALSE,
      //   raw: []
      // }
      {
        statementName: numeratorExpression?.name ?? '',
        libraryName: elm.library.identifier.id,
        localId: numeratorLocalId,
        final: FinalResult.UNHIT,
        raw: false
      }
    ];
  });

  test('simple HTML with generation with mix of false and true clauses', () => {
    // Ignore tabs and new lines
    const expectedHTML = getHTMLFixture('simpleHighlightingAnnotation.html').replace(/\s/g, '');
    const res = generateHTML(
      simpleMeasure,
      [elm],
      statementResults,
      [...trueClauseResults, ...falseClauseResults],
      'test'
    );

    expect(res.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.includes(trueStyleString)).toBeTruthy();
    expect(res.includes(falseStyleString)).toBeTruthy();
  });

  test('statement-level HTML is added to statement results when calculation option is specified', () => {
    const res = generateHTML(simpleMeasure, [elm], statementResults, trueClauseResults, 'test', {
      buildStatementLevelHTML: true
    });

    expect(statementResults[0].statementLevelHTML).toBeDefined();
    if (statementResults[0].statementLevelHTML) {
      expect(res.includes(statementResults[0].statementLevelHTML)).toBeTruthy();
    }
  });

  test('statement-level HTML is not added to statement results when statement relevance is NA', () => {
    const statementResultsNA = [
      {
        statementName: 'statementName',
        libraryName: 'libraryName',
        final: FinalResult.NA,
        relevance: Relevance.NA,
        localId: 'localId'
      }
    ];

    const clauseResultsNA = [
      {
        statementName: 'statementName',
        libraryName: 'libraryName',
        localId: 'localId',
        final: FinalResult.NA,
        raw: true
      }
    ];

    generateHTML(simpleMeasure, [elm], statementResultsNA, clauseResultsNA, 'test', {
      buildStatementLevelHTML: true
    });

    expect(statementResults[0].statementLevelHTML).toBeUndefined();
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
            clauseResults: [...trueClauseResults, ...falseClauseResults],
            groupId: 'test'
          }
        ]
      }
    ];
    const res = generateClauseCoverageHTML(simpleMeasure, [elm], executionResults, {});

    expect(res.coverage.test.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.coverage.test.includes(coverageStyleString)).toBeTruthy();
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
            clauseResults: [...trueClauseResults, ...falseClauseResults],
            groupId: 'test'
          },
          {
            statementResults: statementResults,
            clauseResults: [...trueClauseResults, ...falseClauseResults],
            groupId: 'test2'
          }
        ]
      }
    ];
    const res = generateClauseCoverageHTML(simpleMeasure, [elm], executionResults, {});

    expect(res.coverage.test.replace(/\s/g, '')).toEqual(expectedHTML);
    expect(res.coverage.test2.replace(/\s/g, '')).toEqual(expectedHTML2);
    expect(res.coverage.test.includes(coverageStyleString)).toBeTruthy();
    expect(res.coverage.test2.includes(coverageStyleString)).toBeTruthy();
  });

  test('ordered HTML with generation with clause coverage styling', () => {
    const executionResults: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'testid',
        detailedResults: [
          {
            statementResults: prfStatementResults,
            clauseResults: prfClauseResults,
            groupId: 'test'
          }
        ]
      }
    ];
    const res = generateClauseCoverageHTML(singlePopMeasure, [popRetrieveFuncElm], executionResults, {});

    expect(res.coverage.test.indexOf('ipp')).toBeLessThan(res.coverage.test.indexOf('SimpleVSRetrieve'));
    expect(res.coverage.test.indexOf('SimpleVSRetrieve')).toBeLessThan(res.coverage.test.indexOf('A Function'));
  });

  test('no library found should error', () => {
    elm.library.identifier.id = 'NOT REAL';

    expect(() => {
      generateHTML(simpleMeasure, [elm], statementResults, trueClauseResults, 'test');
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
      generateHTML(simpleMeasure, [elm], badStatementResults, [], 'test');
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
        isFunction: true,
        pretty: 'FUNCTION'
      },
      {
        libraryName: 'testLib',
        statementName: 'testStatement',
        localId: 'test-id-2',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE,
        raw: false,
        isFunction: false,
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
    expect(results.percentage).toEqual('100');
    expect(results.uncoveredClauses).toEqual([]);
  });

  test('html generation orders population first, then other, then function', () => {
    const res = generateHTML(singlePopMeasure, [popRetrieveFuncElm], prfStatementResults, prfClauseResults, 'test');
    expect(res.indexOf('ipp')).toBeLessThan(res.indexOf('SimpleVSRetrieve'));
    expect(res.indexOf('SimpleVSRetrieve')).toBeLessThan(res.indexOf('A Function'));
  });

  test('sortStatements orders population statements in specified order, then other, then function for a proportion boolean measure', () => {
    statementResults = [
      {
        libraryName: 'Test',
        statementName: 'A Function',
        localId: 'test-id-1',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE,
        isFunction: true
      },
      {
        libraryName: 'Test',
        statementName: 'SimpleVSRetrieve',
        localId: 'test-id-2',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      },
      {
        libraryName: 'Test',
        statementName: 'Numerator',
        localId: 'test-id-3',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      },
      {
        libraryName: 'Test',
        statementName: 'Initial Population',
        localId: 'test-id-4',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      },
      {
        libraryName: 'Test',
        statementName: 'Denominator Exclusion',
        localId: 'test-id-5',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      }
    ];
    sortStatements(simpleMeasure, 'test', statementResults);
    expect(statementResults[0].statementName === 'Initial Population');
    expect(statementResults[1].statementName === 'Denominator Exclusion');
    expect(statementResults[2].statementName === 'Numerator');
    expect(statementResults[3].statementName === 'SimpleVSRetrieve');
    expect(statementResults[4].statementName === 'A Function');
  });

  test('sortStatements orders population statements in specified order, then other, then function for a continuous-variable boolean measure', () => {
    statementResults = [
      {
        libraryName: 'Test',
        statementName: 'Measure Population Exclusions',
        localId: 'test-id-1',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      },
      {
        libraryName: 'Test',
        statementName: 'Initial Population',
        localId: 'test-id-2',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      },
      {
        libraryName: 'Test',
        statementName: 'MeasureObservation',
        localId: 'test-id-3',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE,
        isFunction: true
      },
      {
        libraryName: 'Test',
        statementName: 'Measure Population',
        final: FinalResult.FALSE,
        relevance: Relevance.TRUE
      }
    ];
    sortStatements(cvMeasure, 'test', statementResults);
    expect(statementResults[0].statementName === 'Initial Population');
    expect(statementResults[1].statementName === 'Measure Population');
    expect(statementResults[2].statementName === 'Measure Population Exclusions');
    expect(statementResults[3].statementName === 'MeasureObservation');
  });
});
