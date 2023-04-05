import { RelatedArtifact } from 'fhir/r4';
import * as DataRequirementHelpers from '../../src/helpers/DataRequirementHelpers';

describe('DataRequirementHelpers', () => {
  describe('getFlattenedRelatedArtifacts', () => {
    test('throws error if bundle with no measure is passed in', () => {
      expect(() => {
        DataRequirementHelpers.getFlattenedRelatedArtifacts({
          resourceType: 'Bundle',
          type: 'transaction'
        });
      }).toThrowError('Measure resource does not exist in provided measure bundle');
    });

    test('can return related artifacts from simple bundle with measure and main library', () => {
      const result = DataRequirementHelpers.getFlattenedRelatedArtifacts({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              status: 'draft',
              id: 'TestMeasure',
              url: 'http://example.org/Measure/TestMeasure',
              library: ['http://example.org/Library/TestMainLibrary']
            }
          },
          {
            resource: {
              resourceType: 'Library',
              status: 'draft',
              type: {},
              id: 'TestMainLibrary',
              url: 'http://example.org/Library/TestMainLibrary',
              relatedArtifact: [
                {
                  type: 'depends-on',
                  display: 'FHIR model information',
                  resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                }
              ]
            }
          }
        ]
      });
      const expectedResult: RelatedArtifact[] = [
        {
          type: 'depends-on',
          display: 'Measure',
          resource: 'http://example.org/Measure/TestMeasure'
        },
        {
          type: 'depends-on',
          display: 'FHIR model information',
          resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
        }
      ];

      expect(result).toHaveLength(expectedResult.length);
      expect(result).toEqual(expect.arrayContaining(expectedResult));
    });

    test('can return related artifacts from simple bundle with measure with name and main library', () => {
      const result = DataRequirementHelpers.getFlattenedRelatedArtifacts({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              status: 'draft',
              id: 'TestMeasure',
              name: 'Test Measure',
              url: 'http://example.org/Measure/TestMeasure',
              library: ['http://example.org/Library/TestMainLibrary']
            }
          },
          {
            resource: {
              resourceType: 'Library',
              status: 'draft',
              type: {},
              id: 'TestMainLibrary',
              url: 'http://example.org/Library/TestMainLibrary',
              relatedArtifact: [
                {
                  type: 'depends-on',
                  display: 'FHIR model information',
                  resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                }
              ]
            }
          }
        ]
      });
      const expectedResult: RelatedArtifact[] = [
        {
          type: 'depends-on',
          display: 'Measure Test Measure',
          resource: 'http://example.org/Measure/TestMeasure'
        },
        {
          type: 'depends-on',
          display: 'FHIR model information',
          resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
        }
      ];

      expect(result).toHaveLength(expectedResult.length);
      expect(result).toEqual(expect.arrayContaining(expectedResult));
    });

    test('can return related artifacts from nested and redundant relatedArtifact entries with deduplication', () => {
      const result = DataRequirementHelpers.getFlattenedRelatedArtifacts({
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              status: 'draft',
              id: 'TestMeasure',
              url: 'http://example.org/Measure/TestMeasure',
              library: ['http://example.org/Library/TestMainLibrary'],
              relatedArtifact: [
                {
                  type: 'depends-on',
                  display: 'Main Library',
                  resource: 'http://example.org/Library/TestMainLibrary'
                }
              ]
            }
          },
          {
            resource: {
              resourceType: 'Library',
              status: 'draft',
              type: {},
              id: 'TestMainLibrary',
              url: 'http://example.org/Library/TestMainLibrary',
              relatedArtifact: [
                {
                  type: 'depends-on',
                  display: 'FHIR model information',
                  resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                },
                {
                  type: 'depends-on',
                  display: 'Supporting Library',
                  resource: 'http://example.org/Library/SupportingLibrary'
                }
              ]
            }
          },
          {
            resource: {
              resourceType: 'Library',
              status: 'draft',
              type: {},
              id: 'SupportingLibrary',
              url: 'http://example.org/Library/SupportingLibrary',
              relatedArtifact: [
                {
                  type: 'depends-on',
                  display: 'FHIR model information',
                  resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                }
              ]
            }
          }
        ]
      });
      const expectedResult: RelatedArtifact[] = [
        {
          type: 'depends-on',
          display: 'Measure',
          resource: 'http://example.org/Measure/TestMeasure'
        },
        {
          type: 'depends-on',
          display: 'Main Library',
          resource: 'http://example.org/Library/TestMainLibrary'
        },
        {
          type: 'depends-on',
          display: 'Supporting Library',
          resource: 'http://example.org/Library/SupportingLibrary'
        },
        {
          type: 'depends-on',
          display: 'FHIR model information',
          resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
        }
      ];

      expect(result).toHaveLength(expectedResult.length);
      expect(result).toEqual(expect.arrayContaining(expectedResult));
    });

    test('can return library only related artifacts from nested and redundant relatedArtifact entries with deduplication', () => {
      const result = DataRequirementHelpers.getFlattenedRelatedArtifacts(
        {
          resourceType: 'Bundle',
          type: 'transaction',
          entry: [
            {
              resource: {
                resourceType: 'Measure',
                status: 'draft',
                id: 'TestMeasure',
                url: 'http://example.org/Measure/TestMeasure',
                library: ['http://example.org/Library/TestMainLibrary'],
                relatedArtifact: [
                  {
                    type: 'depends-on',
                    display: 'Main Library',
                    resource: 'http://example.org/Library/TestMainLibrary'
                  }
                ]
              }
            },
            {
              resource: {
                resourceType: 'Library',
                status: 'draft',
                type: {},
                id: 'TestMainLibrary',
                url: 'http://example.org/Library/TestMainLibrary',
                relatedArtifact: [
                  {
                    type: 'depends-on',
                    display: 'FHIR model information',
                    resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                  },
                  {
                    type: 'depends-on',
                    display: 'Supporting Library',
                    resource: 'http://example.org/Library/SupportingLibrary'
                  }
                ]
              }
            },
            {
              resource: {
                resourceType: 'Library',
                status: 'draft',
                type: {},
                id: 'SupportingLibrary',
                url: 'http://example.org/Library/SupportingLibrary',
                relatedArtifact: [
                  {
                    type: 'depends-on',
                    display: 'FHIR model information',
                    resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
                  }
                ]
              }
            }
          ]
        },
        'http://example.org/Library/TestMainLibrary'
      );
      const expectedResult: RelatedArtifact[] = [
        {
          type: 'depends-on',
          display: 'Library',
          resource: 'http://example.org/Library/TestMainLibrary'
        },
        {
          type: 'depends-on',
          display: 'Supporting Library',
          resource: 'http://example.org/Library/SupportingLibrary'
        },
        {
          type: 'depends-on',
          display: 'FHIR model information',
          resource: 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
        }
      ];

      expect(result).toHaveLength(expectedResult.length);
      expect(result).toEqual(expect.arrayContaining(expectedResult));
    });
  });
});
