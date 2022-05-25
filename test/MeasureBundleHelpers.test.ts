import * as MeasureBundleHelpers from '../src/helpers/MeasureBundleHelpers';

import { PopulationType } from '../src/types/Enums';
import { getJSONFixture } from './helpers/testHelpers';
import { ValueSetResolver } from '../src/execution/ValueSetResolver';
import { getMissingDependentValuesets } from '../src/execution/ValueSetHelper';

describe('MeasureBundleHelpers', () => {
  describe('codeableConceptToPopulationType', () => {
    test('codeable concept with no codings returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'no codings'
      };
      expect(MeasureBundleHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept with empty returns null', () => {
      const codeableConcept: fhir4.CodeableConcept = {
        text: 'empty codings',
        coding: []
      };
      expect(MeasureBundleHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept with codings of different system returns null', () => {
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
      expect(MeasureBundleHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept proper coding returns valid enum', () => {
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
      expect(MeasureBundleHelpers.codeableConceptToPopulationType(codeableConcept)).toEqual(PopulationType.IPP);
    });

    test('codeable concept correct system, bad code returns null', () => {
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
      expect(MeasureBundleHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });
  });

  describe('extractMeasurementPeriod', () => {
    test('Measurement period start set on measure', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              effectivePeriod: {
                start: '2000-01-01'
              },
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      const mpConfig = MeasureBundleHelpers.extractMeasurementPeriod(measureBundleFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2000-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2019-12-31');
    });

    test('Measurement period end set on measure', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              effectivePeriod: {
                end: '2000-12-31'
              },
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      const mpConfig = MeasureBundleHelpers.extractMeasurementPeriod(measureBundleFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2019-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2000-12-31');
    });

    test('Measurement period start and end set on measure', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              effectivePeriod: {
                start: '2000-01-01',
                end: '2000-12-31'
              },
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      const mpConfig = MeasureBundleHelpers.extractMeasurementPeriod(measureBundleFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2000-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2000-12-31');
    });

    test('Neither set on measure', () => {
      const measureBundleFixture: fhir4.Bundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Measure',
              effectivePeriod: {
                start: '',
                end: ''
              },
              status: 'draft'
            }
          }
        ],
        type: 'transaction'
      };

      const mpConfig = MeasureBundleHelpers.extractMeasurementPeriod(measureBundleFixture);

      expect(mpConfig.measurementPeriodStart).toBe('2019-01-01');
      expect(mpConfig.measurementPeriodEnd).toBe('2019-12-31');
    });
  });

  describe('isValidLibraryURL', () => {
    test('returns true if it is a valid url ', () => {
      const ret = MeasureBundleHelpers.isValidLibraryURL('https://example.com/Library-url');
      expect(ret).toBeTruthy();
    });

    test('returns false if it is not  a valid url ', () => {
      const ret = MeasureBundleHelpers.isValidLibraryURL('Library/example');
      expect(ret).toBeFalsy();
    });
  });

  describe('extractMeasureFromBundle', () => {
    test('returns measure object if one exists', () => {
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

      const ret = MeasureBundleHelpers.extractMeasureFromBundle(measureBundleFixture);
      expect(ret.resourceType).toBe('Measure');
    });

    test('throws an error if the Library is not present', () => {
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

      expect(() => MeasureBundleHelpers.extractMeasureFromBundle(measureBundleFixture)).toThrow();
    });

    test('throws an error if the Measure is not present', () => {
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

      expect(() => MeasureBundleHelpers.extractMeasureFromBundle(measureBundleFixture)).toThrow();
    });
  });

  describe('extractLibrariesFromBundle', () => {
    test('properly gets library from EXM130, and identifies the root library', () => {
      const measureBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json') as fhir4.Bundle;
      const { cqls, rootLibIdentifier, elmJSONs } = MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle);

      expect(rootLibIdentifier).toStrictEqual({
        id: 'EXM130',
        system: 'http://fhir.org/guides/dbcg/connectathon',
        version: '7.3.000'
      });
      // The EXM130 test bundle has 7 libraries, including the root one
      // BUT one of them is the FHIR model info file, which we ignore
      expect(cqls).toHaveLength(6);
      expect(elmJSONs).toHaveLength(6);
    });

    test('throws an error if there is no root Library resource on Measure', () => {
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

      expect(() => MeasureBundleHelpers.extractLibrariesFromBundle(measureBundle)).toThrow(
        'No Root Library could be identified in provided measure bundle'
      );
    });
  });

  describe('addValueSetsToMeasureBundle', () => {
    test('throws an error if no API key is provided for retrieving the ValueSet resource(s)', async () => {
      const measureBundle: fhir4.Bundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes-missingVS.json');

      try {
        await MeasureBundleHelpers.addValueSetsToMeasureBundle(measureBundle);
      } catch (e) {
        expect(e.message).toEqual(
          'Missing the following valuesets: http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016, and no API key was provided to resolve them'
        );
      }
    });

    test('throws an error if error messages array from ValueSetResolver.getExpansionForValuesetUrls is populated', async () => {
      // EXM 130 bundle with one missing valueset and one missing valueset with invalid url
      const measureBundle: fhir4.Bundle = getJSONFixture('EXM130-7.3.000-bundle-no-codes-modified-missingVS.json');
      const errorMessage =
        'Valueset with URL http://no.valueset/url could not be retrieved. Reason: Request failed with status code 404';
      // missing VS that has valid URL in the measure bundle
      const missingVS = getJSONFixture('valuesets/example-missing-EXM130-vs.json');

      const vsrSpy = jest
        .spyOn(ValueSetResolver.prototype, 'getExpansionForValuesetUrls')
        .mockImplementation(async () => {
          {
            return [[missingVS], [errorMessage]];
          }
        });

      try {
        await MeasureBundleHelpers.addValueSetsToMeasureBundle(measureBundle, 'an_api_key');
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
        expect(vsrSpy).toHaveBeenCalledWith(getMissingDependentValuesets(measureBundle));
      }
    });

    test('returns original measure bundle if measure bundle is not missing any ValueSet resources', async () => {
      const measureBundle: fhir4.Bundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json');
      const returnedBundle = await MeasureBundleHelpers.addValueSetsToMeasureBundle(measureBundle, 'an_api_key');
      expect(returnedBundle).toEqual(measureBundle);
    });

    test('returns new bundle with added ValueSet resource when measure bundle is missing one ValueSet resource', async () => {
      // measure bundle with one missing ValueSet
      const measureBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes-missingVS.json');
      // missing ValueSet resource
      const missingVSUrl = getMissingDependentValuesets(measureBundle);
      const missingVS = getJSONFixture('valuesets/example-missing-EXM130-vs.json');

      const vsrSpy = jest
        .spyOn(ValueSetResolver.prototype, 'getExpansionForValuesetUrls')
        .mockImplementation(async () => {
          {
            return [[missingVS], []];
          }
        });
      const returnedBundle = await MeasureBundleHelpers.addValueSetsToMeasureBundle(measureBundle, 'an_api_key');

      expect(vsrSpy).toHaveBeenCalledWith(missingVSUrl);
      expect(returnedBundle.entry?.length).toEqual(measureBundle.entry?.length);
      expect(returnedBundle.entry?.slice(returnedBundle.entry?.length - 1)[0]).toEqual({ resource: missingVS });
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });
  });
});
