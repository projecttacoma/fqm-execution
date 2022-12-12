import * as ELMDependencyHelper from '../../src/helpers/elm/ELMDependencyHelpers';
import { getELMFixture } from './helpers/testHelpers';
import { ELM, ELMValueSet, ELMValueSetRef } from '../../src/types/ELMTypes';

describe('ELMDependencyHelper', () => {
  let elm: ELM;
  beforeAll(() => {
    elm = getELMFixture('elm/EXM130/EXM130.json');
  });

  describe('buildStatementDependencyMaps', () => {
    test('can create dependency map for statements', () => {
      const libInfos = ELMDependencyHelper.buildStatementDependencyMaps([elm]);

      // check top level
      expect(libInfos.length).toEqual(1);
      const libInfo = libInfos[0];
      expect(libInfo.libraryId).toEqual('EXM130');
      expect(libInfo.libraryVersion).toEqual('8.0.000');
      expect(libInfo.statementDependencies.length).toEqual(15);

      // check specific statement
      const statementInfo = libInfo.statementDependencies.find(
        dep => dep.statementName == 'Fecal Immunochemical Test DNA'
      );
      expect(statementInfo).toBeDefined();
      if (statementInfo) {
        expect(statementInfo.statementReferences).toEqual([
          { libraryId: 'FHIRHelpers', statementName: 'ToString' },
          { libraryId: 'MATGlobalCommonFunctions', statementName: 'Normalize Interval' }
        ]);
      }
    });
  });

  describe('findLibraryReferenceId', () => {
    let elm: ELM;
    beforeAll(() => {
      elm = getELMFixture('elm/EXM130/EXM130.json');
    });
    test('should find matching include by localIdentifier', () => {
      const libraryPath = ELMDependencyHelper.findLibraryReferenceId(elm, 'Global');

      expect(libraryPath).toEqual('MATGlobalCommonFunctions');
    });

    test('should return null on missing include', () => {
      const libraryPath = ELMDependencyHelper.findLibraryReferenceId(elm, 'does-not-exist');

      expect(libraryPath).toBeNull();
    });

    test('should return null for library with no include structure', () => {
      const includelessLibrary: ELM = {
        library: {
          identifier: {
            id: 'Includeless',
            version: '0.1.0'
          },
          statements: {
            def: []
          },
          schemaIdentifier: {
            id: 'urn:hl7-org:elm',
            version: 'r1'
          },
          usings: {
            def: [
              {
                localIdentifier: 'System',
                uri: 'urn:hl7-org:elm-types:r1'
              }
            ]
          }
        }
      };
      const libraryPath = ELMDependencyHelper.findLibraryReferenceId(includelessLibrary, 'does-not-exist');

      expect(libraryPath).toBeNull();
    });
  });

  describe('findLibraryReference', () => {
    let elm: ELM;
    let dependency: ELM;
    beforeAll(() => {
      elm = getELMFixture('elm/queries/SimpleQueries.json');
      dependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');
    });

    test('should find matching library by localIdentifier', () => {
      const matchingLib = ELMDependencyHelper.findLibraryReference(elm, [elm, dependency], 'SimpleDep');

      expect(matchingLib).not.toBeNull();
      expect(matchingLib?.library.identifier.id).toEqual(dependency.library.identifier.id);
    });

    test('should return null on missing include', () => {
      const matchingLib = ELMDependencyHelper.findLibraryReference(elm, [elm, dependency], 'does-not-exist');

      expect(matchingLib).toBeNull();
    });

    test('should return null when referenced library was not in list of loaded ELMs', () => {
      const matchingLib = ELMDependencyHelper.findLibraryReference(elm, [elm], 'SimpleDep');

      expect(matchingLib).toBeNull();
    });
  });

  describe('findValueSetReference', () => {
    let elm: ELM;
    let dependency: ELM;
    beforeAll(() => {
      elm = getELMFixture('elm/queries/SimpleQueries.json');
      dependency = getELMFixture('elm/queries/SimpleQueriesDependency.json');
    });

    test('it should be able to navigate a valueset reference to another library', () => {
      const valueSetRef: ELMValueSetRef = {
        name: 'test-vs-2',
        libraryName: 'SimpleDep',
        type: 'ValueSetRef'
      };
      const expectedValueSet: ELMValueSet = {
        localId: '3',
        locator: '7:1-7:52',
        name: 'test-vs-2',
        id: 'http://example.com/test-vs-2',
        accessLevel: 'Public'
      };
      const vs = ELMDependencyHelper.findValueSetReference(elm, [elm, dependency], valueSetRef);
      if (vs) {
        delete vs.annotation;
      }
      expect(vs).toEqual(expectedValueSet);
    });

    test('it should return null if valueset reference could not be found in library', () => {
      const valueSetRef: ELMValueSetRef = {
        name: 'does-not-exist',
        libraryName: 'SimpleDep',
        type: 'ValueSetRef'
      };
      const vs = ELMDependencyHelper.findValueSetReference(elm, [elm, dependency], valueSetRef);
      expect(vs).toBeNull();
    });

    test('it should return null if library reference could not be found', () => {
      const valueSetRef: ELMValueSetRef = {
        name: 'test-vs-2',
        libraryName: 'NopeLibrary',
        type: 'ValueSetRef'
      };
      const vs = ELMDependencyHelper.findValueSetReference(elm, [elm, dependency], valueSetRef);
      expect(vs).toBeNull();
    });
  });
});
