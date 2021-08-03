import { isVSACUrl, getOIDFromValueSet, normalizeCanonical, VSAC_BASE } from '../src/execution/VSACHelper';

describe('VSACHelper', () => {
  describe('isVSACUrl', () => {
    test('vsac url should return true', () => {
      expect(isVSACUrl('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1')).toBe(true);
    });

    test('non vsac url should return false', () => {
      expect(isVSACUrl('http://example.com/ValueSet/1.1.1.1.1')).toBe(false);
    });

    test('vsac url with no ValueSet path should return false', () => {
      expect(isVSACUrl('http://cts.nlm.nih.gov/fhir')).toBe(false);
    });
  });

  describe('getOIDFromValueSet', () => {
    test('vsac url with oid should return the oid', () => {
      expect(getOIDFromValueSet('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1')).toEqual(
        '2.16.840.1.113762.1.4.1'
      );
    });

    test('url with no oid should return null', () => {
      expect(getOIDFromValueSet('http://cts.nlm.nih.gov/fhir')).toBeNull();
    });
  });

  describe('normalizeCanonical', () => {
    test('url should map to defined base', () => {
      expect(normalizeCanonical('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1')).toEqual(
        `${VSAC_BASE}/2.16.840.1.113762.1.4.1`
      );
    });

    test('url with no OID should return null', () => {
      expect(normalizeCanonical('http://cts.nlm.nih.gov/fhir/ValueSet/')).toBeNull();
    });
  });
});
