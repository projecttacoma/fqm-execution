import * as ClauseResultsBuilder from '../../src/calculation/ClauseResultsBuilder';
import { getJSONFixture, getELMFixture } from './helpers/testHelpers';

import { PopulationResult, StatementResult } from '../../src/types/Calculator';
import { PopulationType, Relevance, FinalResult, MeasureScoreType } from '../../src/types/Enums';
import * as cql from '../../src/types/CQLTypes';
import { Code, Concept } from 'cql-execution';

type MeasureWithGroup = fhir4.Measure & {
  group: fhir4.MeasureGroup[];
};

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
const exampleELM = getELMFixture('elm/ExampleMeasure.json');
const mainLibraryId = exampleELM.library.identifier.id;
const populationResults: PopulationResult[] = [
  {
    populationType: PopulationType.IPP,
    criteriaExpression: 'Initial Population',
    result: true
  },
  {
    populationType: PopulationType.DENOM,
    criteriaExpression: 'Denominator',
    result: true
  },
  {
    populationType: PopulationType.NUMER,
    criteriaExpression: 'Numerator',
    result: true
  },
  {
    populationType: PopulationType.NUMEX,
    criteriaExpression: 'Numerator Exclusion',
    result: false
  },
  {
    populationType: PopulationType.DENEX,
    criteriaExpression: 'Denominator Exclusion',
    result: false
  }
];
const localIdResults: cql.LocalIdResults = {
  [mainLibraryId]: {
    '2': true,
    '3': true,
    '4': true,
    '5': true,
    '6': true,
    '7': true,
    '8': false,
    '9': false,
    '10': false,
    '11': false,
    '12': true,
    '13': true
  }
};
const statementResults: StatementResult[] = [
  {
    libraryName: mainLibraryId,
    statementName: 'Initial Population',
    localId: '3',
    final: FinalResult.TRUE,
    relevance: Relevance.TRUE,
    raw: true
  },
  {
    libraryName: mainLibraryId,
    statementName: 'Denominator',
    localId: '5',
    final: FinalResult.TRUE,
    relevance: Relevance.TRUE,
    raw: true
  },
  {
    libraryName: mainLibraryId,
    statementName: 'Numerator',
    localId: '7',
    final: FinalResult.TRUE,
    relevance: Relevance.TRUE,
    raw: true
  },
  {
    libraryName: mainLibraryId,
    statementName: 'Numerator Exclusion',
    localId: '9',
    final: FinalResult.FALSE,
    relevance: Relevance.FALSE,
    raw: false
  },
  {
    libraryName: mainLibraryId,
    statementName: 'Denominator Exclusion',
    localId: '11',
    final: FinalResult.FALSE,
    relevance: Relevance.FALSE,
    raw: false
  },
  {
    libraryName: mainLibraryId,
    statementName: 'SDE',
    localId: '13',
    final: FinalResult.TRUE,
    relevance: Relevance.TRUE,
    raw: true
  }
];

const populationResultsTwoIps: PopulationResult[] = [
  {
    populationType: PopulationType.IPP,
    result: false
  },
  {
    populationType: PopulationType.IPP,
    criteriaExpression: 'ipp2',
    result: true
  }
];

describe('ClauseResultsBuilder', () => {
  describe('findResult', () => {
    test('should default to populationType when criteriaExpression is missing', () => {
      const result = ClauseResultsBuilder.findResult(PopulationType.IPP, populationResultsTwoIps);

      expect(result).not.toBeUndefined();
      expect((result as PopulationResult).result).toBe(false);
    });

    test('should find second ipp when matching criteria expression', () => {
      const result = ClauseResultsBuilder.findResult(PopulationType.IPP, populationResultsTwoIps, 'ipp2');

      expect(result).not.toBeUndefined();
      expect((result as PopulationResult).result).toBe(true);
    });

    test('should return undefined when no population matches', () => {
      const result = ClauseResultsBuilder.findResult(PopulationType.IPP, populationResultsTwoIps, 'does not exist');

      expect(result).toBeUndefined();
    });
  });

  describe('Statement Maps', () => {
    test('should build statement relevance map', () => {
      const map = ClauseResultsBuilder.buildStatementRelevanceMap(
        simpleMeasure,
        populationResults,
        mainLibraryId,
        [exampleELM],
        simpleMeasure.group[0],
        true
      );

      expect(map).toHaveLength(exampleELM.library.statements.def.length);

      expect(map).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            libraryName: mainLibraryId,
            statementName: 'Initial Population',
            relevance: Relevance.TRUE
          }),

          expect.objectContaining({
            libraryName: mainLibraryId,
            statementName: 'Denominator',
            relevance: Relevance.TRUE
          }),

          expect.objectContaining({
            libraryName: mainLibraryId,
            statementName: 'Numerator',
            relevance: Relevance.TRUE
          }),

          expect.objectContaining({
            libraryName: mainLibraryId,
            statementName: 'Denominator Exclusion',
            relevance: Relevance.FALSE
          })
        ])
      );
    });

    test('should build statement and clause results', () => {
      const results = ClauseResultsBuilder.buildStatementAndClauseResults(
        simpleMeasure,
        [exampleELM],
        localIdResults,
        statementResults,
        true,
        true
      );

      const numResults = Object.keys(localIdResults[mainLibraryId]).length;

      expect(results).toHaveLength(numResults);

      expect(results).toEqual(
        expect.arrayContaining([
          {
            raw: true,
            statementName: 'Initial Population',
            libraryName: 'ExampleMeasure',
            localId: '3',
            final: FinalResult.TRUE
          },
          {
            raw: true,
            statementName: 'Denominator',
            libraryName: 'ExampleMeasure',
            localId: '5',
            final: FinalResult.TRUE
          },
          {
            raw: true,
            statementName: 'Numerator',
            libraryName: 'ExampleMeasure',
            localId: '7',
            final: FinalResult.TRUE
          },
          {
            raw: false,
            statementName: 'Numerator Exclusion',
            libraryName: 'ExampleMeasure',
            localId: '9',
            final: FinalResult.UNHIT
          },
          {
            raw: false,
            statementName: 'Denominator Exclusion',
            libraryName: 'ExampleMeasure',
            localId: '11',
            final: FinalResult.UNHIT
          },
          {
            raw: true,
            statementName: 'SDE',
            libraryName: 'ExampleMeasure',
            localId: '13',
            final: FinalResult.TRUE
          }
        ])
      );
    });

    test('should add populationId to relevance map when present on results', () => {
      const results: PopulationResult[] = [
        {
          populationType: PopulationType.IPP,
          populationId: 'example-pop-id',
          result: true
        }
      ];

      const relevantPops = ClauseResultsBuilder.buildPopulationRelevanceMap(results);

      expect(relevantPops).toEqual(results);
    });

    test('should add criteriaReferenceId to relevance map when present on results', () => {
      const results: PopulationResult[] = [
        {
          populationType: PopulationType.IPP,
          criteriaReferenceId: 'example-pop-id',
          result: true
        }
      ];

      const relevantPops = ClauseResultsBuilder.buildPopulationRelevanceMap(results);

      expect(relevantPops).toEqual(results);
    });
  });

  describe('episodes', () => {
    test('should mark master results relevant if any episode is true', () => {
      const truePopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const falsePopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: false },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const expectedMasterResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: true }
      ];

      const results = ClauseResultsBuilder.buildPopulationRelevanceForAllEpisodes(
        [
          { episodeId: '1', populationResults: truePopulationResults },
          { episodeId: '2', populationResults: falsePopulationResults }
        ],
        simpleMeasure.group[0]
      );

      expect(results.length).toEqual(expectedMasterResults.length);
      expect(results).toEqual(expect.arrayContaining(expectedMasterResults));
    });
  });

  describe('prettyResult', () => {
    test('should not destroy objects passed in', () => {
      const before: { [key: string]: any } = { a: 1, b: 2 };
      const beforeClone: { [key: string]: any } = { a: 1, b: 2 };
      ClauseResultsBuilder.prettyResult(before);
      Object.entries(before).map(([key, value]) => expect(value).toEqual(beforeClone[key]));
    });

    test('should not destroy arrays passed in', () => {
      const before = [1, 2, 3];
      const beforeClone = [1, 2, 3];
      ClauseResultsBuilder.prettyResult(before);
      Array.from(before).map((item, index) => expect(item).toEqual(beforeClone[index]));
    });

    test('should properly indent nested objects', () => {
      const nestedObject = {
        one: 'single item',
        two: { nested: 'item', nested2: 'item' },
        three: { doubleNested: { a: '1', b: '2', c: '3' }, nested: 'item' }
      };
      const prettyNestedObject =
        '{\n  one: "single item",\n  three: {\n    doubleNested: {\n      a: "1",\n      b: "2",\n      c: "3"\n    },\n    nested: "item"\n  },\n' +
        '  two: {\n    nested: "item",\n    nested2: "item"\n  }\n}';
      expect(ClauseResultsBuilder.prettyResult(nestedObject)).toEqual(prettyNestedObject);
    });

    test('should properly indent a single array', () => {
      const singleArray = [1, 2, 3];
      expect(ClauseResultsBuilder.prettyResult(singleArray)).toEqual('[1,\n2,\n3]');
    });

    test('should properly indent an array in an object', () => {
      const arrayObject = { array: [1, 2, 3] };
      expect(ClauseResultsBuilder.prettyResult(arrayObject)).toEqual('{\n  array: [1,\n         2,\n         3]\n}');
    });

    test('should create pretty code', () => {
      const code = new Code('testCode', 'http://snomed.info/sct');
      expect(ClauseResultsBuilder.prettyResult(code)).toEqual('CODE: SNOMEDCT testCode');
    });

    test('should create pretty code for unmapped system URL', () => {
      const code = new Code('testCode', 'www.example.com');
      expect(ClauseResultsBuilder.prettyResult(code)).toEqual('CODE: www.example.com testCode');
    });

    test('should create pretty code for undefined system URL', () => {
      const code = new Code('testCode');
      expect(ClauseResultsBuilder.prettyResult(code)).toEqual('CODE: UNDEFINED_SYSTEM testCode');
    });

    test('should create pretty concept', () => {
      const concept = new Concept([new Code('testCode1'), new Code('testCode2')], 'testConcept');
      expect(ClauseResultsBuilder.prettyResult(concept)).toEqual(
        'CONCEPT: testConcept\n  [CODE: UNDEFINED_SYSTEM testCode1,\n   CODE: UNDEFINED_SYSTEM testCode2]'
      );
    });

    test('should create pretty concept without display text', () => {
      const concept = new Concept([new Code('testCode1'), new Code('testCode2')]);
      expect(ClauseResultsBuilder.prettyResult(concept)).toEqual(
        'CONCEPT: \n  [CODE: UNDEFINED_SYSTEM testCode1,\n   CODE: UNDEFINED_SYSTEM testCode2]'
      );
    });
  });

  describe('buildStatementRelevanceMap', () => {
    test('marks all false when IPP is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: false },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEX, DENEXCP, NUMER, NUMEX all false when DENOM is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEXCP, NUMER, NUMEX all false when DENEX is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEXCP false when NUMER is true', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: true }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks NUMEX false when NUMER is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.DENEXCEP, criteriaExpression: 'Denominator Exception', result: true },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks OBSERV, MSRPOPLEX false when MSRPOPL is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: false },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: false },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks OBSERV false when MSRPOPLEX is true', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: true },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: true }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: false },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    describe('multiple ipps', () => {
      const group: fhir4.MeasureGroup = {
        population: [
          {
            id: 'ipp-1',
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'initial-population'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'ipp'
            }
          },
          {
            id: 'ipp-2',
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'initial-population'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'ipp2'
            }
          },
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                valueString: 'ipp-1'
              }
            ],
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'denominator'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'denom'
            }
          },
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                valueString: 'ipp-2'
              }
            ],
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'numerator'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'numer'
            }
          },
          {
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'numerator-exclusion'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'numex'
            }
          },
          {
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'denominator-exclusion'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'denex'
            }
          },
          {
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'denominator-exception'
                }
              ]
            },
            criteria: {
              language: 'text/cql',
              expression: 'denexcep'
            }
          }
        ]
      };

      test('should mark all as relevant when both IPPs are true', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false }
        ];
        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should mark numer/numex irrelevant when corresponding IPP is false', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: false }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should mark denom/denex/denexcep irrelevant when corresponding IPP is false', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.DENEXCEP, criteriaExpression: 'denexcep', result: true }
        ];

        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: false },
          { populationType: PopulationType.DENEXCEP, criteriaExpression: 'denexcep', result: false }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should mark denom relevant independent of numer IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false }
        ];
        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should mark numer relevant independent of denom IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false }
        ];
        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should bypass denom-based numer/numex logic', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: false }
        ];
        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });

      test('should bypass denex-based numer/numex logic', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];
        const expectedRelevanceMap: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        expect(
          ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults, group, MeasureScoreType.RATIO)
        ).toEqual(expectedRelevanceMap);
      });
    });
  });

  describe('getSDEValues', () => {
    test('should create proper SDE results', () => {
      const sdeStatementResults: cql.StatementResults = { SDE: [] };
      const result = ClauseResultsBuilder.getSDEValues(simpleMeasure, sdeStatementResults);
      const expectedResult = [
        {
          name: 'sde-code',
          rawResult: [],
          pretty: '[]',
          id: 'sde-id',
          criteriaExpression: 'SDE',
          usage: 'supplemental-data'
        }
      ];
      expect(result).toEqual(expectedResult);
    });

    test('should throw error when SDE usage is invalid', () => {
      const invalidMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
      if (invalidMeasure.supplementalData?.[0]?.usage?.[0]?.coding?.[0].code) {
        invalidMeasure.supplementalData[0].usage[0].coding[0].code = 'invalid';
      }
      const sdeStatementResults: cql.StatementResults = { SDE: [] };
      expect(() => {
        ClauseResultsBuilder.getSDEValues(invalidMeasure, sdeStatementResults);
      }).toThrowError(
        'Received usage: invalid. Expected sde usage code from the MeasureDataUsage valueset: https://terminology.hl7.org/3.1.0/ValueSet-measure-data-usage.html'
      );
    });
  });
});
