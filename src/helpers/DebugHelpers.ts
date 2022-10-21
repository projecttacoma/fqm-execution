import { ELM } from '../types/ELMTypes';
import { ValueSetMap } from '../types/CQLTypes';
import fs from 'fs';

export function clearDebugFolder(): void {
  if (fs.existsSync('debug/')) {
    fs.rmSync('debug/', { recursive: true });
  }
}

export function dumpHTMLs(htmls: { name: string; html: string }[]): void {
  // create debug folder if it doesnt exist
  if (!fs.existsSync('debug/html')) {
    fs.mkdirSync('debug/html', { recursive: true });
  }

  htmls.forEach(h => {
    // delete old copy
    if (fs.existsSync(`debug/html/${h.name}`)) {
      fs.unlinkSync(`debug/html/${h.name}`);
    }

    fs.writeFileSync(`debug/html/${h.name}`, h.html);
  });
}

export function dumpELMJSONs(elmJSONs: ELM[]): void {
  // create folder if it doesn't exist
  if (!fs.existsSync('debug/elm')) {
    fs.mkdirSync('debug/elm', { recursive: true });
  }

  // wipe out anything from previous run
  const files = fs.readdirSync('debug/elm');
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(`debug/elm/${file}`);
    });
  }

  elmJSONs.forEach(elmJSON => {
    fs.writeFileSync(
      `debug/elm/${elmJSON.library.identifier.id}-${elmJSON.library.identifier.version}.json`,
      JSON.stringify(elmJSON, null, 2)
    );
  });
}

export function dumpCQLs(cqls: { name: string; cql: string }[]): void {
  // create folder if it doesn't exist
  if (!fs.existsSync('debug/cql')) {
    fs.mkdirSync('debug/cql', { recursive: true });
  }

  // wipe out anything from previous run
  const files = fs.readdirSync('debug/cql');
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(`debug/cql/${file}`);
    });
  }

  cqls.forEach(cql => {
    fs.writeFileSync(`debug/cql/${cql.name}.cql`, cql.cql);
  });
}

export function dumpVSMap(VSMap: ValueSetMap): void {
  // create folder if it doesn't exist
  if (!fs.existsSync('debug/vs')) {
    fs.mkdirSync('debug/vs', { recursive: true });
  }

  // wipe out anything from previous run
  const files = fs.readdirSync('debug/vs');
  if (files) {
    files.forEach(file => {
      fs.unlinkSync(`debug/vs/${file}`);
    });
  }

  fs.writeFileSync('debug/vs/vsmap.json', JSON.stringify(VSMap, null, 2));
}

export function dumpObject(object: any, nameInDebugFolder: string): void {
  // create debug folder if it doesnt exist
  if (!fs.existsSync('debug')) {
    fs.mkdirSync('debug', { recursive: true });
  }

  // delete old copy
  if (fs.existsSync(`debug/${nameInDebugFolder}`)) {
    fs.unlinkSync(`debug/${nameInDebugFolder}`);
  }

  fs.writeFileSync(`debug/${nameInDebugFolder}`, JSON.stringify(object, null, 2));
}
