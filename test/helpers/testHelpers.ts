import { readFileSync } from 'fs';
import { ELM } from '../../src/types/ELMTypes';

export function getELMFixture(path: string): ELM {
  return JSON.parse(readFileSync(`test/fixtures/${path}`).toString());
}

export function getJSONFixture(path: string): any {
  return JSON.parse(readFileSync(`test/fixtures/${path}`).toString());
}

export function getHTMLFixture(path: string): string {
  return readFileSync(`test/fixtures/html/${path}`, 'utf8');
}
