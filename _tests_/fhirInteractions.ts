const fs = require('fs');
const http = require('http');
//const process = require('process');
import cql from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { RTTI_Bundle } from '@ahryman40k/ts-fhir-types/lib/R4';
import path from 'path';
import { program } from 'commander';
import { calculate, calculateMeasureReports, calculateRaw } from './src/Calculator.ts';

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
async function getMeasureReport(measureId: string, measureBundle, patientBundle): Promise<FHIR.MeasureReport> {
  return new Promise((resolve, reject) => {
    let dotTimer;
    let result;
    console.log(`Executing measure ${measureId}`);
  
    result = calculateRaw(measureBundle, patientBundle, {});
    result = calculateMeasureReports(measureBundle, patientBundles, {
      measurementPeriodStart: '2019-01-01',
      measurementPeriodEnd: '2019-12-31',
      calculateSDEs: true,
      calculateHTML: true
    });

    // Start a timer
    console.time(`Execute ${measureId}`);
    // Dots are required to keep travis from giving up.
    dotTimer = setInterval(() => { process.stdout.write('.') }, 10000);
  });
}



module.exports.getMeasureReport = getMeasureReport;