import { ELM, ELMBinaryExpression, ELMStatement } from '../types/ELMTypes';

/**
 * Finds all localIds in a statement by it's library and statement name.
 * @public
 * @param {ELM} libraryElm - The library the statement belongs to.
 * @param {string} statementName - The statement name to search for.
 * @return {Hash} List of local ids in the statement.
 */
export function findAllLocalIdsInStatementByName(libraryElm: ELM, statementName: string): any {
  // create place for aliases and their usages to be placed to be filled in later. Aliases and their usages (aka scope)
  // and returns do not have localIds in the elm but do in elm_annotations at a consistent calculable offset.
  // BE WARY of this calculable offset.
  const emptyResultClauses: any[] = [];
  const statement = libraryElm.library.statements.def.find(stat => stat.name === statementName);
  const libraryName = libraryElm.library.identifier.id;

  const aliasMap = {};
  // recurse through the statement elm for find all localIds
  const localIds = findAllLocalIdsInStatement(
    statement,
    libraryName,
    statement?.annotation,
    {},
    aliasMap,
    emptyResultClauses,
    null
  );
  // Create/change the clause for all aliases and their usages
  for (const alias of Array.from(emptyResultClauses)) {
    // Only do it if we have a clause for where the result should be fetched from
    // and have a localId for the clause that the result should map to
    if (localIds[alias.expressionLocalId] != null && alias.aliasLocalId != null) {
      localIds[alias.aliasLocalId] = {
        localId: alias.aliasLocalId,
        sourceLocalId: alias.expressionLocalId
      };
    }
  }

  // We do not yet support coverage/coloring of Function statements
  // Mark all the clauses as unsupported so we can mark them 'NA' in the clause_results
  if (statement?.type === 'FunctionDef') {
    for (const localId in localIds) {
      const clause = localIds[localId];
      clause.isUnsupported = true;
    }
  }
  return localIds;
}

/**
 * Finds all localIds in the statement structure recursively.
 * @private
 * @param {ELMStatement | any} statement - The statement structure or child parts of it.
 * @param {String} libraryName - The name of the library we are looking at.
 * @param {any[]} annotation - The JSON annotation for the entire structure, this is occasionally needed.
 * @param {any} localIds - The hash of localIds we are filling.
 * @param {any} aliasMap - The map of aliases.
 * @param {Array} emptyResultClauses - List of clauses that will have empty results from the engine. Each object on
 *    this has info on where to find the actual result.
 * @param {any} parentNode - The parent node, used for some special situations.
 * @return {any} List of local ids in the statement. This is same array, localIds, that is passed in.
 */
export function findAllLocalIdsInStatement(
  statement: ELMStatement | any,
  libraryName: string,
  annotation: any[] | undefined,
  localIds: any,
  aliasMap: any,
  emptyResultClauses: any[],
  parentNode: any | null
): any {
  // looking at the key and value of everything on this object or array
  for (const k in statement) {
    let alId;
    const v = statement[k];
    if (k === 'return') {
      // Keep track of the localId of the expression that the return references. 'from's without a 'return' dont have
      // localId's. So it doesn't make sense to mark them.
      if (statement.return.expression.localId != null) {
        aliasMap[v] = statement.return.expression.localId;
        alId = statement.return.localId;
        if (alId) {
          emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: aliasMap[v] });
        }
      }

      findAllLocalIdsInStatement(v, libraryName, annotation, localIds, aliasMap, emptyResultClauses, statement);
    } else if (k === 'alias') {
      if (statement.expression != null && statement.expression.localId != null) {
        // Keep track of the localId of the expression that the alias references
        aliasMap[v] = statement.expression.localId;
        // Determine the localId in the elm_annotation for this alias.
        alId = parseInt(statement.expression.localId, 10) + 1;
        emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: aliasMap[v] });
      }
    } else if (k === 'scope') {
      // The scope entry references an alias but does not have an ELM local ID. However it DOES have an elm_annotations localId
      // The elm_annotation localId of the alias variable is the localId of it's parent (one less than)
      // because the result of the scope clause should be equal to the clause that the scope is referencing
      alId = parseInt(statement.localId, 10) - 1;
      emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: aliasMap[v] });
    } else if (k === 'asTypeSpecifier') {
      // Map the localId of the asTypeSpecifier (Code, Quantity...) to the result of the result it is referencing
      // For example, in the CQL code 'Variable.result as Code' the typeSpecifier does not produce a result, therefore
      // we will set its result to whatever the result value is for 'Variable.result'
      alId = statement.asTypeSpecifier.localId;
      if (alId != null) {
        const typeClauseId = parseInt(statement.asTypeSpecifier.localId, 10) - 1;
        emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: typeClauseId });
      }
    } else if (k === 'sort') {
      // Sort is a special case that we need to recurse into separately and set the results to the result of the statement the sort clause is in
      findAllLocalIdsInSort(v, libraryName, localIds, aliasMap, emptyResultClauses, parentNode);
    } else if (k === 'let') {
      // let is a special case where it is an array, one for each defined alias. These aliases work slightly different
      // and execution engine does return results for them on use. The Initial naming of them needs to be properly pointed
      // to what they are set to.
      let aLet: any;
      for (aLet of Array.from(v)) {
        // Add the localId for the definition of this let to it's source.
        localIds[aLet.localId] = { localId: aLet.localId, sourceLocalId: aLet.expression.localId };
        findAllLocalIdsInStatement(
          aLet.expression,
          libraryName,
          annotation,
          localIds,
          aliasMap,
          emptyResultClauses,
          statement
        );
      }
      // If 'First' and 'Last' expressions, the result of source of the clause should be set to the expression
    } else if (k === 'type' && (v === 'First' || v === 'Last')) {
      if (statement.source && statement.source.localId != null) {
        alId = statement.source.localId;
        emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: statement.localId });
      }
      // Continue to recurse into the 'First' or 'Last' expression
      findAllLocalIdsInStatement(v, libraryName, annotation, localIds, aliasMap, emptyResultClauses, statement);
      // If this is a FunctionRef or ExpressionRef and it references a library, find the clause for the library reference and add it.
    } else if (k === 'type' && (v === 'FunctionRef' || v === 'ExpressionRef') && statement.libraryName != null) {
      const libraryClauseLocalId = findLocalIdForLibraryRef(annotation, statement.localId, statement.libraryName);
      if (libraryClauseLocalId !== null) {
        // only add the clause if the localId for it is found
        // the sourceLocalId is the FunctionRef itself to match how library statement references work.
        localIds[libraryClauseLocalId] = { localId: libraryClauseLocalId, sourceLocalId: statement.localId };
      }
      // Comparison operators are special cases that we need to recurse into and set the localId of a literal type to
      // the localId of the whole comparison expression
    } else if (
      k === 'type' &&
      (v === 'Equal' ||
        v === 'Equivalent' ||
        v === 'Greater' ||
        v === 'GreaterOrEqual' ||
        v === 'Less' ||
        v === 'LessOrEqual' ||
        v === 'NotEqual')
    ) {
      findLocalIdsForComparisonOperators(statement as ELMBinaryExpression, libraryName, emptyResultClauses);
      // else if they key is localId push the value
    } else if (k === 'localId') {
      localIds[v] = { localId: v };
      // if the value is an array or object, recurse
    } else if (Array.isArray(v) || typeof v === 'object') {
      findAllLocalIdsInStatement(v, libraryName, annotation, localIds, aliasMap, emptyResultClauses, statement);
    }
  }

  return localIds;
}

/**
 * Finds all localIds in the sort structure recursively and sets the expressionLocalId to the parent statement.
 * @private
 * @param {any} statement - The statement structure or child parts of it.
 * @param {String} libraryName - The name of the library we are looking at.
 * @param {any} localIds - The hash of localIds we are filling.
 * @param {any} aliasMap - The map of aliases.
 * @param {any[]} emptyResultClauses - List of clauses that will have empty results from the engine. Each object on
 *    this has info on where to find the actual result.
 * @param {any} rootStatement - The rootStatement.
 */
export function findAllLocalIdsInSort(
  statement: any,
  libraryName: string,
  localIds: any,
  aliasMap: any,
  emptyResultClauses: any[],
  rootStatement: any
): any {
  const alId = statement.localId;
  emptyResultClauses.push({ lib: libraryName, aliasLocalId: alId, expressionLocalId: rootStatement.localId });
  return (() => {
    const result = [];
    for (const k in statement) {
      const v = statement[k];
      if (Array.isArray(v) || typeof v === 'object') {
        result.push(findAllLocalIdsInSort(v, libraryName, localIds, aliasMap, emptyResultClauses, rootStatement));
      } else {
        result.push(undefined);
      }
    }
    return result;
  })();
}

/**
 * Checks if an operand in the ELM Binary Expression is of type Literal and if so,
 * pushes its localId and the overall statement localId to emptyResultClauses
 * @param statement
 * @param libraryName
 * @param emptyResultClauses
 */
export function findLocalIdsForComparisonOperators(
  statement: ELMBinaryExpression,
  libraryName: string,
  emptyResultClauses: any[]
): any {
  for (const operand of Array.from(statement.operand)) {
    if (operand.type === 'Literal' && operand.localId) {
      emptyResultClauses.push({
        lib: libraryName,
        aliasLocalId: operand.localId,
        expressionLocalId: statement.localId
      });
    }
  }
}

/**
 * Find the localId of the library reference in the JSON elm annotation. This recursively searches the annotation structure
 * for the clause of the library ref. When that is found it knows where to look inside of that for where the library
 * reference may be.
 *
 * Consider the following example of looking for function ref with id "55" and library "global".
 * CQL for this is "global.CalendarAgeInYearsAt(...)". The following annotation snippet covers the call of the
 * function.
 *
 * {
 *  "r": "55",
 *  "s": [
 *    {
 *      "r": "49",
 *      "s": [
 *        {
 *          "value": [
 *            "global"
 *          ]
 *        }
 *      ]
 *    },
 *    {
 *      "value": [
 *        "."
 *      ]
 *    },
 *    {
 *      "r": "55",
 *      "s": [
 *        {
 *          "value": [
 *            "\"CalendarAgeInYearsAt\"",
 *            "("
 *          ]
 *        },
 *
 * This method will recurse through the structure until it stops on this snippet that has "r": "55". Then it will check
 * if the value of the first child is simply an array with a single string equaling "global". If that is indeed the
 * case then it will return the "r" value of that first child, which is the clause localId for the library part of the
 * function reference. If that is not the case, it will keep recursing and may eventually return null.
 *
 * @private
 * @param {any|any[]} annotation - The annotation structure or child in the annotation structure.
 * @param {string} refLocalId - The localId of the library ref we should look for.
 * @param {string} libraryName - The library reference name, used to find the clause.
 * @return {string|null} The localId of the clause for the library reference or null if not found.
 */
export function findLocalIdForLibraryRef(
  annotation: any | any[],
  refLocalId: string,
  libraryName: string | null
): string | null {
  // if this is an object it should have an "r" for localId and "s" for children or leaf nodes
  let child;
  let ret;
  if (Array.isArray(annotation)) {
    for (child of Array.from(annotation)) {
      // in the case of a list of children only return if there is a non null result
      ret = findLocalIdForLibraryRef(child, refLocalId, libraryName);
      if (ret !== null) {
        return ret;
      }
    }
  } else if (typeof annotation === 'object') {
    // if we found the function ref
    if (annotation.r != null && annotation.r === refLocalId) {
      // check if the first child has the first leaf node with the library name
      // refer to the method comment for why this is done.
      if (
        __guard__(annotation.s[0].s != null ? annotation.s[0].s[0].value : undefined, (x: any) => x[0]) === libraryName
      ) {
        // return the localId if there is one
        if (annotation.s[0].r != null) {
          return annotation.s[0].r;
        }
        // otherwise return null because the library ref is in the same clause as expression ref.
        // this is common with expressionRefs for some reason.
        return null;
      }
    }

    // if we made it here, we should traverse down the child nodes
    if (Array.isArray(annotation.s)) {
      for (child of Array.from(annotation.s)) {
        // in the case of a list of children only return if there is a non null result
        ret = findLocalIdForLibraryRef(child, refLocalId, libraryName);
        if (ret !== null) {
          return ret;
        }
      }
    } else if (typeof annotation.s === 'object') {
      return findLocalIdForLibraryRef(annotation.s, refLocalId, libraryName);
    }
  }

  // if nothing above caused this to return, then we are at a leaf node and should return null
  return null;
}

/**
 * Figure out if a statement is a function given library and statement name.
 * @public
 * @param {ELM} libraryName - The name of the library the statement belongs to.
 * @param {string} statementName - The statement name to search for.
 * @return {boolean} If the statement is a function or not.
 */
export function isStatementFunction(library: ELM, statementName: string): boolean {
  // find the library and statement in the elm
  const statement = library.library.statements.def.find((def: any) => def.name === statementName);
  if (statement != null) {
    return statement.type === 'FunctionDef';
  }
  return false;
}

/**
 * Figure out if a statement is in a Supplemental Data Element given the statement name.
 * @public
 * @param {fhir4.MeasureSupplementalData[]} supplementalDataElements
 * @param {string} statementName - The statement to search for.
 * @return {boolean} Statement does or does not belong to a Supplemental Data Element.
 */
export function isSupplementalDataElementStatement(
  supplementalDataElements: fhir4.MeasureSupplementalData[] | undefined,
  statementName: string
): boolean {
  if (supplementalDataElements != undefined) {
    for (const supplementalData of supplementalDataElements) {
      if (supplementalData.criteria.language === 'text/cql' && supplementalData.criteria.expression === statementName) {
        return true;
      }
    }
  }
  return false;
}

function __guard__(value: any, transform: any) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
