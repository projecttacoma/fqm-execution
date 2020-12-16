/**
 * This will shell out either the cli or export the library functions to actually execute 
 * the tests against the measures
 */
import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';

const process = require('process');
const measureReportCompare = require('./measureReportCompare');
const fhirInteractions = require('./fhirInteractions');
const testDataHelpers = require('./testDataHelpers');

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));
const patientBundles = program.patientBundles.map((bundlePath: string) => parseBundle(path.resolve(bundlePath)));


async function calculateMeasuresAndCompare() {
  // look for an argument on the command line to indicate the only measure to run. i.e. EXM_105
  let onlyMeasureExmId;
  if (process.argv[2]) {
    onlyMeasureExmId = process.argv[2];
    console.log(`Only running ${onlyMeasureExmId}`);
  }

  // grab info on measures in fqm-execution and measures in test data
  const fqmMeasures = await fhirInteractions.getfqmMeasureList();
  const testPatientMeasures = await testDataHelpers.getTestMeasureList();

  // if we are testing only one measure check it exists in both test data and fqm-execution
  if (onlyMeasureExmId &&
    (!fqmMeasures.some((fqmMeasure) => fqmMeasure.exmId == onlyMeasureExmId) ||
    !testPatientMeasures.some((testMeasure) => testMeasure.exmId == onlyMeasureExmId))) {
      throw new Error(`Measure ${onlyMeasureExmId} was not found in fqm-execution or in test data and was the only measure requested.`);
  }

  // Array for collecting diff information to print at end.
  const measureDiffInfo = [];

  // Iterate over test data measures
  for (const testPatientMeasure of testPatientMeasures) {
    // Skip if we are in run one mode and this is not the only one we should run
    if (onlyMeasureExmId && testPatientMeasure.exmId != onlyMeasureExmId) continue;

    // Check if there is a MeasureReport to compare to
    if (!testPatientMeasure.measureReportPath) {
      console.log(`No Reference MeasureReport found for ${testPatientMeasure.exmId}`);

      // If we are only runing one measure throw an error if we cannot find the report, otherwise skip to the next one
      if (onlyMeasureExmId) {
        throw new Error(`Measure ${onlyMeasureExmId} does not have a reference MeasureReport and was the only measure requested.`);
      } else {
        continue;
      }
    }

    // Grab the corresponding information about the fqm-execution measure
    const fqmMeasure = fqmMeasures.find((measure) => measure.exmId == testPatientMeasure.exmId);
    if (!fqmMeasure) {
      console.log(`Measure ${testPatientMeasure.exmId} not found in fqm-execution. Skipping.`);
      continue;
    }

    // Load up all test patients for this measure.
    console.log(`Loading test data for ${testPatientMeasure.exmId}`);
    const bundleResourceInfos = await testDataHelpers.loadTestDataFolder(testPatientMeasure.path);

    // Execute the measure, i.e. get the MeasureReport from fqm-execution
    const report = await fhirInteractions.getMeasureReport(fqmMeasure.id);
    // Load the reference report from the test data
    const referenceReport = await testDataHelpers.loadReferenceMeasureReport(testPatientMeasure.measureReportPath);

    // Compare measure reports and get the list of information about patients with discrepancies
    const badPatients = measureReportCompare.compareMeasureReports(referenceReport, report);

    // Add to the measure info to print at the end
    measureDiffInfo.push({
      exmId: testPatientMeasure.exmId,
      badPatients: badPatients
    });

    // Clean up the test patients so they don't pollute the next test.
    console.log(`Removing test data for ${testPatientMeasure.exmId}`);
    await testDataHelpers.deleteBundleResources(bundleResourceInfos);
  }

  return measureDiffInfo;
}
calculateMeasuresAndCompare() // Print listing of measures and differences found and exit.
.then((measureDiffInfo) => {

  console.log();
  console.log('--- RESULTS ---');
  console.log();
  let hasDifferences = false;

  // Iterate over measures
  measureDiffInfo.forEach((measureDiff) => {
    console.log(`MEASURE ${measureDiff.exmId}`);

    // Iterate over the listing of discrepancies for this measure if there are any
    if (measureDiff.badPatients.length > 0) {
      hasDifferences = true;
      measureDiff.badPatients.forEach((patient) => {
        console.log(`|- ${patient.patientName}`);
        patient.issues.forEach((issue) => {
          console.log(`|   ${issue}`);
        });
      });

    // If there were no discrepancies
    } else {
      console.log('  No Issues!');
    }
    console.log();
  });

  // If there were discrepancies, return with non-zero exit status
  if (hasDifferences) {
    process.exit(1);
  }
})
// Handle errors by printing and return non-zero exit status
.catch((reason) => {
  console.error(reason);
  process.exit(2);
});

//find data in folder
//run measure
//catch failures
//store results