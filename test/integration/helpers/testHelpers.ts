import { readFileSync } from 'fs';

/**
 * Retrieves JSON fixture from the integration directory for easier ts casting in test files
 */
export function getJSONFixture(path: string): any {
  return JSON.parse(readFileSync(`test/integration/${path}`).toString());
}
