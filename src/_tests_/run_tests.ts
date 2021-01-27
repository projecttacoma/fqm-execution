import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { BadPatient, getTestMeasureList, loadReferenceMeasureReport, loadTestDataFolder } from './testDataHelpers';
import { getMeasureReport } from './fhirInteractions';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { compareMeasureReports } from './measureReportCompare';

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));

export function calculateMeasuresAndCompare(): { exmId: string; badPatients: BadPatient[] }[] {
  // look for an argument on the command line to indicate the only measure to run. i.e. EXM_105
  let onlyMeasureExmId: string | undefined;
  if (process.argv[2]) {
    onlyMeasureExmId = process.argv[2];
    console.log(`Only running ${onlyMeasureExmId}`);
  }

  const testPatientMeasures = getTestMeasureList();

  // if we are testing only one measure check it exists in both test data and fqm-execution
  if (onlyMeasureExmId && !testPatientMeasures.some(testMeasure => testMeasure.exmId == onlyMeasureExmId)) {
    throw new Error(`Measure ${onlyMeasureExmId} was not found  in test data and was the only measure requested.`);
  }

  // Array for collecting diff information to print at end.
  const measureDiffInfo = [];

  // Iterate over test data measures
  for (const testPatientMeasure of testPatientMeasures) {
    // Skip if we are in run one mode and this is not the only one we should run
    if (onlyMeasureExmId && testPatientMeasure.exmId != onlyMeasureExmId) continue;

    // Check if there is a MeasureReport to compare to
    if (!testPatientMeasure.path) {
      console.log(`No Reference MeasureReport found for ${testPatientMeasure.exmId}`);

      // If we are only runing one measure throw an error if we cannot find the report, otherwise skip to the next one
      if (onlyMeasureExmId) {
        throw new Error(
          `Measure ${onlyMeasureExmId} does not have a reference MeasureReport and was the only measure requested.`
        );
      }
      // Load up all test patients for this measure.
      console.log(`Loading test data for ${testPatientMeasure.exmId}`);
      //need to change here, we can't load all the patients we need to iterate through each one
      //in the bundle
      const bundleResourceInfos = loadTestDataFolder(testPatientMeasure.path);
      for (const patBundle of bundleResourceInfos) {
        // Execute the measure, i.e. get the MeasureReport from fqm-execution
        const report = getMeasureReport(
          testPatientMeasure.exmId,
          measureBundle,
          parseBundle(path.resolve(patBundle.toString()))
        );
        // Load the reference report from the test data
        const referenceReport = loadReferenceMeasureReport(testPatientMeasure.path);

        // Compare measure reports and get the list of information about patients with discrepancies
        const badPatients = compareMeasureReports(referenceReport, report);

        // Add to the measure info to print at the end
        measureDiffInfo.push({
          exmId: testPatientMeasure.exmId,
          badPatients: badPatients
        });
      }
    }
  }

  return measureDiffInfo;
}
// Print listing of measures and differences found and exit.

const measureDiffInfo = calculateMeasuresAndCompare();
console.log();
console.log('--- RESULTS ---');
console.log();
let hasDifferences = false;

// Iterate over measures
measureDiffInfo.forEach(measureDiff => {
  console.log(`MEASURE ${measureDiff.exmId}`);

  // Iterate over the listing of discrepancies for this measure if there are any
  if (measureDiff.badPatients.length > 0) {
    hasDifferences = true;
    measureDiff.badPatients.forEach(patient => {
      console.log(`|- ${patient.patientName}`);
      patient.issues.forEach(issue => {
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
