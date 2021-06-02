import { ELM, ELMStatement } from '../types/ELMTypes';
import { DataTypeQuery, ExpressionStackEntry } from '../types/Calculator';

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
  expr: ELMStatement,
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
  if (expr.type === 'Retrieve' && expr.dataType) {
    // If present, strip off HL7 prefix to data type
    const dataType = expr.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');

    if (expr.codes?.type === 'ValueSetRef') {
      const valueSet = elm.library.valueSets?.def.find(v => v.name === expr.codes.name);
      if (valueSet) {
        results.push({
          dataType,
          valueSet: valueSet.id,
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack]
        });
      }
    } else if (
      expr.codes.type === 'CodeRef' ||
      (expr.codes.type === 'ToList' && expr.codes.operand?.type === 'CodeRef')
    ) {
      // ToList promotions have the CodeRef on the operand
      const codeName = expr.codes.type === 'CodeRef' ? expr.codes.name : expr.codes.operand.name;
      const code = elm.library.codes?.def.find(c => c.name === codeName);
      if (code) {
        results.push({
          dataType,
          code: {
            system: code.codeSystem.name,
            code: code.id
          },
          queryLocalId,
          retrieveLocalId: expr.localId,
          libraryName: elm.library.identifier.id,
          expressionStack: [...expressionStack]
        });
      }
    }
  } else if (expr.type === 'Query') {
    // Queries have the source array containing the expressions
    expr.source?.forEach(s => {
      results.push(...findRetrieves(elm, deps, s.expression, expr.localId, [...expressionStack]));
    });
  } else if (expr.type === 'ExpressionRef') {
    // Find expression in dependent library
    if (expr.libraryName) {
      const matchingLib = deps.find(d => d.library.identifier.id === expr.libraryName);
      const exprRef = matchingLib?.library.statements.def.find(e => e.name === expr.name);
      if (matchingLib && exprRef) {
        results.push(...findRetrieves(matchingLib, deps, exprRef.expression, queryLocalId, [...expressionStack]));
      }
    } else {
      // Find expression in current library
      const exprRef = elm.library.statements.def.find(d => d.name === expr.name);
      if (exprRef) {
        results.push(...findRetrieves(elm, deps, exprRef.expression, queryLocalId, [...expressionStack]));
      }
    }
  } else if (expr.operand) {
    // Operand can be array or object. Recurse on either
    if (Array.isArray(expr.operand)) {
      expr.operand.forEach(e => {
        results.push(...findRetrieves(elm, deps, e, queryLocalId, [...expressionStack]));
      });
    } else {
      results.push(...findRetrieves(elm, deps, expr.operand, queryLocalId, [...expressionStack]));
    }
  }
  return results;
}
