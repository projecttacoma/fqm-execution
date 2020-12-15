const fs = require('fs');
const http = require('http');
//const process = require('process');
import cql from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { ELM, ELMIdentifier } from '/src/types/ELMTypes';
import { RTTI_Bundle } from '@ahryman40k/ts-fhir-types/lib/R4';

const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';
const execute = require('./src/Execute.ts');
const calculate = require('./src/Calcuator.ts')


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
async function getMeasureReport(measureId) {
  return new Promise((resolve, reject) => {
    let dotTimer;
    console.log(`Executing measure ${measureId}`);
   
   //this is where I need to call the measure calc, bc this is where cqf ruler would have had a post
    //measureBundle, patientBundle, calcOptions
    //loop through patients
    execute(measureBundle,patientBundle,);
    calculate();

    // Start a timer
    console.time(`Execute ${measureId}`);
    // Dots are required to keep travis from giving up.
    dotTimer = setInterval(() => { process.stdout.write('.') }, 10000);
  });
}


module.exports.loadPatientBundle = loadPatientBundle;
module.exports.getMeasureReport = getMeasureReport;