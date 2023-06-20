// Code systems source: https://cts.nlm.nih.gov/fhir/metadata?_format=json

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const inputPath = path.resolve(path.join(__dirname, '../code-system/cts-metadata.json'));
const outputPath = path.resolve(path.join(__dirname, '../code-system/system-map.json'));
const ctsMetadata = readFileSync(inputPath, 'utf8');

/**
 * Parse cts-metadata and transform into code system url->name mapping
 */
async function parse(codeSystemJSON: string) {
  const codeSystemData = (await JSON.parse(codeSystemJSON)) as fhir4.CapabilityStatement;
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

parse(ctsMetadata)
  .then(data => {
    writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`Wrote file to ${outputPath}`);
  })
  .catch(e => {
    console.error(e);
  });
