import { DataTypeQuery } from '../types/Calculator';
import { GracefulError } from '../types/GracefulError';
import {
  EqualsFilter,
  InFilter,
  DuringFilter,
  AndFilter,
  AnyFilter,
  Filter,
  NotNullFilter
} from '../types/QueryFilterTypes';

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
  if (filter.type === 'notnull') {
    const notnullFilter = filter as NotNullFilter;
    return {
      url: 'http://example.com/dr-value',
      extension: [
        { url: 'dr-value-attribute', valueString: notnullFilter.attribute },
        { url: 'dr-value-filter', valueString: 'not null' }
      ]
    };
  } else if (filter?.withError) {
    return filter.withError;
  } else {
    return { message: `Detailed value filter is not yet supported for filter type ${filter.type}` } as GracefulError;
  }
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
