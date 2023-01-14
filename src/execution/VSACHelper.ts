const VSAC_REGEX = /http:\/\/cts\.nlm\.nih\.gov.*ValueSet/;
const OID_REGEX = /([0-9]+\.)+[0-9]+/;

// Base URL for current version can be found at https://www.nlm.nih.gov/vsac/support/usingvsac/vsacfhirapi.html
export const VSAC_BASE = 'http://cts.nlm.nih.gov/fhir/ValueSet';

export function isVSACUrl(url: string): boolean {
  return VSAC_REGEX.test(url);
}

export function getOIDFromValueSet(url: string): string | null {
  const match = url.match(OID_REGEX);

  if (match !== null) {
    return match[0];
  }

  return null;
}

export function normalizeCanonical(url: string): string | null {
  const oid = getOIDFromValueSet(url);

  if (oid !== null) {
    return `${VSAC_BASE}/${oid}`;
  }

  return null;
}
