import * as ClauseResultsBuilder from '../src/calculation/ClauseResultsBuilder';
import { getJSONFixture, getELMFixture } from './helpers/testHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { PopulationResult, StatementResult } from '../src/types/Calculator';
import { PopulationType, Relevance, FinalResult } from '../src/types/Enums';
import * as cql from '../src/types/CQLTypes';

type MeasureWithGroup = R4.IMeasure & {
  group: R4.IMeasure_Group[];
};

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
const exampleELM = getELMFixture('elm/ExampleMeasure.json');
const mainLibraryId = exampleELM.library.identifier.id;
const populationResults: PopulationResult[] = [
  {
    populationType: PopulationType.IPP,
    result: true
  },
  {
    populationType: PopulationType.DENOM,
    result: true
  },
  {
    populationType: PopulationType.NUMER,
    result: true
  },
  {
    populationType: PopulationType.NUMEX,
    result: false
  },
  {
    populationType: PopulationType.DENEX,
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

describe('ResultsHelper', () => {
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
  });

  describe('episodes', () => {
    test('should mark master results relevant if any episode is true', () => {
      const truePopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const falsePopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: false },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const expectedMasterResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: true }
      ];

      const results = ClauseResultsBuilder.buildPopulationRelevanceForAllEpisodes(simpleMeasure.group[0], [
        { episodeId: '1', populationResults: truePopulationResults },
        { episodeId: '2', populationResults: falsePopulationResults }
      ]);

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
  });

  describe('buildStatementRelevanceMap', () => {
    test('marks all false when IPP is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: false },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEX, DENEXCP, NUMER, NUMEX all false when DENOM is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: false },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEXCP, NUMER, NUMEX all false when DENEX is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks DENEXCP false when NUMER is true', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: true }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks NUMEX false when NUMER is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: false },
        { populationType: PopulationType.DENEXCEP, result: false },
        { populationType: PopulationType.NUMER, result: false },
        { populationType: PopulationType.NUMEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.IPP, result: true },
        { populationType: PopulationType.DENOM, result: true },
        { populationType: PopulationType.DENEX, result: true },
        { populationType: PopulationType.DENEXCEP, result: true },
        { populationType: PopulationType.NUMER, result: true },
        { populationType: PopulationType.NUMEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks OBSERV, MSRPOPLEX false when MSRPOPL is false', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, result: false },
        { populationType: PopulationType.OBSERV, result: false },
        { populationType: PopulationType.MSRPOPLEX, result: false }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, result: false },
        { populationType: PopulationType.OBSERV, result: false },
        { populationType: PopulationType.MSRPOPLEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });

    test('marks OBSERV false when MSRPOPLEX is true', () => {
      const populationResults: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, result: true },
        { populationType: PopulationType.OBSERV, result: false },
        { populationType: PopulationType.MSRPOPLEX, result: true }
      ];
      const expectedRelevanceMap: PopulationResult[] = [
        { populationType: PopulationType.MSRPOPL, result: false },
        { populationType: PopulationType.OBSERV, result: false },
        { populationType: PopulationType.MSRPOPLEX, result: false }
      ];

      const relevanceMap = ClauseResultsBuilder.buildPopulationRelevanceMap(populationResults);
      expect(relevanceMap).toEqual(expectedRelevanceMap);
    });
  });
});
