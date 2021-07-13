import { R4 } from '@ahryman40k/ts-fhir-types';
import { DataTypeQuery } from '../types/Calculator';
import {
  EqualsFilter,
  InFilter,
  DuringFilter,
  AndFilter,
  AnyFilter,
  Filter,
  NotNullFilter
} from '../types/QueryFilterTypes';
import { GapsDataTypeQuery } from '../types/Calculator';
import { ICoding } from '@ahryman40k/ts-fhir-types/lib/R4';
import { equal } from 'assert';


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
export function generateDetailedCodeFilter(filter: EqualsFilter | InFilter, dataType: string): R4.IDataRequirement_CodeFilter | null {


  const codeLookup = (dataType: string, attribute: string): (string | undefined) => {

    const validDataTypes : string[] = ["Observation", "Procedure", "Encounter", "MedicationRequest"];
    
    if (!(validDataTypes.includes(dataType))) {
      return undefined;
    }

    else if (dataType === "Observation" && attribute === "status") {
      return "http://hl7.org/fhir/observation-status";
    }
    
    else if (dataType === "Procedure" && attribute === "status") {
      return "http://hl7.org/fhir/event-status";
    }

    else if (dataType === "Encounter" && attribute === "status") {
      return 'http://hl7.org/fhir/encounter-status';
    }

    else if (dataType === 'MedicationRequest'){
      
      switch(attribute){
        case 'status':
          return "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
          
        case 'intent':
          return "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
            
        case 'priority':
          return "http://hl7.org/fhir/request-priority";
          
        default:
          return undefined;
      }
    }
    return undefined;
    
  }
  let system : string | undefined = codeLookup(dataType, filter.attribute);
  if (filter.type === 'equals') {
    const equalsFilter = filter as EqualsFilter;
    if (typeof equalsFilter.value === 'string'){
      // console.log(`dataType: ${dataType}`);
      // console.log(`attribute: ${equalsFilter.attribute}`);
      // console.log(`code lookup: ${codeLookup(dataType, equalsFilter.attribute)}`);
      // console.log(codeLookup("MedicationRequest", "status"));
      // console.log(codeLookup("MedicationRequest", "intent"));
      // console.log(codeLookup("MedicationRequest", "priority"));
      // console.log(codeLookup("MedicationRequest", "nonsense"));
      // console.log(codeLookup("Encounter", "status"));
      // console.log(codeLookup("Encounter", "nothing"));
      // console.log(codeLookup("Observation", "status"));
      // console.log(codeLookup("Observation", "nothing"));
      // console.log(codeLookup("Procedure", "nothing"));

      return {
        path: equalsFilter.attribute,
        code: [{ 
          code: equalsFilter.value,
          system: system
         }]
      };
    }
  } else if (filter.type === 'in') {
    const inFilter = filter as InFilter;

    if (inFilter.valueList?.every(v => typeof v === 'string')) {
      return {
        path: inFilter.attribute,
        code: inFilter.valueList.map(v => ({
          code: v as string,
          system: system
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
export function generateDetailedDateFilter(filter: DuringFilter): R4.IDataRequirement_DateFilter {
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
export function generateDetailedValueFilter(filter: Filter): R4.IExtension | null {
  if (filter.type === 'notnull') {
    const notnullFilter = filter as NotNullFilter;
    return {
      url: 'http://example.com/dr-value',
      extension: [
        { url: 'dr-value-attribute', valueString: notnullFilter.attribute },
        { url: 'dr-value-filter', valueString: 'not null' }
      ]
    };
  } else {
    console.error(`Detailed value filter is not yet supported for filter type ${filter.type}`);
    return null;
  }
}

/**
 * Given a DataTypeQuery object, create a DataRequirement object that represents the data
 * that would be requested from a FHIR server for that query.
 * Currently supports
 * @param retrieve a DataTypeQuery that represents a retrieve for a FHIR Resource with certain attributes
 * @returns R4.IDataRequirement with as much attribute data as we can add
 */
export function generateDataRequirement(retrieve: DataTypeQuery): R4.IDataRequirement {
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
          code: [retrieve.code as R4.ICoding]
        }
      ]
    };
  } else {
    return {
      type: retrieve.dataType
    };
  }
}
