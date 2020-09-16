import { R4 } from '@ahryman40k/ts-fhir-types';

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
export function valueSetsForCodeService(valueSetResources: R4.IValueSet[]): any {
  const valueSets: any = {};
  valueSetResources.forEach(valueSet => {
    if (valueSet.compose && valueSet.url) {
      // Grab id for this valueset (should match FHIR ValueSet url)
      const valueSetId = valueSet.url;
      if (!valueSets[valueSetId]) {
        valueSets[valueSetId] = {};
      }

      // Grab ValueSet version. This usually is not used.
      let version = valueSet.version || '';
      if (version === 'N/A') {
        version = '';
      }

      // Create array for valueset members.
      if (!valueSets[valueSetId][version]) {
        valueSets[valueSetId][version] = [];
      }

      // NOTE: This should be using ValueSet.expansion as mentioned above.
      // Iterate over include components and add all concepts
      valueSet.compose.include.forEach(include => {
        include.concept?.forEach(concept => {
          valueSets[valueSetId][version].push({
            code: concept.code,
            system: include.system,
            version: include.version,
            display: concept.display
          });
        });
      });
    } else {
      // TODO: Handle situation when ValueSet does not have url or compose.
    }
  });
  return valueSets;
}
