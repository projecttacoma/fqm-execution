
import { calculateMeasureReports, calculateRaw } from '../src/Calculator';


/**
 * Information about a measure in fqm execution.
 *
 * @typedef {Object} FQMeasureInfo
 * @property {String} exmId - The EXM ID of the measure. ex. EXM_104
 * @property {String} id - The Measure resource's id. ex. measure-EXM104-FHIR4-8.1.000
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


    // Start a timer
    console.time(`Execute ${measureId}`);

  });
}
