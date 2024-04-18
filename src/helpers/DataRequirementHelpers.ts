import { Extension } from 'fhir/r4';
import { CalculationOptions, DataTypeQuery, DRCalculationOutput, ExpressionStackEntry } from '../types/Calculator';
import { GracefulError } from '../types/errors/GracefulError';
import { EqualsFilter, InFilter, DuringFilter, codeFilterQuery, AttributeFilter } from '../types/QueryFilterTypes';
import { PatientParameters } from '../compartment-definition/PatientParameters';
import { SearchParameters } from '../compartment-definition/SearchParameters';
import {
  AnyELMExpression,
  ELM,
  ELMAliasedQuerySource,
  ELMIdentifier,
  ELMLast,
  ELMProperty,
  ELMQuery,
  ELMStatement
} from '../types/ELMTypes';
import { ExtractedLibrary } from '../types/CQLTypes';
import * as Execution from '../execution/Execution';
import { UnexpectedResource } from '../types/errors/CustomErrors';
import {
  flattenFilters,
  generateDetailedCodeFilter,
  generateDetailedDateFilter,
  generateDetailedValueFilter,
  parseQueryInfo
} from './elm/QueryFilterParser';
import * as RetrievesHelper from './elm/RetrievesHelper';
import { uniqBy, isEqual } from 'lodash';
import { DateTime, Interval } from 'cql-execution';
import { parseTimeStringAsUTC } from '../execution/ValueSetHelper';
import * as MeasureBundleHelpers from './MeasureBundleHelpers';
import { findLibraryReference } from './elm/ELMDependencyHelpers';
import { findClauseInExpression, findClauseInLibrary, findNamedClausesInExpression } from './elm/ELMHelpers';
const FHIR_QUERY_PATTERN_URL = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-fhirQueryPattern';

/**
 * Returns a FHIR library containing data requirements, given a root library
 */
export async function getDataRequirements(
  cqls: ExtractedLibrary[],
  rootLibIdentifier: ELMIdentifier,
  elmJSONs: ELM[],
  options: CalculationOptions = {},
  effectivePeriod?: fhir4.Period
): Promise<DRCalculationOutput> {
  const rootLib = elmJSONs.find(ej => ej.library.identifier == rootLibIdentifier);

  // We need a root library to run dataRequirements properly. If we don't have one, error out.
  if (!rootLib?.library) {
    throw new UnexpectedResource("root library doesn't contain a library object");
  }
  const parameters = extractDataRequirementsMeasurementPeriod(options, effectivePeriod);

  const withErrors: GracefulError[] = [];
  // get the retrieves for every statement in the root library
  const allRetrieves = rootLib.library.statements.def.flatMap(statement => {
    if (statement.expression && statement.name != 'Patient') {
      const retrievesOutput = RetrievesHelper.findRetrieves(rootLib, elmJSONs, statement.expression);
      withErrors.push(...retrievesOutput.withErrors);
      return retrievesOutput.results;
    } else {
      return [] as DataTypeQuery[];
    }
  });

  const allRetrievesPromises = allRetrieves.map(async retrieve => {
    // If the retrieves have a localId for the query and a known library name, we can get more info
    // on how the query filters the sources.
    if (retrieve.queryLocalId && retrieve.queryLibraryName && parameters['Measurement Period']) {
      const library = elmJSONs.find(lib => lib.library.identifier.id === retrieve.queryLibraryName);
      if (library) {
        retrieve.queryInfo = await parseQueryInfo(
          library,
          elmJSONs,
          retrieve.queryLocalId,
          retrieve.valueComparisonLocalId,
          parameters
        );
      }
    }
  });

  await Promise.all(allRetrievesPromises);

  // add main code path as a mustSupport
  allRetrieves.forEach(retrieve => {
    if (retrieve.path) {
      if (retrieve.mustSupport) {
        retrieve.mustSupport?.push(retrieve.path);
      } else {
        retrieve.mustSupport = [retrieve.path];
      }
    }
  });
  // add property must supports
  rootLib.library.statements.def.forEach(statement => {
    if (statement.expression && statement.name != 'Patient') {
      addMustSupport(allRetrieves, statement, rootLib, elmJSONs);
    }
  });

  const results: fhir4.Library = {
    resourceType: 'Library',
    type: { coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }] },
    status: 'unknown'
  };
  // TODO: combine must supports if there are data requirements from the same retrieve that have different mustSupports
  // combine based on resourcetype/primary code path
  // allRetrieves[0].templateId
  // allRetrieves[0].dataType
  // allRetrieves[0].path
  // allRetrieves[0].code or allRetrieves[0].valueSet
  // ^if these 4 things are the same, then it is the same data requirement and we can combine mustSupports

  results.dataRequirement = uniqBy(
    allRetrieves.map(retrieve => {
      const dr = generateDataRequirement(retrieve);
      addFiltersToDataRequirement(retrieve, dr, withErrors);
      addFhirQueryPatternToDataRequirements(dr);
      dr.mustSupport = retrieve.mustSupport;
      return dr;
    }),
    JSON.stringify
  );

  return {
    results: results,
    debugOutput: {
      cql: cqls,
      elm: elmJSONs,
      gaps: {
        retrieves: allRetrieves
      }
    },
    withErrors
  };
}

/**
 * Creates query string for the data requirement using either the code filter code or valueSet and
 * the specified endpoint, and adds a fhirQueryPattern extension to the data requirement that
 * contains the query string.
 * @param dataRequirement  Data requirement to add FHIR Query Pattern to
 */
export function addFhirQueryPatternToDataRequirements(dataRequirement: fhir4.DataRequirement) {
  const query: codeFilterQuery = createQueryFromCodeFilter(dataRequirement.codeFilter, dataRequirement.type);

  // Configure query string from query object
  let queryString = `/${query.endpoint}?`;
  for (const [key, value] of Object.entries(query.params)) {
    queryString = queryString.concat(`${key}=${value}&`);
  }

  if (dataRequirement.dateFilter) {
    dataRequirement.dateFilter.forEach(dateFilter => {
      let path = dateFilter.path || '';
      // remove period path pieces
      // NOTE: Currently we are limited in doing period comparisons within our query pattern
      // because search parameters do not allow a use of ".end" or ".start"
      // and prefixes are not sufficient for certain comparisons https://www.hl7.org/fhir/search.html#prefix
      if (path?.endsWith('.end')) {
        path = path.slice(0, -4);
      } else if (path?.endsWith('.start')) {
        path = path.slice(0, -6);
      }
      // add resource type
      path = `${dataRequirement.type}.${path}`;

      // identify search parameters that should be used for the query
      const foundParams = SearchParameters.entry.filter(searchParam => searchParam.resource.expression.includes(path));

      if (foundParams.length === 1) {
        if (dateFilter.valueDateTime) {
          queryString = queryString.concat(`${foundParams[0].resource.code}=${dateFilter.valueDateTime}&`);
        } else if (dateFilter.valuePeriod) {
          if (dateFilter.valuePeriod.start) {
            queryString = queryString.concat(`${foundParams[0].resource.code}=ge${dateFilter.valuePeriod.start}&`);
          }
          if (dateFilter.valuePeriod.end) {
            queryString = queryString.concat(`${foundParams[0].resource.code}=le${dateFilter.valuePeriod.end}&`);
          }
        } else if (dateFilter.valueDuration) {
          queryString = queryString.concat(`${foundParams[0].resource.code}=${dateFilter.valueDuration.value}&`);
        }
      } else if (foundParams.length > 1) {
        // assumed that multiple foundParams matches is an unexpected result
        console.warn(`Unexpected result:  (${foundParams.length}) dateFilter path search parameters found`);
      } else if (foundParams.length == 0) {
        // (or no matches means we ignore this constraint and add nothing to the query)
        console.warn(`Could not identify search parameters using dateFilter path '${path}'`);
      }
    });
  }

  // Create an extension for each way that exists for referencing the patient
  (<any>PatientParameters)[dataRequirement.type]?.forEach((patientContext: string) => {
    const fhirPathExtension: Extension = {
      url: FHIR_QUERY_PATTERN_URL,
      valueString: queryString.concat(`${patientContext}=Patient/{{context.patientId}}`)
    };

    // Add query to data requirement
    if (dataRequirement.extension) {
      dataRequirement.extension.push(fhirPathExtension);
    } else {
      dataRequirement.extension = [fhirPathExtension];
    }
  });
}

/**
 * Parses each element of codeFilter array for either the code or valueSet key, and creates
 * query object containing each code/valueSet and corresponding value.
 * @param codeFilterArray codeFilter array from DataRequirement
 * @param type dataRequirement type
 * @returns query object consisting of an endpoint and params object containing the code/valueSet
 * and value pairs
 */
function createQueryFromCodeFilter(codeFilterArray: fhir4.DataRequirementCodeFilter[] | undefined, type: string) {
  const query: codeFilterQuery = { endpoint: type, params: {} };

  codeFilterArray?.map(codeFilter => {
    // Prefer specific code filter over valueSet
    if (codeFilter?.code) {
      query.params[`${codeFilter.path}`] = codeFilter.code[0].code;
    } else if (codeFilter?.valueSet) {
      query.params[`${codeFilter.path}:in`] = codeFilter.valueSet;
    }
  });

  return query;
}

/**
 * Given a DataTypeQuery object, create a DataRequirement object that represents the data
 * that would be requested from a FHIR server for that query.
 * Currently supports
 * @param retrieve a DataTypeQuery that represents a retrieve for a FHIR Resource with certain attributes
 * @returns fhir4.DataRequirement with as much attribute data as we can add
 */
export function generateDataRequirement(retrieve: DataTypeQuery): fhir4.DataRequirement {
  const dataRequirement: fhir4.DataRequirement = {
    type: retrieve.dataType
  };

  // if the retrieve has a templateId, add it to the profile attribute on the data requirement
  if (retrieve.templateId) {
    dataRequirement.profile = [retrieve.templateId];
  }

  if (retrieve.valueSet) {
    dataRequirement.codeFilter = [
      {
        path: retrieve.path,
        valueSet: retrieve.valueSet
      }
    ];
  } else if (retrieve.code) {
    dataRequirement.codeFilter = [
      {
        path: retrieve.path,
        code: [retrieve.code as fhir4.Coding]
      }
    ];
  }

  return dataRequirement;
}

/**
 * Extracts the measurement period information from either the options or effective period (in that order depending on presence)
 * and populates a parameters object including the extracted info to be passed into the parseQueryInfo function
 */
export function extractDataRequirementsMeasurementPeriod(options: CalculationOptions, effectivePeriod?: fhir4.Period) {
  if (!hasMeasurementPeriodInfo(options, effectivePeriod)) {
    return {};
  }
  const parameters: Record<string, Interval> = {};

  if (options.measurementPeriodStart || options.measurementPeriodEnd) {
    parameters['Measurement Period'] = createIntervalFromEndpoints(
      options.measurementPeriodStart,
      options.measurementPeriodEnd
    );
  } else {
    parameters['Measurement Period'] = createIntervalFromEndpoints(effectivePeriod?.start, effectivePeriod?.end);
  }
  return parameters;
}

/**
 * Creates a cql-execution interval from start to end. If either start or end is not present,
 * creates an interval with duration exactly one year using the present endpoint
 */
export function createIntervalFromEndpoints(start?: string, end?: string) {
  let startCql, endCql;
  if (start && end) {
    ({ startCql, endCql } = Execution.getCQLIntervalEndpoints({
      measurementPeriodStart: start,
      measurementPeriodEnd: end
    }));
  } else {
    if (start) {
      startCql = parseTimeStringAsUTC(start);
      endCql = new Date(startCql);
      endCql.setFullYear(startCql.getFullYear() + 1);
    } else if (end) {
      endCql = parseTimeStringAsUTC(end);
      startCql = new Date(endCql);
      startCql.setFullYear(endCql.getFullYear() - 1);
    }
    startCql = DateTime.fromJSDate(startCql, 0);
    endCql = DateTime.fromJSDate(endCql, 0);
  }
  return new Interval(startCql, endCql);
}

function hasMeasurementPeriodInfo(options: CalculationOptions, effectivePeriod?: fhir4.Period) {
  return Boolean(
    options.measurementPeriodStart || options.measurementPeriodEnd || effectivePeriod?.start || effectivePeriod?.end
  );
}

/**
 * Get a flattened list of all related artifacts in the measure bundle.
 *
 * @param measureBundle The measure bundle to fetch all RelatedArtifacts from
 * @returns List of flattened related artifacts.
 */
export function getFlattenedRelatedArtifacts(
  measureBundle: fhir4.Bundle,
  rootLibRef?: string
): fhir4.RelatedArtifact[] {
  const relatedArtifacts: fhir4.RelatedArtifact[] = [];

  if (rootLibRef) {
    // if a rootLibIdentifier is defined we should be excluding the measure info
    const { libId: rootLibId, libVersion: rootLibVersion } = MeasureBundleHelpers.parseLibRef(rootLibRef);
    // find the root library resource
    const libraryEntry = measureBundle.entry?.find(entry => {
      if (entry.resource?.resourceType === 'Library') {
        const library = entry.resource as fhir4.Library;
        return (
          (library.url === rootLibId && (!rootLibVersion || library.version === rootLibVersion)) ||
          library.id === rootLibId
        );
      }
    });
    if (libraryEntry?.resource) {
      const library = libraryEntry.resource as fhir4.Library;
      // add the root library itself
      relatedArtifacts.push({
        type: 'depends-on',
        display: library.name ? `Library ${library.name}` : 'Library',
        resource: library.url ?? `Library/${library.id}`
      });
    }
  } else {
    const measure = MeasureBundleHelpers.extractMeasureFromBundle(measureBundle);
    // add the measure itself
    relatedArtifacts.push({
      type: 'depends-on',
      display: measure.name ? `Measure ${measure.name}` : 'Measure',
      resource: measure.url ?? `Measure/${measure.id}`
    });

    // copy over related artifacts from measure
    if (measure.relatedArtifact) {
      relatedArtifacts.push(...measure.relatedArtifact);
    }
  }

  // copy over all related artifacts from all libraries
  const libraries = measureBundle.entry?.filter(entry => entry.resource?.resourceType === 'Library');
  if (libraries) {
    libraries.forEach(libraryEntry => {
      const library = libraryEntry.resource as fhir4.Library;
      if (library.relatedArtifact) {
        relatedArtifacts.push(...library.relatedArtifact);
      }
    });
  }

  // unique the relatedArtifacts
  return uniqBy(relatedArtifacts, JSON.stringify);
}

/**
 *
 * @param q The query which contains the filters to add to the data requirement
 * @param dataRequirement Data requirement to add date filters to
 * @param withErrors Errors object which will eventually be returned to the user if populated
 * @returns void, but populated the dataRequirement filters
 */
export function addFiltersToDataRequirement(
  q: DataTypeQuery,
  dataRequirement: fhir4.DataRequirement,
  withErrors: GracefulError[]
) {
  if (q.queryInfo) {
    const relevantSource = q.queryInfo.sources.find(source => source.resourceType === q.dataType);
    // if a source cannot be found that matches, exit the function
    if (relevantSource) {
      const detailedFilters = flattenFilters(q.queryInfo.filter);

      detailedFilters.forEach(df => {
        // DuringFilter, etc. inherit from attribute filter (and have alias on them)
        if (relevantSource.alias === (df as AttributeFilter).alias) {
          if (df.type === 'equals' || df.type === 'in') {
            const cf = generateDetailedCodeFilter(df as EqualsFilter | InFilter, q.dataType);

            if (cf !== null) {
              if (dataRequirement.codeFilter) {
                dataRequirement.codeFilter.push(cf);
              } else {
                dataRequirement.codeFilter = [cf];
              }
            }
          } else if (df.type === 'during') {
            const dateFilter = generateDetailedDateFilter(df as DuringFilter);
            if (dataRequirement.dateFilter) {
              dataRequirement.dateFilter.push(dateFilter);
            } else {
              dataRequirement.dateFilter = [dateFilter];
            }
          } else {
            const valueFilter = generateDetailedValueFilter(df);
            if (didEncounterDetailedValueFilterErrors(valueFilter)) {
              withErrors.push(valueFilter);
            } else if (valueFilter) {
              if (dataRequirement.extension) {
                dataRequirement.extension.push(valueFilter);
              } else {
                dataRequirement.extension = [valueFilter];
              }
            }
          }
        }
      });
    }
  }
}

function didEncounterDetailedValueFilterErrors(tbd: fhir4.Extension | GracefulError): tbd is GracefulError {
  if ((tbd as GracefulError).message) {
    return true;
  } else {
    return false;
  }
}

// addMustSupport: find any fields as part of this statement.expression,
// then search the allRetrieves for that field's context, and add the field to the correct retrieve's mustSupport
function addMustSupport(allRetrieves: DataTypeQuery[], statement: ELMStatement, rootLib: ELM, allELM: ELM[]) {
  const propertyExpressions = findPropertyExpressions(statement, [], rootLib, allELM);

  propertyExpressions.forEach(prop => {
    // find all matches for this property in allRetrieves
    const retrieveMatches = findRetrieveMatches(prop, allRetrieves, allELM);
    // add mustSupport for each match (if not already included)
    retrieveMatches.forEach(match => {
      if (match.mustSupport) {
        if (!match.mustSupport.includes(prop.property.path)) {
          match.mustSupport.push(prop.property.path);
        }
      } else {
        match.mustSupport = [prop.property.path];
      }
    });
  });
}

export interface PropertyTracker {
  property: ELMProperty;
  stack: ExpressionStackEntry[];
}

/**
 * recurses across all key/values in an ELM tree structure
 * finds values with type 'Property' and assumes they are ELMProperty type objects
 *
 * @param exp the current expression (top node) of the tree to search for Properties
 * @param currentStack stack entries that led to this expression (not including this expression)
 * @param lib library context for this expression
 * @param allLib all elm libraries
 * @returns array of all properties found in this expression's tree
 */
export function findPropertyExpressions(
  exp: object,
  currentStack: ExpressionStackEntry[],
  lib: ELM,
  allLib: ELM[]
): PropertyTracker[] {
  if (typeof exp !== 'object') {
    return [];
  }
  // ... only do this for objects TODO next
  const thisStackEntry: ExpressionStackEntry = {
    type: 'type' in exp && exp.type ? (exp.type as string) : 'unknown',
    localId: 'localId' in exp && exp.localId ? (exp.localId as string) : 'unknown',
    libraryName: lib.library.identifier.id
  };

  if ('type' in exp && exp.type && exp.type === 'Property') {
    // base case found property expression
    const prop = exp as ELMProperty;
    if (prop.source) {
      // add this expression to current stack before recursing on .source
      return [
        { property: prop, stack: currentStack },
        ...findPropertyExpressions(prop.source, currentStack.concat([thisStackEntry]), lib, allLib)
      ];
    } else {
      return [{ property: prop, stack: currentStack }];
    }
  } else if (
    'type' in exp &&
    exp.type &&
    (exp.type === 'FunctionRef' || exp.type === 'ExpressionRef') &&
    'name' in exp &&
    exp.name
  ) {
    // handle references that go to different libraries

    // TODO: do we have to worry about ParameterRef as well?
    let operandProperties: PropertyTracker[] = [];
    if ('operand' in exp && exp.operand) {
      operandProperties = findPropertyExpressions(exp.operand, currentStack.concat([thisStackEntry]), lib, allLib);
      if (operandProperties.length > 0) {
        const idProperty = operandProperties.find(p => p.property.path === 'id');
        if (!idProperty) {
          // if we find the property(s) in the operand, we can short-circuit the search without going to a different library
          // unless it's an "id" property, in which case it may just be a reference finding operation
          return operandProperties;
        }
      }
    }
    let newLib;
    // find new lib if libraryName exists, otherwise use current lib
    if ('libraryName' in exp && exp.libraryName) {
      newLib = findLibraryReference(lib, allLib, exp.libraryName as string);
      if (!newLib) {
        throw new UnexpectedResource(`Cannot Find Referenced Library: ${exp.libraryName}`);
      }
    } else {
      newLib = lib;
    }
    const newExp = findNameinLib(exp.name as string, newLib);
    if (!newExp) {
      // If we can't uniquely identify the reference, warn and explode immediate expression in current library context
      console.warn(
        `Issue with searching for properties within ${exp.name} in library ${lib.library.identifier.id}. Could not identify reference because it is overloaded or doesn't exist.`
      );
      return findPropertyExpressions(Object.values(exp), currentStack.concat([thisStackEntry]), lib, allLib);
    }
    return operandProperties.concat(
      findPropertyExpressions(newExp, currentStack.concat([thisStackEntry]), newLib, allLib)
    );
  } else if (Array.isArray(exp)) {
    return exp.flatMap(elem => findPropertyExpressions(elem, currentStack, lib, allLib));
  } else {
    // non property object, recurse all children values
    return findPropertyExpressions(Object.values(exp), currentStack.concat([thisStackEntry]), lib, allLib);
  }
}

// find the expression in this library that matches the passed name
// if there are issues uniquely identifying one, return null
export function findNameinLib(name: string, lib: ELM): AnyELMExpression | ELMStatement | null {
  // search statements first and return expression
  const namedStatement = lib.library.statements.def.filter(statement => statement.name === name);
  if (namedStatement.length > 0) {
    if (namedStatement.length === 1) {
      return namedStatement[0];
    } else {
      // if multiple come up, then it's overloaded (we can't handle)
      return null;
    }
  }

  // search expressions in statements
  const foundNames = lib.library.statements.def.flatMap(statement =>
    findNamedClausesInExpression(statement.expression, name)
  );
  if (foundNames.length !== 1) {
    // if multiple come up, then it's overloaded (we can't handle). If 0 come up, it's ill-formed.
    return null;
  }
  // TODO: fix statement return (don't want to search annotations)
  return foundNames[0];
}

// search retrieves for any that match this property's stack and alias context
export function findRetrieveMatches(prop: PropertyTracker, retrieves: DataTypeQuery[], allELM: ELM[]): DataTypeQuery[] {
  // basic checks that the property is matchable
  if (prop.property.source) {
    // source must have operandref and name (TODO: check this is true)
    if (prop.property.source.type !== 'OperandRef' || !('name' in prop.property.source) || !prop.property.source.name)
      return [];
  } else {
    // must have either source or scope
    if (!prop.property.scope) return [];
  }

  return retrieves.filter(retrieve => {
    const stackMatch = prop.stack.findLast(ps => {
      // find the last property stack entry that matches any entry in the retrieve stack
      return retrieve.expressionStack?.some(
        rs => isEqual(ps, rs) //test object equality
      );
    });

    if (stackMatch) {
      if (stackMatch?.type === 'Or' || stackMatch?.type === 'And' || stackMatch?.type === 'Exists') {
        return false;
      }
      const matchIdx = prop.stack.findIndex(
        s => s.localId === stackMatch.localId && s.libraryName === stackMatch.libraryName
      );
      if (prop.property.scope) {
        // travel the stack looking for nearest queries (limited by stackMatch)
        const scopedQuery = findStackScopedQuery(prop.stack.slice(matchIdx), prop.property.scope, allELM);

        if (!scopedQuery) return false;
        const { query, position, source } = scopedQuery;
        // if the query is our stackMatch, stop here, otherwise continue with query source
        if (position === 0) {
          // confirm alias matches scope (i.e. the retrieve is somewhere within the source expression tree)
          return (
            source &&
            source.expression.localId &&
            !!retrieve.expressionStack?.find(st => st.localId === source.expression.localId)
          );
        }
        if ('name' in source.expression && source.expression.name) {
          return checkStackFunctionDefs(
            prop.stack.slice(matchIdx, matchIdx + position),
            source.expression.name,
            allELM
          );
        }
        return false;
      } else {
        // assume property.source (checked above)
        if (prop.property.source && 'name' in prop.property.source && prop.property.source.name) {
          // slice property stack from stackMatch id to end
          return checkStackFunctionDefs(prop.stack.slice(matchIdx), prop.property.source.name, allELM);
        }
        return false;
      }
    }
    return false;
  });
}

// traverse from end of the stack to find the nearest query that has alias labeled with the passed scope
export function findStackScopedQuery(stack: ExpressionStackEntry[], scope: string, allELM: ELM[]) {
  for (let i = stack.length - 1; i >= 0; i--) {
    // ... should stop if it sees an expression ref
    if (stack[i].type === 'Query') {
      if (stack[i].localId === 'unknown' || stack[i].libraryName === 'unknown') {
        // TODO: how do we handle this case (example AI&F query below localId 180 has no localId)
        continue;
      }
      const queryExpression = expressionFromStackEntry(stack[i], allELM);
      const source = queryExpression.source.find(s => s.alias === scope);
      if (source) {
        return { query: queryExpression, position: i, source: source };
      }
      const letClause = queryExpression.let?.find(lc => lc.identifier === scope);
      if (letClause) {
        return { query: queryExpression, position: i, source: letClause };
      }
      const relationshipClause = queryExpression.relationship?.find(r => r.alias === scope);
      if (relationshipClause) {
        return { query: queryExpression, position: i, source: relationshipClause };
      }
    }
  }
  return null;
}

// Pull actual expression from stack entry information. Assumes stack entry information exists in libraries (otherwise error)
export function expressionFromStackEntry(stackEntry: ExpressionStackEntry, allELM: ELM[]) {
  const lib = allELM.find(e => e.library.identifier.id === stackEntry.libraryName);
  if (!lib) {
    throw Error(`Could not find library with identifier ${stackEntry.libraryName}`);
  }
  const expression = findClauseInLibrary(lib, stackEntry.localId) as ELMQuery;
  if (!expression) {
    throw Error(
      `Could not find ${stackEntry.type} type expression in ${stackEntry.libraryName} with localId ${stackEntry.localId}`
    );
  }
  return expression;
}

// traverse from end of the stack to check all function definitions use name in operand
// TODO: need to traverse from end in order to change approach partway up, or can we traverse from beginning?
export function checkStackFunctionDefs(stack: ExpressionStackEntry[], name: string, allELM: ELM[]) {
  // return false if no function defs
  if (!stack.find(s => s.type === 'FunctionDef')) return false;

  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].type === 'FunctionDef') {
      const lib = allELM.find(e => e.library.identifier.id === stack[i].libraryName);
      const functionStatement = lib?.library.statements.def.find(s => s.localId === stack[i].localId);
      if (!functionStatement) {
        throw Error(
          `Unable to find function definition statement with localId ${stack[i].localId} in library ${stack[i].libraryName}`
        );
      }
      if (!checkFunctionDefMatch(functionStatement, name)) {
        return false;
      }
    }
  }
  return true;
}

// return true if function def operand matches the passed source name
export function checkFunctionDefMatch(statement: ELMStatement, name: string) {
  if (Array.isArray(statement.operand)) {
    return statement.operand.find(o => 'name' in o && o.name && o.name === name);
  } else {
    return 'name' in statement.operand && statement.operand.name && statement.operand.name === name;
  }
}

// Special case TODO: function ref madness
// Special case TODO 2: expression ref layers (pair and debug cases with Hoss)
// Special case TODO 3: last of... means that matching up the source will require special handling

// ... start making unit tests (cql to elm test data)
// think about what else needs to be tested (i.e. which create function to identify which retrieve is providing the results for an expression ref)
