import { R4 } from '@ahryman40k/ts-fhir-types';
import { valueSetsForCodeService, getMissingDependentValuesets } from '../src/helpers/ValueSetHelper';
import { getJSONFixture } from './helpers/testHelpers';

type ValueSetWithNoUndefined = R4.IValueSet & {
  url: string;
  version: string;
  compose: {
    include: (R4.IValueSet_Include & {
      concept: R4.IValueSet_Concept;
      system: string;
      version: string;
    })[];
  };
};

const exampleValueSet1 = getJSONFixture('valuesets/example-vs-1.json') as ValueSetWithNoUndefined;
const exampleValueSet2 = getJSONFixture('valuesets/example-vs-2.json') as ValueSetWithNoUndefined;

describe('ValueSetHelper', () => {
  describe('getAllDependentValuesets', () => {
    test('Finds all valuesets that are missing in the standard measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json');
      const vs = getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(0);
    });
    test('Finds all valuesets that are missing in the missingVS measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes-missingVS.json');
      const vs = getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(1);
      expect(vs[0]).toEqual('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016');
    });
  });
  test('valueSetMapper should include all codes', () => {
    const map = valueSetsForCodeService([exampleValueSet1, exampleValueSet2]);

    // map should key both URLs
    const vsetUrls = Object.keys(map);
    expect(vsetUrls).toHaveLength(2);
    expect(vsetUrls).toEqual(expect.arrayContaining([exampleValueSet1.url, exampleValueSet2.url]));

    const vs1Entry = map[exampleValueSet1.url];
    const vs1Codes = vs1Entry[exampleValueSet1.version];
    const vs2Entry = map[exampleValueSet2.url];
    const vs2Codes = vs2Entry[exampleValueSet2.version];

    // This entry of the map should contain all codes defined in compose.include
    expect(vs1Codes).toBeDefined();
    expect(vs2Codes).toBeDefined();

    // Check all codes listed
    exampleValueSet1.compose.include.forEach(i => {
      expect(vs1Codes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            system: i.system,
            version: i.version
          })
        ])
      );

      i.concept?.forEach(c => {
        expect(vs1Codes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: c.code,
              display: c.display
            })
          ])
        );
      });
    });
  });
});
