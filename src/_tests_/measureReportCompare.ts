import { R4 } from '@ahryman40k/ts-fhir-types';
import { BadPatient } from './testDataHelpers';
const debug = process.env.DEBUG;
/**
 * Finds the corresponding group in a measure report for the given reference group in.
 *
 * @param {*} referenceGroup The reference group. This is the one we are trying to find the match for.
 * @param {FHIR.MeasureReport} report The MeasureReport to find the group in.
 * @returns {Object} The corresponding group.
 */
function findCorrespondingGroup(referenceGroup: R4.IMeasureReport_Group, report: R4.IMeasureReport) {
  return report.group?.find(group => {
    return referenceGroup.id == group.id;
  });
}

/**
 * Finds the corresponding population result in a group for the given reference population.
 *
 * @param {*} referencePopulation The reference population. This is the one we are trying to find the match for.
 * @param {*} group The group to look for the population in
 * @returns {Object} The corresponding population.
 */
function findCorrespondingPopulation(
  referencePopulation: R4.IMeasureReport_Population,
  group: R4.IMeasureReport_Group | undefined
) {
  return group?.population?.find(population => {
    if (referencePopulation.code?.coding && population.code?.coding) {
      return referencePopulation.code.coding[0].code == population.code.coding[0].code;
    }
  });
}

/**
 * Add an issue entry to the given bad patient list for a specific patient. Add this patient to the list if are not already in it.
 *
 * @param {BadPatient[]} badPatientsList
 * @param {String} patientName
 * @param {String} issueMessage
 */
function addBadPatientEntry(
  badPatientsList: BadPatient[],
  patientName: string,
  thereWasAnIssue: boolean,
  issueMessage: string
) {
  // Find the patient or create them if they don't exist
  let badPatient = badPatientsList.find(badPatient => badPatient.patientName == patientName);
  if (!badPatient) {
    badPatient = { patientName: patientName, thereWasAnIssue, issues: [] };
    badPatientsList.push(badPatient);
  }

  // Add the issue message to their list of issues.
  if (badPatient?.thereWasAnIssue == true) {
    badPatient.issues.push(issueMessage);
  } else {
    badPatient.issues.push('no issue');
  }
}

/**
 * Compare two measure reports. Report the differences as a list of issues with each patient that has a descrepancy.
 *
 * @param {FHIR.MeasureReport} referenceReport The report we are comparing the executed report to.
 * @param {FHIR.MeasureReport} report The report coming from execution.
 * @returns {BadPatient[]} List of bad patients and the issues with them.
 */
export function compareMeasureReports(referenceReport: R4.IMeasureReport, report: R4.IMeasureReport, fileName: string) {
  /** @type {BadPatient[]} */
  const badPatientsList: BadPatient[] = [];
  const patientName = fileName.substring(0, fileName.lastIndexOf('-'));
  if (debug) {
    console.log(`Comparing reports for ${referenceReport.measure}`);
    console.log(`Comparing results for ${patientName}`);
  }
  // iterate groups in referenceReport
  if (referenceReport?.group) {
    referenceReport.group.forEach(referenceGroup => {
      if (debug) console.log(`  Comparing group: ${referenceGroup.id}`);
      // find corresponding group in report
      const group = findCorrespondingGroup(referenceGroup, report);

      // iterate populations
      referenceGroup.population?.forEach(referencePopulation => {
        let popName = '';
        if (referencePopulation.code?.coding) {
          popName = referencePopulation.code.coding[0].display || ' unknown pop';
          if (debug) console.log(`    Comparing population: ${referencePopulation.code.coding[0].display}`);
        }
        // find corresponding population

        const population = findCorrespondingPopulation(referencePopulation, group);

        if (population?.count && referencePopulation?.count) {
          if (population?.count == referencePopulation.count) {
            return;
          } else if (population?.count > 0 && referencePopulation.count > 0) {
            return;
          } else {
            console.log('        MISSING  ' + patientName);
            addBadPatientEntry(badPatientsList, patientName, true, `Missing from ${popName}`);
          }
        }
      });
    });
  }
  // return list of patients with issues
  return badPatientsList;
}
