import fs from 'fs';
import path from 'path';
import { Calculator } from '../src';

const regressionBaseName = process.argv[2] ?? 'regression-output';
const verbose = process.argv[3] === 'true';

const REGRESSION_OUTPUT_DIR = path.join(__dirname, `./output/${regressionBaseName}`);
const CTHON_BASE_PATH = path.join(__dirname, './connectathon/fhir401/bundles/measure');
const ECQM_CONTENT_BASE_PATH = path.join(__dirname, './ecqm-content-r4-2021/bundles/measure');
const ECQM_CONTENT_QICORE_BASE_PATH = path.join(__dirname, './ecqm-content-qicore-2022/bundles/measure');
const COVERAGE_BASE_PATH = path.join(__dirname, './coverage-script-bundles/measure');

const RESET = '\x1b[0m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';

function findPatientBundlePathsInDirectory(patientDir: string): string[] {
  const paths: string[] = [];
  // iterate over the given directory
  fs.readdirSync(patientDir, { withFileTypes: true }).forEach(ent => {
    // if this item is a directory, look for .json files under it
    if (ent.isDirectory()) {
      fs.readdirSync(path.join(patientDir, ent.name), { withFileTypes: true }).forEach(subEnt => {
        if (!subEnt.isDirectory() && subEnt.name.endsWith('.json')) {
          paths.push(path.join(ent.name, subEnt.name));
        }
      });
    } else if (ent.name.endsWith('.json')) {
      paths.push(ent.name);
    }
  });
  return paths;
}

/*
* @public
* @param {string} filesPath - patient file directory path
* @param {string[]} testFilePaths - individual test files within that directory
* @param {fhir4.Bundle} measureBundle - parsed measure bundle
* @param {string} shortName - measure shortname for location of results
*/
async function calculateRegression(filesPath: string, testFilePaths: string[], measureBundle: fhir4.Bundle, shortName: string){
  const regressionResultsPath = path.join(REGRESSION_OUTPUT_DIR, shortName);
  console.log(`Path: ${regressionResultsPath}`);
  fs.mkdirSync(regressionResultsPath);

  for (const tfp of testFilePaths) {
    const fullTestFilePath = path.join(filesPath, tfp);
    const patientBundle = JSON.parse(fs.readFileSync(fullTestFilePath, 'utf8')) as fhir4.Bundle;

    //turn tfp into un-nested path for results file
    const testResultsPath = path.join(regressionResultsPath, `results-${tfp.replace('/','-')}`);

    try {
      const { results } = await Calculator.calculate(measureBundle, [patientBundle], {});

      fs.writeFileSync(testResultsPath, JSON.stringify(results, undefined, verbose ? 2 : undefined), 'utf8');
      console.log(`${FG_GREEN}%s${RESET}: Results written to ${testResultsPath}`, 'SUCCESS');
    } catch (e) {
      if (e instanceof Error) {
        // Errors will not halt regression. For the purposes of these tests, what matters is that there aren't any new errors that weren't there before
        // or that the behavior related to the error differs from the base branch to the branch in question.
        // Errors that occur will be diffed just like normal calculation results
        fs.writeFileSync(
          testResultsPath,
          JSON.stringify({ error: e.message }, undefined, verbose ? 2 : undefined),
          'utf8'
        );
        console.log(`${FG_YELLOW}%s${RESET}: Results written to ${testResultsPath}`, 'EXECUTION ERROR');
      }
    }
  }
}

async function main() {
  if (fs.existsSync(REGRESSION_OUTPUT_DIR)) {
    fs.rmSync(REGRESSION_OUTPUT_DIR, { recursive: true });
  }

  fs.mkdirSync(REGRESSION_OUTPUT_DIR);

  const measureDirBasePaths = [CTHON_BASE_PATH, ECQM_CONTENT_BASE_PATH, ECQM_CONTENT_QICORE_BASE_PATH];

  const allDirs = measureDirBasePaths
    .map(d =>
      fs.readdirSync(d).map(f => ({
        shortName: f,
        fullPath: path.join(d, f)
      }))
    )
    .flat();

  for (const dir of allDirs) {
    const basePath = dir.fullPath;

    // Regression relies on the `*-files` approach used in ecqm content repositories
    // where the `*-files` directory contains the patient
    const filesPath = path.join(basePath, `${dir.shortName}-files`);

    // Skip measures with no `*-files` directory
    if (!fs.existsSync(filesPath)) continue;

    const testFilePaths = fs.readdirSync(filesPath).filter(p => p.startsWith('tests-'));

    // Skip measures with no test patients in the `*-files` directory
    if (testFilePaths.length === 0) continue;

    // It is assumed that the bundle lives under the base directory with `-bundle.json` added to the extension
    const measureBundle = JSON.parse(
      fs.readFileSync(path.join(basePath, `${dir.shortName}-bundle.json`), 'utf8')
    ) as fhir4.Bundle;

    await calculateRegression(filesPath, testFilePaths, measureBundle, dir.shortName);
  }


  // coverage directory organized with multiple measures for each set of test files
  const covDirs = fs.readdirSync(COVERAGE_BASE_PATH).map(f => ({
    shortName: f,
    fullPath: path.join(COVERAGE_BASE_PATH, f)
  }));
  for (const dir of covDirs) {
    const basePath = dir.fullPath;

    const patientDirectoryPath = path.join(basePath, `${dir.shortName}-TestCases`);
    // Skip measures with no `*-TestCases` directory
    if (!fs.existsSync(patientDirectoryPath)) continue;
    const testFilePaths = findPatientBundlePathsInDirectory(patientDirectoryPath);
    // Skip measures with no test patients in the `*-files` directory
    if (testFilePaths.length === 0) continue;

    // Two versions of measure
    const measureBundle314 = JSON.parse(
      fs.readFileSync(path.join(basePath, `${dir.shortName}-v314.json`), 'utf8')
    ) as fhir4.Bundle;
    await calculateRegression(patientDirectoryPath, testFilePaths, measureBundle314, `${dir.shortName}-v314`);

    const measureBundle332 = JSON.parse(
      fs.readFileSync(path.join(basePath, `${dir.shortName}-v332.json`), 'utf8')
    ) as fhir4.Bundle;
    await calculateRegression(patientDirectoryPath, testFilePaths, measureBundle332, `${dir.shortName}-v332`);
  }
}


main().then(() => console.log('done'));
