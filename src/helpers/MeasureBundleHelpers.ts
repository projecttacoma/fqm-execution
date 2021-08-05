import { R4 } from '@ahryman40k/ts-fhir-types';
import { PopulationType } from '../types/Enums';
import { CalculationOptions } from '../types/Calculator';
import { ELM, ELMIdentifier } from '../types/ELMTypes';

/**
 * The extension that defines the population basis. This is used to determine if the measure is an episode of care or
 * patient based measure.
 */
 const POPULATION_BASIS_EXT = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis';

 /**
  * Check if a measure is an episode of care measure or not. Look for the cqfm-populationBasis extension.
  * If it is found return true if valueCode is not 'boolean' otherwise return false.
  *
  * @param {R4.IMeasure} measure FHIR Measure resource.
  * @returns {boolean} true if this is an episode of care, false if it is a patient measure.
  */
 export function isEpisodeOfCareMeasure(measure: R4.IMeasure): boolean {
   const popBasisExt = measure.extension?.find(ext => ext.url == POPULATION_BASIS_EXT);
   if (popBasisExt != undefined) {
     return popBasisExt.valueCode != 'boolean';
   } else {
     return false;
   }
 }

 /**
 * Population Type Code system.
 */
const POPULATION_TYPE_CODESYSTEM = 'http://terminology.hl7.org/CodeSystem/measure-population';

/**
 * Converts FHIR CodeableConcept value for the measure population type to a PopulationType enum value.
 *
 * @param {R4.ICodeableConcept|undefined} concept The FHIR CodeableConcept value for the measure population.
 * @returns {PopulationType|null} null if not a proper population type. The PopulationType if it is.
 */
export function codeableConceptToPopulationType(concept: R4.ICodeableConcept | undefined): PopulationType | null {
  const populationTypeCoding = concept?.coding?.find(coding => {
    return coding.system == POPULATION_TYPE_CODESYSTEM;
  });

  if (populationTypeCoding?.code != null && Object.values(<any>PopulationType).includes(populationTypeCoding.code)) {
    return <PopulationType>populationTypeCoding.code;
  }

  return null;
}

/**
 * Pulls the measurement period out of the Measure resource in the provided bundle, assuming one is set.
 * NOTE: the default start/end values are also set in Execution.ts
 * so if this date is changed from 2019 it must also be changed there
 *
 * @param {R4.IBundle} measureBundle the FHIR Bundle object containing the Measure resource.
 * @returns {CalculationOptions} object with only the measurement period start/end fields filled out,
 * or the year 2019 set as the calculation period if not set in the Measure.
 */
 export function extractMeasurementPeriod(measureBundle: R4.IBundle): CalculationOptions {
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
  if (!measureEntry || !measureEntry.resource) {
    throw new Error('Measure resource was not found in provided measure bundle');
  }
  const measure = measureEntry.resource as R4.IMeasure;
  return {
    measurementPeriodStart: measure.effectivePeriod?.start || '2019-01-01',
    measurementPeriodEnd: measure.effectivePeriod?.end || '2019-12-31'
  };
}

/**
 * Figure out if a string is a  valid URL  or if it's just a string
 * @public
 * @param {string} libraryName - The name of the library depending on the origin of the measure this may a url
 * @return {boolean} If the statement is a function or not.
 */
 export function isValidLibraryURL(libraryName: string) {
  const urlFormat = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  const r = new RegExp(urlFormat);
  return r.test(libraryName);
}

export function extractLibrariesFromBundle(
  measureBundle: R4.IBundle
): {
  cqls: { name: string; cql: string }[];
  rootLibIdentifier: ELMIdentifier;
  elmJSONs: ELM[];
} {
  const measure = extractMeasureFromBundle(measureBundle);
  const rootLibRef = measure.library[0];
  let rootLibId: string;
  if (isValidLibraryURL(rootLibRef)) rootLibId = rootLibRef;
  else rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);

  const libraries: R4.ILibrary[] = [];
  const elmJSONs: ELM[] = [];
  const cqls: { name: string; cql: string }[] = [];
  let rootLibIdentifier: ELMIdentifier = {
    id: '',
    version: ''
  };
  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType == 'Library') {
      const library = e.resource as R4.ILibrary;
      libraries.push(library);
      const elmsEncoded = library.content?.filter(a => a.contentType === 'application/elm+json');
      elmsEncoded?.forEach(elmEncoded => {
        if (elmEncoded.data) {
          const decoded = Buffer.from(elmEncoded.data, 'base64').toString('binary');
          const elm = JSON.parse(decoded) as ELM;
          if (library.url == rootLibId) {
            rootLibIdentifier = elm.library.identifier;
          } else if (library.id === rootLibId) {
            rootLibIdentifier = elm.library.identifier;
          }
          if (elm.library?.includes?.def) {
            elm.library.includes.def = elm.library.includes.def.map(def => {
              def.path = def.path.substring(def.path.lastIndexOf('/') + 1);

              return def;
            });
          }
          elmJSONs.push(elm);
        }
      });

      const cqlsEncoded = library.content?.filter(a => a.contentType === 'text/cql');
      cqlsEncoded?.forEach(elmEncoded => {
        if (elmEncoded.data) {
          const decoded = Buffer.from(elmEncoded.data, 'base64').toString('binary');
          const cql = {
            name: library.name || library.id || 'unknown library',
            cql: decoded
          };
          cqls.push(cql);
        }
      });
    }
  });

  if (rootLibIdentifier.id === '') {
    throw new Error('No Root Library could be identified in provided measure bundle');
  }

  return { cqls, rootLibIdentifier, elmJSONs };
}

export type MeasureWithLibrary = R4.IMeasure & { library: string[] };

export function extractMeasureFromBundle(measureBundle: R4.IBundle): MeasureWithLibrary {
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');

  if (!measureEntry) {
    throw new Error('Measure resource does not exist in provided measure bundle');
  }

  const measure = measureEntry.resource as MeasureWithLibrary;

  if (!measure.library) {
    throw new Error('Measure resource must specify a "library"');
  }

  return measure;
}