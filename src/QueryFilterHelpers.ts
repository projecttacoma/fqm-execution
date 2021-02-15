import { R4 } from '@ahryman40k/ts-fhir-types';
import { v4 as uuidv4 } from 'uuid';
import { ELMTypes } from './types';
import { DataTypeQuery, DetailedPopulationGroupResult } from './types/Calculator';
import {
  ELM,
  ELMEqual,
  ELMExpression,
  ELMFunctionRef,
  ELMLiteral,
  ELMProperty,
  ELMQuery,
  ELMRetrieve,
  ELMStatement
} from './types/ELMTypes';
import { FinalResult } from './types/Enums';

export function parseQueryInfo(library: ELM, querylocalId: string): any {
  const expression = findClauseInLibrary(library, querylocalId);
  if (expression?.type == 'Query') {
    const query = expression as ELMQuery;
    const queryInfo = {
      localId: query?.localId,
      sources: parseSources(query)
    };
    if (query.where) {
      const whereInfo = parseExpression(query.where);
      const source = queryInfo.sources.find(source => source.alias === whereInfo.alias);
      if (source) {
        source.filters.push({
          attribute: whereInfo.attribute,
          value: whereInfo.value,
          localId: whereInfo.localId
        });
      }
    }
    return queryInfo;
  } else {
    throw new Error(`Clause ${querylocalId} in ${library.library.identifier.id} was not a Query or not found.`);
  }
}

function findClauseInLibrary(library: ELM, localId: string): ELMExpression | null {
  for (let i = 0; i < library.library.statements.def.length; i++) {
    const statement = library.library.statements.def[i];
    const expression = findClauseInExpression(statement.expression, localId);
    if (expression) {
      return expression;
    }
  }
  return null;
}

function findClauseInExpression(expression: any, localId: string): ELMExpression | null {
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

function parseSources(query: ELMQuery): any[] {
  const sources: any[] = [];
  query.source.forEach(source => {
    if (source.expression.type == 'Retrieve') {
      const retrieveInfo = parseRetrieveInfo(source.expression as ELMRetrieve);
      const sourceInfo = {
        sourceLocalId: source.localId,
        retrievelocalId: source.expression.localId,
        alias: source.alias,
        resourceType: retrieveInfo.resourceType,
        filters: []
      };
      sources.push(sourceInfo);
    }
  });
  return sources;
}

function parseRetrieveInfo(retrieve: ELMRetrieve): any {
  // TODO: Parse and determine valueset or code filter info. Possibly share code in GapsInCareHelpers.
  return {
    resourceType: retrieve.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '')
  };
}

function parseExpression(expression: ELMExpression): any {
  switch (expression.type) {
    case 'FunctionRef':
      //interpertFunctionRef(expression as ELMFunctionRef);
      break;
    case 'Equal':
      return interpretEqual(expression as ELMEqual);
      break;
    default:
      break;
  }
}

function interpretFunctionRef(functionRef: ELMFunctionRef): any {
  // from fhir helpers
  if (functionRef.libraryName == 'FHIRHelpers') {
    switch (functionRef.name) {
      case 'ToString':
        // Act as pass through
        return functionRef.operand[0] as ELMProperty;
        break;

      default:
        break;
    }
  }
}

function interpretEqual(equal: ELMEqual): any {
  let propRef: ELMProperty | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  let literal: ELMLiteral | null = null;
  if (equal.operand[1].type == 'Literal') {
    literal = equal.operand[1] as ELMLiteral;
  }

  if (propRef != undefined && literal != undefined) {
    return {
      alias: propRef.scope,
      value: literal.value,
      attribute: propRef.path,
      localId: equal.localId
    };
  } else {
    console.log('could not find prop and literal for Equal');
  }
}
