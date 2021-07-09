const VSAC_REXEG = /http:\/\/cts\.nlm\.nih\.gov.*ValueSet/;
const OID_REGEX = /([0-9]+\.)+[0-9]+/;

export const VSAC_BASE = 'http://cts.nlm.nih.gov/fhir/r4/ValueSet';

export function isVSACUrl(url: string): boolean {
  return VSAC_REXEG.test(url);
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
