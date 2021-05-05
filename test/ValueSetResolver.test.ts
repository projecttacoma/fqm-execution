import { R4 } from '@ahryman40k/ts-fhir-types';
import { ValueSetResolver } from '../src/helpers/ValueSetResolver';
import { getJSONFixture } from './helpers/testHelpers';
import MockAdapter from 'axios-mock-adapter';

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
const exampleVSArray = [exampleValueSet1, exampleValueSet2];

const expectedValuesets = exampleVSArray.map(vs => vs.url);
const vsr = new ValueSetResolver('an_api_key');

// Mock out network calls in test-land
const mock = new MockAdapter(vsr.instance);

  describe('ValueSetResolver', () => {
  describe('findMissingValuesets', () => {
    test('should return an empty array if all valueset URLs are present in the provided array', () => {
      const missingVS = vsr.findMissingValuesets(expectedValuesets, exampleVSArray);
      expect(missingVS).toEqual([]);
    });

    test('should return an array of 1 element if a valueset is missing', () => {
      const missingVS = vsr.findMissingValuesets(['http://no.valueset/url', ...expectedValuesets], exampleVSArray);
      expect(missingVS).toEqual(['http://no.valueset/url']);
    });
  });

  describe('getExpansionForValuesetUrls', () => {
    beforeAll(() => {
      mock.onGet(`${exampleValueSet1.url}/$expand`,).reply(200, exampleValueSet1);
      mock.onGet(`${exampleValueSet2.url}/$expand`,).reply(200, exampleValueSet2);
    });

    test('can GET several valuesets successfully', async () => {
      const [expansions, errors] = await vsr.getExpansionForValuesetUrls(expectedValuesets);
      expect(expansions).toEqual(expect.arrayContaining(exampleVSArray));
      expect(errors).toEqual([]);
    });

    test('should return a useful error if it can\'t get a valueset', async () => {
      const [expansions, errors] = await vsr.getExpansionForValuesetUrls(['http://no.valueset/url', ...expectedValuesets]);
      expect(expansions).toEqual(expect.arrayContaining(exampleVSArray));
      // Error message should contain the valueset url
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('http://no.valueset/url/$expand')
      ]));
      // Error message should contain the status code for the failed GET
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('404')
      ]));
    });

    test('should return a useful error if it is still missing a valueset', async () => {
      // This pretends to be a valueset that has the wrong 
      mock.onGet('http://no.valueset/url/$expand',).reply(200, { url: 'http://a_different.valueset/url' });
      const [expansions, errors] = await vsr.getExpansionForValuesetUrls(['http://no.valueset/url', ...expectedValuesets]);
      expect(expansions).toEqual(expect.arrayContaining(exampleVSArray));
      // Error message should contain the valueset url
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('http://no.valueset/url')
      ]));
    });
  });
});
