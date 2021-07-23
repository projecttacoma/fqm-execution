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
  ELMUnaryExpression,
  ELMInterval,
  ELMCodeSystem,
  ELMGreaterOrEqual,
  ELMToDateTime,
  ELMStart,
  ELMEnd,
  ELMExpressionRef
} from './types/ELMTypes';
import {
  AndFilter,
  AnyFilter,
  AttributeFilter,
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
import { findLibraryReference, findLibraryReferenceId } from './ELMDependencyHelper';
import { findClauseInLibrary } from './helpers/ELMHelpers';

/**
 * Parse information about a query. This pulls out information about all sources in the query and attempts to parse
 * how the query is filtered.
 *
 * @param library The library ELM the query resides in.
 * @param allELM An array of all the ELM libraries accessible to fqm-execution (includes library from library param)
 * @param queryLocalId The localId for the query we want to get information on.
 * @param parameters The parameters used for calculation so they could be reused for re-calculating small bits for CQL.
 *                    "Measurement Period" is the only supported parameter at the moment as it is the only parameter
 *                    seen in eCQMs.
 * @param patient The patient resource being calculated for.
 * @returns Information about the query and how it is filtered.
 */
export function parseQueryInfo(
  library: ELM,
  allELM: ELM[],
  queryLocalId: string | undefined,
  parameters: { [key: string]: any } = {},
  patient: R4.IPatient
): QueryInfo {
  if (!queryLocalId) {
    throw new Error('QueryLocalId was not provided');
  }
  const expression = findClauseInLibrary(library, queryLocalId);
  if (expression?.type == 'Query') {
    const query = expression as ELMQuery;
    const queryInfo: QueryInfo = {
      localId: query?.localId,
      sources: parseSources(query),
      filter: { type: 'truth' }
    };

    if (query.where) {
      const whereInfo = interpretExpression(query.where, library, parameters, patient);
      queryInfo.filter = whereInfo;
    }

    // If this query's source is a reference to an expression that is a query then we should parse it and include
    // the filters from it.
    if (query.source[0].expression.type === 'ExpressionRef') {
      const exprRef = query.source[0].expression as ELMExpressionRef;
      let queryLib: ELM | null = library;
      if (exprRef.libraryName) {
        queryLib = findLibraryReference(library, allELM, exprRef.libraryName);
      }
      if (!queryLib) {
        throw new Error(`Cannot Find Referenced Library: ${exprRef.libraryName}`);
      }
      const statement = queryLib.library.statements.def.find(s => s.name === exprRef.name);
      /**
       * Add support for library search in another library if necessary
       * steps:
       *  Determine if query.source[0] references a different library
       *    is this possible or will we need to instead just search all accessible libraries for source??
       *  Replace library.library with apropriate library
       *  The rest of this function should be unchnaged??
       */
      // if we find the statement and it is a query we can move forward.
      if (statement) {
        if (statement.expression.type === 'Query') {
          const innerQuery = statement.expression as ELMQuery;
          const innerQueryInfo = parseQueryInfo(queryLib, allELM, innerQuery.localId, parameters, patient);

          // use sources from inner query
          queryInfo.sources = innerQueryInfo.sources;

          // replace the filters for this query to match the inner source
          replaceAliasesInFilters(queryInfo.filter, query.source[0].alias, innerQuery.source[0].alias);

          // combine filters from inner query by 'AND'ing it with the outer statement and replacing filter info
          if (innerQuery.where) {
            // make new combined and filter
            const combinedAnd: AndFilter = {
              type: 'and',
              children: [],
              notes: 'Combination of multiple queries'
            };

            // Add inner query info. merge to the combined 'and' if it is an 'and' itself
            if (innerQueryInfo.filter.type === 'and') {
              combinedAnd.children.push(...(innerQueryInfo.filter as AndFilter).children);
            } else {
              combinedAnd.children.push(innerQueryInfo.filter);
            }

            // Add this query info. merge to the combined 'and' if it is an 'and' itself
            if (queryInfo.filter.type === 'and') {
              combinedAnd.children.push(...(queryInfo.filter as AndFilter).children);
            } else {
              combinedAnd.children.push(queryInfo.filter);
            }

            // replace the filter info with the combined and
            queryInfo.filter = combinedAnd;
          }
        } else {
          console.error(
            `query source referenced a statement that is not a query. ${query.localId} in ${library.library.identifier.id}`
          );
        }
      } else {
        console.error(
          `query source referenced a statement that could not be found. ${query.localId} in ${library.library.identifier.id}`
        );
      }
    }

    return queryInfo;
  } else {
    throw new Error(`Clause ${queryLocalId} in ${library.library.identifier.id} was not a Query or not found.`);
  }
}

/**
 * Replace the aliases in a tree of filters.
 *
 * @param filter The root filter.
 * @param match The alias to look to replace.
 * @param replace The replacement.
 */
function replaceAliasesInFilters(filter: AnyFilter, match: string, replace: string) {
  if (filter.type === 'and' || filter.type === 'or') {
    (filter as AndFilter).children.forEach(filter => {
      replaceAliasesInFilters(filter, match, replace);
    });
  } else if ((filter as AttributeFilter).alias === match) {
    (filter as AttributeFilter).alias = replace;
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
 * @param patient The patient resource.
 * @returns The simpler Filter representation of this clause.
 */
export function interpretExpression(
  expression: ELMExpression,
  library: ELM,
  parameters: any,
  patient: R4.IPatient
): AnyFilter {
  switch (expression.type) {
    case 'Equal':
      return interpretEqual(expression as ELMEqual, library);
    case 'Equivalent':
      return interpretEquivalent(expression as ELMEquivalent, library);
    case 'And':
      return interpretAnd(expression as ELMAnd, library, parameters, patient);
    case 'Or':
      return interpretOr(expression as ELMOr, library, parameters, patient);
    case 'IncludedIn':
      return interpretIncludedIn(expression as ELMIncludedIn, library, parameters);
    case 'In':
      return interpretIn(expression as ELMIn, library, parameters);
    case 'Not':
      return interpretNot(expression as ELMNot);
    case 'GreaterOrEqual':
      return interpretGreaterOrEqual(expression as ELMGreaterOrEqual, library, parameters, patient);
    default:
      console.error(`Don't know how to parse ${expression.type} expression.`);
      // Look for a property (source attribute) usage in the expression tree. This can denote an
      // attribute on a resource was checked but we don't know what it was checked for.
      const propUsage = findPropertyUsage(expression, expression.localId);
      if (propUsage) {
        return propUsage;
      }
  }
  // If we cannot make sense of this expression or find a parameter usage in it, then we should return
  // an UnknownFilter to denote something is done here that we could not interpret.
  return {
    type: 'unknown',
    localId: expression.localId
  };
}

/**
 * Recursively search an ELM expression for usage of a property on a query source.
 *
 * @param expression Expression to search for property use in.
 * @param unknownLocalId The localId of the parent express that should be identified as the clause we are unable to parse.
 * @returns An `UnknownFilter` describing the attribute that was accessed or null if none was found.
 */
export function findPropertyUsage(expression: any, unknownLocalId?: string): UnknownFilter | null {
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

/**
 * Parses an `and` expression into a tree of filters. This will flatten directly nested `and` statements.
 *
 * @param andExpression The and expression to interpret.
 * @param library The library the elm is in.
 * @param parameters The original calculation parameters.
 * @param patient The patient resource.
 * @returns The filter tree for this and expression.
 */
export function interpretAnd(andExpression: ELMAnd, library: ELM, parameters: any, patient: R4.IPatient): AndFilter {
  const andInfo: AndFilter = { type: 'and', children: [] };
  if (andExpression.operand[0].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[0] as ELMAnd, library, parameters, patient).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[0], library, parameters, patient));
  }
  if (andExpression.operand[1].type == 'And') {
    andInfo.children.push(...interpretAnd(andExpression.operand[1] as ELMAnd, library, parameters, patient).children);
  } else {
    andInfo.children.push(interpretExpression(andExpression.operand[1], library, parameters, patient));
  }
  andInfo.children = andInfo.children.filter(filter => filter?.type !== 'truth');
  return andInfo;
}

/**
 * Parses an `or` expression into a tree of filters. This will flatten directly nested `or` statements.
 *
 * @param orExpression The or expression to interpret.
 * @param library The library the elm is in.
 * @param parameters The original calculation parameters.
 * @param patient The patient resource.
 * @returns The filter tree for this or expression.
 */
export function interpretOr(orExpression: ELMOr, library: ELM, parameters: any, patient: R4.IPatient): OrFilter {
  const orInfo: OrFilter = { type: 'or', children: [] };
  if (orExpression.operand[0].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[0] as ELMOr, library, parameters, patient).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[0], library, parameters, patient));
  }
  if (orExpression.operand[1].type == 'Or') {
    orInfo.children.push(...interpretOr(orExpression.operand[1] as ELMOr, library, parameters, patient).children);
  } else {
    orInfo.children.push(interpretExpression(orExpression.operand[1], library, parameters, patient));
  }
  orInfo.children = orInfo.children.filter(filter => filter?.type !== 'truth');
  return orInfo;
}

/**
 * Attempt to interpret what a FunctionRef is doing. This currently checks to see if it can be treated as a passthrough
 * to the property accessed in the operand.
 *
 * @param functionRef The function ref to look at.
 * @returns Usually an ELMProperty expression for the operand if it can be considered a passthrough.
 */
export function interpretFunctionRef(functionRef: ELMFunctionRef, library: ELM): any {
  if (functionRef.libraryName) {
    const libraryId = findLibraryReferenceId(library, functionRef.libraryName);

    // from fhir helpers or MAT Global or fhir common
    if (libraryId === 'FHIRHelpers' || libraryId === 'MATGlobalCommonFunctions' || libraryId === 'FHIRCommon') {
      switch (functionRef.name) {
        case 'ToString':
        case 'ToConcept':
        case 'ToInterval':
        case 'ToDateTime':
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
}

/**
 * Interprets a `not` expression into a filter. This currently is able to handle "not null" and superfluous checks
 * that cql-to-elm adds (i.e. a check to see if the end of "Measurement Period" is not null)
 *
 * This is commonly seen in measures as an `Observation.value is not null`.
 *
 * @param not The ELM `Not` expression to parse.
 * @returns The interpreted filter. This may be a TautologyFilter that can be removed.
 */
export function interpretNot(not: ELMNot): NotNullFilter | TautologyFilter | UnknownFilter {
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

/**
 * Parses an ELM equivalent expression into a filter. This currently handles checks against literals and checks against
 * a concept reference.
 *
 * @param equal The ELM equivalent clause to parse.
 * @param library The library the clause resides in.
 * @returns The filter representation.
 */
export function interpretEquivalent(equal: ELMEquivalent, library: ELM): EqualsFilter | InFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef, library);
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

/**
 * Gets a list of codes in a CQL concept reference by name. These are returned as
 * FHIR Codings.
 *
 * @param name Name of the concept.
 * @param library The library elm the concept should be found in.
 * @returns A list of codings in the concept
 */
export function getCodesInConcept(name: string, library: ELM): R4.ICoding[] {
  const concept = library.library.concepts?.def.find(concept => concept.name === name);
  if (concept) {
    const codes: R4.ICoding[] = [];
    concept.code.map(codeRef => {
      const code = library.library.codes?.def.find(code => code.name == codeRef.name);
      if (code) {
        codes.push({
          code: code?.id,
          system: library.library.codeSystems?.def.find(
            (systemRef: ELMCodeSystem) => code?.codeSystem.name === systemRef.name
          )?.id
        });
      }
    });
    return codes;
  }
  return [];
}

/**
 * Parses an ELM equal expression into a filter. This currently only handles checks against literal values.
 *
 * @param equal The equal expression to be parsed.
 * @returns Filter representing the equal filter.
 */
export function interpretEqual(equal: ELMEqual, library: ELM): EqualsFilter | UnknownFilter {
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

/**
 * Parses an `IncludedIn` clause to a simpler filter representation. Currently handles comparisons to the
 * "Measurement Period" parameter.
 *
 * @param includedIn IncludedId expression to be parsed.
 * @param library The library the expression resides in.
 * @param parameters The original parameters used for calculation.
 * @returns Filter representation of the IncludedIn clause.
 */
export function interpretIncludedIn(
  includedIn: ELMIncludedIn,
  library: ELM,
  parameters: any
): DuringFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (includedIn.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(includedIn.operand[0] as ELMFunctionRef, library);
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
    const valuePeriod: { start?: string; end?: string } = {};
    // If this parameter is known and is an interval we can use it
    if (parameters[paramName] && parameters[paramName].isInterval) {
      valuePeriod.start = (parameters[paramName] as cql.Interval).start().toString().replace('+00:00', 'Z');
      valuePeriod.end = (parameters[paramName] as cql.Interval).end().toString().replace('+00:00', 'Z');
    } else {
      console.warn(`could not find parameter "${paramName}" or it was not an interval.`);
      return { type: 'unknown', alias: propRef.scope, attribute: propRef.path };
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

/**
 * Parses a `in` expression. This may seen in CQL as 'during'. This can handle two situations.
 *  - A value, such as a code, is checked to be if it's in a list of literals. ex. status in { 'complete', 'amended' }
 *  - A time value is being checked if it is during a calculated interval. Usually based on "Measurement Period".
 *
 * @param inExpr The `in` expression to parse.
 * @param library The library the expression resides in.
 * @param parameters The parameters used for calculation.
 * @returns Filter representation of the In clause.
 */
export function interpretIn(inExpr: ELMIn, library: ELM, parameters: any): InFilter | DuringFilter | UnknownFilter {
  let propRef: ELMProperty | null = null;
  if (inExpr.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(inExpr.operand[0] as ELMFunctionRef, library);
  } else if (inExpr.operand[0].type == 'Property') {
    propRef = inExpr.operand[0] as ELMProperty;
  } else if (inExpr.operand[0].type == 'End' || inExpr.operand[0].type == 'Start') {
    const startOrEnd = inExpr.operand[0] as ELMUnaryExpression;
    const suffix = startOrEnd.type === 'End' ? '.end' : '.start';
    if (startOrEnd.operand.type == 'FunctionRef') {
      propRef = interpretFunctionRef(startOrEnd.operand as ELMFunctionRef, library);
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
      `could not resolve property ref for In:${inExpr.localId}. first operand is a ${inExpr.operand[0].type}`
    );

    const foundPropUsage = findPropertyUsage(inExpr, inExpr.localId);
    if (foundPropUsage) {
      console.warn(`  found property ref "${foundPropUsage.alias}.${foundPropUsage.attribute}" in first operand.`);
      return foundPropUsage;
    }

    return { type: 'unknown' };
  }

  if (inExpr.operand[1].type == 'List') {
    if (propRef.scope) {
      return {
        type: 'in',
        alias: propRef.scope,
        attribute: propRef.path,
        valueList: (inExpr.operand[1] as ELMList).element.map(item => item.value) as (string | number)[],
        localId: inExpr.localId
      };
    } else {
      console.warn('Could not find scope for property reference');
      return { type: 'unknown' };
    }
  } else if (inExpr.operand[1].type == 'Interval') {
    // execute the interval creation elm.
    const period = executeIntervalELM(inExpr.operand[1] as ELMInterval, library, parameters);
    if (period == null) {
      return {
        type: 'unknown',
        localId: inExpr.localId,
        alias: propRef.scope,
        attribute: propRef.path
      };
    } else if (propRef.scope) {
      return {
        type: 'during',
        alias: propRef.scope,
        attribute: propRef.path,
        valuePeriod: period
      };
    } else {
      console.warn('could not resolve property scope');
    }
  } else {
    console.warn('could not resolve In operand[1] ' + inExpr.operand[1].type);
  }
  return { type: 'unknown' };
}

/**
 * Calculates an ELM expression that creates a CQL Interval using the cql-execution engine.
 * This is used to create the periods that are based on the "Measurement Period".
 *
 * @param intervalExpr ELM Interval Expression to execute.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @param parameters The execution parameters.
 * @returns A FHIR Period like structure with start and end of the calculated interval.
 */
export function executeIntervalELM(
  intervalExpr: ELMInterval,
  library: ELM,
  parameters: any
): {
  start?: string;
  end?: string;
  interval?: cql.Interval;
} | null {
  // make sure the interval created based on property usage from the query source
  const propRefInInterval = findPropertyUsage(intervalExpr, undefined);
  if (propRefInInterval) {
    console.warn('cannot handle intervals constructed on query data right now');
    return null;
  }

  // build an expression that has the interval creation and
  const intervalExecExpr = new cql.Expression({ operand: intervalExpr });
  const ctx = new cql.PatientContext(new cql.Library(library), null, null, parameters);
  const interval: cql.Interval = intervalExecExpr.arg.execute(ctx);
  if (interval != null && interval.start() != null && interval.end() != null) {
    return {
      start: interval.start().toString().replace('+00:00', 'Z'),
      end: interval.end().toString().replace('+00:00', 'Z'),
      interval
    };
  } else {
    return null;
  }
}

/* Interface to aid in parsing when we know "CalendarAgeInYearsAt" is the referenced function */
interface CalendarAgeInYearsAtRef extends ELMFunctionRef {
  name: 'CalendarAgeInYearsAt';
  libraryName: 'Global';
  operand: [CalendarAgeInYearsDateTime, ELMFunctionRef | ELMProperty | ELMStart | ELMEnd];
}

/* Interface to aid in parsing when we know "CalendarAgeInYearsAt" is the referenced function. This is for the first operand. */
interface CalendarAgeInYearsDateTime extends ELMToDateTime {
  operand: ELMFunctionRef;
}

/**
 * Parses a `GreaterOrEqual` expression. This can handle one situation at the moment.
 *  - A time on a source attribute is expected to happen after the patient's Nth birthDate.
 *     ex: Global."CalendarAgeInYearsAt"(FHIRHelpers.ToDate(Patient.birthDate), start of Global."Normalize Interval"(HPVTest.effective)) >= 30
 *
 * @param greaterOrEqualExpr The GreaterOrEqual expression to interpret.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @param parameters The execution parameters.
 * @param patient The patient we are executing for. This is where the birthDate is fetched if referenced.
 * @returns Filter representation of the GreaterOrEqual clause. This will be Unknown or During depending on if it can be parsed or not.
 */
export function interpretGreaterOrEqual(
  greaterOrEqualExpr: ELMGreaterOrEqual,
  library: ELM,
  parameters: any,
  patient: R4.IPatient
): AnyFilter {
  // look at first param if it is function ref to calendar age in years at.
  if (greaterOrEqualExpr.operand[0].type === 'FunctionRef') {
    const functionRef = greaterOrEqualExpr.operand[0] as ELMFunctionRef;
    // Check if it is "Global.CalendarAgeInYearsAt"
    if (functionRef.name === 'CalendarAgeInYearsAt' && functionRef.libraryName === 'Global') {
      const calAgeRef = functionRef as CalendarAgeInYearsAtRef;
      // ensure the first operand is the patient birthdate.
      if (
        calAgeRef.operand[0].type === 'ToDateTime' &&
        calAgeRef.operand[0].operand.type === 'FunctionRef' &&
        calAgeRef.operand[0].operand.name === 'ToDate' &&
        calAgeRef.operand[0].operand.operand[0].type === 'Property' &&
        (calAgeRef.operand[0].operand.operand[0] as ELMProperty).path === 'birthDate'
      ) {
        // figure out what the attribute on the property is
        const attrExpr = calAgeRef.operand[1];
        let propRef: ELMProperty | null = null;
        if (attrExpr.type === 'FunctionRef') {
          propRef = interpretFunctionRef(attrExpr as ELMFunctionRef, library);
        } else if (attrExpr.type === 'Property') {
          propRef = attrExpr;
        } else if (attrExpr.type === 'Start' || attrExpr.type === 'End') {
          const suffix = attrExpr.type === 'End' ? '.end' : '.start';
          if (attrExpr.operand.type == 'FunctionRef') {
            propRef = interpretFunctionRef(attrExpr.operand as ELMFunctionRef, library);
          } else if (attrExpr.operand.type == 'Property') {
            propRef = attrExpr.operand as ELMProperty;
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

        // if propRef is defined that means we found the attribute on the source resource
        if (propRef == null) {
          console.warn('Could not resolve the property referenced in CalendarAgeInYearsAt');
          return { type: 'unknown' };
        }

        // If the second operand in the GreaterOrEqual expression is a literal then we can move forward using the literal
        // as the number of years to add to the birthDate.
        if (greaterOrEqualExpr.operand[1].type === 'Literal') {
          const years = (greaterOrEqualExpr.operand[1] as ELMLiteral).value as number;
          if (patient.birthDate) {
            // parse birthDate into cql-execution DateTime. and wipe out hours, minutes, seconds, and miliseconds. Then add
            // the number of years.
            const birthDate = cql.DateTime.parse(patient.birthDate);
            birthDate.hour = 0;
            birthDate.minute = 0;
            birthDate.second = 0;
            birthDate.millisecond = 0;
            birthDate.timezoneOffset = 0;
            const birthDateOffset = birthDate.add(years, cql.DateTime.Unit.YEAR);
            // create an interval with this offset as the start and no end date.
            const period = {
              start: birthDateOffset.toString().replace('+00:00', 'Z'),
              interval: new cql.Interval(birthDateOffset, null, true, false)
            };
            // build the DuringFilter to return.
            return {
              type: 'during',
              alias: propRef.scope as string,
              attribute: propRef.path,
              valuePeriod: period,
              localId: greaterOrEqualExpr.localId,
              notes: `Compares against the patient's birthDate (${years} years)`
            };
          } else {
            console.warn('Patient data had no birthDate');
            return {
              type: 'unknown',
              alias: propRef.scope,
              attribute: propRef.path,
              localId: greaterOrEqualExpr.localId,
              notes: "Compares against the patient's birthDate. But patient did not have birthDate."
            };
          }
        }
      }
    } else {
      // If the function referenced is not "CalendarAgeInYearsAt".
      return { type: 'unknown' };
    }
  }

  // Fallback if the first operand cannot be parsed or parsing falls through.
  return { type: 'unknown' };
}
