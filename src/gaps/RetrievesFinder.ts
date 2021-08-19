import {
  AnyELMExpression,
  ELM,
  ELMCodeRef,
  ELMExpressionRef,
  ELMQuery,
  ELMRetrieve,
  ELMStatement,
  ELMToList,
  ELMValueSetRef
} from '../types/ELMTypes';
import { DataTypeQuery, ExpressionStackEntry } from '../types/Calculator';
import { findLibraryReference, findValueSetReference } from '../helpers/elm/ELMDependencyHelpers';
import { findClauseInLibrary } from '../helpers/elm/ELMHelpers';
import { GracefulError } from '../types/errors/GracefulError';
import { UnexpectedResource } from '../types/errors/CustomErrors';

/**
 * Get all data types, and codes/valuesets used in Query ELM expressions
 *
 * @param elm main ELM library with expressions to traverse
 * @param allELM list of any dependent ELM libraries included in the main ELM
 * @param expr expression to find queries under (usually numerator for gaps in care)
 * @param queryLocalId keeps track of latest id of query statements for lookup later
 * @returns query info for each ELM retrieve
 */
export function findRetrieves(
  elm: ELM,
  allELM: ELM[],
  expr: ELMStatement | AnyELMExpression,
  queryLocalId?: string,
  expressionStack: ExpressionStackEntry[] = [],
  withErrors: GracefulError[] = []
): { results: DataTypeQuery[]; withErrors: GracefulError[] } {
  const results: DataTypeQuery[] = [];
  // Push this expression onto the stack of processed expressions
  if (expr.localId && expr.type) {
    expressionStack.push({
      libraryName: elm.library.identifier.id,
      localId: expr.localId,
      type: expr.type
    });
  }

  // Base case, get data type and code/valueset off the expression
  if (expr.type === 'Retrieve' && (expr as ELMRetrieve).dataType) {
    const exprRet = expr as ELMRetrieve;
    // If present, strip off HL7 prefix to data type
    const dataType = exprRet.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');

    let queryLibraryName = elm.library.identifier.id;

    // We need to detect if this query/retrieve is used as the source of another query directly. This is an indication
    // that the retrieve is filtered by two separate queries and we need to actually look at the 'outermost' query closest
    // to the numerator.
    // This looks like the expressionStack ends with the following types ['Query', 'ExpressionRef', 'Query', 'Retrieve']
    if (expressionStack.length >= 4) {
      // Grab the last 4 in the stack and see if they match the case we are looking for
      const bottomExprs = expressionStack.slice(-4);

      if (
        bottomExprs[0].type === 'Query' &&
        bottomExprs[1].type === 'ExpressionRef' &&
        bottomExprs[2].type === 'Query'
      ) {
        // check if the outer query is indeed referencing the inner one in the source.
        const queryLib = allELM.find(lib => lib.library.identifier.id === bottomExprs[0].libraryName);
        if (!queryLib) {
          throw new UnexpectedResource('Referenced query library cannot be found.');
        }
        const outerQuery = findClauseInLibrary(queryLib, bottomExprs[0].localId) as ELMQuery;
        if (
          outerQuery.source[0].expression.localId === bottomExprs[1].localId &&
          outerQuery.source[0].expression.type === 'ExpressionRef'
        ) {
          // Change the queryLocalId to the outer query.
          queryLocalId = bottomExprs[0].localId;
          queryLibraryName = bottomExprs[0].libraryName;
        } else {
          withErrors.push({
            message: 'Query is referenced in another query but not as a single source. Gaps output may be incomplete.'
          } as GracefulError);
        }
      }
    }

    if (exprRet.codes?.type === 'ValueSetRef') {
      const codes = exprRet.codes as ELMValueSetRef;
      const valueSet = findValueSetReference(elm, allELM, codes);
      if (valueSet) {
        results.push({
          dataType,
          valueSet: valueSet.id,
          queryLocalId,
          retrieveLocalId: exprRet.localId,
          retrieveLibraryName: elm.library.identifier.id,
          queryLibraryName,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty
        });
        withErrors.push(...withErrors);
      }
    } else if (
      exprRet.codes?.type === 'CodeRef' ||
      (exprRet.codes?.type === 'ToList' && (exprRet.codes as ELMToList).operand?.type === 'CodeRef')
    ) {
      // ToList promotions have the CodeRef on the operand
      const codeName =
        exprRet.codes.type === 'CodeRef'
          ? (exprRet.codes as ELMCodeRef).name
          : ((exprRet.codes as ELMToList).operand as ELMCodeRef).name;
      const code = elm.library.codes?.def.find(c => c.name === codeName);
      if (code) {
        const cs = elm.library.codeSystems?.def.find(cs => cs.name == code.codeSystem.name);
        results.push({
          dataType,
          code: {
            system: cs?.id || code.codeSystem.name,
            version: cs?.version,
            display: code.display,
            code: code.id
          },
          queryLocalId,
          retrieveLocalId: exprRet.localId,
          retrieveLibraryName: elm.library.identifier.id,
          queryLibraryName,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty
        });
        withErrors.push(...withErrors);
      }
    }
  } else if (expr.type === 'Query') {
    // Queries have the source array containing the expressions
    (expr as ELMQuery).source?.forEach(s => {
      const retrieves = findRetrieves(
        elm,
        allELM,
        s.expression,
        (expr as ELMQuery).localId,
        [...expressionStack],
        [...withErrors]
      );
      results.push(...retrieves.results);
      withErrors.push(...retrieves.withErrors);
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if ((expr as ELMExpressionRef).libraryName) {
      const matchingLib = findLibraryReference(elm, allELM, (expr as ELMExpressionRef).libraryName || '');
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === (expr as ELMExpressionRef).name);
      if (matchingLib && exprRef) {
        const retrieves = findRetrieves(
          matchingLib,
          allELM,
          exprRef.expression,
          queryLocalId,
          [...expressionStack],
          [...withErrors]
        );
        results.push(...retrieves.results);
        withErrors.push(...retrieves.withErrors);
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === (expr as ELMExpressionRef).name);
      if (exprRef) {
        const retrieves = findRetrieves(
          elm,
          allELM,
          exprRef.expression,
          queryLocalId,
          [...expressionStack],
          [...withErrors]
        );
        results.push(...retrieves.results);
        withErrors.push(...retrieves.withErrors);
      }
    }
  } else if ((expr as any).operand) {
    // Operand can be array or object. Recurse on either
    const anyExpr = expr as any;
    if (Array.isArray(anyExpr.operand)) {
      anyExpr.operand.forEach((e: any) => {
        const retrieves = findRetrieves(elm, allELM, e, queryLocalId, [...expressionStack], [...withErrors]);
        results.push(...retrieves.results);
        withErrors.push(...retrieves.withErrors);
      });
    } else {
      const retrieves = findRetrieves(
        elm,
        allELM,
        anyExpr.operand,
        queryLocalId,
        [...expressionStack],
        [...withErrors]
      );
      results.push(...retrieves.results);
      withErrors.push(...retrieves.withErrors);
    }
  }
  return { results, withErrors };
}
