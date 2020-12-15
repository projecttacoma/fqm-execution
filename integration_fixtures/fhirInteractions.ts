const fs = require('fs');
const http = require('http');
const process = require('process');


const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';
const execute = require('./src/Execute.ts');


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
    let req = http.request(`${FHIR_SERVER}/Measure/${measureId}/$evaluate-measure?reportType=patient-list&periodStart=${PERIOD_START}&periodEnd=${PERIOD_END}`,
      {
        method: 'GET',
        timeout: 2400000 //40 minute timeout because this is slow for some measures.
      }, (res) => {
        // Handle result of execution.
        clearInterval(dotTimer); // clear the timer for the dot printer
        console.log();
        console.timeEnd(`Execute ${measureId}`); // print out how long this took.
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when executing.`);
          return;
        } else {
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            resolve(JSON.parse(rawData));
          });
        }
      }
    );

    req.on('error', (e) => {
      console.error(e);
      reject(e);
    });
    req.end();

    // Start a timer
    console.time(`Execute ${measureId}`);
    // Dots are required to keep travis from giving up.
    dotTimer = setInterval(() => { process.stdout.write('.') }, 10000);
  });
}


module.exports.loadPatientBundle = loadPatientBundle;
module.exports.getMeasureReport = getMeasureReport;