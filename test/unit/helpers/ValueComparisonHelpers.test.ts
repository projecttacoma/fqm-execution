import { compareValues } from '../../../src/helpers/ValueComparisonHelpers';

describe('ValueComparisonHelpers', () => {
  describe('compareValues', () => {
    it('should return true for "ge" and "gt" values', () => {
      expect(compareValues(2.0, 1, 'ge')).toBe(true);
      expect(compareValues(2.0, 1, 'gt')).toBe(true);
      expect(compareValues(2.0, 2.0, 'ge')).toBe(true);
    });

    it('should return false for non "ge" and "gt" values', () => {
      expect(compareValues(1, 2.0, 'ge')).toBe(false);
      expect(compareValues(1, 2.0, 'gt')).toBe(false);
    });

    it('should return true for "le" and "lt" values', () => {
      expect(compareValues(1, 2.0, 'le')).toBe(true);
      expect(compareValues(2.0, 2.0, 'le')).toBe(true);
      expect(compareValues(1, 2.0, 'lt')).toBe(true);
    });

    it('should return false for non "le" and "lt" values', () => {
      expect(compareValues(2.0, 1, 'le')).toBe(false);
      expect(compareValues(2.0, 1, 'le')).toBe(false);
    });

    it('should return true for "eq" values', () => {
      expect(compareValues(2.0, 2.0, 'eq')).toBe(true);
    });

    it('should return false for non "eq" values', () => {
      expect(compareValues(2.0, 1, 'eq')).toBe(false);
    });

    it('should throw error for unsupported comparator', () => {
      expect(() => compareValues(2.0, 1, 'sa')).toThrow('Unsupported comparator "sa" when comparing values');
    });
  });
});
