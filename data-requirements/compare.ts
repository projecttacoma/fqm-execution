import fs from 'fs';
import path from 'path';
import { Calculator } from '../src';

const RESET = '\x1b[0m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';

const ECQM_CONTENT_BASE_PATH = path.join(__dirname, '../regression/ecqm-content-r4-2021/bundles/measure');

async function main() {
  if (fs.existsSync('./fqm-e-dr')) {
    fs.rmSync('./fqm-e-dr', { recursive: true });
  }

  fs.mkdirSync('./fqm-e-dr');

  const allDirs = fs.readdirSync(ECQM_CONTENT_BASE_PATH).map(f => ({
    shortName: f,
    fullPath: path.join(ECQM_CONTENT_BASE_PATH, f)
  }));

  for (const dir of allDirs) {
    const basePath = dir.fullPath;

    // It is assumed that the bundle lives under the base directory with `-bundle.json added to the extension
    const measureBundle = JSON.parse(
      fs.readFileSync(path.join(basePath, `${dir.shortName}-bundle.json`), 'utf8')
    ) as fhir4.Bundle;

    // try to calculate the data requirements for the measure bundle
    try {
      const { results } = await Calculator.calculateDataRequirements(measureBundle, {});

      fs.writeFileSync(`./fqm-e-dr/${dir.shortName}-dr.json`, JSON.stringify(results, undefined, 2), 'utf8');
      console.log(`${FG_GREEN}%s${RESET}: Results written to ./fqm-e-dr/${dir.shortName}-dr.json`, 'SUCCESS');
    } catch (e) {
      if (e instanceof Error) {
        fs.writeFileSync(
          `./fqm-e-dr/${dir.shortName}-dr.json`,
          JSON.stringify({ error: e.message }, undefined, 2),
          'utf8'
        );
        console.log(
          `${FG_YELLOW}%s${RESET}: Results written to ./fqm-e-dr/${dir.shortName}-dr.json`,
          'EXECUTION ERROR'
        );
      }
    }

    // In the following code, I would like to go through the data-requirements library outputs, take just the data-requirements
    // array, sort them and put them in their own files
    // const fqmEDataReqs = (
    //   JSON.parse(fs.readFileSync(`./fqm-e-dr/${dir.shortName}-drLib.json`, 'utf8')) as fhir4.Library
    // ).dataRequirement;

    // if (!fs.existsSync(`./elm-parser-dr/${dir.shortName}.xml.json`)) continue;

    // const elmParserDataReqs = (
    //   JSON.parse(fs.readFileSync(`./elm-parser-dr/${dir.shortName}.xml.json`, 'utf8')) as fhir4.Library
    // ).dataRequirement;

    // fs.writeFileSync(`./fqm-e-dr/${dir.shortName}-dr.json`, JSON.stringify(fqmEDataReqs, undefined, 2), 'utf8');
    // fs.writeFileSync(
    //   `./elm-parser-dr/${dir.shortName}-dr.json`,
    //   JSON.stringify(elmParserDataReqs, undefined, 2),
    //   'utf8'
    // );
  }
}

main().then(() => console.log('done'));
