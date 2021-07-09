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
import { findLibraryReference, findValueSetReference } from '../ELMDependencyHelper';

/**
 * Get all data types, and codes/valuesets used in Query ELM expressions
 *
 * @param elm main ELM library with expressions to traverse
 * @param deps list of any dependent ELM libraries included in the main ELM
 * @param expr expression to find queries under (usually numerator for gaps in care)
 * @param queryLocalId keeps track of latest id of query statements for lookup later
 * @returns query info for each ELM retrieve
 */
export function findRetrieves(
  elm: ELM,
  deps: ELM[],
  expr: ELMStatement | AnyELMExpression,
  queryLocalId?: string,
  expressionStack: ExpressionStackEntry[] = []
) {
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

    if (exprRet.codes?.type === 'ValueSetRef') {
      const codes = exprRet.codes as ELMValueSetRef;

      const valueSet = findValueSetReference(elm, deps, codes);

      if (valueSet) {
        results.push({
          dataType,
          valueSet: valueSet.id,
          queryLocalId,
          retrieveLocalId: exprRet.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty
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
          retrieveLocalId: exprRet.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack],
          path: exprRet.codeProperty
        });
      }
    }
  } else if (expr.type === 'Query') {
    // Queries have the source array containing the expressions
    (expr as ELMQuery).source?.forEach(s => {
      results.push(...findRetrieves(elm, deps, s.expression, (expr as ELMQuery).localId, [...expressionStack]));
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if ((expr as ELMExpressionRef).libraryName) {
      const matchingLib = findLibraryReference(elm, deps, (expr as ELMExpressionRef).libraryName || '');
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === (expr as ELMExpressionRef).name);
      if (matchingLib && exprRef) {
        results.push(...findRetrieves(matchingLib, deps, exprRef.expression, queryLocalId, [...expressionStack]));
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === (expr as ELMExpressionRef).name);
      if (exprRef) {
        results.push(...findRetrieves(elm, deps, exprRef.expression, queryLocalId, [...expressionStack]));
      }
    }
  } else if ((expr as any).operand) {
    // Operand can be array or object. Recurse on either
    const anyExpr = expr as any;
    if (Array.isArray(anyExpr.operand)) {
      anyExpr.operand.forEach((e: any) => {
        results.push(...findRetrieves(elm, deps, e, queryLocalId, [...expressionStack]));
      });
    } else {
      results.push(...findRetrieves(elm, deps, anyExpr.operand, queryLocalId, [...expressionStack]));
    }
  }
  return results;
}
