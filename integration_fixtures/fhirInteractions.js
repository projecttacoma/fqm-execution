const fs = require('fs');
const http = require('http');
const process = require('process');

const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

const FHIR_SERVER = 'http://localhost:3000/POST/calculateRaw';

/**
 * Information about a measure in fqm execution.
 * 
 * @typedef {Object} FQMeasureInfo
 * @property {String} exmId - The EXM ID of the measure. ex. EXM_104
 * @property {String} fullUrl - Full URL of the measure in the FHIR server
 * @property {String} id - The Measure resource's id. ex. measure-EXM104-FHIR4-8.1.000
 */

/**
 * Get information about all Measures in the fqm execution instance.
 * 
 * @returns {Promise<FQMeasureInfo[]} List of information about the Measures.
 */
async function getFQMeasureList() {
  return new Promise((resolve, reject) => {
    http.get(FHIR_SERVER + '/Measure', (res) => {
      // make sure it worked, error out if the status code wasn't 200
      if (res.statusCode != 200) {
        reject(`Status code ${res.statusCode} was unexpected when listing measures.`);
        return;
      }

      // collect and parse the response body into a JS object
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const measureSearchBundle = JSON.parse(rawData);
          // iterate over each measure found
          const measureListing = measureSearchBundle.entry.map((entry) => {
            // find the CMS identifier of the resource and use it for the exmId. Default to EXM_UNKNOWN if it can't be found
            let cmsId;
            if (entry.resource.identifier) {
              cmsId = entry.resource.identifier.find((identifier) => { return identifier.system == "http://hl7.org/fhir/cqi/ecqm/Measure/Identifier/cms" });
            }
            let exmId = "EXM_UNKNOWN";
            if (cmsId) {
              exmId = `EXM_${cmsId.value}`
            }
            return {
              fullUrl: entry.fullUrl,
              id: entry.resource.id,
              exmId: exmId
            };
          });

          console.log(measureListing);
          resolve(measureListing);
        } catch (e) {
          reject(`Failed to parse result from fqm-execution: ${e.message}`);
          console.error(e);
          return;
        }
      });
    });
  });
}

/**
 * Information about all resources that were created when a bundle was posted.
 * 
 * @typedef {Object} BundleLoadInfo
 * @property {String} originalBundle - Path to the bundle that was posted.
 * @property {String[]} resources - List of references to the FHIR Resources that were created. ex. ['Patient/123', 'Condition/12']
 */

/**
 * Post a patient test patient bundle to the server. Collect information about the resources that were created.
 * 
 * @param {String} patientBundlePath Path to a FHIR Bundle to POST to fqm execution service.
 * @returns {Promise<BundleLoadInfo>} Information about the resources created.
 */
async function loadPatientBundle(patientBundlePath) {
  return new Promise((resolve, reject) => {
    let req = http.request(FHIR_SERVER,
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        }
      }, (res) => {
        // make sure it worked, error out if the status code wasn't 200
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when posting bundle. ${patientBundlePath}`);
          return;
        }

        // collect and parse the response body into a JS object
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let transactionResult = JSON.parse(rawData);
          // loop through each Resource that was created and grab the reference, clearing up the history piece
          let resourcesCreated = transactionResult.entry.map((entry) => {
            return entry.response.location.replace("/_history/1", '');
          })
          resolve({
            originalBundle: patientBundlePath,
            resources: resourcesCreated
          });
        });
      });

    // open the patient bundle file and pipe it to the request.
    let bundleStream = fs.createReadStream(patientBundlePath);
    bundleStream.pipe(req);
  });
}

/**
 * Creates a transaction bundle that does a DELETE of every resource reference passed in.
 * 
 * @param {String[]} resourcesToDelete List of resources to delete as relative urls. ex. ['Patient/123', 'Condition/12']
 */
async function deleteResources(resourcesToDelete) {
  // Build up a Bundle that is a transaction to delete every resource.
  let deleteTransaction = {
    resourceType: 'Bundle',
    id: 'big-delete',
    type: 'transaction',
    entry: resourcesToDelete.map((resource) => {
      return {
        request: {
          method: 'DELETE',
          url: resource
        }
      };
    })
  };

  // Run the request to post the transaction.
  return new Promise((resolve, reject) => {
    let req = http.request(FHIR_SERVER,
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        }
      }, (res) => {
        // handle response. pass if status code is 200, otherwise fail.
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when deleting data.`);
          return;
        } else {
          resolve();
        }
      });

    // Send the transaction Bundle.
    req.write(JSON.stringify(deleteTransaction));
    req.end();
  });
}

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

module.exports.getFQMeasureList = getFQMeasureList;
module.exports.loadPatientBundle = loadPatientBundle;
module.exports.deleteResources = deleteResources;
module.exports.getMeasureReport = getMeasureReport;