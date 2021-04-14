import { R4 } from '@ahryman40k/ts-fhir-types';
import cql from 'cql-execution';
import {
  ELM,
  ELMEqual,
  ELMExpression,
  ELMFunctionRef,
  ELMLiteral,
  ELMProperty,
  ELMQuery,
  ELMRetrieve,
  ELMAnd,
  ELMOr,
  ELMEquivalent,
  ELMConceptRef,
  ELMIncludedIn,
  ELMParameterRef,
  ELMAs,
  ELMIn,
  ELMList,
  ELMNot,
  ELMIsNull,
  ELMUnaryExpression
} from './types/ELMTypes';
import {
  AndFilter,
  AnyFilter,
  DuringFilter,
  EqualsFilter,
  InFilter,
  NotNullFilter,
  OrFilter,
  QueryInfo,
  SourceInfo,
  TautologyFilter,
  UnknownFilter
} from './types/QueryFilterTypes';

/**
 * Parse information about a query. This pulls out information about all sources in the query and attempts to parse
 * how the query is filtered.
 *
 * @param library The library ELM the query resides in.
 * @param queryLocalId The localId for the query we want to get information on.
 * @param parameters The parameters used for calculation so they could be reused for re-calculating small bits for CQL.
 * @returns Information about the query and how it is filtered.
 */
export function parseQueryInfo(library: ELM, queryLocalId: string, parameters: { [key: string]: any } = {}): QueryInfo {
  const expression = findClauseInLibrary(library, queryLocalId);
  if (expression?.type == 'Query') {
    const query = expression as ELMQuery;
    const queryInfo: QueryInfo = {
      localId: query?.localId,
      sources: parseSources(query),
      filter: { type: 'truth' }
    };
    if (query.where) {
      const whereInfo = interpretExpression(query.where, library, parameters);
      queryInfo.filter = whereInfo;
    }
    return queryInfo;
  } else {
    throw new Error(`Clause ${queryLocalId} in ${library.library.identifier.id} was not a Query or not found.`);
  }
}

/**
 * Find an ELM clause by localId in a given library.
 *
 * @param library The library to search in.
 * @param localId The localId to look for.
 * @returns The expression if found or null.
 */
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

/**
 * Recursively search an ELM tree for an expression (clause) with a given localId.
 *
 * @param expression The expression tree to search for the clause in.
 * @param localId The localId to look for.
 * @returns The expression if found or null.
 */
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

/**
 * Parse information about the sources in a given query.
 *
 * @param query The Query expression to parse.
 * @returns Information about each source. This is usually an array of one.
 */
function parseSources(query: ELMQuery): SourceInfo[] {
  const sources: SourceInfo[] = [];
  query.source.forEach(source => {
    if (source.expression.type == 'Retrieve') {
      const sourceInfo: SourceInfo = {
        sourceLocalId: source.localId,
        retrieveLocalId: source.expression.localId,
        alias: source.alias,
        resourceType: parseDataType(source.expression as ELMRetrieve)
      };
      sources.push(sourceInfo);
    }
  });
  return sources;
}

/**
 * Pulls out the resource type of the retrieve.
 *
 * @param retrieve The retrieve expression to pull out resource type from.
 * @returns FHIR ResourceType name.
 */
function parseDataType(retrieve: ELMRetrieve): string {
  return retrieve.dataType.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');
}

/**
 * Interprets an expression into a filter tree. This is the central point where the interpreting occurs. This function
 * determines the expression type and sends it to the correct place to be parsed.
 *
 * @param expression The ELM expression/clause to attempt to interpret into a filter.
 * @param library The ELM library, in case it is needed for calculating intervals.
 * @param parameters The parameters used for calculation.
 * @returns The simpler Filter representation of this clause.
 */
function interpretExpression(expression: ELMExpression, library: ELM, parameters: any): AnyFilter {
  switch (expression.type) {
    case 'FunctionRef':
      //interpretFunctionRef(expression as ELMFunctionRef, library);
      break;
    case 'Equal':
      return interpretEqual(expression as ELMEqual);
      break;
    case 'Equivalent':
      return interpretEquivalent(expression as ELMEquivalent, library);
      break;
    case 'And':
      return interpretAnd(expression as ELMAnd, library, parameters);
      break;
    case 'Or':
      return interpretOr(expression as ELMOr, library, parameters);
      break;
    case 'IncludedIn':
      return interpretIncludedIn(expression as ELMIncludedIn, library, parameters);
      break;
    case 'In':
      return interpretIn(expression as ELMIn, library, parameters);
      break;
    case 'Not':
      return interpretNot(expression as ELMNot);
      break;
    default:
      console.error(`Don't know how to parse ${expression.type} expression.`);
      const propUsage = findPropertyUsage(expression, expression.localId);
      if (propUsage) {
        return propUsage;
      }
      break;
  }
  return {
    type: 'unknown',
    localId: expression.localId
  };
}

// Fall back to finding property use
function findPropertyUsage(expression: any, unknownLocalId?: string): UnknownFilter | null {
  if (expression.type === 'Property') {
    const propRef = expression as ELMProperty;
    if (propRef.scope) {
      return {
        type: 'unknown',
        alias: propRef.scope,
        attribute: propRef.path,
        localId: unknownLocalId
      };
    }
  } else if (Array.isArray(expression.operand)) {
    for (let i = 0; i < expression.operand.length; i++) {
      const propInfo = findPropertyUsage(expression.operand[i], unknownLocalId);
      if (propInfo) {
        return propInfo;
      }
    }
  } else if (expression.operand) {
    return findPropertyUsage(expression.operand, unknownLocalId);
  }
  return null;
}

function interpretAnd(andExpression: ELMAnd, library: ELM, parameters: any): AndFilter {
  const andInfo: AndFilter = { type: 'and', children: [] };
  if (andExpression.operand[0].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[0] as ELMAnd, library, parameters).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[0], library, parameters));
  }
  if (andExpression.operand[1].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[1] as ELMAnd, library, parameters).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[1], library, parameters));
  }
  andInfo.children = andInfo.children.filter(filter => filter?.type !== 'truth');
  return andInfo;
}

function interpretOr(orExpression: ELMOr, library: ELM, parameters: any): OrFilter {
  const orInfo: OrFilter = { type: 'or', children: [] };
  if (orExpression.operand[0].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[0] as ELMOr, library, parameters).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[0], library, parameters));
  }
  if (orExpression.operand[1].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[1] as ELMOr, library, parameters).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[1], library, parameters));
  }
  orInfo.children = orInfo.children.filter(filter => filter?.type !== 'truth');
  return orInfo;
}

function interpretFunctionRef(functionRef: ELMFunctionRef): any {
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

function interpretNot(not: ELMNot): NotNullFilter | TautologyFilter | UnknownFilter {
  if (not.operand.type === 'IsNull') {
    const isNull = not.operand as ELMIsNull;
    if (isNull.operand.type === 'Property') {
      const propRef = isNull.operand as ELMProperty;
      if (propRef.scope) {
        return {
          type: 'notnull',
          attribute: propRef.path,
          alias: propRef.scope,
          localId: not.localId
        };
      }
    } else if (isNull.operand.type === 'End' || isNull.operand.type === 'Start') {
      const endOrStart = isNull.operand as ELMUnaryExpression;
      // if it is "Measurement Period" we can return that this will always be true/removed
      if (
        endOrStart.operand.type === 'ParameterRef' &&
        (endOrStart.operand as ELMParameterRef).name === 'Measurement Period'
      ) {
        return { type: 'truth' };
      }
    } else {
      console.warn(`could not handle 'isNull' inside 'not' for expression type ${isNull.operand.type}`);
    }
  } else {
    console.warn(`could not handle 'not' for expression type ${not.operand.type}`);
  }
  return { type: 'unknown' };
}

function interpretEquivalent(equal: ELMEquivalent, library: ELM): EqualsFilter | InFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    console.warn('could not resolve property ref for Equivalent');
    return { type: 'unknown' };
  }

  if (equal.operand[1].type == 'Literal') {
    const literal = equal.operand[1] as ELMLiteral;
    if (propRef.scope && literal.value) {
      return {
        type: 'equals',
        alias: propRef.scope,
        value: literal.value,
        attribute: propRef.path,
        localId: equal.localId
      };
    } else {
      console.warn('Property reference scope or literal value were not found.');
      return { type: 'unknown' };
    }
  }

  if (equal.operand[1].type == 'ConceptRef') {
    const conceptRef = equal.operand[1] as ELMConceptRef;
    if (propRef.scope) {
      return {
        type: 'in',
        alias: propRef.scope,
        attribute: propRef.path,
        valueCodingList: getCodesInConcept(conceptRef.name, library),
        localId: equal.localId
      };
    } else {
      console.warn('Property reference scope was not found.');
      return { type: 'unknown' };
    }
  }
  return { type: 'unknown' };
}

function getCodesInConcept(name: string, library: ELM): R4.ICoding[] {
  const concept = library.library.concepts?.def.find(concept => concept.name === name);
  if (concept) {
    const codes: R4.ICoding[] = [];
    concept.code.map(codeRef => {
      const code = library.library.codes?.def.find(code => code.name == codeRef.name);
      if (code) {
        codes.push({
          code: code?.id,
          system: library.library.codeSystems.def.find((systemRef: any) => code?.codeSystem.name === systemRef.name).id
        });
      }
    });
    return codes;
  }
  return [];
}

function interpretEqual(equal: ELMEqual): EqualsFilter | UnknownFilter {
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

  if (propRef?.scope && literal?.value) {
    return {
      type: 'equals',
      alias: propRef.scope,
      value: literal.value,
      attribute: propRef.path,
      localId: equal.localId
    };
  } else {
    console.log('could not find attribute or literal for Equal');
  }
  return { type: 'unknown' };
}

function interpretIncludedIn(includedIn: ELMIncludedIn, library: ELM, parameters: any): DuringFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (includedIn.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(includedIn.operand[0] as ELMFunctionRef);
  } else if (includedIn.operand[0].type == 'Property') {
    propRef = includedIn.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    console.warn(
      `could not resolve property ref for IncludedIn:${includedIn.localId}. first operand is a ${includedIn.operand[0].type}`
    );
    return { type: 'unknown' };
  }

  if (includedIn.operand[1].type == 'ParameterRef') {
    const paramName = (includedIn.operand[1] as ELMParameterRef).name;
    const valuePeriod: any = {
      ref: paramName
    };
    // If this parameter is known use it
    if (parameters[paramName]) {
      valuePeriod.start = (parameters[paramName] as cql.Interval).start().toString().replace('+00:00', 'Z');
      valuePeriod.end = (parameters[paramName] as cql.Interval).end().toString().replace('+00:00', 'Z');
    }
    if (propRef.scope) {
      return {
        type: 'during',
        alias: propRef.scope,
        valuePeriod: valuePeriod,
        attribute: propRef.path,
        localId: includedIn.localId
      };
    } else {
      console.warn('could not find scope of property ref');
    }
  } else {
    console.warn('could not resolve IncludedIn operand[1] ' + includedIn.operand[1].type);
  }
  return { type: 'unknown' };
}

function interpretIn(includedIn: ELMIn, library: ELM, parameters: any): InFilter | DuringFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (includedIn.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(includedIn.operand[0] as ELMFunctionRef);
  } else if (includedIn.operand[0].type == 'Property') {
    propRef = includedIn.operand[0] as ELMProperty;
  } else if (includedIn.operand[0].type == 'End' || includedIn.operand[0].type == 'Start') {
    const startOrEnd = includedIn.operand[0] as ELMUnaryExpression;
    const suffix = startOrEnd.type === 'End' ? '.end' : '.start';
    if (startOrEnd.operand.type == 'FunctionRef') {
      propRef = interpretFunctionRef(startOrEnd.operand as ELMFunctionRef);
    } else if (startOrEnd.operand.type == 'Property') {
      propRef = startOrEnd.operand as ELMProperty;
    }
    if (propRef) {
      propRef = {
        type: 'Property',
        path: propRef?.path + suffix,
        scope: propRef?.scope,
        localId: propRef?.localId,
        locator: propRef?.locator,
        source: propRef?.source
      };
    }
  }

  if (propRef == null) {
    console.warn(
      `could not resolve property ref for In:${includedIn.localId}. first operand is a ${includedIn.operand[0].type}`
    );

    const foundPropUsage = findPropertyUsage(includedIn, includedIn.localId);
    if (foundPropUsage) {
      console.warn(`  found property ref "${foundPropUsage.alias}.${foundPropUsage.attribute}" in first operand.`);
      return foundPropUsage;
    }

    return { type: 'unknown' };
  }

  if (includedIn.operand[1].type == 'List') {
    if (propRef.scope) {
      return {
        type: 'in',
        alias: propRef.scope,
        attribute: propRef.path,
        valueList: (includedIn.operand[1] as ELMList).element.map(item => item.value) as (string | number)[],
        localId: includedIn.localId
      };
    } else {
      console.warn('Could not find scope for property reference');
      return { type: 'unknown' };
    }
  } else if (includedIn.operand[1].type == 'Interval') {
    const propRefInInterval = findPropertyUsage(includedIn.operand[1], undefined);
    if (propRefInInterval) {
      console.warn('cannot handle intervals constructed on query data right now');
      return {
        type: 'unknown',
        localId: includedIn.localId,
        alias: propRef.scope,
        attribute: propRef.path
      };
    }

    // build an expression that has the interval creation and
    const intervalExpr = new cql.Expression({ operand: includedIn.operand[1] });
    const ctx = new cql.PatientContext(new cql.Library(library), null, null, parameters);
    const interval: cql.Interval = intervalExpr.arg.execute(ctx);

    if (propRef.scope) {
      return {
        type: 'during',
        alias: propRef.scope,
        attribute: propRef.path,
        valuePeriod: {
          ref: 'Measurement Period',
          start: interval.start().toString().replace('+00:00', 'Z'),
          end: interval.end().toString().replace('+00:00', 'Z')
        }
      };
    } else {
      console.warn('could not resolve property scope');
    }
  } else {
    console.warn('could not resolve IncludedIn operand[1] ' + includedIn.operand[1].type);
  }
  return { type: 'unknown' };
}
