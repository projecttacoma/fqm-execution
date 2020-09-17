import { ELM } from './types/ELMTypes';
import { ValueSetMap } from 'cql-execution';
import fs = require('fs');

export function dumpELMJSONs(elmJSONs:ELM[]):void {
  const files = fs.readdirSync('debug/elm');
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(`debug/elm/${file}`);
    });
  }
  fs.mkdirSync('debug/elm', { recursive: true });
  elmJSONs.forEach(elmJSON => {
    fs.writeFileSync(`debug/elm/${elmJSON.library.identifier.id}.json`, JSON.stringify(elmJSON, null, 2));
  });
}

export function dumpVSMap(VSMap: ValueSetMap): void {
  const files = fs.readdirSync('debug/vs');
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(`debug/vs/${file}`);
    });
  }
  fs.mkdirSync('debug/vs', { recursive: true });
  fs.writeFileSync('debug/vs/vsmap.json', JSON.stringify(VSMap, null, 2));
}
