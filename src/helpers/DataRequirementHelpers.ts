import { Extension } from 'fhir/r4';
import { DataTypeQuery } from '../types/Calculator';
import { GracefulError } from '../types/errors/GracefulError';
import {
  EqualsFilter,
  InFilter,
  DuringFilter,
  AndFilter,
  AnyFilter,
  Filter,
  NotNullFilter,
  codeFilterQuery,
  ValueFilter,
  IsNullFilter
} from '../types/QueryFilterTypes';
import { PatientReferences } from '../compartment-definition/PatientReferences';
import { PatientParameters } from '../compartment-definition/PatientParameters';

const FHIR_QUERY_PATTERN_URL = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-fhirQueryPattern';

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

  // TODO: We should change this from hardcoding the parameter as date=... to looking up the proper search parameter
  // Add on date filters
  if (dataRequirement.dateFilter && dataRequirement.dateFilter[0].valuePeriod) {
    if (dataRequirement.dateFilter[0].valuePeriod.start) {
      queryString = queryString.concat(`date=ge${dataRequirement.dateFilter[0].valuePeriod.start}&`);
    }
    if (dataRequirement.dateFilter[0].valuePeriod.end) {
      queryString = queryString.concat(`date=le${dataRequirement.dateFilter[0].valuePeriod.end}&`);
    }
  }

  // Create an extension for each way that exists for referencing the patient
  (<any>PatientParameters)[dataRequirement.type].forEach((patientContext: string) => {
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
  if (retrieve.valueSet) {
    return {
      type: retrieve.dataType,
      codeFilter: [
        {
          path: retrieve.path,
          valueSet: retrieve.valueSet
        }
      ]
    };
  } else if (retrieve.code) {
    return {
      type: retrieve.dataType,
      codeFilter: [
        {
          path: retrieve.path,
          code: [retrieve.code as fhir4.Coding]
        }
      ]
    };
  } else {
    return {
      type: retrieve.dataType
    };
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
