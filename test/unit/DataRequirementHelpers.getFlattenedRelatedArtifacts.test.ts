import { RelatedArtifact } from 'fhir/r4';
import * as DataRequirementHelpers from '../../src/helpers/DataRequirementHelpers';

const TEST_MEASURE: fhir4.BundleEntry = {
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
};

const TEST_MAIN_LIBRARY: fhir4.BundleEntry = {
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
};

const TEST_MAIN_LIBRARY_USING_SUPPORTING: fhir4.BundleEntry = {
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
};

const TEST_SUPPORTING_LIBRARY: fhir4.BundleEntry = {
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
};

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
        entry: [TEST_MEASURE, TEST_MAIN_LIBRARY]
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
          TEST_MAIN_LIBRARY
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
        entry: [TEST_MEASURE, TEST_MAIN_LIBRARY_USING_SUPPORTING, TEST_SUPPORTING_LIBRARY]
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
          entry: [TEST_MEASURE, TEST_MAIN_LIBRARY_USING_SUPPORTING, TEST_SUPPORTING_LIBRARY]
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
