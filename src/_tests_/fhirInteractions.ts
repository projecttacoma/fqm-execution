import { calculateMeasureReports } from '../Calculator';
import { CalculationOptions } from '../types/Calculator';
import { R4 } from '@ahryman40k/ts-fhir-types';
import fs from 'fs';

const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

/**
 * Information about a measure
 *
 * @typedef {Object} CQFMeasureInfo
 * @property {String} exmId - The EXM ID of the measure. ex. EXM_104
 * @property {String} id - The Measure resource's id. ex. measure-EXM104-FHIR4-8.1.000
 */

/**
 * Information about all resources that were created when a bundle was posted.
 *
 * @typedef {Object} BundleLoadInfo
 * @property {String} originalBundle - Path to the bundle that was posted.
 * @property {String[]} resources - List of references to the FHIR Resources that were created. ex. ['Patient/123', 'Condition/12']
 */

/**
 * The MeasureReport Resource that is a result of executing a measure.
 *
 * @typedef {Object} FHIR.MeasureReport
 */

/**
 * Run Measure/{id}/$evaluate-measure on fqm execution and return the MeasureReport as a JS object.
 *
 * @param {String} measureId The id of the measure to execute on fqm execution.
 * @returns {Promise<R4.IMeasureReport>} The patient-list MeasureReport.
 */
export function getMeasureReport(measureId: string, measureBundle: R4.IBundle, patientBundle: R4.IBundle) {
  console.log(`Executing measure ${measureId}`);

  // Start a timer
  console.time(`Execute ${measureId}`);
  const calcOptions: CalculationOptions = setupCalcOptions();
  const report = calculateMeasureReports(measureBundle, [patientBundle], calcOptions);

  return report.results[0];
}

function setupCalcOptions(/* string paramName, boolean value*/): CalculationOptions {
  const calcOptions: CalculationOptions = {};
  calcOptions.calculateHTML = true;
  calcOptions.calculateSDEs = true;
  calcOptions.includeClauseResults = true;
  calcOptions.includeHighlighting = true;
  calcOptions.includePrettyResults = true;
  calcOptions.measurementPeriodEnd = PERIOD_END;
  calcOptions.measurementPeriodStart = PERIOD_START;

  return calcOptions;
}
export function loadPatientBundle(patientBundlePath: string) {
  const patientBundles = fs.readdirSync(patientBundlePath).filter((fileName: string) => {
    return fileName.endsWith('.json');
  });

  const bundleStream = fs.createReadStream(patientBundles[0]);

  return bundleStream;
}
