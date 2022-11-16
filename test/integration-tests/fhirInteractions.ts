import { calculateIndividualMeasureReports } from '../../src/calculation/Calculator';
import { CalculationOptions } from '../../src/types/Calculator';
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
 * @returns {Promise<fhir4.MeasureReport>} The patient-list MeasureReport.
 */
export async function getMeasureReport(measureId: string, measureBundle: fhir4.Bundle, patientBundle: fhir4.Bundle) {
  // Start a timer
  const calcOptions: CalculationOptions = setupCalcOptions();
  const report = await calculateIndividualMeasureReports(measureBundle, [patientBundle], calcOptions);

  return report.results[0];
}

function setupCalcOptions(/* string paramName, boolean value*/): CalculationOptions {
  const calcOptions: CalculationOptions = {};
  calcOptions.calculateHTML = true;
  calcOptions.calculateSDEs = true;
  calcOptions.includeClauseResults = true;
  calcOptions.measurementPeriodEnd = PERIOD_END;
  calcOptions.measurementPeriodStart = PERIOD_START;

  return calcOptions;
}
export function loadPatientBundle(patientBundlePath: string) {
  const patientBundle = fs.readFileSync(patientBundlePath, 'utf8');
  const bundleStream = JSON.parse(patientBundle) as fhir4.Bundle;
  return bundleStream;
}
