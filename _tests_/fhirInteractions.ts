import { calculate,calculateMeasureReports, calculateRaw } from '../src/Calculator';
import { R4 } from '@ahryman40k/ts-fhir-types';
import { CalculationOptions } from '../src/types/Calculator';

const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

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
 * @returns {Promise<FHIR.MeasureReport>} The patient-list MeasureReport.
 */
export async function getMeasureReport(measureId: string, measureBundle, patientBundle): Promise<FHIR.MeasureReport> {
  return new Promise(() => {

    console.log(`Executing measure ${measureId}`);
   
    let  calcOptions: CalculationOptions; 
    calcOptions= setupCalcOptions(); 
    calculate( measureBundle,patientBundle, calcOptions);

    // Start a timer
    console.time(`Execute ${measureId}`);

  });

}

 function setupCalcOptions(/* string paramName, boolean value*/) : CalculationOptions{
  let calcOptions: CalculationOptions;// = CalculationOptions;
  calcOptions.calculateHTML = true;
  calcOptions.calculateSDEs = true;
  calcOptions.includeClauseResults = true;
  calcOptions.includeHighlighting = true;
  calcOptions.includePrettyResults = true;
  calcOptions.measurementPeriodEnd = PERIOD_END;
  calcOptions.measurementPeriodStart = PERIOD_START; 

  return calcOptions;
}
