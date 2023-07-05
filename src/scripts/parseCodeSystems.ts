// Code systems source: https://cts.nlm.nih.gov/fhir/metadata?_format=json

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const inputPath = path.resolve(path.join(__dirname, '../code-system/cts-metadata.json'));
const outputPath = path.resolve(path.join(__dirname, '../code-system/system-map.ts'));
const ctsMetadata = readFileSync(inputPath, 'utf8');
const codeSystemData = JSON.parse(ctsMetadata) as fhir4.CapabilityStatement;

/**
 * Transform parsed cts metadata capability statement into code system url->name mapping
 */
function createMapping(codeSystemData: fhir4.CapabilityStatement) {
  const systemMapping: Record<string, string> = {};
  codeSystemData.extension?.forEach(extension => {
    const systemURLExt = extension.extension?.find(e => e.url === 'system');
    const systemNameExt = extension.extension?.find(e => e.url === 'name');
    if (systemURLExt?.valueUri && systemNameExt?.valueString) {
      systemMapping[systemURLExt.valueUri] = systemNameExt.valueString;
    }
  });
  return systemMapping;
}

const data = createMapping(codeSystemData);
try {
  writeFileSync(
    outputPath,
    `export const systemMap: Record<string, string> = ${JSON.stringify(data, null, 2)};`,
    'utf8'
  );
  console.log(`Wrote file to ${outputPath}`);
} catch (e) {
  console.error(e);
}
