import { R4 } from '@ahryman40k/ts-fhir-types';
import { EqualsFilter, InFilter, DuringFilter, AndFilter, AnyFilter } from './types/QueryFilterTypes';

// matt was here

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
export function generateDetailedCodeFilter(filter: EqualsFilter | InFilter): R4.IDataRequirement_CodeFilter | null {
  if (filter.type === 'equals') {
    const equalsFilter = filter as EqualsFilter;
    if (typeof equalsFilter.value === 'string')
      return {
        path: equalsFilter.attribute,
        code: [{ code: equalsFilter.value }]
      };
  } else if (filter.type === 'in') {
    const inFilter = filter as InFilter;

    if (inFilter.valueList?.every(v => typeof v === 'string')) {
      return {
        path: inFilter.attribute,
        code: inFilter.valueList.map(v => ({
          code: v as string
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
