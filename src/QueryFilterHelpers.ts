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
  ELMStatement,
  ELMAnd,
  ELMOr,
  ELMEquivalent,
  ELMConceptRef,
  ELMIncludedIn,
  ELMParameterRef,
  ELMAs
} from './types/ELMTypes';
import { FinalResult } from './types/Enums';

export function parseQueryInfo(library: ELM, queryLocalId: string): any {
  const expression = findClauseInLibrary(library, queryLocalId);
  if (expression?.type == 'Query') {
    const query = expression as ELMQuery;
    const queryInfo = {
      localId: query?.localId,
      sources: parseSources(query)
    };
    if (query.where) {
      const whereInfo = interpretExpression(query.where, library);
      const source = queryInfo.sources[0]; //find(source => source.alias === whereInfo.alias);
      source.filters = whereInfo;
    }
    return queryInfo;
  } else {
    throw new Error(`Clause ${queryLocalId} in ${library.library.identifier.id} was not a Query or not found.`);
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
        retrieveLocalId: source.expression.localId,
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

function interpretExpression(expression: ELMExpression, library: ELM): any {
  switch (expression.type) {
    case 'FunctionRef':
      //interpretFunctionRef(expression as ELMFunctionRef, library);
      break;
    case 'Equal':
      return interpretEqual(expression as ELMEqual, library);
      break;
    case 'Equivalent':
      return interpretEquivalent(expression as ELMEquivalent, library);
      break;
    case 'And':
      return interpretAnd(expression as ELMAnd, library);
      break;
    case 'Or':
      return interpretOr(expression as ELMOr, library);
      break;
    case 'IncludedIn':
      return interpretIncludedIn(expression as ELMIncludedIn, library);
      break;
    default:
      console.error(`Don't know how to parse ${expression.type} expression.`);
      //TODO: recursively look for accessing attributes of sources to say they have been accessed
      break;
  }
}

function interpretAnd(andExpression: ELMAnd, library: ELM): any {
  const andInfo = { type: 'and', children: [] as any[] };
  if (andExpression.operand[0].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[0] as ELMAnd, library).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[0], library));
  }
  if (andExpression.operand[1].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[1] as ELMAnd, library).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[1], library));
  }
  return andInfo;
}

function interpretOr(orExpression: ELMOr, library: ELM): any {
  const orInfo = { type: 'or', children: [] as any[] };
  if (orExpression.operand[0].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[0] as ELMOr, library).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[0], library));
  }
  if (orExpression.operand[1].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[1] as ELMOr, library).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[1], library));
  }
  return orInfo;
}

function interpretFunctionRef(functionRef: ELMFunctionRef, library: ELM): any {
  // from fhir helpers
  if (functionRef.libraryName == 'FHIRHelpers' || functionRef.libraryName == 'Global') {
    switch (functionRef.name) {
      case 'ToString':
      case 'ToConcept':
      case 'ToInterval':
      case 'Normalize Interval':
        // Act as pass through
        if (functionRef.operand[0].type == 'Property') {
          return functionRef.operand[0] as ELMProperty;
        } else if (
          functionRef.operand[0].type === 'As' &&
          (functionRef.operand[0] as ELMAs).operand.type == 'Property'
        ) {
          return (functionRef.operand[0] as ELMAs).operand as ELMProperty;
        }
        break;
      default:
        break;
    }
  } else {
    console.warn(`do not know how to interpret function ref ${functionRef.libraryName}."${functionRef.name}"`);
  }
}

function interpretEquivalent(equal: ELMEquivalent, library: ELM): any {
  let propRef: ELMProperty | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef, library);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    console.warn('could not resolve property ref for Equivalent');
    return;
  }

  if (equal.operand[1].type == 'Literal') {
    const literal = equal.operand[1] as ELMLiteral;
    return {
      type: 'equals',
      alias: propRef.scope,
      value: literal.value,
      attribute: propRef.path,
      localId: equal.localId
    };
  }

  if (equal.operand[1].type == 'ConceptRef') {
    const conceptRef = equal.operand[1] as ELMConceptRef;
    return {
      type: 'in',
      alias: propRef.scope,
      attribute: propRef.path,
      valueList: getCodesInConcept(conceptRef.name, library),
      localId: equal.localId
    };
  }
}

function getCodesInConcept(name: string, library: ELM): any {
  const concept = library.library.concepts?.def.find(concept => concept.name === name);
  if (concept) {
    return concept.code.map(codeRef => {
      const code = library.library.codes?.def.find(code => code.name == codeRef.name);
      if (code) {
        return {
          code: code?.id,
          system: library.library.codeSystems.def.find((systemRef: any) => code?.codeSystem.name === systemRef.name).id
        };
      }
    });
  }
  return [];
}

function interpretEqual(equal: ELMEqual, library: ELM): any {
  let propRef: ELMProperty | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef, library);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  let literal: ELMLiteral | null = null;
  if (equal.operand[1].type == 'Literal') {
    literal = equal.operand[1] as ELMLiteral;
  }

  if (propRef != undefined && literal != undefined) {
    return {
      type: 'equals',
      alias: propRef.scope,
      value: literal.value,
      attribute: propRef.path,
      localId: equal.localId
    };
  } else {
    console.log('could not find prop and literal for Equal');
  }
}

function interpretIncludedIn(includedIn: ELMIncludedIn, library: ELM): any {
  let propRef: ELMProperty | null = null;
  if (includedIn.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(includedIn.operand[0] as ELMFunctionRef, library);
  } else if (includedIn.operand[0].type == 'Property') {
    propRef = includedIn.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    console.warn('could not resolve property ref for IncludedIn');
    return;
  }

  if (includedIn.operand[1].type == 'ParameterRef') {
    return {
      type: 'during',
      alias: propRef.scope,
      valuePeriod: {
        ref: (includedIn.operand[1] as ELMParameterRef).name
      },
      attribute: propRef.path,
      localId: includedIn.localId
    };
  } else {
    console.warn('could not resolve IncludedIn operand[1] ' + includedIn.operand[1].type);
  }
}
