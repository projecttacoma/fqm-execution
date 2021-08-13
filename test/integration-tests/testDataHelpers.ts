import { R4 } from '@ahryman40k/ts-fhir-types';
import fs from 'fs';
import path, { join } from 'path';
import { loadPatientBundle } from './fhirInteractions';
/**
 * Information about the test data available for a measure.
 *
 * @typedef {Object} TestMeasureInfo
 * @property {String} exmId - The EXM ID of the measure. ex. EXM_104
 * @property {String} path - Path to the folder of test data.
 * @property {String} measureReportPath - Path to the reference MeasureReport json file that should be compared against.
 */
/**
 * Container for issues with a patient found during MeasureReport comparison.
 *
 * @typedef {Object} BadPatient
 * @property {String} patientName - Patient Name.
 * @property {boolean} thereWasAnIssue - flag to indicate if there was an issue with the comparison to the reference report default is false which means that there was no issues
 * @property {String[]} issues - List of reasons this patient is bad.
 */
export interface BadPatient {
  patientName: string;
  thereWasAnIssue: boolean;
  issues: string[];
}
/**
 * Grabs the list of measures that fhir-patient-generator has test data for.
 *
 * @returns {Promise<TestMeasureInfo[]>} List of information about each available test measure data.
 */
export function getTestMeasureList() {
  // Find applicable measure test data directories in fhir-patient-generator

  const fpgPath = './fhir-patient-generator';
  const prefixPath = './connectathon/fhir401/bundles/measure/';
  const fpgDir = fs.readdirSync(fpgPath);
  const applicableMeasuresDirs = fpgDir.filter(dir => {
    return dir.startsWith('EXM_');
  });

  // Pull out applicable measure information on them
  /** @type {TestMeasureInfo[]} */
  const measureDirInfo = applicableMeasuresDirs.map(measureDir => {
    /** @type {TestMeasureInfo} */
    const testDirInfo = {
      // format exmId into simple, non-versioned id
      exmId: measureDir.includes('-') ? measureDir.split('-')[0] : measureDir,
      path: `./fhir-patient-generator/${measureDir}/patients-r4`,
      measureReportPath: 'string',
      connectathonBundlePath: 'string',
      connectathonBundle: ''
    };

    if (fs.existsSync(testDirInfo.path)) {
      const measureReportFile = fs.readdirSync(testDirInfo.path).find(filename => {
        return filename.includes('measure-report.json');
      });

      if (measureReportFile) {
        testDirInfo.measureReportPath = `${testDirInfo.path}/${measureReportFile}`;
      }
    } else {
      testDirInfo.measureReportPath = '';
    }
    const newString = prefixPath + measureDir.replace('_', '');

    if (fs.existsSync(newString)) {
      const connectathonBundle = fs.readdirSync(newString).find(filename => {
        return filename.includes('bundle.json');
      });
      if (connectathonBundle) {
        const tempPath = prefixPath + measureDir.replace('_', '') + '/';
        testDirInfo.connectathonBundlePath = join(tempPath, connectathonBundle);
        testDirInfo.connectathonBundle = connectathonBundle; //'${testDirInfo.path}/connectathonBundle';
      }
    } else {
      testDirInfo.connectathonBundlePath = '';
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
export function loadTestDataFolder(testDataFolder: string) {
  // use data in all subfolders except for measure-reports. ex. numerator, denominator, etc.
  const subfolders = fs
    .readdirSync(testDataFolder, { withFileTypes: true })
    .filter(dir => {
      return dir.isDirectory() && dir.name != 'measure-reports';
    })
    .map(dir => {
      return dir.name;
    });

  /** @type {BundleLoadInfo[]} */
  const bundleResourceInfos: { fileName: string; bundle: R4.IBundle }[] = [];
  // Iterate over sub folders
  for (const subfolder of subfolders) {
    const subfolderPath = testDataFolder + '/' + subfolder;
    const patientBundles = fs.readdirSync(subfolderPath).filter(fileName => {
      return fileName.endsWith('.json');
    });

    // Iterate over bundles in this folder and post them
    for (const patientBundleName of patientBundles) {
      process.stdout.write('.');
      console.log(`Loading bundle ${subfolderPath}/${patientBundleName}`);
      const newResourceInfo = loadPatientBundle(`${subfolderPath}/${patientBundleName}`);
      bundleResourceInfos.push({ fileName: patientBundleName, bundle: newResourceInfo });
    }
  }
  console.log();

  return bundleResourceInfos;
}

/**
 * Loads the MeasureReport from that test data that will be used as reference.
 *
 * @param {String} measureReportPath Path to the reference measure report.
 * @returns {FHIR.MeasureReport} The MeasureReport resource that will be compared against.
 */
export function loadReferenceMeasureReport(filePath: string, patientBundle: string) {
  const c = patientBundle.substring(0, patientBundle.lastIndexOf('.'));
  const mRfilename = c + '-MeasureReport.json';
  const file = fs.readFileSync(path.join(filePath, '/measure-reports/' + mRfilename), 'utf-8');
  return JSON.parse(file);
}
