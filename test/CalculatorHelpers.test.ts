import * as CalculatorHelpers from '../src/CalculatorHelpers';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { getJSONFixture } from './helpers/testHelpers';

describe('CalculatorHelpers', () => {
  describe('getAllDependentValuesets', () => {
    test('Finds all valuesets that are available in the measure bundle', () => {
      const measureBundle: R4.IBundle = getJSONFixture('EXM130-7.3.000-bundle-nocodes.json');
      const vs = CalculatorHelpers.getAllDependentValuesets(measureBundle);
      expect(vs.length).toEqual(17);
      // compare ids
      const vsIds = [
        '2.16.840.1.113883.3.464.1003.101.12.1016',
        '2.16.840.1.113883.3.464.1003.101.12.1023',
        '2.16.840.1.113883.3.464.1003.101.12.1025',
        '2.16.840.1.113883.3.526.3.1240',
        '2.16.840.1.113883.3.464.1003.101.12.1001',
        '2.16.840.1.113762.1.4.1111.143',
        '2.16.840.1.113883.3.117.1.7.1.292',
        '2.16.840.1.114222.4.11.3591',
        '2.16.840.1.113883.3.464.1003.108.12.1020',
        '2.16.840.1.113883.3.464.1003.108.12.1039',
        '2.16.840.1.113883.3.464.1003.198.12.1011',
        '2.16.840.1.113883.3.464.1003.108.12.1001',
        '2.16.840.1.113883.3.464.1003.198.12.1019',
        '2.16.840.1.113883.3.464.1003.108.12.1038',
        '2.16.840.1.113883.3.464.1003.198.12.1010',
        '2.16.840.1.113762.1.4.1108.15',
        '2.16.840.1.113883.3.666.5.307'
      ];
      expect(vs.map(valueSet => valueSet.id)).toEqual(expect.arrayContaining(vsIds));
    });
  });
});
