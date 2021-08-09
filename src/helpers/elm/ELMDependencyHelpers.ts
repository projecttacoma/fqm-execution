import {
  ELM,
  ELMStatement,
  LibraryDependencyInfo,
  StatementDependency,
  StatementReference,
  ELMValueSetRef,
  ELMValueSet
} from '../../types/ELMTypes';

/**
 * Build the dependency maps for all libraries. This creates a listing of which statements and functions
 * are referenced by each statement in each library.
 *
 * @param {ELM[]} elmLibraries - List of ELM Libraries to process.
 * @returns {LibraryDependencyInfo[]} Library dependency info for each library that was passed in
 */
export function buildStatementDependencyMaps(elmLibraries: ELM[]): LibraryDependencyInfo[] {
  return elmLibraries.map(elmLibrary => {
    return {
      libraryId: elmLibrary.library.identifier.id,
      libraryVersion: elmLibrary.library.identifier.version,
      statementDependencies: makeStatementDependenciesForELM(elmLibrary)
    };
  });
}

/**
 * Map of aliases found in a library to help with processing.
 */
interface AliasMap {
  [alias: string]: string;
}

/**
 * Create the map of aliases to full library identifiers for each referenced library.
 *
 * @param {ELM} elm - ELM library.
 * @returns {AliasMap} Map of aliases to full identifiers.
 */
function makeLibraryAliasToPathHash(elm: ELM): AliasMap {
  const aliasMap: AliasMap = {};
  elm.library.includes?.def.forEach(includeDef => {
    aliasMap[includeDef.localIdentifier] = includeDef.path;
  });
  return aliasMap;
}

/**
 * Iterate over each statement in the given library and find each statement or function
 * referenced by the statement and create a list of all these references (aka. dependencies of the statement)
 *
 * @param {ELM} elm - The library to create statement dependencies for.
 * @returns {StatementDependency[]} The list of statement dependencies for each statement in the library.
 */
function makeStatementDependenciesForELM(elm: ELM): StatementDependency[] {
  const statementDependencies: StatementDependency[] = [];
  const libAliasMap = makeLibraryAliasToPathHash(elm);

  // TODO: This is a workaround to not require statements in ELM
  // Current 130 bundle uses a standalone library of valuesets
  // our interface should be updated to make this optional, which will require a bunch of other changes
  const statements = elm.library.statements as any;

  statements?.def.forEach((statement: ELMStatement) => {
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

/**
 * Recursive function for finding all statement or function references in a statement.
 *
 * @param {any} obj - Any component of the ELM expression tree for a statement.
 * @param {AliasMap} libAliasMap - Map of aliases to library identifiers used in this library.
 * @param {string} thisLibraryId - The identifier of this library being parsed.
 * @param {StatementReference[]} references - The list of references add found references too.
 * @returns {StatementReference[]} The list of references that was passed in, but now filled with references found.
 */
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

/**
 * Find the full identifier for a library given a local identifier.
 *
 * @param mainELM The library the local identifier is used in.
 * @param localIdentifier The local identifier for a library.
 * @returns The library identifier or 'null' if it couldn't be found.
 */
export function findLibraryReferenceId(mainELM: ELM, localIdentifier: string): string | null {
  const matchingInclude = mainELM.library.includes?.def.find(d => d.localIdentifier === localIdentifier);

  return matchingInclude ? matchingInclude.path : null;
}

/**
 * Find the library for a given local identifier for a library.
 *
 * @param mainELM The library the local identifier is used in.
 * @param allELM All ELM libraries loaded at the moment.
 * @param localIdentifier The local identifer for the desired library.
 * @returns The library referenced or 'null' if it couldn't be found.
 */
export function findLibraryReference(mainELM: ELM, allELM: ELM[], localIdentifier: string): ELM | null {
  const matchingInclude = findLibraryReferenceId(mainELM, localIdentifier);

  if (matchingInclude) {
    return allELM.find(e => e.library.identifier.id === matchingInclude) || null;
  }

  return null;
}

/**
 * Find the ValueSet definition for a given ValueSetRef.
 *
 * @param mainELM The library the ValueSetRef resides in.
 * @param allELM All ELM libraries loaded at the moment.
 * @param valueSetRef The ValueSetRef to resolve.
 * @returns The ValueSet definition or 'null' if it couldn't be found.
 */
export function findValueSetReference(mainELM: ELM, allELM: ELM[], valueSetRef: ELMValueSetRef): ELMValueSet | null {
  let matchingLib: ELM | null = null;
  // ValueSet exists in other lib, need to follow library reference first

  if (valueSetRef.libraryName) {
    matchingLib = findLibraryReference(mainELM, allELM, valueSetRef.libraryName);
  } else {
    matchingLib = mainELM;
  }
  return matchingLib?.library.valueSets?.def.find(v => v.name === valueSetRef.name) || null;
}
