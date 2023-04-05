import fs from 'fs';
import path from 'path';
import { Calculator } from '../src';

const regressionBaseName = process.argv[2] ?? 'regression-output';
const verbose = process.argv[3] === 'true';

const REGRESSION_OUTPUT_DIR = path.join(__dirname, `./output/${regressionBaseName}`);
const CTHON_BASE_PATH = path.join(__dirname, './connectathon/fhir401/bundles/measure');
const ECQM_CONTENT_BASE_PATH = path.join(__dirname, './ecqm-content-r4-2021/bundles/measure');
const ECQM_CONTENT_QICORE_BASE_PATH = path.join(__dirname, './ecqm-content-qicore-2022/bundles/measure');

const RESET = '\x1b[0m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';

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

    // Skip measures with no test patients provided
    if (!fs.existsSync(filesPath)) continue;

    const regressionResultsPath = path.join(REGRESSION_OUTPUT_DIR, dir.shortName);

    fs.mkdirSync(regressionResultsPath);

    const testFilePaths = fs.readdirSync(filesPath).filter(p => p.startsWith('tests-'));

    // It is assumed that the bundle lives under the base directory with `-bundle.json` added to the extension
    const measureBundle = JSON.parse(
      fs.readFileSync(path.join(basePath, `${dir.shortName}-bundle.json`), 'utf8')
    ) as fhir4.Bundle;

    for (const tfp of testFilePaths) {
      const fullTestFilePath = path.join(filesPath, tfp);
      const patientBundle = JSON.parse(fs.readFileSync(fullTestFilePath, 'utf8')) as fhir4.Bundle;

      const testResultsPath = path.join(regressionResultsPath, `results-${tfp}`);

      try {
        const { results } = await Calculator.calculate(measureBundle, [patientBundle], {
          verboseCalculationResults: false
        });

        fs.writeFileSync(testResultsPath, JSON.stringify(results, undefined, verbose ? 2 : undefined), 'utf8');
        console.log(`${FG_GREEN}%s${RESET}: Results written to ${testResultsPath}`, 'SUCCESS');
      } catch (e) {
        // Errors will not halt regression. For the purposes of these tests, what matters is that there aren't any new errors that weren't there before
        // or that the behavior related to the error differs from the main branch to the branch in question.
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

main().then(() => console.log('done'));
