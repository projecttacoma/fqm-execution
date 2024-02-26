import {
  AnyELMExpression,
  ELM,
  ELMCodeRef,
  ELMExpressionRef,
  ELMQuery,
  ELMRetrieve,
  ELMStatement,
  ELMToList,
  ELMValueSetRef,
  ELMTuple
} from '../../types/ELMTypes';
import { DataTypeQuery, ExpressionStackEntry } from '../../types/Calculator';
import { findLibraryReference, findValueSetReference } from './ELMDependencyHelpers';
import { findClauseInLibrary } from './ELMHelpers';
import { GracefulError } from '../../types/errors/GracefulError';
import { UnexpectedResource } from '../../types/errors/CustomErrors';

/**
 * List of possible expressions that could be doing extra filtering on the result of a query
 */
const VALUE_COMPARISON_TYPES = ['Greater', 'IsNull'];

// Defines structure of args to be included along with a recursive call
interface RecursiveCallOptions {
  elm: ELM;
  allELM: ELM[];
  newQueryLocalId?: string;
  newValueComparisonLocalId?: string;
  expressionStack: ExpressionStackEntry[];
  withErrors: GracefulError[];
}

/*
 * Helper function for recursing on the findRetrieves function
 * Allows for explicit specification of which arguments change on each recursive call
 * NOTE: This function has a side effect of updating the results array that gets defined in findRetrieves
 */
function recurse(results: DataTypeQuery[], recursedExpression: AnyELMExpression, opts: RecursiveCallOptions) {
  const retrieves = findRetrieves(
    opts.elm,
    opts.allELM,
    recursedExpression,
    opts.newQueryLocalId,
    opts.newValueComparisonLocalId,
    [...opts.expressionStack],
    opts.withErrors
  );
  results.push(...retrieves.results);
}

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
  valueComparisonLocalId?: string,
  expressionStack: ExpressionStackEntry[] = [],
  withErrors: GracefulError[] = []
): { results: DataTypeQuery[]; withErrors: GracefulError[] } {
  // add mustSupport to DataTypeQuery type
  // Smart defaults for recursive call to avoid passing in a bunch of values that don't usually change
  const defaultRecursiveOpts: RecursiveCallOptions = {
    elm,
    allELM,
    newQueryLocalId: queryLocalId,
    newValueComparisonLocalId: valueComparisonLocalId,
    expressionStack,
    withErrors
  };

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

    const templateId = exprRet.templateId;

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
            message: 'Query is referenced in another query but not as a single source. Gaps output may be incomplete.',
            localId: queryLocalId
          });
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
          valueComparisonLocalId,
          retrieveLocalId: exprRet.localId,
          retrieveLibraryName: elm.library.identifier.id,
          queryLibraryName,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty,
          templateId
        });
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
          valueComparisonLocalId,
          retrieveLocalId: exprRet.localId,
          retrieveLibraryName: elm.library.identifier.id,
          queryLibraryName,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty,
          templateId
        });
      }
    }
  } else if (expr.type === 'Query') {
    // For queries, recurse on all cases that may contain any ELM expression
    // NOTE: ignoring "aggregate" for now, as we have no precedent for its use within queries for eCQMs
    const query = expr as ELMQuery;

    // Overwrite queryLocalId with new ID of the current query expression
    const recursiveOpts: RecursiveCallOptions = {
      ...defaultRecursiveOpts,
      newQueryLocalId: query.localId
    };

    query.source.forEach(s => {
      recurse(results, s.expression, recursiveOpts);
    });

    query.let?.forEach(letClause => {
      recurse(results, letClause.expression, recursiveOpts);
    });

    if (query.where) {
      recurse(results, query.where, recursiveOpts);
    }

    if (query.return) {
      recurse(results, query.return.expression, recursiveOpts);
    }

    query.relationship?.forEach(relationshipClause => {
      recurse(results, relationshipClause.expression, recursiveOpts);
      recurse(results, relationshipClause.suchThat, recursiveOpts);
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if ((expr as ELMExpressionRef).libraryName) {
      const matchingLib = findLibraryReference(elm, allELM, (expr as ELMExpressionRef).libraryName || '');
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === (expr as ELMExpressionRef).name);
      if (matchingLib && exprRef) {
        // Overwrite default ELM with new ELM containing the referenced expression
        recurse(results, exprRef.expression, { ...defaultRecursiveOpts, elm: matchingLib });
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === (expr as ELMExpressionRef).name);
      if (exprRef) {
        recurse(results, exprRef.expression, defaultRecursiveOpts);
      }
    }
  } else if ((expr as any).operand) {
    // Operand can be array or object. Recurse on either
    const anyExpr = expr as any;
    const newValueComparisonLocalId = VALUE_COMPARISON_TYPES.includes(expr.type as string)
      ? expr.localId
      : valueComparisonLocalId;

    // Overwrite the valueComparisonLocalId with the newly found value expression
    const recursiveOpts: RecursiveCallOptions = {
      ...defaultRecursiveOpts,
      newValueComparisonLocalId
    };

    if (Array.isArray(anyExpr.operand)) {
      // Should expand to types beyond greater
      anyExpr.operand.forEach((e: any) => {
        recurse(results, e, recursiveOpts);
      });
    } else {
      recurse(results, anyExpr.operand, recursiveOpts);
    }
  } else if (expr.type === 'Tuple') {
    const tuple = expr as ELMTuple;
    tuple.element.forEach(te => {
      recurse(results, te.value, defaultRecursiveOpts);
    });
  } else if ((expr as any).source) {
    // Pass through the source expression if no other cases have been satisfied
    recurse(results, (expr as any).source, defaultRecursiveOpts);
  }
  return { results, withErrors };
}
