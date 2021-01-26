import { R4 } from '@ahryman40k/ts-fhir-types';
import { BadPatient } from './testDataHelpers';

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
  group: R4.IMeasureReport_Group
) {
  return group.population?.find(population => {
    if (referencePopulation.code?.coding && population.code?.coding) {
      return referencePopulation.code.coding[0].code == population.code.coding[0].code;
    }
  });
}

/**
 * Gets the contained Resource in a MeasureReport by '#' local reference. This is used to grab the list of patients
 * that calculated in a population.
 *
 * @param {String} reference FHIR '#' style reference to contained resource
 * @param {FHIR.MeasureReport} report The report to find the contained reference.
 */
function grabReferencedResource(reference: string, report: R4.IMeasureReport) {
  const id = reference.replace('#', '');
  return report.contained?.find(resource => {
    return resource.id == id;
  });
}

/**
 * Add an issue entry to the given bad patient list for a specific patient. Add this patient to the list if are not already in it.
 *
 * @param {BadPatient[]} badPatientsList
 * @param {String} patientName
 * @param {String} issueMessage
 */
function addBadPatientEntry(badPatientsList: BadPatient[], patientName: string, issueMessage: string) {
  // Find the patient or create them if they don't exist
  let badPatient = badPatientsList.find(badPatient => badPatient.patientName == patientName);
  if (!badPatient) {
    badPatient = { patientName: patientName, issues: [] };
    badPatientsList.push(badPatient);
  }

  // Add the issue message to their list of issues.
  badPatient.issues.push(issueMessage);
}

/**
 * Compare two measure reports. Report the differences as a list of issues with each patient that has a descrepancy.
 *
 * @param {FHIR.MeasureReport} referenceReport The report we are comparing the executed report to.
 * @param {FHIR.MeasureReport} report The report coming from execution.
 * @returns {BadPatient[]} List of bad patients and the issues with them.
 */
export function compareMeasureReports(referenceReport: R4.IMeasureReport, report: R4.IMeasureReport) {
  /** @type {BadPatient[]} */
  const badPatientsList: BadPatient[] = [];

  console.log(`Comparing reports for ${referenceReport.measure}`);

  // iterate groups in referenceReport
  referenceReport.group?.forEach(referenceGroup => {
    console.log(`  Comparing group: ${referenceGroup.id}`);
    // find corresponding group in report
    const group = findCorrespondingGroup(referenceGroup, report);

    // iterate populations
    referenceGroup.population?.forEach(referencePopulation => {
      if (referencePopulation.code?.coding) {
        console.log(`    Comparing population: ${referencePopulation.code.coding[0].display}`);
      }
      // find corresponding population

      if (group && referencePopulation.subjectResults?.reference) {
        const population = findCorrespondingPopulation(referencePopulation, group);

        // grab lists of patients
        const referenceList = <any>(
          grabReferencedResource(referencePopulation.subjectResults.reference, referenceReport)
        );
        if (population?.subjectResults?.reference) {
          const list = <any>grabReferencedResource(population.subjectResults.reference, report);

          // Turn into list of patient names from reference report, default to [] if list is empty/nonexistent
          let referencePatientNames: string[] = [];
          if (referenceList?.entry) {
            referencePatientNames = referenceList.entry.map((e: any) => {
              return e.item.display;
            });
          }

          // Turn into list of patient names from calculated report. default to [] if list is empty/nonexistent
          let patientNames: string[] = [];
          if (list.entry) {
            patientNames = list.entry.map((e: any) => {
              return e.item.display;
            });
          }

          // compare lists
          const missingPatients = referencePatientNames.filter(patientName => {
            return !patientNames.includes(patientName);
          });
          const unexpectedPatients = patientNames.filter(patientName => {
            return !referencePatientNames.includes(patientName);
          });

          // log patients that are missing in the report
          console.log(`      Expected ${referencePatientNames.length} - Actual ${patientNames.length}`);
          missingPatients.forEach(patientName => {
            if (referencePopulation?.code?.coding) {
              console.log(`        MISSING    ${patientName}`);
              addBadPatientEntry(
                badPatientsList,
                patientName,
                `Missing from ${referenceGroup.id} - ${referencePopulation.code.coding[0].display}`
              );
            }
          });

          // log patients that were unexpected in the report
          unexpectedPatients.forEach(patientName => {
            if (referencePopulation?.code?.coding) {
              console.log(`        UNEXPECTED ${patientName}`);
              addBadPatientEntry(
                badPatientsList,
                patientName,
                `Unexpected in ${referenceGroup.id} - ${referencePopulation.code.coding[0].display}`
              );
            }
          });
        }
      }
    });
  });

  // return list of patients with issues
  return badPatientsList;
}
