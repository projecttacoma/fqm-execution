import {
  isEpisodeOfCareGroup,
  hasMultipleIPPs,
  getRelevantIPPFromPopulation
} from '../../src/helpers/MeasureBundleHelpers';
import { PopulationType } from '../../src/types/Enums';

describe('MeasureBundleHelpers tests', () => {
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
});
