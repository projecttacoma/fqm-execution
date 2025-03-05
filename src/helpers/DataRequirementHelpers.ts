import { Extension } from 'fhir/r4';
import { CalculationOptions, DataTypeQuery, DRCalculationOutput } from '../types/Calculator';
import { GracefulError } from '../types/errors/GracefulError';
import { EqualsFilter, InFilter, DuringFilter, codeFilterQuery, AttributeFilter } from '../types/QueryFilterTypes';
import { patientSearchParameters } from 'fhir-spec-tools/build/data/patient-search-parameters';
import { SearchParameters } from '../compartment-definition/SearchParameters';
import { ELM, ELMIdentifier } from '../types/ELMTypes';
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
import { uniqBy } from 'lodash';
import { DateTime, Interval } from 'cql-execution';
import { parseTimeStringAsUTC } from '../execution/ValueSetHelper';
import * as MeasureBundleHelpers from './MeasureBundleHelpers';
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

  const results: fhir4.Library = {
    resourceType: 'Library',
    type: { coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }] },
    status: 'unknown'
  };
  results.dataRequirement = uniqBy(
    allRetrieves.map(retrieve => {
      const dr = generateDataRequirement(retrieve);
      addFiltersToDataRequirement(retrieve, dr, withErrors);
      addFhirQueryPatternToDataRequirements(dr);
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
  (<any>patientSearchParameters)[dataRequirement.type]?.forEach((patientContext: string) => {
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
