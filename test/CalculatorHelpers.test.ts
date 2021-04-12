import * as CalculatorHelpers from '../src/CalculatorHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { getJSONFixture } from './helpers/testHelpers';

describe('CalculatorHelpers', () => {
  describe('getAllDependentValuesets', () => {
    test('Finds all valuesets that are missing in the standard measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json');
      const vs = CalculatorHelpers.getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(0);
    });
    test('Finds all valuesets that are missing in the missingVS measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes-missingVS.json');
      const vs = CalculatorHelpers.getMissingDependentValuesets(measureBundle);
      expect(vs.length).toEqual(1);
      expect(vs[0]).toEqual('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016');
    });
  });
});
