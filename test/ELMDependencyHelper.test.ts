import * as ELMDependencyHelper from '../src/ELMDependencyHelper';
import { getELMFixture } from './helpers/testHelpers';
import { ELM } from '../src/types/ELMTypes';

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
  });
});
