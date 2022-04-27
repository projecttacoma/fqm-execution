import { ValueFilterComparator } from '../types/QueryFilterTypes';

/**
 * Computes truthiness of value comparisons obtained from value filter
 */
export function compareValues(actualValue: number, desiredValue: number, comparator: ValueFilterComparator) {
  switch (comparator) {
    case 'ge':
      return actualValue >= desiredValue;
    case 'gt':
      return actualValue > desiredValue;
    case 'le':
      return actualValue <= desiredValue;
    case 'lt':
      return actualValue < desiredValue;
    case 'eq':
      return actualValue === desiredValue;
    default:
      throw new Error(`Unsupported comparator "${comparator}" when comparing values`);
  }
}
