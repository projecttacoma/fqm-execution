import * as MeasureHelpers from '../src/MeasureHelpers';
import { readFileSync } from 'fs';
import { ELM } from '../src/types/ELMTypes';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { PopulationType } from '../src/types/Enums';

function getJSONFixture(path: string): any {
  return JSON.parse(readFileSync(`test/fixtures/${path}`).toString());
}

describe('MeasureHelpers', () => {
  describe('findAllLocalIdsInStatementByName', () => {
    test('finds localIds for library FunctionRefs while finding localIds in statements', () => {
      // Loads Anticoagulation Therapy for Atrial Fibrillation/Flutter measure.
      // This measure has the MAT global functions library included and the measure uses the
      // "CalendarAgeInYearsAt" function.
      const libraryElm: ELM = getJSONFixture('elm/CMS723v0.json');

      // Find the localid for the specific statement with the global function ref.
      const statementName = 'Encounter with Principal Diagnosis and Age';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(libraryElm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 49 and the functionRef itself is 55.
      expect(localIds[49]).not.toBeUndefined();
      expect(localIds[49]).toEqual({ localId: '49', sourceLocalId: '55' });
    });

    test('finds localIds for library ExpressionRefs while finding localIds in statements', () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const libraryElm: ELM = getJSONFixture('elm/CMS13v2.json');

      // Find the localid for the specific statement with the global function ref.
      const statementName = 'Initial Population';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(libraryElm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[109]).not.toBeUndefined();
      expect(localIds[109]).toEqual({ localId: '109', sourceLocalId: '110' });
    });

    test('handles library ExpressionRefs with libraryRef embedded in the clause', () => {
      // Loads Test104 aka. CMS13 measure.
      // This measure has both the TJC_Overall and MAT global libraries
      const libraryElm: ELM = getJSONFixture('elm/CMS13v2.json');

      // Find the localid for the specific statement with the global function ref.
      const statementName = 'Comfort Measures during Hospitalization';
      const localIds = MeasureHelpers.findAllLocalIdsInStatementByName(libraryElm, statementName);

      // For the fixture loaded for this test it is known that the library reference is 109 and the functionRef itself is 110.
      expect(localIds[42]).not.toBeUndefined();
      expect(localIds[42]).toEqual({ localId: '42' });
    });
  });

  describe('findLocalIdForLibraryRef for functionRefs', () => {
    let annotationSnippet: any;
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const libraryElm: ELM = getJSONFixture('elm/CMS723v0.json');

      // The annotation for the 'Encounter with Principal Diagnosis and Age' will be used for these tests
      // it is known the functionRef 'global.CalendarAgeInYearsAt' is a '55' and the libraryRef clause is at '49'
      annotationSnippet = libraryElm.library.statements.def[6].annotation;
    });

    test('returns correct localId for functionRef if when found', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '55', 'global');
      expect(ret).toEqual('49');
    });

    test('returns null if it does not find the localId for the functionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '23', 'global');
      expect(ret).toBeNull();
    });

    test('returns null if it does not find the proper libraryName for the functionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '55', 'notGlobal');
      expect(ret).toBeNull();
    });

    test('returns null if annotation is empty', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef({}, '55', 'notGlobal');
      expect(ret).toBeNull();
    });

    test('returns null if there is no value associated with annotation', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '68', 'notGlobal');
      expect(ret).toBeNull();
    });
  });

  describe('findLocalIdForLibraryRef for expressionRefs', () => {
    let annotationSnippet: any;
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const libraryElm: ELM = getJSONFixture('elm/CMS13v2.json');

      // The annotation for the 'Initial Population' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis and Age"' is '110' and the libraryRef
      // clause is at '109'
      annotationSnippet = libraryElm.library.statements.def[12].annotation;
    });

    test('returns correct localId for expressionRef when found', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '110', 'TJC');
      expect(ret).toEqual('109');
    });

    test('returns null if it does not find the localId for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '21', 'TJC');
      expect(ret).toBeNull();
    });

    test('returns null if it does not find the proper libraryName for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '110', 'notTJC');
      expect(ret).toBeNull();
    });
  });

  describe('findLocalIdForLibraryRef for expressionRefs with libraryRef in clause', () => {
    let annotationSnippet: any;
    beforeEach(() => {
      // Use a chunk of this fixture for these tests.
      const libraryElm: ELM = getJSONFixture('elm/CMS13v2.json');

      // The annotation for the 'Comfort Measures during Hospitalization' will be used for these tests
      // it is known the expressionRef 'TJC."Encounter with Principal Diagnosis of Ischemic Stroke"' is '42' and the
      // libraryRef is embedded in the clause without a localId of its own.
      annotationSnippet = libraryElm.library.statements.def[8].annotation;
    });

    test('returns null for expressionRef when found yet it is embedded', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '42', 'TJC');
      expect(ret).toBeNull();
    });

    test('returns null if it does not find the proper libraryName for the expressionRef', () => {
      const ret = MeasureHelpers.findLocalIdForLibraryRef(annotationSnippet, '42', 'notTJC');
      expect(ret).toBeNull();
    });
  });

  describe('codeableConceptToPopulationType', () => {
    test('codeable concept with no codings returns null', () => {
      const codeableConcept: R4.ICodeableConcept = {
        text: 'no codings'
      };
      expect(MeasureHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept with empty returns null', () => {
      const codeableConcept: R4.ICodeableConcept = {
        text: 'empty codings',
        coding: []
      };
      expect(MeasureHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept with codings of different system returns null', () => {
      const codeableConcept: R4.ICodeableConcept = {
        text: 'bad system coding',
        coding: [
          {
            code: 'initial-population',
            display: 'Totally Initial Population',
            system: 'http://example.org/terminology/bad-system'
          }
        ]
      };
      expect(MeasureHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });

    test('codeable concept proper coding returns valid enum', () => {
      const codeableConcept: R4.ICodeableConcept = {
        text: 'good coding',
        coding: [
          {
            code: 'initial-population',
            display: 'Initial Population',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      };
      expect(MeasureHelpers.codeableConceptToPopulationType(codeableConcept)).toEqual(PopulationType.IPP);
    });

    test('codeable concept correct system, bad code returns null', () => {
      const codeableConcept: R4.ICodeableConcept = {
        text: 'good coding',
        coding: [
          {
            code: 'fake-population',
            display: 'Fake Population',
            system: 'http://terminology.hl7.org/CodeSystem/measure-population'
          }
        ]
      };
      expect(MeasureHelpers.codeableConceptToPopulationType(codeableConcept)).toBe(null);
    });
  });
});
