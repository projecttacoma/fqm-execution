import { ELM, LibraryDependencyInfo, StatementDependency, StatementReference } from './types/ELMTypes';

export function buildStatementDependencyMaps(elmLibraries: ELM[]): LibraryDependencyInfo[] {
  return elmLibraries.map(elmLibrary => {
    return {
      libraryId: elmLibrary.library.identifier.id,
      libraryVersion: elmLibrary.library.identifier.version,
      statementDependencies: makeStatementDependenciesForELM(elmLibrary)
    };
  });
}

interface AliasMap {
  [alias: string]: string;
}

function makeLibraryAliasToPathHash(elm: ELM): AliasMap {
  const aliasMap: AliasMap = {};
  elm.library.includes?.def.forEach(includeDef => {
    aliasMap[includeDef.localIdentifier] = includeDef.path;
  });
  return aliasMap;
}

function makeStatementDependenciesForELM(elm: ELM): StatementDependency[] {
  const statementDependencies: StatementDependency[] = [];
  const libAliasMap = makeLibraryAliasToPathHash(elm);

  elm.library.statements.def.forEach(statement => {
    // skip "Patient" statement since this is a cql-to-elm addition
    if (statement.name === 'Patient') {
      return;
    }
    statementDependencies.push({
      statementName: statement.name,
      statementReferences: findStatementReferencesForExpression(
        statement.expression,
        libAliasMap,
        elm.library.identifier.id,
        []
      )
    });
  });

  return statementDependencies;
}

function findStatementReferencesForExpression(
  obj: any,
  libAliasMap: AliasMap,
  thisLibraryId: string,
  references: StatementReference[]
): StatementReference[] {
  // if array recurse down
  if (Array.isArray(obj)) {
    obj.forEach(el => {
      findStatementReferencesForExpression(el, libAliasMap, thisLibraryId, references);
    });
  } else if (obj === Object(obj)) {
    // reference found and isn't to Patient
    if ((obj.type === 'ExpressionRef' || obj.type === 'FunctionRef') && obj.name != 'Patient') {
      const newRef = {
        libraryId: obj.libraryName ? libAliasMap[obj.libraryName] : thisLibraryId,
        statementName: obj.name
      };
      // only add if new
      if (
        !references.find(ref => {
          return ref.libraryId == newRef.libraryId && ref.statementName == newRef.statementName;
        })
      ) {
        references.push(newRef);
      }
    }
    // recurse through all values
    for (const el of Object.values(obj)) {
      findStatementReferencesForExpression(el, libAliasMap, thisLibraryId, references);
    }
  }
  return references;
}
