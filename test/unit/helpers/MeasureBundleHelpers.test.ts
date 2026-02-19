import {
  isEpisodeOfCareGroup,
  hasMultipleIPPs,
  getRelevantIPPFromPopulation,
  codeableConceptToPopulationType,
  extractMeasurementPeriod,
  getCriteriaReferenceIdFromPopulation,
  addValueSetsToMeasureBundle,
  extractMeasureFromBundle,
  isValidLibraryURL,
  getScoringCodeFromGroup,
  getScoringCodeFromMeasure,
  getObservationResultForPopulation,
  extractLibrariesFromMeasureBundle,
  extractLibrariesFromLibraryBundle,
  isRatioMeasure,
  parseLibRef,
  extractComponentsFromMeasure,
  extractCompositeMeasure,
  getGroupIdForComponent,
  filterComponentResults,
  getWeightForComponent,
  getImprovementNotationFromGroup
} from '../../../src/helpers/MeasureBundleHelpers';
import { PopulationType } from '../../../src/types/Enums';
import { ValueSetResolver } from '../../../src/execution/ValueSetResolver';
import { getJSONFixture } from './testHelpers';
import { getMissingDependentValuesets } from '../../../src/execution/ValueSetHelper';
import { ComponentResults, PopulationResult } from '../../../src/types/Calculator';
import { UnexpectedResource } from '../../../src/types/errors/CustomErrors';

const GROUP_NUMER_AND_DENOM_CRITERIA = getJSONFixture('measure/groups/groupNumerAndDenomCriteria.json');

describe('MeasureBundleHelpers tests', () => {
  describe('getImprovementNotationFromGroup', () => {
    it('should return the code when extension is defined', () => {
      const group: fhir4.MeasureGroup = {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-improvementNotation',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-improvement-notation',
                  code: 'increase'
                }
              ]
            }
          }
        ]
      };

      expect(getImprovementNotationFromGroup(group)).toEqual('increase');
    });

    it('should return null with no matching extension', () => {
      const group: fhir4.MeasureGroup = {};

      expect(getImprovementNotationFromGroup(group)).toBeNull();
    });
  });

  describe('getScoringCodeFromGroup', () => {
    it('should return the code when extension is defined', () => {
      const group: fhir4.MeasureGroup = {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                  code: 'ratio'
                }
              ]
            }
          }
        ]
      };

      expect(getScoringCodeFromGroup(group)).toEqual('ratio');
    });

    it('should return null with no matching extension', () => {
      const group: fhir4.MeasureGroup = {};

      expect(getScoringCodeFromGroup(group)).toBeNull();
    });
  });

  describe('getScoringCodeFromMeasure', () => {
    it('should return the code when present on the measure resource', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'ratio'
            }
          ]
        }
      };

      expect(getScoringCodeFromMeasure(measure)).toEqual('ratio');
    });

    it('should return undefined when no scoring is present on measure resource', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown'
      };

      expect(getScoringCodeFromMeasure(measure)).toBeUndefined();
    });
  });

  describe('getGroupIdForComponent', () => {
    it('should return the groupId string when defined on the extension', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-groupId',
            valueString: 'test-group'
          }
        ]
      };

      expect(getGroupIdForComponent(relatedArtifact)).toEqual('test-group');
    });

    it('should return null when group Id extension is not present', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1'
      };

      expect(getGroupIdForComponent(relatedArtifact)).toBeNull();
    });

    it('should return null when group Id is not defined on the extension', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-groupId'
          }
        ]
      };

      expect(getGroupIdForComponent(relatedArtifact)).toBeNull();
    });

    it('should throw error when multiple CQFM Group Id extensions are defined', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-groupId',
            valueString: 'test-group-1'
          },
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-groupId',
            valueString: 'test-group-2'
          }
        ]
      };
      expect(() => getGroupIdForComponent(relatedArtifact)).toThrow(
        /Only one CQFM Group Id extension can be defined on a component, but 2 were provided./i
      );
    });
  });

  describe('getWeightForComponent', () => {
    it('should return the weight when defined on the extension', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight',
            valueDecimal: 0.5
          }
        ]
      };
      expect(getWeightForComponent(relatedArtifact)).toEqual(0.5);
    });

    it('should return null when weight extension is not present', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1'
      };
      expect(getWeightForComponent(relatedArtifact)).toBeNull();
    });

    it('should return null when weight is not defined on the extension', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight'
          }
        ]
      };
      expect(getWeightForComponent(relatedArtifact)).toBeNull();
    });

    it('should throw error when multiple CQFM Weight extensions are defined', () => {
      const relatedArtifact: fhir4.RelatedArtifact = {
        type: 'composed-of',
        display: 'test-related-artifact',
        resource: 'http://example.com/Measure/test-measure|0.0.1',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight',
            valueDecimal: 0.5
          },
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight',
            valueDecimal: 0.1
          }
        ]
      };
      expect(() => getWeightForComponent(relatedArtifact)).toThrow(
        /Only one CQFM Weight extension can be defined on a component, but 2 were provided./i
      );
    });
  });

  describe('filterComponentResults', () => {
    it('should return original component results array if each component contains a single group', () => {
      const componentResults: ComponentResults[] = [
        {
          groupId: 'test-group-1',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-2',
          componentCanonical: 'http://example.com/Measure/test-measure-2|0.0.1'
        }
      ];
      const groupIdMapping: Record<string, Record<string, number> | number> = {
        'http://example.com/Measure/test-measure-1|0.0.1': 1,
        'http://example.com/Measure/test-measure-2|0.0.1': 1
      };
      const filteredComponentResults = filterComponentResults(groupIdMapping, componentResults);
      expect(filteredComponentResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            groupId: 'test-group-1',
            componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
          }),
          expect.objectContaining({
            groupId: 'test-group-2',
            componentCanonical: 'http://example.com/Measure/test-measure-2|0.0.1'
          })
        ])
      );
    });

    it('should return a filtered array of component results if a component has more than one group and specifies the groupId extension', () => {
      const componentResults: ComponentResults[] = [
        {
          groupId: 'test-group-1',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-2',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-3',
          componentCanonical: 'http://example.com/Measure/test-measure-2|0.0.1'
        }
      ];

      const groupIdMapping = {
        'http://example.com/Measure/test-measure-1|0.0.1': { 'test-group-1': 1 },
        'http://example.com/Measure/test-measure-2|0.0.1': 1
      };
      const filteredComponentResults = filterComponentResults(groupIdMapping, componentResults);
      expect(filteredComponentResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            groupId: 'test-group-1',
            componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
          }),
          expect.objectContaining({
            groupId: 'test-group-3',
            componentCanonical: 'http://example.com/Measure/test-measure-2|0.0.1'
          })
        ])
      );
    });

    it('should throw error if a component has more than one group but does not specify a specific group via the groupId extension', () => {
      const componentResults: ComponentResults[] = [
        {
          groupId: 'test-group-1',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-2',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        }
      ];
      const groupIdMapping = { 'http://example.com/Measure/test-measure-1|0.0.1': 1 };
      expect(() => filterComponentResults(groupIdMapping, componentResults)).toThrow(
        /For component measures that contain multiple population groups, the composite measure SHALL specify a specific group, but no group was specified./i
      );
    });

    it('should throw error if a component has more than one group but the specified group does not exist', () => {
      const componentResults: ComponentResults[] = [
        {
          groupId: 'test-group-1',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-2',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        }
      ];
      const groupIdMapping = { 'http://example.com/Measure/test-measure-1|0.0.1': { 'non-existent-group': 1 } };
      expect(() => filterComponentResults(groupIdMapping, componentResults)).toThrow(
        /For component measures that contain multiple population groups, the composite measure SHALL specify a specific group. The specified group does not exist./i
      );
    });

    it('should include component results for components that refer to the same measure but refer to different groups', () => {
      const componentResults: ComponentResults[] = [
        {
          groupId: 'test-group-1',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        },
        {
          groupId: 'test-group-2',
          componentCanonical: 'http://example.com/Measure/test-measure-1|0.0.1'
        }
      ];
      const groupIdMapping = {
        'http://example.com/Measure/test-measure-1|0.0.1': { 'test-group-1': 1, 'test-group-2': 1 }
      };
      expect(filterComponentResults(groupIdMapping, componentResults)).toHaveLength(2);
    });
  });

  describe('isRatioMeasure', () => {
    it('should return true when group scoring code is "ratio"', () => {
      const group: fhir4.MeasureGroup = {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                  code: 'ratio'
                }
              ]
            }
          }
        ]
      };

      expect(isRatioMeasure(group)).toBe(true);
    });

    it('should return true when measure scoring code is "ratio"', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'ratio',
              display: 'Ratio'
            }
          ]
        },
        group: [{}]
      };
      const measureScoringCode = getScoringCodeFromMeasure(measure);
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];

      expect(isRatioMeasure(group, measureScoringCode)).toBe(true);
    });

    it('should return false if neither measure scoring code nor group scoring code is "ratio"', () => {
      const group: fhir4.MeasureGroup = {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                  code: 'proportion'
                }
              ]
            }
          }
        ]
      };
      expect(isRatioMeasure(group)).toBe(false);
    });
  });

  describe('isEpisodeOfCareGroup', () => {
    it('can determine episode of care on group extension', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
                valueCode: 'Procedure'
              }
            ]
          }
        ]
      };
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('can determine patient based on group extension', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
                valueCode: 'boolean'
              }
            ]
          }
        ]
      };
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(false);
    });

    it('can determine episode of care on measure extension', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'Procedure'
          }
        ],
        group: [{}]
      };
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('can determine patient based on measure extension', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'boolean'
          }
        ],
        group: [{}]
      };
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(false);
    });

    it('defaults to patient based if extension is not found', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [{}]
      };
      const group: fhir4.MeasureGroup = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(false);
    });

    it('should return true for ratio measure with root populationBasis and root measure scoring', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [{}],
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'ratio'
            }
          ]
        },
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
            valueCode: 'Encounter'
          }
        ]
      };
      const group = (measure.group as fhir4.MeasureGroup[])[0];

      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('should return true for ratio measure with group populationBasis and root measure scoring', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
                valueCode: 'Encounter'
              }
            ]
          }
        ],
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'ratio'
            }
          ]
        }
      };
      const group = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('should return true for ratio measure with group populationBasis and group measure scoring', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                      code: 'ratio'
                    }
                  ]
                }
              },
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
                valueCode: 'Encounter'
              }
            ]
          }
        ]
      };
      const group = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('should return true when any population has episode basis', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                      code: 'ratio'
                    }
                  ]
                }
              }
            ],
            population: [
              {
                extension: [
                  {
                    url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis',
                    valueCode: 'Encounter'
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
                  language: 'text/cql'
                }
              }
            ]
          }
        ]
      };
      const group = (measure.group as fhir4.MeasureGroup[])[0];

      expect(isEpisodeOfCareGroup(measure, group)).toBe(true);
    });

    it('should return false for ratio measure when no populations have non-boolean basis', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'unknown',
        group: [
          {
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
                      code: 'ratio'
                    }
                  ]
                }
              }
            ],
            population: [
              {
                code: {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/measure-population',
                      code: 'initial-population'
                    }
                  ]
                },
                criteria: {
                  language: 'text/cql'
                }
              }
            ]
          }
        ]
      };
      const group = (measure.group as fhir4.MeasureGroup[])[0];
      expect(isEpisodeOfCareGroup(measure, group)).toBe(false);
    });
  });

  describe('hasMultipleIPPs', () => {
    it('should return false for measure group with no IPP', () => {
      const group: fhir4.MeasureGroup = {};

      expect(hasMultipleIPPs(group)).toBe(false);
    });

    it('should return false for measure group with 1 IPP', () => {
      const group: fhir4.MeasureGroup = {
        population: [
          {
            code: {
              coding: [
                { code: 'initial-population', system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
              ]
            },
            criteria: {
              language: 'text/cql.identifier',
              expression: 'ipp'
            }
          }
        ]
      };

      expect(hasMultipleIPPs(group)).toBe(false);
    });

    it('should return true for measure group with 2 IPPs', () => {
      const group: fhir4.MeasureGroup = {
        population: [
          {
            code: {
              coding: [
                { code: 'initial-population', system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
              ]
            },
            criteria: {
              language: 'text/cql.identifier',
              expression: 'ipp'
            }
          },
          {
            code: {
              coding: [
                { code: 'initial-population', system: 'http://terminology.hl7.org/CodeSystem/measure-population' }
              ]
            },
            criteria: {
              language: 'text/cql.identifier',
              expression: 'ipp2'
            }
          }
        ]
      };
      expect(hasMultipleIPPs(group)).toBe(true);
    });
  });

  describe('getRelevantIPPFromPopulation', () => {
    it('should return null when no fromPopulation exists', () => {
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
          }
        ]
      };

      expect(getRelevantIPPFromPopulation(group, PopulationType.DENOM)).toBeNull();
    });

    it('should return null with no criteriaReference', () => {
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
          }
        ]
      };

      expect(getRelevantIPPFromPopulation(group, PopulationType.DENOM)).toBeNull();
    });

    it('should return null with non-matching criteriaReference', () => {
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
            extension: [
              {
                url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
                valueString: 'DOES-NOT-EXIST'
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
          }
        ]
      };

      expect(getRelevantIPPFromPopulation(group, PopulationType.DENOM)).toBeNull();
    });

    it('should return matching IPP by ID', () => {
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
                valueString: 'ipp-2'
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
          }
        ]
      };

      const population = getRelevantIPPFromPopulation(group, PopulationType.DENOM);
      expect(population).not.toBeNull();
      expect((population as fhir4.MeasureGroupPopulation).id).toEqual('ipp-2');
    });
  });

  describe('codeableConceptToPopulationType', () => {
    it('codeable concept with no codings returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'no codings'
      };
      expect(codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    it('codeable concept with empty returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'empty codings',
        coding: []
      };
      expect(codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    it('codeable concept with codings of different system returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'bad system coding',
        coding: [
          {
            code: 'initial-population',
            display: 'Totally Initial Population',
            system: 'http://example.org/terminology/bad-system'
          }
        ]
      };
      expect(codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    it('codeable concept proper coding returns valid enum', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'good coding',
        coding: [
          {
            code: 'initial-population',
            display: 'Initial Population',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      };
      expect(codeableConceptToPopulationType(codeableConcept)).toEqual(PopulationType.IPP);
    });

    it('codeable concept correct system, bad code returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'good coding',
        coding: [
          {
            code: 'fake-population',
            display: 'Fake Population',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      };
      expect(codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });
  });

  describe('extractMeasurementPeriod', () => {
    it('Measurement period start set on measure', () => {
      const measureFixture: fhir4.Measure = {
        resourceType: 'Measure',
        effectivePeriod: {
          start: '2000-01-01'
        },
        status: 'draft'
      };

      const mpConfig = extractMeasurementPeriod(measureFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2000-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2019-12-31');
    });

    it('Measurement period end set on measure', () => {
      const measureFixture: fhir4.Measure = {
        resourceType: 'Measure',
        effectivePeriod: {
          end: '2000-12-31'
        },
        status: 'draft'
      };

      const mpConfig = extractMeasurementPeriod(measureFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2019-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2000-12-31');
    });

    it('Measurement period start and end set on measure', () => {
      const measureFixture: fhir4.Measure = {
        resourceType: 'Measure',
        effectivePeriod: {
          start: '2000-01-01',
          end: '2000-12-31'
        },
        status: 'draft'
      };

      const mpConfig = extractMeasurementPeriod(measureFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2000-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2000-12-31');
    });

    it('Neither set on measure', () => {
      const measureFixture: fhir4.Measure = {
        resourceType: 'Measure',
        effectivePeriod: {
          start: '',
          end: ''
        },
        status: 'draft'
      };

      const mpConfig = extractMeasurementPeriod(measureFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2019-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2019-12-31');
    });
  });

  describe('isValidLibraryURL', () => {
    it('returns true if it is a valid url ', () => {
      const ret = isValidLibraryURL('https://example.com/Library-url');
      expect(ret).toBeTruthy();
    });

    it('returns false if it is not  a valid url ', () => {
      const ret = isValidLibraryURL('Library/example');
      expect(ret).toBeFalsy();
    });
  });

  describe('extractMeasureFromBundle', () => {
    it('returns measure object if one exists', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              library: [],
              status: 'draft'
            }
          },
          {
            resource: {
              resourceType: 'Library',
              type: {
                coding: [{ code: 'logic-library', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
              },
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      const ret = extractMeasureFromBundle(measureBundleFixture);
      expect(ret.resourceType).toBe('Measure');
    });

    it('throws an error if the Library is not present', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      expect(() => extractMeasureFromBundle(measureBundleFixture)).toThrow();
    });

    it('throws an error if the Measure is not present', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Patient'
            }
          }
        ],
        type: 'transaction'
      };

      expect(() => extractMeasureFromBundle(measureBundleFixture)).toThrow();
    });
  });

  describe('extractComponentsFromMeasure', () => {
    it('throws an error if composite measure has no relatedArtifact', () => {
      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        }
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          }
        ]
      };

      expect(() => extractComponentsFromMeasure(compositeMeasure, measureBundle)).toThrow(
        /composite measures with components defined at the Measure level must specify at least two components/i
      );
    });

    it('throws an error if composite measure has one component', () => {
      const measureWithUrl: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        status: 'draft'
      };

      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        },
        relatedArtifact: [{ type: 'composed-of', resource: measureWithUrl.url }]
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          }
        ]
      };

      expect(() => extractComponentsFromMeasure(compositeMeasure, measureBundle)).toThrow(
        /composite measures with components defined at the Measure level must specify at least two components/i
      );
    });

    it('finds components by url only', () => {
      const measureWithUrlOne: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const measureWithUrlTwo: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure-2',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        },
        relatedArtifact: [
          { type: 'composed-of', resource: measureWithUrlOne.url },
          { type: 'composed-of', resource: measureWithUrlTwo.url }
        ]
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          },
          {
            resource: measureWithUrlOne
          },
          {
            resource: measureWithUrlTwo
          }
        ]
      };

      const components = extractComponentsFromMeasure(compositeMeasure, measureBundle);
      expect(components).toHaveLength(2);
      expect(components).toEqual(expect.arrayContaining([measureWithUrlOne, measureWithUrlTwo]));
    });

    it('finds components by url and version', () => {
      const measureWithUrlAndVersionOne: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        version: '0.0.1',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const measureWithUrlAndVersionTwo: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure-2',
        version: '0.0.1',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        },
        relatedArtifact: [
          {
            type: 'composed-of',
            resource: `${measureWithUrlAndVersionOne.url}|${measureWithUrlAndVersionOne.version}`
          },
          { type: 'composed-of', resource: `${measureWithUrlAndVersionTwo.url}|${measureWithUrlAndVersionTwo.version}` }
        ]
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          },
          {
            resource: measureWithUrlAndVersionOne
          },
          {
            resource: measureWithUrlAndVersionTwo
          }
        ]
      };

      const components = extractComponentsFromMeasure(compositeMeasure, measureBundle);
      expect(components).toHaveLength(2);
      expect(components).toEqual(expect.arrayContaining([measureWithUrlAndVersionOne, measureWithUrlAndVersionTwo]));
    });

    it('throws an error if .library is not present on any component measure', () => {
      const measureWithLibrary: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const measureNoLibrary: fhir4.Measure = {
        resourceType: 'Measure',
        id: 'measure-no-library',
        url: 'http://example.com/Measure/simple-measure-2',
        status: 'draft'
      };

      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        },
        relatedArtifact: [
          { type: 'composed-of', resource: measureWithLibrary.url },
          { type: 'composed-of', resource: measureNoLibrary.url }
        ]
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          },
          {
            resource: measureWithLibrary
          },
          {
            resource: measureNoLibrary
          }
        ]
      };

      expect(() => extractComponentsFromMeasure(compositeMeasure, measureBundle)).toThrow(
        /measure resource "Measure\/measure-no-library" must specify a "library"/i
      );
    });

    it('throws an error if a composite references a component that is not provided in the bundle', () => {
      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        },
        relatedArtifact: [
          { type: 'composed-of', resource: 'http://example.com/Measure/does-not-exist-1' },
          { type: 'composed-of', resource: 'http://example.com/Measure/does-not-exist-2' }
        ]
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          }
        ]
      };

      expect(() => extractComponentsFromMeasure(compositeMeasure, measureBundle)).toThrow(
        /missing components from measure bundle: "http:\/\/example.com\/Measure\/does-not-exist-1, http:\/\/example.com\/Measure\/does-not-exist-2"/i
      );
    });
  });

  describe('extractLibrariesFromLibraryBundle', () => {
    it('properly gets libraries from test library Bundle using resourceID for rootLibRef', () => {
      const measureBundle = getJSONFixture('bundle/measure-with-library-dependencies.json') as fhir4.Bundle;

      const libraryBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        id: 'test-bundle',
        type: 'transaction'
      };
      libraryBundle.entry = measureBundle.entry?.filter(e => e.resource?.resourceType === 'Library');

      const rootLibRef = 'Library/library-TestRootLib';
      const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromLibraryBundle(libraryBundle, rootLibRef);

      expect(rootLibIdentifier).toStrictEqual({
        id: 'TestRootLib',
        version: '0.0.1'
      });
      // The test bundle has 3 libraries, including the root one
      expect(cqls).toHaveLength(3);
      expect(elmJSONs).toHaveLength(3);
    });

    it('properly gets libraries from test library bundle using canonical URL for rootLibRef', () => {
      const measureBundle = getJSONFixture('bundle/measure-with-library-dependencies.json') as fhir4.Bundle;
      const libraryBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        id: 'test-bundle',
        type: 'transaction'
      };
      libraryBundle.entry = measureBundle.entry?.filter(e => e.resource?.resourceType === 'Library');

      const rootLibRef = 'http://example.com/Library/library-TestRootLib';
      const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromLibraryBundle(libraryBundle, rootLibRef);

      expect(rootLibIdentifier).toStrictEqual({
        id: 'TestRootLib',
        version: '0.0.1'
      });
      // The test Bundle has 3 libraries, including the root one
      expect(cqls).toHaveLength(3);
      expect(elmJSONs).toHaveLength(3);
    });

    it('properly gets libraries from test library bundle using canonical URL with version for rootLibRef', () => {
      const measureBundle = getJSONFixture('bundle/measure-with-library-dependencies.json') as fhir4.Bundle;
      const libraryBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        id: 'test-bundle',
        type: 'transaction'
      };
      libraryBundle.entry = measureBundle.entry?.filter(e => e.resource?.resourceType === 'Library');

      const rootLibRef = 'http://example.com/Library/library-TestRootLib|0.0.1';
      const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromLibraryBundle(libraryBundle, rootLibRef);

      expect(rootLibIdentifier).toStrictEqual({
        id: 'TestRootLib',
        version: '0.0.1'
      });
      // The test Bundle has 3 libraries, including the root one
      expect(cqls).toHaveLength(3);
      expect(elmJSONs).toHaveLength(3);
    });

    it('throws an error if there is no root Library resource in the Library bundle', () => {
      const libraryBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Library',
              type: {
                coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
              },
              url: 'http://example.com/library',
              status: 'draft'
            }
          },
          {
            resource: {
              resourceType: 'Library',
              type: {
                coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
              },
              url: 'http://example.com/other-library',
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      expect(() => extractLibrariesFromLibraryBundle(libraryBundle, 'http://example.com/root-library')).toThrow(
        'No Root Library could be identified in provided library bundle'
      );
    });
  });

  describe('extractLibrariesFromMeasureBundle', () => {
    it('properly gets library from test Bundle, and identifies the root library', () => {
      const measureBundle = getJSONFixture('bundle/measure-with-library-dependencies.json') as fhir4.Bundle;
      const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromMeasureBundle(measureBundle);

      expect(rootLibIdentifier).toStrictEqual({
        id: 'TestRootLib',
        version: '0.0.1'
      });
      // The test Bundle has 3 libraries, including the root one
      expect(cqls).toHaveLength(3);
      expect(elmJSONs).toHaveLength(3);
    });

    it('throws an error if there is no root Library resource on Measure', () => {
      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Library',
              type: {
                coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
              },
              url: 'http://example.com/root-library',
              status: 'draft'
            }
          },
          {
            resource: {
              resourceType: 'Measure',
              library: [
                // Library array doesn't contain the root lib ID
                'http://example.com/other-library'
              ],
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      expect(() => extractLibrariesFromMeasureBundle(measureBundle)).toThrow(
        'No Root Library could be identified in provided measure bundle'
      );
    });
  });

  describe('addValueSetsToMeasureBundle', () => {
    it('throws an error if no API key is provided for retrieving the ValueSet resource(s)', async () => {
      const measureBundle = getJSONFixture('bundle/missing-vs/measure-missing-codeFilter-vs.json') as fhir4.Bundle;

      try {
        await addValueSetsToMeasureBundle(measureBundle, {});
        fail('addValueSetsToMeasureBundle failed to throw error for missing API key');
      } catch (e) {
        expect(e).toBeInstanceOf(UnexpectedResource);
        expect(e).toHaveProperty(
          'message',
          'Missing the following valuesets: http://example.com/ValueSet, and no API key was provided to resolve them'
        );
      }
    });

    it('throws an error if error messages array from ValueSetResolver.getExpansionForValuesetUrls is populated', async () => {
      // Bundle with one missing valueset and one missing valueset with invalid url
      const measureBundle = getJSONFixture('bundle/missing-vs/measure-missing-codeFilter-vs.json') as fhir4.Bundle;
      const errorMessage =
        'Valueset with URL http://example.com/testValueset could not be retrieved. Reason: Request failed with status code 404';
      // missing VS that has valid URL in the measure bundle
      const missingVS = getJSONFixture('valuesets/example-vs-1.json');

      const vsrSpy = jest
        .spyOn(ValueSetResolver.prototype, 'getExpansionForValuesetUrls')
        .mockImplementation(async () => {
          {
            return [[missingVS], [errorMessage]];
          }
        });

      try {
        await addValueSetsToMeasureBundle(measureBundle, { vsAPIKey: 'an_api_key' });
        fail('addValueSetsToMeasureBundle failed to throw error from getExpansionForValuesetUrls');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toHaveProperty('message', errorMessage);
        expect(vsrSpy).toHaveBeenCalledWith(getMissingDependentValuesets(measureBundle));
      }
    });

    it('returns original measure bundle if measure bundle is not missing any ValueSet resources', async () => {
      const measureBundle = getJSONFixture('bundle/measure-with-library-dependencies.json') as fhir4.Bundle;
      const returnedBundle = (
        await addValueSetsToMeasureBundle(measureBundle, {
          vsAPIKey: 'an_api_key'
        })
      ).results;
      expect(returnedBundle).toEqual(measureBundle);
    });

    it('returns new bundle with added ValueSet resource when measure bundle is missing one ValueSet resource', async () => {
      // measure bundle with one missing ValueSet
      const measureBundle = getJSONFixture('bundle/missing-vs/measure-missing-codeFilter-vs.json') as fhir4.Bundle;
      // missing ValueSet resource
      const missingVSUrl = getMissingDependentValuesets(measureBundle);
      const missingVS = getJSONFixture('valuesets/example-vs-1.json');

      const vsrSpy = jest
        .spyOn(ValueSetResolver.prototype, 'getExpansionForValuesetUrls')
        .mockImplementation(async () => {
          {
            return [[missingVS], []];
          }
        });
      const returnedBundle = (await addValueSetsToMeasureBundle(measureBundle, { vsAPIKey: 'an_api_key' })).results;

      expect(vsrSpy).toHaveBeenCalledWith(missingVSUrl);
      expect(returnedBundle.entry?.length).toEqual(measureBundle.entry?.length);
      expect(returnedBundle.entry?.slice(returnedBundle.entry?.length - 1)[0]).toEqual({
        resource: missingVS,
        request: { method: 'PUT', url: `ValueSet/${missingVS.id}` }
      });
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });
  });

  describe('getCriteriaReferenceIdFromPopulation', () => {
    it('should identify valueString when present', () => {
      const pop: fhir4.MeasureGroupPopulation = {
        extension: [
          {
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference',
            valueString: 'test-id'
          }
        ],
        criteria: {
          language: 'text/cql',
          expression: 'Test'
        }
      };

      expect(getCriteriaReferenceIdFromPopulation(pop)).toEqual('test-id');
    });

    it('should return null with no matching extension', () => {
      const pop: fhir4.MeasureGroupPopulation = {
        extension: [
          {
            url: 'http://example.com/not-a-real-extension',
            valueString: 'test-id'
          }
        ],
        criteria: {
          language: 'text/cql',
          expression: 'Test'
        }
      };

      expect(getCriteriaReferenceIdFromPopulation(pop)).toBeNull();
    });

    it('should return null with extension at all', () => {
      const pop: fhir4.MeasureGroupPopulation = {
        criteria: {
          language: 'text/cql',
          expression: 'Test'
        }
      };

      expect(getCriteriaReferenceIdFromPopulation(pop)).toBeNull();
    });
  });
  describe('getObservationResultForPopulation', () => {
    const populationResults: PopulationResult[] = [
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

    it('returns null when desired population has no associated measure-observation', () => {
      expect(
        getObservationResultForPopulation(GROUP_NUMER_AND_DENOM_CRITERIA, populationResults, PopulationType.IPP)
      ).toBeNull();
    });

    it('returns measure observation when desired population has associated measure-observation', () => {
      expect(
        getObservationResultForPopulation(GROUP_NUMER_AND_DENOM_CRITERIA, populationResults, PopulationType.NUMER)
      ).toEqual({
        populationType: PopulationType.OBSERV,
        criteriaExpression: 'numerFunc',
        result: false
      });
    });
  });

  describe('parseLibRef', () => {
    it('handles canonical with version', () => {
      expect(parseLibRef('http://example.org/TestLibrary|1.0.1')).toEqual({
        libId: 'http://example.org/TestLibrary',
        libVersion: '1.0.1'
      });
    });

    it('handles canonical without version', () => {
      expect(parseLibRef('http://example.org/TestLibrary')).toEqual({
        libId: 'http://example.org/TestLibrary'
      });
    });

    it('handles Library/id reference', () => {
      expect(parseLibRef('Library/TestLibrary')).toEqual({
        libId: 'TestLibrary'
      });
    });
  });

  describe('extractCompositeMeasure', () => {
    it('should return the only composite measure in a bundle of multiple measures', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        version: '0.0.1',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        }
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          },
          {
            resource: measure
          },
          {
            resource: measure
          }
        ]
      };

      expect(extractCompositeMeasure(measureBundle)).toEqual(compositeMeasure);
    });

    it('should return undefined when there are no composite measures in the bundle', () => {
      const measure: fhir4.Measure = {
        resourceType: 'Measure',
        url: 'http://example.com/Measure/simple-measure',
        version: '0.0.1',
        status: 'draft',
        library: ['http://example.com/Library/example']
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: measure
          }
        ]
      };

      expect(extractCompositeMeasure(measureBundle)).toBeUndefined();
    });

    it('should throw an error when there is more than one composite measure in the bundle', () => {
      const compositeMeasure: fhir4.Measure = {
        resourceType: 'Measure',
        status: 'draft',
        scoring: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/measure-scoring',
              code: 'composite',
              display: 'Composite'
            }
          ]
        }
      };

      const measureBundle: fhir4.Bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: compositeMeasure
          },
          {
            resource: compositeMeasure
          }
        ]
      };

      expect(() => extractCompositeMeasure(measureBundle)).toThrow(
        /composite measure calculation must only include one composite measure resource in the measure bundle/i
      );
    });
  });
});
