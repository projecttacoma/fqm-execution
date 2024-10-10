import * as DetailedResultsBuilder from '../../src/calculation/DetailedResultsBuilder';

import { getJSONFixture } from './helpers/testHelpers';
import { MeasureScoreType, PopulationType } from '../../src/types/Enums';
import { StatementResults } from '../../src/types/CQLTypes';
import { PopulationResult, EpisodeResults, StratifierResult } from '../../src/types/Calculator';
import { ELMExpressionRef, ELMQuery, ELMTuple, ELMFunctionRef } from '../../src/types/ELMTypes';

type MeasureWithGroup = fhir4.Measure & {
  group: fhir4.MeasureGroup[];
};

const simpleMeasure = getJSONFixture('measure/simple-measure.json') as MeasureWithGroup;
const cvMeasure = getJSONFixture('measure/cv-measure.json') as MeasureWithGroup;
const ratioMeasure = getJSONFixture('measure/ratio-measure.json') as MeasureWithGroup;
const simpleMeasureGroup = simpleMeasure.group[0];
const cvMeasureGroup = cvMeasure.group[0];
const ratioMeasureGroup = ratioMeasure.group[0];
const groupWithObs = getJSONFixture('measure/groups/groupNumerAndDenomCriteria.json');
const measureWithMeasureObs = getJSONFixture('measure/measure-measure-obs.json') as MeasureWithGroup;
const groupWithMeasureObs = (measureWithMeasureObs.group as [fhir4.MeasureGroup])[0];

describe('DetailedResultsBuilder', () => {
  describe('Population Values', () => {
    test('NUMER population not modified by inclusion in NUMEX', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': false,
        Numerator: true,
        'Numerator Exclusion': true
      };
      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: true },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: true }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('NUMEX membership removed when not a member of NUMER', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': false,
        Numerator: false,
        'Numerator Exclusion': true
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('NUMEX membership removed when not a member of DENOM', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: false,
        'Denominator Exclusion': false,
        Numerator: false,
        'Numerator Exclusion': true
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('DENOM population not modified by inclusion in DENEX', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: true,
        'Denominator Exclusion': true,
        Numerator: false,
        'Numerator Exclusion': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: true },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: true },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('DENEX membership removed when not a member of DENOM', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        Denominator: false,
        'Denominator Exclusion': true,
        Numerator: false,
        'Numerator Exclusion': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.DENOM, criteriaExpression: 'Denominator', result: false },
        { populationType: PopulationType.DENEX, criteriaExpression: 'Denominator Exclusion', result: false },
        { populationType: PopulationType.NUMER, criteriaExpression: 'Numerator', result: false },
        { populationType: PopulationType.NUMEX, criteriaExpression: 'Numerator Exclusion', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(
        simpleMeasure,
        simpleMeasureGroup,
        statementResults
      );

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('MSRPOPLEX should be 0 if MSRPOPL not satisfied', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        'Measure Population': false,
        'Measure Population Exclusion': true,
        'Measure Observation': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: false },
        {
          populationType: PopulationType.MSRPOPLEX,
          criteriaExpression: 'Measure Population Exclusions',
          result: false
        },
        {
          populationType: PopulationType.OBSERV,
          criteriaExpression: 'MeasureObservation',
          result: false,
          criteriaReferenceId: 'measure-population-identifier'
        }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test.skip('MSRPOPLEX should be unchanged if MSRPOPL satisfied', () => {
      const statementResults: StatementResults = {
        'Initial Population': true,
        'Measure Population': true,
        'Measure Population Exclusion': true,
        'Measure Observation': false
      };

      const expectedPopulationResults: PopulationResult[] = [
        { populationType: PopulationType.IPP, criteriaExpression: 'Initial Population', result: true },
        { populationType: PopulationType.MSRPOPL, criteriaExpression: 'Measure Population', result: true },
        { populationType: PopulationType.MSRPOPLEX, criteriaExpression: 'Measure Population Exclusions', result: true },
        { populationType: PopulationType.OBSERV, criteriaExpression: 'MeasureObservation', result: false }
      ];

      const results = DetailedResultsBuilder.createPopulationValues(cvMeasure, cvMeasureGroup, statementResults);

      expect(results.populationResults).toBeDefined();
      expect(results.populationResults).toHaveLength(expectedPopulationResults.length);
      expect(results.populationResults).toEqual(expect.arrayContaining(expectedPopulationResults));
    });

    test('boolean-based measure should add populationIds to results', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'boolean'
          }
        ],
        group: [
          {
            population: [
              {
                id: 'example-population-id',
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
      const group = (measure.group as [fhir4.MeasureGroup])[0];

      const { populationResults } = DetailedResultsBuilder.createPopulationValues(measure, group, {});

      expect(populationResults).toBeDefined();
      expect(populationResults).toHaveLength(1);
      expect(populationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            populationId: 'example-population-id'
          })
        ])
      );
    });

    test('episode-based measure should add populationIds to populationResults of an individual episode', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'Encounter'
          }
        ],
        group: [
          {
            population: [
              {
                id: 'example-population-id',
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
      const group = (measure.group as [fhir4.MeasureGroup])[0];

      const statementResults: StatementResults = {
        // Mock FHIRObject from cql-exec-fhir
        ipp: [
          {
            id: {
              value: 'example-encounter'
            }
          }
        ]
      };

      const { episodeResults } = DetailedResultsBuilder.createPopulationValues(measure, group, statementResults);

      expect(episodeResults).toBeDefined();
      expect(episodeResults).toHaveLength(1);

      const episodePopulationResults = (episodeResults as EpisodeResults[])[0].populationResults;

      expect(episodePopulationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            populationId: 'example-population-id'
          })
        ])
      );
    });

    test('should add ID of strata to stratifierResults for boolean measure', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'boolean'
          }
        ],
        group: [
          {
            stratifier: [
              {
                id: 'example-strata-id',
                criteria: {
                  expression: 'strat1',
                  language: 'text/cql'
                }
              }
            ]
          }
        ]
      };
      const group = (measure.group as [fhir4.MeasureGroup])[0];

      const { stratifierResults } = DetailedResultsBuilder.createPopulationValues(measure, group, {});

      expect(stratifierResults).toBeDefined();
      expect(stratifierResults).toHaveLength(1);
      expect(stratifierResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            strataId: 'example-strata-id'
          })
        ])
      );
    });

    test('should add ID of strata to stratifierResults of an individual episode', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'Encounter'
          }
        ],
        group: [
          {
            stratifier: [
              {
                id: 'example-strata-id',
                criteria: {
                  expression: 'strat1',
                  language: 'text/cql'
                }
              }
            ]
          }
        ]
      };
      const group = (measure.group as [fhir4.MeasureGroup])[0];

      const statementResults: StatementResults = {
        // Mock FHIRObject from cql-exec-fhir
        strat1: [
          {
            id: {
              value: 'example-encounter'
            }
          }
        ]
      };

      const { episodeResults } = DetailedResultsBuilder.createPopulationValues(measure, group, statementResults);

      expect(episodeResults).toBeDefined();
      expect(episodeResults).toHaveLength(1);

      const episodeStratifierResults = (episodeResults as EpisodeResults[])[0].stratifierResults;

      expect(episodeStratifierResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            strataId: 'example-strata-id'
          })
        ])
      );
    });

    test('should add criteriaReferenceId when extension is present on population', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            population: [
              {
                extension: [
                  {
                    url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                    valueString: 'example-pop-id'
                  }
                ],
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
      const group = (measure.group as [fhir4.MeasureGroup])[0];

      const { populationResults } = DetailedResultsBuilder.createPopulationValues(measure, group, {});

      expect(populationResults).toBeDefined();
      expect(populationResults).toHaveLength(1);
      expect(populationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            criteriaReferenceId: 'example-pop-id'
          })
        ])
      );
    });

    test('Root population results should not contain arrays of observations', () => {
      const statementResults: StatementResults = {
        ipp: [
          {
            id: {
              value: 'Encounter2'
            }
          },
          {
            id: {
              value: 'Encounter3'
            }
          }
        ],
        obs_func_observe_ipp: [
          { episode: { id: { value: 'Encounter2' } } },
          { episode: { id: { value: 'Encounter3' } } }
        ]
      };

      const { populationResults } = DetailedResultsBuilder.createPopulationValues(
        measureWithMeasureObs,
        groupWithMeasureObs,
        statementResults
      );

      expect(populationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            populationType: PopulationType.OBSERV
          })
        ])
      );

      populationResults?.forEach(pr => {
        expect(pr.observations).toBeUndefined();
      });
    });

    test('Root population results should contain an array of observations for corresponding episode', () => {
      const statementResults: StatementResults = {
        ipp: [
          {
            id: {
              value: 'Encounter2'
            }
          },
          {
            id: {
              value: 'Encounter3'
            }
          }
        ],
        obs_func_observe_ipp: [
          { episode: { id: { value: 'Encounter2' } }, observation: 2 },
          { episode: { id: { value: 'Encounter3' } }, observation: 3 }
        ]
      };

      const { populationResults } = DetailedResultsBuilder.createPopulationValues(
        measureWithMeasureObs,
        groupWithMeasureObs,
        statementResults
      );

      expect(populationResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            populationType: PopulationType.OBSERV,
            observations: [2, 3]
          })
        ])
      );
    });

    test('Episode results should have observation array of one value', () => {
      const statementResults: StatementResults = {
        ipp: [
          {
            id: {
              value: 'Encounter2'
            }
          },
          {
            id: {
              value: 'Encounter3'
            }
          }
        ],
        obs_func_observe_ipp: [
          { episode: { id: { value: 'Encounter2' } }, observation: 2 },
          { episode: { id: { value: 'Encounter3' } }, observation: 3 }
        ]
      };

      const { episodeResults } = DetailedResultsBuilder.createPopulationValues(
        measureWithMeasureObs,
        groupWithMeasureObs,
        statementResults
      );

      expect(episodeResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining<EpisodeResults>({
            episodeId: 'Encounter2',
            populationResults: expect.arrayContaining([
              expect.objectContaining({
                populationType: PopulationType.OBSERV,
                observations: [2]
              })
            ])
          }),
          expect.objectContaining<EpisodeResults>({
            episodeId: 'Encounter3',
            populationResults: expect.arrayContaining([
              expect.objectContaining({
                populationType: PopulationType.OBSERV,
                observations: [3]
              })
            ])
          })
        ])
      );
    });

    describe('handlePopulationValues for group with observations and multiple IPPs (relevant for ratio measures)', () => {
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
            id: 'denom',
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
            id: 'numer',
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
          },
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                valueString: 'numer'
              }
            ],
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'measure-observation',
                  display: 'Measure Observation'
                }
              ]
            },
            criteria: {
              language: 'text/cql.identifier',
              expression: 'numerFunc'
            }
          },
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                valueString: 'denom'
              }
            ],
            code: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                  code: 'measure-observation',
                  display: 'Measure Observation'
                }
              ]
            },
            criteria: {
              language: 'text/cql.identifier',
              expression: 'denomFunc'
            }
          }
        ]
      };

      test('should false out NUMER/NUMEX when relevant IPP is false', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: false }
        ];

        expect(DetailedResultsBuilder.handlePopulationValues(populationResults, group, MeasureScoreType.RATIO)).toEqual(
          expectedHandledResults
        );
      });

      test('should false out DENOM/DENEX/DENEXCEP when relevant IPP is false', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.DENEXCEP, criteriaExpression: 'denexcep', result: true }
        ];

        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: false },
          { populationType: PopulationType.DENEXCEP, criteriaExpression: 'denexcep', result: false }
        ];

        expect(DetailedResultsBuilder.handlePopulationValues(populationResults, group, MeasureScoreType.RATIO)).toEqual(
          expectedHandledResults
        );
      });

      test('should null out NUMER observations when associated IPP is false for multiple IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null }
        ];

        expect(DetailedResultsBuilder.handlePopulationValues(populationResults, group, MeasureScoreType.RATIO)).toEqual(
          expectedHandledResults
        );
      });

      test('should null out DENOM observations when associated IPP is false for multiple IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp2', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: false, observations: null },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];

        expect(DetailedResultsBuilder.handlePopulationValues(populationResults, group, MeasureScoreType.RATIO)).toEqual(
          expectedHandledResults
        );
      });
    });

    describe('handlePopulationValues for group with observations and single IPP (non-ratio measure)', () => {
      test('should null out NUMER and DENOM observations IPP for single IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: false },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: false, observations: null }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, groupWithObs, MeasureScoreType.PROP)
        ).toEqual(expectedHandledResults);
      });

      test('should null out NUMER observations when not in DENOM for single IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, groupWithObs, MeasureScoreType.PROP)
        ).toEqual(expectedHandledResults);
      });

      test('should null out both NUMER and DENOM observations when not in DENOM for single IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: false, observations: null },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, groupWithObs, MeasureScoreType.PROP)
        ).toEqual(expectedHandledResults);
      });

      test('should null out NUMER observations when in DENEX for single IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.DENEX, criteriaExpression: 'denex', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, groupWithObs, MeasureScoreType.PROP)
        ).toEqual(expectedHandledResults);
      });

      test('should null out NUMER observations when not in NUMER for single IPP', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: true },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'denomFunc', result: true },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'numerFunc', result: false, observations: null }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, groupWithObs, MeasureScoreType.PROP)
        ).toEqual(expectedHandledResults);
      });

      test('should null out observation when not in MSRPOPL', () => {
        const groupWithMeasurePopulation: fhir4.MeasureGroup = {
          population: [
            {
              code: {
                coding: [
                  { code: PopulationType.IPP, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'ipp'
              }
            },
            {
              code: {
                coding: [
                  { code: PopulationType.MSRPOPL, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'measure-population'
              }
            },
            {
              code: {
                coding: [
                  { code: PopulationType.OBSERV, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'measure-observation'
              }
            }
          ]
        };

        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.MSRPOPL, criteriaExpression: 'measure-population', result: false },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'measure-observation', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.MSRPOPL, criteriaExpression: 'measure-population', result: false },
          {
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'measure-observation',
            result: false,
            observations: null
          }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(
            populationResults,
            groupWithMeasurePopulation,
            MeasureScoreType.PROP
          )
        ).toEqual(expectedHandledResults);
      });

      test('should null out observation when in MSRPOPLEX', () => {
        const groupWithMeasurePopulation: fhir4.MeasureGroup = {
          population: [
            {
              code: {
                coding: [
                  { code: PopulationType.IPP, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'ipp'
              }
            },
            {
              code: {
                coding: [
                  { code: PopulationType.MSRPOPL, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'measure-population'
              }
            },
            {
              code: {
                coding: [
                  { code: PopulationType.MSRPOPLEX, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'measure-population-exclusion'
              }
            },
            {
              code: {
                coding: [
                  { code: PopulationType.OBSERV, system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
                ]
              },
              criteria: {
                language: 'text/cql',
                expression: 'measure-observation'
              }
            }
          ]
        };

        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.MSRPOPL, criteriaExpression: 'measure-population', result: true },
          {
            populationType: PopulationType.MSRPOPLEX,
            criteriaExpression: 'measure-population-exclusion',
            result: true
          },
          { populationType: PopulationType.OBSERV, criteriaExpression: 'measure-observation', result: true }
        ];
        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.MSRPOPL, criteriaExpression: 'measure-population', result: true },
          {
            populationType: PopulationType.MSRPOPLEX,
            criteriaExpression: 'measure-population-exclusion',
            result: true
          },
          {
            populationType: PopulationType.OBSERV,
            criteriaExpression: 'measure-observation',
            result: false,
            observations: null
          }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(
            populationResults,
            groupWithMeasurePopulation,
            MeasureScoreType.PROP
          )
        ).toEqual(expectedHandledResults);
      });
    });

    describe('handlePopulationValues for group with single IPP - ratio measure', () => {
      test('should not false out NUMER/NUMEX when DENOM is false for ratio measure', () => {
        const populationResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        const expectedHandledResults: PopulationResult[] = [
          { populationType: PopulationType.IPP, criteriaExpression: 'ipp', result: true },
          { populationType: PopulationType.DENOM, criteriaExpression: 'denom', result: false },
          { populationType: PopulationType.NUMER, criteriaExpression: 'numer', result: true },
          { populationType: PopulationType.NUMEX, criteriaExpression: 'numex', result: true }
        ];

        expect(
          DetailedResultsBuilder.handlePopulationValues(populationResults, ratioMeasureGroup, MeasureScoreType.RATIO)
        ).toEqual(expectedHandledResults);
      });
    });
  });

  describe('handleStratificationValues', () => {
    test('it should take population result into consider when appliesTo extension exists', () => {
      const populationGroup: fhir4.MeasureGroup = {
        stratifier: [
          {
            id: 'example-strata-id',
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-appliesTo',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                      code: 'initial-population',
                      display: 'Initial Population'
                    }
                  ]
                }
              }
            ],
            criteria: {
              expression: 'strat1',
              language: 'text/cql'
            }
          }
        ]
      };

      const populationResults: PopulationResult[] = [
        {
          populationType: PopulationType.IPP,
          criteriaExpression: 'Initial Population',
          result: false,
          populationId: 'exampleId'
        }
      ];

      const stratifierResults: StratifierResult[] = [
        {
          strataCode: 'example-strata-id',
          result: true,
          appliesResult: true,
          strataId: 'example-strata-id'
        }
      ];

      const newStratifierResults = DetailedResultsBuilder.handleStratificationValues(
        populationGroup,
        populationResults,
        stratifierResults
      );

      expect(newStratifierResults).toBeDefined();
      expect(newStratifierResults).toHaveLength(1);
      expect(newStratifierResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            strataId: 'example-strata-id',
            result: true,
            appliesResult: false
          })
        ])
      );
    });

    test('it should not take population result into consideration when appliesTo extension does not exist', () => {
      const populationGroup: fhir4.MeasureGroup = {
        stratifier: [
          {
            id: 'example-strata-id',
            criteria: {
              expression: 'strat1',
              language: 'text/cql'
            }
          }
        ]
      };

      const populationResults: PopulationResult[] = [
        {
          populationType: PopulationType.IPP,
          criteriaExpression: 'Initial Population',
          result: false,
          populationId: 'exampleId'
        }
      ];

      const stratifierResults: StratifierResult[] = [
        {
          strataCode: 'example-strata-id',
          result: true,
          appliesResult: true,
          strataId: 'example-strata-id'
        }
      ];

      const newStratifierResults = DetailedResultsBuilder.handleStratificationValues(
        populationGroup,
        populationResults,
        stratifierResults
      );

      expect(newStratifierResults).toBeDefined();
      expect(newStratifierResults).toHaveLength(1);
      expect(newStratifierResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            strataId: 'example-strata-id',
            result: true,
            appliesResult: true
          })
        ])
      );
    });

    test('it should add stratificationIds to stratification results of an individual episode for episode-based measure', () => {
      const episodeMeasureStrat: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'Encounter'
          }
        ],
        group: [
          {
            population: [
              {
                id: 'example-population-id',
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
            ],
            stratifier: [
              {
                id: 'example-stratifier-id',
                criteria: {
                  language: 'text/cql-identifier',
                  expression: 'Strat1'
                }
              }
            ]
          }
        ]
      };

      const group = (episodeMeasureStrat.group as [fhir4.MeasureGroup])[0];

      const statementResults: StatementResults = {
        ipp: [
          {
            id: {
              value: 'example-encounter'
            }
          }
        ]
      };

      const { episodeResults } = DetailedResultsBuilder.createPopulationValues(
        episodeMeasureStrat,
        group,
        statementResults
      );

      expect(episodeResults).toBeDefined();
      expect(episodeResults).toHaveLength(1);

      const episodeStratifierResults = (episodeResults as EpisodeResults[])[0].stratifierResults;

      expect(episodeStratifierResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            strataCode: 'example-stratifier-id'
          })
        ])
      );
    });
  });

  describe('ELM JSON Function', () => {
    test('should properly generate episode-based ELM JSON given name and parameter', () => {
      const exampleFunctionName = 'exampleFunction';
      const exampleParameterName = 'exampleParameter';
      const fn = DetailedResultsBuilder.generateEpisodeELMJSONFunction(exampleFunctionName, exampleParameterName);

      expect(fn.name).toEqual(`obs_func_${exampleFunctionName}_${exampleParameterName}`);
      expect(((fn.expression as ELMQuery).source[0].expression as ELMExpressionRef).name).toEqual(exampleParameterName);
      expect((fn.expression as ELMQuery).return).toBeDefined();
      expect((fn.expression as ELMQuery).return?.expression?.type).toEqual('Tuple');
      expect(((fn.expression as ELMQuery).return?.expression as ELMTuple).element).toEqual(
        expect.arrayContaining([
          {
            name: 'observation',
            value: {
              name: exampleFunctionName,
              type: 'FunctionRef',
              operand: [
                {
                  name: 'MP',
                  type: 'AliasRef'
                }
              ]
            }
          }
        ])
      );
    });

    test('should properly generate boolean-based ELM JSON given name', () => {
      const exampleFunctionName = 'exampleFunction';
      const fn = DetailedResultsBuilder.generateBooleanELMJSONFunction(exampleFunctionName);

      expect(fn.name).toEqual(`obs_func_${exampleFunctionName}`);
      expect(fn.expression.type).toEqual('FunctionRef');

      const functionRef = fn.expression as ELMFunctionRef;

      expect(functionRef.name).toEqual(exampleFunctionName);
      expect(functionRef.operand).toEqual([]);
    });
  });
});
