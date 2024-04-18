import fs, { readdirSync } from 'fs';
import path from 'path';
import { Calculator } from '../src';

const RESET = '\x1b[0m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';

const SEPT_2023_CONNECTATHON_BASE_PATH = path.join(__dirname, './sept-2023-connectathon');

/**
 * The purpose of this function is to go through all of the measure bundles in the sept-2023-connectathon
 * directory, calculate their data-requirements, and output their data-requirements to a JSON file
 * corresponding to the name of the measure in the fqm-e-dr directory
 */
async function main() {
  // if the fqm-e-dr directory already exists, remove it and its contents
  if (fs.existsSync('./fqm-e-dr')) {
    readdirSync('./fqm-e-dr').forEach(file => {
      if (file.endsWith('.json')) {
        fs.rmSync(`./fqm-e-dr/${file}`);
      }
    });
  } else {
    // create new fqm-e-dr directory within the data-requirements directory
    fs.mkdirSync('./fqm-e-dr');
  }

  // get all of the file names (short and fullPath) from the sept-2023-connectathon directory
  const allBundles = fs
    .readdirSync(SEPT_2023_CONNECTATHON_BASE_PATH)
    .filter(f => !f.startsWith('.'))
    .map(f => ({
      shortName: f.split('.')[0],
      fullPath: path.join(SEPT_2023_CONNECTATHON_BASE_PATH, f)
    }));

  for (const bundle of allBundles) {
    const measureBundle = JSON.parse(fs.readFileSync(bundle.fullPath, 'utf8')) as fhir4.Bundle;

    // try to calculate the data requirements for the measure bundle
    try {
      const { results } = await Calculator.calculateDataRequirements(measureBundle, {});

      // write the data-requirements results to the measure's shortName-dr.json file in the fqm-e-dr directory
      fs.writeFileSync(`./fqm-e-dr/${bundle.shortName}-dr.json`, JSON.stringify(results, undefined, 2), 'utf8');

      console.log(`${FG_GREEN}%s${RESET}: Results written to ./fqm-e-dr/${bundle.shortName}-dr.json`, 'SUCCESS');
    } catch (e) {
      if (e instanceof Error) {
        fs.writeFileSync(
          `./fqm-e-dr/${bundle.shortName}-dr.json`,
          JSON.stringify({ error: e.message }, undefined, 2),
          'utf8'
        );
        console.log(
          `${FG_YELLOW}%s${RESET}: Results written to ./fqm-e-dr/${bundle.shortName}-dr.json`,
          'EXECUTION ERROR'
        );
      }
    }
  }
}

main().then(() => console.log('fqm-execution data-requirement calculation finished'));
