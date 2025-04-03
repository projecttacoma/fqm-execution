import {
  Interval,
  Expression,
  PatientContext,
  Library,
  DateTime,
  NamedTypeSpecifier,
  ListTypeSpecifier
} from 'cql-execution';
import { CQLPatient } from '../../types/CQLPatient';
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
  ELMExpressionRef,
  ELMGreater,
  ELMQuantity,
  ELMComparator,
  ELMLess,
  ELMLessOrEqual,
  ELMRatio,
  ELMAliasRef
} from '../../types/ELMTypes';
import {
  AndFilter,
  AnyFilter,
  AttributeFilter,
  ParsedFilterInterval,
  DuringFilter,
  EqualsFilter,
  InFilter,
  NotNullFilter,
  OrFilter,
  QueryInfo,
  SourceInfo,
  TautologyFilter,
  UnknownFilter,
  ValueFilter,
  ValueFilterComparator,
  IsNullFilter,
  QueryParserParams,
  Filter
} from '../../types/QueryFilterTypes';
import { findLibraryReference, findLibraryReferenceId } from './ELMDependencyHelpers';
import { findClauseInLibrary } from './ELMHelpers';
import { GracefulError, isOfTypeGracefulError } from '../../types/errors/GracefulError';
import { UnexpectedResource } from '../../types/errors/CustomErrors';

/**
 * Parse information about a query. This pulls out information about all sources in the query and attempts to parse
 * how the query is filtered.
 *
 * @param library The library ELM the query resides in.
 * @param allELM An array of all the ELM libraries accessible to fqm-execution (includes library from library param)
 * @param queryLocalId The localId for the query we want to get information on.
 * @param valueComparisonLocalId The localId for the initial expression that contained a comparator. Used for tracking
 *                               which clause is the "source" of the comparator in the case of nested expressions outside
 *                                of where statements.
 * @param parameters The parameters used for calculation so they could be reused for re-calculating small bits for CQL.
 *                    "Measurement Period" is the only supported parameter at the moment as it is the only parameter
 *                    seen in eCQMs.
 * @param patient The patient resource being calculated for.
 * @returns Information about the query and how it is filtered.
 */
export async function parseQueryInfo(
  library: ELM,
  allELM: ELM[],
  queryLocalId?: string,
  valueComparisonLocalId?: string,
  parameters: QueryParserParams = {},
  patient?: CQLPatient
): Promise<QueryInfo> {
  if (!queryLocalId) {
    throw new Error('QueryLocalId was not provided');
  }
  const expression = findClauseInLibrary(library, queryLocalId);
  if (expression?.type == 'Query') {
    const query = expression as ELMQuery;
    const queryInfo: QueryInfo = {
      localId: query?.localId,
      sources: parseSources(query),
      filter: { type: 'truth' },
      libraryName: library.library.identifier.id
    };

    if (query.where) {
      const whereInfo = await interpretExpression(query.where, library, parameters, patient);
      queryInfo.filter = whereInfo;
    }
    if (valueComparisonLocalId) {
      const valueExpression = findClauseInLibrary(library, valueComparisonLocalId);
      if (valueExpression) {
        const comparisonInfo = await interpretExpression(valueExpression, library, parameters, patient);
        if (queryInfo.filter) {
          if (queryInfo.filter.type === 'and') {
            (queryInfo.filter as AndFilter).children.push(comparisonInfo);
          } else {
            queryInfo.filter = {
              type: 'and',
              children: [queryInfo.filter, comparisonInfo],
              libraryName: library.library.identifier.id
            };
          }
        } else {
          queryInfo.filter = comparisonInfo;
        }

        queryInfo.fromExternalClause = true;
      }
    }
    // If this query's source is a reference to an expression that is a query (or function acting on a query)
    // then we should parse it and include the filters from it.
    if (query.source[0].expression.type === 'ExpressionRef' || query.source[0].expression.type == 'FunctionRef') {
      const exprRef = query.source[0].expression as ELMExpressionRef | ELMFunctionRef;
      let queryLib: ELM | null = library;
      if (exprRef.libraryName) {
        queryLib = findLibraryReference(library, allELM, exprRef.libraryName);
      }
      if (!queryLib) {
        throw new UnexpectedResource(`Cannot Find Referenced Library: ${exprRef.libraryName}`);
      }
      const statement = queryLib.library.statements.def.find(s => s.name === exprRef.name);
      // if we find the statement and it is a query we can move forward.
      if (statement) {
        if (statement.expression.type === 'Query') {
          const innerQuery = statement.expression as ELMQuery;
          const innerQueryInfo = await parseQueryInfo(
            queryLib,
            allELM,
            innerQuery.localId,
            valueComparisonLocalId,
            parameters,
            patient
          );

          // use first source from inner query (only replaces the first source)
          queryInfo.sources = [...innerQueryInfo.sources.slice(0, 1), ...queryInfo.sources.slice(1)];

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
          const withError: GracefulError = {
            message: `query source referenced a statement that is not a query. ${query.localId} in ${library.library.identifier.id}`
          };
          queryInfo.withError = withError;
        }
      } else {
        const withError: GracefulError = {
          message: `query source referenced a statement that could not be found. ${query.localId} in ${library.library.identifier.id}`
        };
        queryInfo.withError = withError;
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
 * Parse information about the sources in a given query. Treat relationships as sources.
 *
 * @param query The Query to parse. The query source can consist of aliased query sources or relationship clauses.
 * @returns Information about each source. This is usually an array of one, except for when we are working with
 * multi-source queries or relationships.
 */
function parseSources(query: ELMQuery): SourceInfo[] {
  const sources: SourceInfo[] = [];
  const querySources = [...query.source];
  if (query.relationship) {
    querySources.push(...query.relationship);
  }

  querySources.forEach(source => {
    if (source.expression.type == 'Retrieve') {
      const sourceInfo: SourceInfo = {
        sourceLocalId: source.localId,
        retrieveLocalId: source.expression.localId,
        alias: source.alias,
        resourceType: parseDataType(source.expression as ELMRetrieve)
      };
      sources.push(sourceInfo);
      // use the resultTypeSpecifier as a fallback if the expression is not a Retrieve
    } else if (source.expression.resultTypeSpecifier) {
      const sourceInfo: SourceInfo = {
        sourceLocalId: source.localId,
        alias: source.alias,
        resourceType: parseElementType(source.expression)
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
 * Pulls out the resource type of a result type. Used when a source expression type is *not* a
 * Retrieve but the source expression contains a type specified for the result of the expression that
 * we can use to parse the resource type of the query source.
 *
 * @param expression The ELM expression to pull out resource type from.
 * @returns FHIR ResourceType name.
 */
function parseElementType(expression: ELMExpression): string {
  const resultTypeSpecifier = expression.resultTypeSpecifier;
  if (
    resultTypeSpecifier?.type === 'ListTypeSpecifier' &&
    (resultTypeSpecifier as ListTypeSpecifier).elementType.type === 'NamedTypeSpecifier'
  ) {
    const elementType = (resultTypeSpecifier as ListTypeSpecifier).elementType as NamedTypeSpecifier;
    return elementType.name.replace(/^(\{http:\/\/hl7.org\/fhir\})?/, '');
  }
  console.warn(`Resource type cannot be found for ELM Expression with localId ${expression.localId}`);
  return '';
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
export async function interpretExpression(
  expression: ELMExpression,
  library: ELM,
  parameters: any,
  patient?: CQLPatient
): Promise<AnyFilter> {
  let returnFilter: AnyFilter = {
    type: 'unknown',
    localId: expression.localId
  };
  switch (expression.type) {
    case 'Equal':
      returnFilter = interpretEqual(expression as ELMEqual, library);
      break;
    case 'Equivalent':
      returnFilter = interpretEquivalent(expression as ELMEquivalent, library);
      break;
    case 'And':
      returnFilter = await interpretAnd(expression as ELMAnd, library, parameters, patient);
      break;
    case 'Or':
      returnFilter = await interpretOr(expression as ELMOr, library, parameters, patient);
      break;
    case 'IncludedIn':
      returnFilter = interpretIncludedIn(expression as ELMIncludedIn, library, parameters);
      break;
    case 'In':
      returnFilter = await interpretIn(expression as ELMIn, library, parameters);
      break;
    case 'Not':
      returnFilter = interpretNot(expression as ELMNot);
      break;
    case 'IsNull':
      returnFilter = interpretIsNull(expression as ELMIsNull);
      break;
    case 'GreaterOrEqual':
      returnFilter = interpretGreaterOrEqual(expression as ELMGreaterOrEqual, library, patient);
      break;
    case 'Greater':
      returnFilter = interpretGreater(expression as ELMGreater, library);
      break;
    case 'Less':
      returnFilter = interpretLess(expression as ELMLess, library);
      break;
    case 'LessOrEqual':
      returnFilter = interpretLessOrEqual(expression as ELMLessOrEqual, library);
      break;
    default:
      const withError: GracefulError = { message: `Don't know how to parse ${expression.type} expression.` };
      // Look for a property (source attribute) usage in the expression tree. This can denote an
      // attribute on a resource was checked but we don't know what it was checked for.
      const propUsage = findPropertyUsage(expression, expression.localId);

      if (propUsage) {
        returnFilter = propUsage;
      }
      returnFilter.withError = withError;
  }
  // If we cannot make sense of this expression or find a parameter usage in it, then we should return
  // an UnknownFilter to denote something is done here that we could not interpret.

  returnFilter.libraryName = library.library.identifier.id;

  return returnFilter;
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
  } else if (expression.type === 'Interval') {
    const propInfo = findPropertyUsage(expression.low, unknownLocalId);
    if (propInfo) {
      return propInfo;
    }
    return findPropertyUsage(expression.high, unknownLocalId);
  }
  return null;
}

/**
 * Recursively search an ELM expression for usage of a query source alias.
 *
 * @param expression Expression to search for alias use in.
 * @param unknownLocalId The localId of the parent expression that should be identified as the clause we are unable to parse.
 * @returns An `UnknownFilter` describing the attribute that was accessed or null if none was found.
 */
export function findAliasUsage(expression: any, unknownLocalId?: string): UnknownFilter | null {
  if (expression.type === 'AliasRef') {
    const aliasRef = expression as ELMAliasRef;
    return {
      type: 'unknown',
      alias: aliasRef.name,
      localId: unknownLocalId
    };
  } else if (Array.isArray(expression.operand)) {
    for (let i = 0; i < expression.operand.length; i++) {
      const propInfo = findAliasUsage(expression.operand[i], unknownLocalId);
      if (propInfo) {
        return propInfo;
      }
    }
  } else if (expression.operand) {
    return findAliasUsage(expression.operand, unknownLocalId);
  } else if (expression.type === 'Interval') {
    const propInfo = findAliasUsage(expression.low, unknownLocalId);
    if (propInfo) {
      return propInfo;
    }
    return findAliasUsage(expression.high, unknownLocalId);
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
export async function interpretAnd(
  andExpression: ELMAnd,
  library: ELM,
  parameters: any,
  patient?: CQLPatient
): Promise<AndFilter> {
  const andInfo: AndFilter = { type: 'and', children: [] };
  if (andExpression.operand[0].type == 'And') {
    andInfo.children.push(
      ...(await interpretAnd(andExpression.operand[0] as ELMAnd, library, parameters, patient)).children
    );
  } else {
    andInfo.children.push(await interpretExpression(andExpression.operand[0], library, parameters, patient));
  }
  if (andExpression.operand[1].type == 'And') {
    andInfo.children.push(
      ...(await interpretAnd(andExpression.operand[1] as ELMAnd, library, parameters, patient)).children
    );
  } else {
    andInfo.children.push(await interpretExpression(andExpression.operand[1], library, parameters, patient));
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
export async function interpretOr(
  orExpression: ELMOr,
  library: ELM,
  parameters: any,
  patient?: CQLPatient
): Promise<OrFilter> {
  const orInfo: OrFilter = { type: 'or', children: [] };
  if (orExpression.operand[0].type == 'Or') {
    orInfo.children.push(
      ...(await interpretOr(orExpression.operand[0] as ELMOr, library, parameters, patient)).children
    );
  } else {
    orInfo.children.push(await interpretExpression(orExpression.operand[0], library, parameters, patient));
  }
  if (orExpression.operand[1].type == 'Or') {
    orInfo.children.push(
      ...(await interpretOr(orExpression.operand[1] as ELMOr, library, parameters, patient)).children
    );
  } else {
    orInfo.children.push(await interpretExpression(orExpression.operand[1], library, parameters, patient));
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
    // from fhir helpers or MAT Global or fhir common or qicore common
    if (
      libraryId === 'FHIRHelpers' ||
      libraryId === 'MATGlobalCommonFunctions' ||
      libraryId === 'FHIRCommon' ||
      libraryId === 'MATGlobalCommonFunctionsFHIR4' ||
      libraryId === 'QICoreCommon'
    ) {
      switch (functionRef.name) {
        case 'ToString':
        case 'ToConcept':
        case 'ToInterval':
        case 'toInterval':
        case 'ToDateTime':
        case 'Normalize Interval':
        case 'Latest':
        case 'ToQuantity':
          // Act as pass through for all of the above
          if (functionRef.operand[0].type === 'Property') {
            return functionRef.operand[0] as ELMProperty;
          } else if (functionRef.operand[0].type === 'As') {
            const asExp = functionRef.operand[0] as ELMAs;
            if (asExp.operand.type === 'Property') {
              return asExp.operand as ELMProperty;
            }
            // interpret inner function ref
            if (asExp.operand.type === 'FunctionRef') {
              return interpretFunctionRef(asExp.operand as ELMFunctionRef, library);
            }
          }

          break;
        default:
          break;
      }
    } else {
      return {
        message: `do not know how to interpret function ref ${functionRef.libraryName}."${functionRef.name}"`
      } as GracefulError;
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
  const errorInfo = {} as GracefulError;
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
      errorInfo.message = `could not handle 'isNull' inside 'not' for expression type ${isNull.operand.type}`;
    }
  } else {
    errorInfo.message = `could not handle 'not' for expression type ${not.operand.type}`;
  }
  return { type: 'unknown', withError: errorInfo };
}

/**
 * Parses an ELM isNull expression into a filter
 * @param equal The ELM isNull clause to parse.
 * @param library The library the clause resides in.
 * @returns The filter representation.
 */
export function interpretIsNull(isNull: ELMIsNull): IsNullFilter | TautologyFilter | UnknownFilter {
  const errorInfo = {} as GracefulError;
  if (isNull.operand.type === 'Property') {
    const propRef = isNull.operand as ELMProperty;
    // TODO: This alias needs to be re-examined with multi-sourced queries
    return {
      type: 'isnull',
      attribute: propRef.path,
      alias: propRef.scope || '',
      localId: isNull.localId
    };
  } else {
    errorInfo.message = `could not handle 'IsNull' for expression type ${isNull.operand.type}`;
  }
  return { type: 'unknown', withError: errorInfo };
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
  let propRef: ELMProperty | GracefulError | null = null;
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef, library);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    const withError: GracefulError = { message: 'could not resolve property ref for Equivalent' };
    return { type: 'unknown', withError };
  }

  if (isOfTypeGracefulError(propRef)) {
    return { type: 'unknown', withError: propRef };
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
      const withError: GracefulError = { message: 'Property reference scope or literal value were not found.' };
      return { type: 'unknown', withError };
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
      const withError: GracefulError = { message: 'Property reference scope was not found.' };
      return { type: 'unknown', withError };
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
export function getCodesInConcept(name: string, library: ELM): fhir4.Coding[] {
  const concept = library.library.concepts?.def.find(concept => concept.name === name);
  if (concept) {
    const codes: fhir4.Coding[] = [];
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
  let propRef: ELMProperty | GracefulError | null = null;
  let withError: GracefulError = { message: 'An unknown error ocurred.' };
  if (equal.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(equal.operand[0] as ELMFunctionRef, library);
  } else if (equal.operand[0].type == 'Property') {
    propRef = equal.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    withError.message = `could not resolve property ref for Equal:${equal.localId}. first operand is a ${equal.operand[0].type}`;
    return { type: 'unknown', withError };
  }

  if (isOfTypeGracefulError(propRef)) {
    return { type: 'unknown', withError: propRef };
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
    withError = { message: 'could not find attribute or literal for Equal' };
  }
  return { type: 'unknown', withError };
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
  let propRef: ELMProperty | GracefulError | null = null;
  let withError: GracefulError = { message: 'An unknown error occurred' };
  if (includedIn.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(includedIn.operand[0] as ELMFunctionRef, library);
  } else if (includedIn.operand[0].type == 'Property') {
    propRef = includedIn.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    const withError: GracefulError = {
      message: `could not resolve property ref for IncludedIn:${includedIn.localId}. first operand is a ${includedIn.operand[0].type}`
    };
    return { type: 'unknown', withError };
  }

  if (isOfTypeGracefulError(propRef)) {
    return { type: 'unknown', withError: propRef };
  }

  if (includedIn.operand[1].type == 'ParameterRef') {
    const paramName = (includedIn.operand[1] as ELMParameterRef).name;
    const valuePeriod: { start?: string; end?: string } = {};
    // If this parameter is known and is an interval we can use it
    if (parameters[paramName] && parameters[paramName].isInterval) {
      valuePeriod.start = (parameters[paramName] as Interval).start().toString().replace('+00:00', 'Z');
      valuePeriod.end = (parameters[paramName] as Interval).end().toString().replace('+00:00', 'Z');
    } else {
      withError = {
        message: `could not find parameter "${paramName}" or it was not an interval.`
      };
      return { type: 'unknown', alias: propRef.scope, attribute: propRef.path, withError };
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
      withError = { message: 'could not find scope of property ref' };
    }
  } else {
    withError = {
      message: 'could not resolve IncludedIn operand[1] ' + includedIn.operand[1].type
    };
  }
  return { type: 'unknown', withError };
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
export async function interpretIn(
  inExpr: ELMIn,
  library: ELM,
  parameters: any
): Promise<InFilter | DuringFilter | UnknownFilter> {
  let propRef: ELMProperty | GracefulError | null = null;
  let withError: GracefulError = { message: 'An unknown error occurred' };
  if (inExpr.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(inExpr.operand[0] as ELMFunctionRef, library);
  } else if (inExpr.operand[0].type == 'Property') {
    propRef = inExpr.operand[0] as ELMProperty;
    // Extra check for property pass through (i.e. alias.property.value, grab what's inside the .value)
    if (propRef.path === 'value' && !propRef.scope && propRef.source && propRef.source?.type === 'Property') {
      propRef = propRef.source as ELMProperty;
    }
  } else if (inExpr.operand[0].type == 'End' || inExpr.operand[0].type == 'Start') {
    const startOrEnd = inExpr.operand[0] as ELMUnaryExpression;
    const suffix = startOrEnd.type === 'End' ? '.end' : '.start';
    if (startOrEnd.operand.type == 'FunctionRef') {
      propRef = interpretFunctionRef(startOrEnd.operand as ELMFunctionRef, library);
    } else if (startOrEnd.operand.type == 'Property') {
      propRef = startOrEnd.operand as ELMProperty;
    }

    if (propRef && !isOfTypeGracefulError(propRef)) {
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
    withError.message = `could not resolve property ref for In:${inExpr.localId}. first operand is a ${inExpr.operand[0].type}`;

    const foundPropUsage = findPropertyUsage(inExpr, inExpr.localId);
    if (foundPropUsage) {
      withError.message = withError.message.concat(
        '\n',
        `  found property ref "${foundPropUsage.alias}.${foundPropUsage.attribute}" in first operand.`
      );
      return { ...foundPropUsage, withError };
    }

    return { type: 'unknown', withError };
  }
  if (isOfTypeGracefulError(propRef)) {
    return { type: 'unknown', withError: propRef };
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
      withError.message = 'Could not find scope for property reference';
      return { type: 'unknown', withError };
    }
  } else if (inExpr.operand[1].type == 'Interval') {
    // execute the interval creation elm.
    const period = await executeIntervalELM(inExpr.operand[1] as ELMInterval, library, parameters);
    if (isOfTypeGracefulError(period)) {
      return {
        type: 'unknown',
        localId: inExpr.localId,
        alias: propRef.scope,
        attribute: propRef.path,
        withError: period
      };
    } else if (propRef.scope) {
      return {
        type: 'during',
        alias: propRef.scope,
        attribute: propRef.path,
        valuePeriod: period
      };
    } else {
      withError.message = 'could not resolve property scope';
    }
  } else if (inExpr.operand[1].type == 'ParameterRef') {
    // currently handles when the reference exists and is an interval (i.e. Measurement Period)
    const paramName = (inExpr.operand[1] as ELMParameterRef).name;
    const valuePeriod: { start?: string; end?: string } = {};
    // If this parameter is known and is an interval we can use it
    if (parameters[paramName] && parameters[paramName].isInterval) {
      valuePeriod.start = (parameters[paramName] as Interval).start().toString().replace('+00:00', 'Z');
      valuePeriod.end = (parameters[paramName] as Interval).end().toString().replace('+00:00', 'Z');
    } else {
      withError = {
        message: `could not find parameter "${paramName}" or it was not an interval.`
      };
      return { type: 'unknown', alias: propRef.scope, attribute: propRef.path, withError };
    }
    if (propRef.scope) {
      return {
        type: 'during',
        alias: propRef.scope,
        valuePeriod: valuePeriod,
        attribute: propRef.path,
        localId: inExpr.localId
      };
    } else {
      withError = { message: 'could not find scope of property ref' };
    }
  } else {
    withError.message = 'could not resolve In operand[1] ' + inExpr.operand[1].type;
  }
  return { type: 'unknown', withError };
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
export async function executeIntervalELM(
  intervalExpr: ELMInterval,
  library: ELM,
  parameters: any
): Promise<ParsedFilterInterval | GracefulError> {
  // make sure the interval created based on property usage from the query source
  const propRefInInterval = findPropertyUsage(intervalExpr, undefined);
  const aliasRefInInterval = findAliasUsage(intervalExpr, undefined);
  const withError: GracefulError = {
    message: 'An unknown error occurred while calculating CQL intervals based on measurement period'
  };
  if (propRefInInterval || aliasRefInInterval) {
    withError.message = 'Cannot handle intervals constructed on query data right now';
    return withError;
  }

  // build an expression that has the interval creation and
  const intervalExecExpr = new Expression({ operand: intervalExpr });
  const ctx = new PatientContext(new Library(library), null, undefined, parameters);
  try {
    const interval: Interval = await intervalExecExpr.arg?.execute(ctx);
    if (interval != null && interval.start() != null && interval.end() != null) {
      return {
        start: interval.start().toString().replace('+00:00', 'Z'),
        end: interval.end().toString().replace('+00:00', 'Z'),
        interval
      };
    } else {
      return withError;
    }
  } catch (e) {
    withError.message += `\n ${e}`;
    return withError;
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
 * @returns Filter representation of the GreaterOrEqual clause. This will be Unknown, During, or Value depending on if it can be parsed or not.
 */
export function interpretGreaterOrEqual(
  greaterOrEqualExpr: ELMGreaterOrEqual,
  library: ELM,
  patient?: CQLPatient
): AnyFilter {
  // TODO: Consider breaking out a compareBirthdate function and calling it in interpretComparator instead
  // look at first param if it is function ref to calendar age in years at.
  const withError: GracefulError = { message: 'An unknown error occurred while interpreting greater or equal filter' };
  if (greaterOrEqualExpr.operand[0].type === 'FunctionRef') {
    const functionRef = greaterOrEqualExpr.operand[0] as ELMFunctionRef;
    // Check if it is "Global.CalendarAgeInYearsAt"
    if (patient && functionRef.name === 'CalendarAgeInYearsAt' && functionRef.libraryName === 'Global') {
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
        let propRef: ELMProperty | GracefulError | null = null;
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

          if (propRef && !isOfTypeGracefulError(propRef)) {
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
          withError.message = 'Could not resolve the property referenced in CalendarAgeInYearsAt';
          return { type: 'unknown', withError };
        }
        if (isOfTypeGracefulError(propRef)) {
          return { type: 'unknown', withError: propRef };
        }
        // If the second operand in the GreaterOrEqual expression is a literal then we can move forward using the literal
        // as the number of years to add to the birthDate.
        if (greaterOrEqualExpr.operand[1].type === 'Literal') {
          const years = (greaterOrEqualExpr.operand[1] as ELMLiteral).value as number;
          if (patient.birthDate) {
            // Clone patient cql-execution birthDate ensure it is a DateTime then wipe out hours, minutes, seconds,
            // and milliseconds. Then add the number of years.
            const birthDate = patient.birthDate.value.copy().getDateTime() as DateTime;
            birthDate.hour = 0;
            birthDate.minute = 0;
            birthDate.second = 0;
            birthDate.millisecond = 0;
            birthDate.timezoneOffset = 0;
            const birthDateOffset = birthDate.add(years, DateTime.Unit.YEAR);
            // create an interval with this offset as the start and no end date.
            const period = {
              start: birthDateOffset.toString().replace('+00:00', 'Z'),
              interval: new Interval(birthDateOffset, null, true, false)
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
            withError.message = 'Patient data had no birthDate';
            return {
              type: 'unknown',
              alias: propRef.scope,
              attribute: propRef.path,
              localId: greaterOrEqualExpr.localId,
              notes: "Compares against the patient's birthDate. But patient did not have birthDate.",
              withError
            };
          }
        }
      }
      // Fallback if the first operand cannot be parsed or parsing falls through.
      return { type: 'unknown', withError };
    } else {
      // If the function referenced is not "CalendarAgeInYearsAt".
      return interpretComparator(greaterOrEqualExpr, library, 'ge');
    }
  } else {
    return interpretComparator(greaterOrEqualExpr, library, 'ge');
  }
}

/**
 * Parses a `Greater` expression. Currently used as a wrapper for interpretComparator but may become more robust if functionality
 * specific to 'Greater' expressions is needed
 * @param greater The Greater expression to interpret.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @returns Filter representation of the Greater clause. This will be Unknown or Value depending on if it can be parsed or not.
 */
export function interpretGreater(greater: ELMGreater, library: ELM): ValueFilter | UnknownFilter {
  return interpretComparator(greater, library, 'gt');
}

/**
 * Parses a `Less` expression. Currently used as a wrapper for interpretComparator but may become more robust if functionality
 * specific to 'Less' expressions is needed
 * @param less The Less expression to interpret.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @returns Filter representation of the Less clause. This will be Unknown or Value depending on if it can be parsed or not.
 */
export function interpretLess(less: ELMLess, library: ELM): ValueFilter | UnknownFilter {
  return interpretComparator(less, library, 'lt');
}

/**
 * Parses a `LessOrEqual` expression. Currently used as a wrapper for interpretComparator but may become more robust if functionality
 * specific to 'LessOrEqual' expressions is needed
 * @param lessOrEqual The LessOrEqual expression to interpret.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @returns Filter representation of the LessOrEqual clause. This will be Unknown or Value depending on if it can be parsed or not.
 */
export function interpretLessOrEqual(lessOrEqual: ELMLessOrEqual, library: ELM): ValueFilter | UnknownFilter {
  return interpretComparator(lessOrEqual, library, 'le');
}

/**
 * Default code for parsing a miscellaneous comparator expression
 * @param comparatorELM The elm comparator expression to interpret.
 * @param library The library it belongs in. This is needed to identify parameters.
 * @param comparatorString a string determining the type of comparator passed into the function
 * @returns Filter representation of the comparator clause this will be Unknown or Value depending on if it can be parsed or not.
 */
export function interpretComparator(
  comparatorELM: ELMComparator,
  library: ELM,
  comparatorString: ValueFilterComparator
): ValueFilter | UnknownFilter {
  let propRef: ELMProperty | GracefulError | null = null;
  if (comparatorELM.operand[0].type == 'FunctionRef') {
    propRef = interpretFunctionRef(comparatorELM.operand[0] as ELMFunctionRef, library);
  } else if (comparatorELM.operand[0].type == 'Property') {
    propRef = comparatorELM.operand[0] as ELMProperty;
  }

  if (propRef == null) {
    const withError: GracefulError = {
      message: `could not resolve property ref for comparator: ${comparatorELM.type}`
    };
    return { type: 'unknown', withError };
  }

  if (isOfTypeGracefulError(propRef)) {
    return { type: 'unknown', withError: propRef };
  }

  const valueFilter: ValueFilter = {
    type: 'value',
    comparator: comparatorString,
    attribute: propRef.path
  };
  const op = comparatorELM.operand[1];

  switch (op.type) {
    case 'Literal':
      const literal = op as ELMLiteral;
      if (literal.valueType === 'Boolean') {
        valueFilter.valueBoolean = literal.value as boolean;
      } else if (literal.valueType === 'Integer') {
        valueFilter.valueInteger = literal.value as number;
      } else {
        valueFilter.valueString = literal.value as string;
      }
      break;
    case 'Quantity':
      const quantity = op as ELMQuantity;
      valueFilter.valueQuantity = { value: quantity.value, unit: quantity.unit };
      break;
    case 'Ratio':
      const ratio = op as ELMRatio;
      valueFilter.valueRatio = { denominator: ratio.denominator, numerator: ratio.numerator };
      break;
    // TODO: Add handling for ELMRange here
    default:
      const withError: GracefulError = {
        message: `cannot handle unsupported operand type: ${op.type} in comparator: ${comparatorELM.type}`
      };
      return { type: 'unknown', withError };
  }

  if (propRef.scope) {
    valueFilter.alias = propRef.scope;
  }
  return valueFilter;
}

/**
 * Map an EqualsFilter or InFilter into a FHIR DataRequirement codeFilter
 *
 * @param filter the filter to translate
 * @returns codeFilter to be put on the DataRequirement
 */
export function generateDetailedCodeFilter(
  filter: EqualsFilter | InFilter,
  dataType?: string
): fhir4.DataRequirementCodeFilter | null {
  const system: string | null = dataType ? codeLookup(dataType, filter.attribute) : null;
  if (filter.type === 'equals') {
    const equalsFilter = filter as EqualsFilter;
    if (typeof equalsFilter.value === 'string') {
      return {
        path: equalsFilter.attribute,
        code: [
          {
            code: equalsFilter.value,
            ...(system && { system: system })
          }
        ]
      };
    }
  } else if (filter.type === 'in') {
    const inFilter = filter as InFilter;

    if (inFilter.valueList?.every(v => typeof v === 'string')) {
      return {
        path: inFilter.attribute,
        code: inFilter.valueList.map(v => ({
          code: v as string,
          ...(system && { system: system })
        }))
      };
    } else if (filter.valueCodingList) {
      return {
        path: filter.attribute,
        code: filter.valueCodingList
      };
    }
  }

  return null;
}

/**
 * Map a during filter into a FHIR DataRequirement dateFilter
 *
 * @param filter the "during" filter to map
 * @returns dateFilter for the dateFilter list of dataRequirement
 */
export function generateDetailedDateFilter(filter: DuringFilter): fhir4.DataRequirementDateFilter {
  return {
    path: filter.attribute,
    valuePeriod: { start: filter.valuePeriod.start, end: filter.valuePeriod.end }
  };
}

/**
 * Map a filter into a FHIR DataRequirement valueFilter extension
 *
 * @param filter the filter to map
 * @returns extension for the valueFilter list of dataRequirement
 */
export function generateDetailedValueFilter(filter: Filter): fhir4.Extension | GracefulError {
  if (filter.type === 'notnull' || filter.type === 'isnull') {
    const nullFilter = filter as NotNullFilter | IsNullFilter;
    return {
      url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
      extension: [
        { url: 'path', valueString: nullFilter.attribute },
        { url: 'comparator', valueCode: 'eq' },
        { url: 'value', valueString: nullFilter.type === 'notnull' ? 'not null' : 'null' }
      ]
    };
  } else if (filter.type === 'value') {
    const valueFilter = filter as ValueFilter;
    const valueExtension = {
      url: 'value',
      valueBoolean: valueFilter.valueBoolean,
      valueInteger: valueFilter.valueInteger,
      valueString: valueFilter.valueString,
      valueQuantity: valueFilter.valueQuantity,
      valueRange: valueFilter.valueRange,
      valueRatio: valueFilter.valueRatio
    };
    return {
      url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-valueFilter',
      extension: [
        { url: 'path', valueString: valueFilter.attribute },
        { url: 'comparator', valueCode: valueFilter.comparator },
        // Remove undefineds
        JSON.parse(JSON.stringify(valueExtension))
      ]
    };
  } else if (filter?.withError) {
    return filter.withError;
  } else {
    return { message: `Detailed value filter is not yet supported for filter type ${filter.type}` } as GracefulError;
  }
}

/**
 * Given a fhir dataType as a string and an attribute as a string, returns the url which outlines
 * the code system used to define the valid inputs for the given attribute for the given dataType
 * @param dataType
 * @param attribute
 * @returns string url for code system
 */
export function codeLookup(dataType: string, attribute: string): string | null {
  const validDataTypes: string[] = ['Observation', 'Procedure', 'Encounter', 'MedicationRequest'];

  if (!validDataTypes.includes(dataType)) {
    return null;
  } else if (dataType === 'Observation' && attribute === 'status') {
    return 'http://hl7.org/fhir/observation-status';
  } else if (dataType === 'Procedure' && attribute === 'status') {
    return 'http://hl7.org/fhir/event-status';
  } else if (dataType === 'Encounter' && attribute === 'status') {
    return 'http://hl7.org/fhir/encounter-status';
  } else if (dataType === 'MedicationRequest') {
    switch (attribute) {
      case 'status':
        return 'http://hl7.org/fhir/CodeSystem/medicationrequest-status';

      case 'intent':
        return 'http://hl7.org/fhir/CodeSystem/medicationrequest-intent';

      case 'priority':
        return 'http://hl7.org/fhir/request-priority';

      default:
        return null;
    }
  }
  return null;
}

/**
 * Take any nesting of base filters and AND filters and flatten into one list
 *
 * @param filter the root filter to flatten
 * @returns a list of all filters used by this query at one level
 */
export function flattenFilters(filter: AnyFilter): AnyFilter[] {
  if (filter.type !== 'and') {
    return [filter];
  } else {
    const a: AnyFilter[] = [];
    (filter as AndFilter).children.forEach(c => {
      a.push(...flattenFilters(c));
    });

    return a;
  }
}
