import { MeasureGroup, MeasureGroupPopulation } from 'fhir/r4';
import { MeasureBundleHelpers } from '../../src';
import {
  pruneDetailedResults,
  isDetailedResult,
  findObsMsrPopl,
  addIdsToPopulationResult,
  nullCriteriaRefMeasureObs
} from '../../src/helpers/DetailedResultsHelpers';
import {
  ExecutionResult,
  DetailedPopulationGroupResult,
  SimplePopulationGroupResult,
  PopulationResult
} from '../../src/types/Calculator';
import { CQLPatient } from '../../src/types/CQLPatient';
import { PopulationType } from '../../src/types/Enums';
import { getJSONFixture } from './testHelpers';

const GROUP_NUMER_AND_DENOM_CRITERIA = getJSONFixture('MeasureBundleHelpersFixtures/groupNumerAndDenomCriteria.json');

describe('pruneDetailedResults', () => {
  test('should not change result with no detailedResults', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient'
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual(ers);
  });

  test('should persist patientObject and supplementalData', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        patientObject: {} as CQLPatient,
        supplementalData: []
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual(ers);
  });

  test('should remove html/clauseResults/statementResults/populationRelevance', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        detailedResults: [
          {
            groupId: 'group-0',
            statementResults: [],
            html: 'test',
            populationRelevance: [],
            clauseResults: [],
            stratifierResults: [],
            episodeResults: [],
            populationResults: []
          }
        ]
      }
    ];

    const pruned = pruneDetailedResults(ers);

    expect(pruned).toHaveLength(1);
    expect(pruned[0].detailedResults).toBeDefined();

    // Cast to any to allow assertions on pruned properties
    // Typescript will think they don't exist otherwise
    const [dr] = pruned[0].detailedResults as any;
    expect(dr).toBeDefined();

    // These should be removed
    expect(dr.statementResults).toBeUndefined();
    expect(dr.clauseResults).toBeUndefined();
    expect(dr.html).toBeUndefined();
    expect(dr.populationRelevance).toBeUndefined();

    // These should be persisted
    expect(dr.populationResults).toEqual([]);
    expect(dr.stratifierResults).toEqual([]);
    expect(dr.episodeResults).toEqual([]);
  });

  test('should remove evaluatedResource', () => {
    const ers: ExecutionResult<DetailedPopulationGroupResult>[] = [
      {
        patientId: 'test-patient',
        evaluatedResource: []
      }
    ];

    expect(pruneDetailedResults(ers)).toEqual([
      {
        patientId: 'test-patient'
      }
    ]);
  });
});

describe('isDetailedResult', () => {
  test('should return true for anything that contains statementResults', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains populationRelevance', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      populationRelevance: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains html', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      html: 'test'
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return true for anything that contains clauseResults', () => {
    const dr: DetailedPopulationGroupResult = {
      groupId: 'group-0',
      statementResults: [],
      clauseResults: []
    };

    expect(isDetailedResult(dr)).toBe(true);
  });

  test('should return false for only populationResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      populationResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });

  test('should return false for only stratifierResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      stratifierResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });

  test('should return false for only episodeResults', () => {
    const sr: SimplePopulationGroupResult = {
      groupId: 'group-0',
      episodeResults: []
    };

    expect(isDetailedResult(sr)).toBe(false);
  });
});

describe('findObsMsrPopl', () => {
  test('should find basic measure population', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Measure Population' },
          code: {
            coding: [
              {
                code: 'measure-population',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Irrelevant' }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('measure-population');
  });

  test('should find population referenced using cqfm-criteriaExpression', () => {
    const examplePopId = 'example-observ-pop';

    const observedPop: MeasureGroupPopulation = {
      id: examplePopId,
      criteria: { language: 'text/cql.identifier', expression: 'Example Function' }
    };

    const observingPop: MeasureGroupPopulation = {
      extension: [
        {
          url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
          valueString: examplePopId
        }
      ],
      code: {
        coding: [
          {
            code: 'numerator',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      },
      criteria: { language: 'text/cql.identifier', expression: 'Example Numerator' }
    };

    const group: MeasureGroup = {
      population: [observingPop, observedPop]
    };

    const msrPop = findObsMsrPopl(group, observingPop);
    expect(msrPop).toBeDefined();
    expect(msrPop).toEqual(observedPop);
  });

  test('should fallback to criteria expression with no criteria reference for numerator', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Numerator' },
          code: {
            coding: [
              {
                code: 'numerator',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Numerator Observations' },
      code: {
        coding: [
          {
            code: 'measure-observation',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('numerator');
  });

  test('should fallback to criteria expression with no criteria reference for denominator', () => {
    const group: MeasureGroup = {
      population: [
        {
          criteria: { language: 'text/cql.identifier', expression: 'Denominator' },
          code: {
            coding: [
              {
                code: 'denominator',
                system: 'http://terminology.hl7.org/CodeSystem/measure-population'
              }
            ]
          }
        }
      ]
    };
    const observationPop: MeasureGroupPopulation = {
      criteria: { language: 'text/cql.identifier', expression: 'Denominator Observations' },
      code: {
        coding: [
          {
            code: 'measure-observation',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      }
    };

    const msrPop = findObsMsrPopl(group, observationPop);

    expect(msrPop).toBeDefined();
    expect(MeasureBundleHelpers.codeableConceptToPopulationType(msrPop?.code)).toBe('denominator');
  });

  describe('nullCriteriaRefMeasureObs', () => {
    let multiObservationPopulationResults: PopulationResult[] = [];
    let singleObservationPopulationResults: PopulationResult[] = [];

    beforeEach(() => {
      multiObservationPopulationResults = [
        {
          populationType: PopulationType.IPP,
          criteriaExpression: 'ipp',
          result: true
        },
        {
          populationType: PopulationType.DENOM,
          criteriaExpression: 'denom',
          result: false
        },
        {
          populationType: PopulationType.NUMER,
          criteriaExpression: 'num',
          result: false
        },
        {
          populationType: PopulationType.OBSERV,
          criteriaExpression: 'denomFunc',
          result: false
        },
        {
          populationType: PopulationType.OBSERV,
          criteriaExpression: 'numerFunc',
          result: false
        }
      ];

      singleObservationPopulationResults = [
        {
          populationType: PopulationType.IPP,
          criteriaExpression: 'ipp',
          result: true
        },
        {
          populationType: PopulationType.DENOM,
          criteriaExpression: 'denom',
          result: false
        },
        {
          populationType: PopulationType.NUMER,
          criteriaExpression: 'num',
          result: false
        },
        {
          populationType: PopulationType.OBSERV,
          criteriaExpression: 'numerFunc',
          result: false
        }
      ];
    });

    it('nulls nothing out if desired population has no associated measure observation', () => {
      nullCriteriaRefMeasureObs(GROUP_NUMER_AND_DENOM_CRITERIA, multiObservationPopulationResults, PopulationType.IPP);

      expect(multiObservationPopulationResults).toEqual(multiObservationPopulationResults);
    });

    it('nulls out associated measure observation when there is an associated measure observation', () => {
      nullCriteriaRefMeasureObs(
        GROUP_NUMER_AND_DENOM_CRITERIA,
        multiObservationPopulationResults,
        PopulationType.NUMER
      );

      expect(multiObservationPopulationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining<PopulationResult>({
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'numerFunc',
            result: false,
            observations: null
          })
        ])
      );
    });

    it('nulls out first measure observation when there is one measure observation and desired population is NUMER', () => {
      nullCriteriaRefMeasureObs(
        GROUP_NUMER_AND_DENOM_CRITERIA,
        singleObservationPopulationResults,
        PopulationType.NUMER
      );

      expect(singleObservationPopulationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining<PopulationResult>({
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'numerFunc',
            result: false,
            observations: null
          })
        ])
      );
    });

    it('nulls out nothing when there is one measure observation and desired population is not NUMER', () => {
      nullCriteriaRefMeasureObs(
        GROUP_NUMER_AND_DENOM_CRITERIA,
        singleObservationPopulationResults,
        PopulationType.DENOM
      );

      expect(singleObservationPopulationResults).toEqual(singleObservationPopulationResults);
    });
  });
});

describe('addIdsToPopulationResult', () => {
  test('should pass through populationResult with no id or criteriaReference', () => {
    const population: fhir4.MeasureGroupPopulation = {
      code: {
        coding: [
          {
            code: 'denominator',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      },
      criteria: {
        expression: 'denom',
        language: 'text/cql'
      }
    };

    const populationResult: PopulationResult = {
      populationType: PopulationType.DENOM,
      criteriaExpression: 'denom',
      result: true
    };

    addIdsToPopulationResult(populationResult, population);

    expect(populationResult).toEqual(populationResult);
  });

  test('should add population ID to result when present', () => {
    const population: fhir4.MeasureGroupPopulation = {
      id: 'denom-population-id',
      code: {
        coding: [
          {
            code: 'denominator',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      },
      criteria: {
        expression: 'denom',
        language: 'text/cql'
      }
    };

    const populationResult: PopulationResult = {
      populationType: PopulationType.DENOM,
      criteriaExpression: 'denom',
      result: true
    };

    addIdsToPopulationResult(populationResult, population);

    expect(populationResult.populationId).toBeDefined();
    expect(populationResult.populationId).toEqual('denom-population-id');
    expect(populationResult.criteriaReferenceId).toBeUndefined();
  });

  test('should add criteriaReferenceId to result when present', () => {
    const population: fhir4.MeasureGroupPopulation = {
      extension: [
        {
          url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
          valueString: 'example-pop-id'
        }
      ],
      code: {
        coding: [
          {
            code: 'denominator',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      },
      criteria: {
        expression: 'denom',
        language: 'text/cql'
      }
    };

    const populationResult: PopulationResult = {
      populationType: PopulationType.DENOM,
      criteriaExpression: 'denom',
      result: true
    };

    addIdsToPopulationResult(populationResult, population);

    expect(populationResult.criteriaReferenceId).toBeDefined();
    expect(populationResult.criteriaReferenceId).toEqual('example-pop-id');
    expect(populationResult.populationId).toBeUndefined();
  });
});
