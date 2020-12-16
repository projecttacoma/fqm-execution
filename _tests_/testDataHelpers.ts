const fs = require('fs');
const process = require('process');
const fhirInteractions = require('./fhirInteractions');

/**
 * Information about the test data available for a measure.
 * 
 * @typedef {Object} TestMeasureInfo
 * @property {String} exmId - The EXM ID of the measure. ex. EXM_104
 * @property {String} path - Path to the folder of test data.
 * @property {String} measureReportPath - Path to the reference MeasureReport json file that should be compared against.
 */

/**
 * Grabs the list of measures that fhir-patient-generator has test data for.
 * 
 * @returns {Promise<TestMeasureInfo[]>} List of information about each available test measure data.
 */
async function getTestMeasureList() {
  // Find applicable measure test data directories in fhir-patient-generator
  const fpgDir = fs.readdirSync('./fhir-patient-generator/');
  const applicableMeasuresDirs = fpgDir.filter((dir) => { return dir.startsWith('EXM_'); });

  // Pull out applicable measure information on them
  /** @type {TestMeasureInfo[]} */
  const measureDirInfo = applicableMeasuresDirs.map((measureDir) => {
    /** @type {TestMeasureInfo} */
    const testDirInfo = {
      // format exmId into simple, non-versioned id
      exmId: measureDir.includes('-') ? measureDir.split('-')[0] : measureDir,
      path: `./fhir-patient-generator/${measureDir}/patients-r4`
    };
    const measureReportFile = fs.readdirSync(testDirInfo.path).find((filename) => { return filename.includes('measure-report.json');});
    if (measureReportFile) {
      testDirInfo.measureReportPath = `${testDirInfo.path}/${measureReportFile}`;
    }
    return testDirInfo;
  });

  return measureDirInfo;
}

/**
 * Load all patient bundle in the test data folder. This will navigate into each "population" folder and load each bundle. Returns information about
 * the paths of all resources put into fqm-ruler and their location so they may be removed later.
 * 
 * @param {String} testDataFolder Path to the folder of test data.
 * @returns {BundleLoadInfo[]} Information about each loaded bundle.
 */
async function loadTestDataFolder(testDataFolder) {
  // use data in all subfolders except for measure-reports. ex. numerator, denominator, etc.
  const subfolders = fs.readdirSync(testDataFolder, { withFileTypes: true })
    .filter((dir) => { return dir.isDirectory() && dir.name != 'measure-reports';})
    .map((dir) => { return dir.name; });

  /** @type {BundleLoadInfo[]} */
  const bundleResourceInfos = [];
  // Iterate over sub folders
  for (const subfolder of subfolders) {
    const subfolderPath = testDataFolder + '/' + subfolder;
    const patientBundles = fs.readdirSync(subfolderPath).filter((fileName) => { return fileName.endsWith('.json'); });

    // Iterate over bundles in this folder and post them to fqm-ruler
    for (const patientBundleName of patientBundles) {
      process.stdout.write('.');
      //console.log(`Loading bundle ${subfolderPath}/${patientBundleName}`)
      const newResourceInfo = await fhirInteractions.loadPatientBundle(`${subfolderPath}/${patientBundleName}`);
      bundleResourceInfos.push(newResourceInfo);
    }
  }
  console.log();

  return bundleResourceInfos;
}

/**
 * Delete all Resources from the list of information about bundles. This is used to clean up after a measure test to clean fqm-ruler
 * for the next test. Each patient bundle is deleted individually, this is faster than trying to delete everything at one.
 * 
 * @param {BundleLoadInfo[]} bundleResourceInfos Information about the bundles that should be deleted.
 */
async function deleteBundleResources(bundleResourceInfos) {
  for (const bundleResourceInfo of bundleResourceInfos) {
    process.stdout.write('.');
    //console.log("Deleting resources from " + bundleResourceInfo.originalBundle)
    await fhirInteractions.deleteResources(bundleResourceInfo.resources);
  }
  console.log();
}

/**
 * Loads the MeasureReport from that test data that will be used as reference.
 * 
 * @param {String} measureReportPath Path to the reference measure report.
 * @returns {FHIR.MeasureReport} The MeasureReport resource that will be compared against.
 */
async function loadReferenceMeasureReport(measureReportPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(measureReportPath, (err, data) => {
      if (err) reject(err);
      resolve(JSON.parse(data));
    });
  });
}

module.exports.getTestMeasureList = getTestMeasureList;
module.exports.loadTestDataFolder = loadTestDataFolder;
module.exports.deleteBundleResources = deleteBundleResources;
module.exports.loadReferenceMeasureReport = loadReferenceMeasureReport;