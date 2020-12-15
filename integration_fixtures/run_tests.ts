/**
 * This will shell out either the cli or export the library functions to actually execute 
 * the tests against the measures
 */
//think these are the imports I need but I'm not sure 
import { R4 } from '@ahryman40k/ts-fhir-types';
const process = require('process');
const measureReportCompare = require('./measureReportCompare');
const fhirInteractions = require('./fhirInteractions');
const testDataHelpers = require('./testDataHelpers');

calculateMeasuresAndCompare() // Print listing of measures and differences found and exit.
.then((measureDiffInfo) => {

  console.log();
  console.log("--- RESULTS ---");
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
      console.log("  No Issues!");
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