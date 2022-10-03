import { isEpisodeOfCareGroup } from '../../src/helpers/MeasureBundleHelpers';

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
});
