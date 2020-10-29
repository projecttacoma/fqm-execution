import * as ELMDependencyHelper from '../src/ELMDependencyHelper';
import { readFileSync } from 'fs';
import { ELM } from '../src/types/ELMTypes';

function getELMFixture(path: string): ELM {
  return JSON.parse(readFileSync(`test/fixtures/${path}`).toString());
}

describe('ELMDependencyHelper', () => {
  describe('buildStatementDependencyMaps', () => {
    test('can create dependency map for statements', () => {
      const elms = [getELMFixture('elm/EXM130/EXM130.json')];
      const libInfos = ELMDependencyHelper.buildStatementDependencyMaps(elms);

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
});
