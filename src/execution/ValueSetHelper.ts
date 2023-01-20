import { CQLCode, ValueSetMap } from '../types/CQLTypes';
import moment from 'moment';
import { UnexpectedProperty, UnexpectedResource } from '../types/errors/CustomErrors';

/**
 * Create the code service valueset database that the cql-execution engine needs.
 *
 * NOTE: This uses the `compose` attribue of the ValueSet to get code. This is incorrect and
 * should be using the `expansion`. But current example measures have ValueSets with compose
 * only.
 *
 * @param valueSetResources FHIR ValueSets.
 * @returns The value set DB structure needed for the cql-execution CodeService.
 */
export function valueSetsForCodeService(valueSetResources: fhir4.ValueSet[]): ValueSetMap {
  const valueSets: ValueSetMap = {};
  let valueSetId: string;
  let version: string;
  valueSetResources.forEach(valueSet => {
    if (valueSet.url) {
      // Grab id for this valueset (should match FHIR ValueSet url)
      valueSetId = valueSet.url;
      if (!valueSets[valueSetId]) {
        valueSets[valueSetId] = {};
      }

      // Grab ValueSet version. This usually is not used.
      version = valueSet.version || '';
      if (version === 'N/A') {
        version = '';
      }

      // Create array for valueset members.
      if (!valueSets[valueSetId][version]) {
        valueSets[valueSetId][version] = [];
      }
    } else {
      // TODO: handle situation where ValueSet does not have URL
    }

    if (valueSet.expansion && valueSet.expansion.contains && valueSet.expansion.contains.length > 0) {
      // Default to using expansion if it exists
      valueSets[valueSetId][version] = getHierarchicalCodes(valueSet.expansion.contains);
    } else if (valueSet.compose) {
      // Only use compose if expansion doesn't exist
      // Iterate over include components and add all concepts
      valueSet.compose.include.forEach(include => {
        include.concept?.forEach(concept => {
          if (concept.code && include.system) {
            valueSets[valueSetId][version].push({
              code: concept.code,
              system: include.system,
              version: include.version,
              display: concept.display
            });
          }
        });
      });
    } else {
      // TODO: Handle situation when ValueSet does not have expansion or compose.
    }
  });
  return valueSets;
}

function getHierarchicalCodes(contains: fhir4.ValueSetExpansionContains[]): CQLCode[] {
  const codes: CQLCode[] = [];
  contains.forEach(contain => {
    if (!contain.abstract && !contain.inactive && contain.code && contain.system) {
      codes.push({
        code: contain.code,
        system: contain.system,
        version: contain.version,
        display: contain.display
      });
    }
    if (contain.contains && contain.contains.length > 0) {
      codes.push(...getHierarchicalCodes(contain.contains));
    }
  });
  return codes;
}

// Create Date from UTC string date and time using momentJS
export function parseTimeStringAsUTC(timeValue: string): Date {
  return moment.utc(timeValue, 'YYYYMDDHHmm').toDate();
}

// Create Date from UTC string date and time using momentJS, shifting to 11:59:59 of the given year
export function parseTimeStringAsUTCConvertingToEndOfYear(timeValue: string): Date {
  return moment.utc(timeValue, 'YYYYMDDHHmm').add(1, 'years').subtract(1, 'seconds').toDate();
}

/**
 * Collates dependent valuesets from a measure by going through all of the measure bundle's libraries' dataCriteria's codeFilters' valueset.
 * Then finds all valuesets that are not already contained in the measure bundle.
 *
 * @param {fhir4.Bundle} measureBundle - A measure bundle object that contains all libraries and valuesets used by the measure
 * @param {fhir4.ValueSet[]} valueSetCache - Cache of existing valueset objects on disk to include in lookup
 * @returns {string[]} An array of all dependent valueset urls in the measure that are used by the measure's libraries but not contained in the measure bundle
 */
export function getMissingDependentValuesets(
  measureBundle: fhir4.Bundle,
  valueSetCache: fhir4.ValueSet[] = []
): string[] {
  if (!measureBundle.entry) {
    throw new UnexpectedResource('Expected measure bundle to contain entries');
  }
  const libraryEntries = measureBundle.entry?.filter(
    e => e.resource?.resourceType === 'Library' && e.resource.dataRequirement
  );

  // create an array of valueset urls
  const vsURLs: string[] = libraryEntries.reduce((acc, lib) => {
    const libraryResource = lib.resource as fhir4.Library;
    if (!libraryResource) {
      throw new UnexpectedResource('Library entry not included in measure bundle');
    } else if (!libraryResource.dataRequirement || !(libraryResource.dataRequirement.length > 0)) {
      throw new UnexpectedProperty(
        'Expected library entry to have resource with dataRequirements that have codeFilters'
      );
    }
    // pull all valueset urls out of this library's dataRequirements
    const libraryVSURL: string[] = libraryResource.dataRequirement.reduce((accumulator, dr) => {
      if (dr.codeFilter && dr.codeFilter.length > 0) {
        // get each valueset url for each codeFilter (if valueset url exists)
        const vs: string[] = dr.codeFilter
          .filter(cf => cf.valueSet)
          .map(cf => {
            return cf.valueSet as string;
          });
        return accumulator.concat(vs);
      } else {
        return accumulator;
      }
    }, [] as string[]);
    return acc.concat(libraryVSURL as string[]);
  }, [] as string[]);

  // unique-ify
  const uniqueVS = vsURLs.filter((value, index, self) => self.indexOf(value) === index);

  // full array of all valueset URLs present across measureBundle and cache
  const existingValueSets = measureBundle.entry
    .filter(e => e.resource?.resourceType === 'ValueSet')
    .map(e => e.resource as fhir4.ValueSet)
    .concat(valueSetCache)
    .map(vs => vs.url as string);

  // filter to any valueset urls that cannot be found
  return uniqueVS.filter(url => {
    return !existingValueSets.includes(url);
  });
}
