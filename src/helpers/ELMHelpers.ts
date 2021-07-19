import { ELM, ELMExpression } from '../types/ELMTypes';

/**
 * Find an ELM clause by localId in a given library.
 *
 * @param library The library to search in.
 * @param localId The localId to look for.
 * @returns The expression if found or null.
 */
export function findClauseInLibrary(library: ELM, localId: string): ELMExpression | null {
  for (let i = 0; i < library.library.statements.def.length; i++) {
    const statement = library.library.statements.def[i];
    const expression = findClauseInExpression(statement.expression, localId);
    if (expression) {
      return expression;
    }
  }
  return null;
}

/**
 * Recursively search an ELM tree for an expression (clause) with a given localId.
 *
 * @param expression The expression tree to search for the clause in.
 * @param localId The localId to look for.
 * @returns The expression if found or null.
 */
export function findClauseInExpression(expression: any, localId: string): ELMExpression | null {
  if (typeof expression === 'string' || typeof expression === 'number' || typeof expression === 'boolean') {
    return null;
  } else if (Array.isArray(expression)) {
    for (let i = 0; i < expression.length; i++) {
      const memberExpression = findClauseInExpression(expression[i], localId);
      if (memberExpression) {
        return memberExpression as ELMExpression;
      }
    }
    return null;
  } else if (expression.localId == localId) {
    return expression as ELMExpression;
  } else {
    return findClauseInExpression(Object.values(expression), localId);
  }
}
