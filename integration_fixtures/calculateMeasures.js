const process = require('process');
const measureReportCompare = require('./measureReportCompare');
const fhirInteractions = require('./fhirInteractions');
const testDataHelpers = require('./testDataHelpers');

async function calculateMeasuresAndCompare() {
  // look for an argument on the command line to indicate the only measure to run. i.e. EXM_105
  let onlyMeasureExmId;
  if (process.argv[2]) {
    onlyMeasureExmId = process.argv[2];
    console.log(`Only running ${onlyMeasureExmId}`);
  }

  // grab info on measures in fqm-ruler and measures in test data
  let fqmMeasures = await fhirInteractions.getfqmMeasureList();
  let testPatientMeasures = await testDataHelpers.getTestMeasureList();

  // if we are testing only one measure check it exists in both test data and fqm-ruler
  if (onlyMeasureExmId &&
    (!fqmMeasures.some((fqmMeasure) => fqmMeasure.exmId == onlyMeasureExmId) ||
    !testPatientMeasures.some((testMeasure) => testMeasure.exmId == onlyMeasureExmId))) {
      throw new Error(`Measure ${onlyMeasureExmId} was not found in fqm-ruler or in test data and was the only measure requested.`)
  }

  // Array for collecting diff information to print at end.
  let measureDiffInfo = [];

  // Iterate over test data measures
  for (let testPatientMeasure of testPatientMeasures) {
    // Skip if we are in run one mode and this is not the only one we should run
    if (onlyMeasureExmId && testPatientMeasure.exmId != onlyMeasureExmId) continue;

    // Check if there is a MeasureReport to compare to
    if (!testPatientMeasure.measureReportPath) {
      console.log(`No Reference MeasureReport found for ${testPatientMeasure.exmId}`);

      // If we are only runing one measure throw an error if we cannot find the report, otherwise skip to the next one
      if (onlyMeasureExmId) {
        throw new Error(`Measure ${onlyMeasureExmId} does not have a reference MeasureReport and was the only measure requested.`)
      } else {
        continue;
      }
    }

    // Grab the corresponding information about the fqm-ruler measure
    let fqmMeasure = fqmMeasures.find((measure) => measure.exmId == testPatientMeasure.exmId);
    if (!fqmMeasure) {
      console.log(`Measure ${testPatientMeasure.exmId} not found in fqm-ruler. Skipping.`);
      continue;
    }

    // Load up all test patients for this measure.
    console.log(`Loading test data for ${testPatientMeasure.exmId}`);
    let bundleResourceInfos = await testDataHelpers.loadTestDataFolder(testPatientMeasure.path);

    // Execute the measure, i.e. get the MeasureReport from fqm-ruler
    let report = await fhirInteractions.getMeasureReport(fqmMeasure.id);
    // Load the reference report from the test data
    let referenceReport = await testDataHelpers.loadReferenceMeasureReport(testPatientMeasure.measureReportPath);

    // Compare measure reports and get the list of information about patients with discrepancies
    let badPatients = measureReportCompare.compareMeasureReports(referenceReport, report);

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


calculateMeasuresAndCompare()
  // Print listing of measures and differences found and exit.
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