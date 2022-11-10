import { PopulationType, MeasureScoreType } from '../types/Enums';
import { CalculationOptions, PopulationResult, valueSetOutput } from '../types/Calculator';
import { ELM, ELMIdentifier } from '../types/ELMTypes';
import { UnexpectedProperty, UnexpectedResource } from '../types/errors/CustomErrors';
import { getMissingDependentValuesets } from '../execution/ValueSetHelper';
import { ValueSetResolver } from '../execution/ValueSetResolver';
import { ExtractedLibrary } from '../types/CQLTypes';

/**
 * The extension that defines the population basis. This is used to determine if the measure is an episode of care or
 * patient based measure.
 */
const POPULATION_BASIS_EXT = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis';
const SCORING_CODE_EXT = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-scoring';

export function getScoringCodeFromGroup(group: fhir4.MeasureGroup): string | null {
  return group?.extension?.find(ext => ext.url === SCORING_CODE_EXT)?.valueCodeableConcept?.coding?.[0].code ?? null;
}

export function getScoringCodeFromMeasure(measure: fhir4.Measure): string | null {
  return (
    measure.scoring?.coding?.find(
      c =>
        c.system === 'http://hl7.org/fhir/measure-scoring' ||
        c.system === 'http://terminology.hl7.org/CodeSystem/measure-scoring'
    )?.code ?? null
  );
}

/**
 * Check if a measure is an episode of care measure or not. Look for the cqfm-populationBasis extension.
 * If it is found return true if valueCode is not 'boolean' otherwise return false.
 *
 * @param {fhir4.Measure} measure FHIR Measure resource.
 * @returns {boolean} true if this is an episode of care, false if it is a patient measure.
 */
export function isEpisodeOfCareMeasure(measure: fhir4.Measure): boolean {
  const popBasisExt = measure.extension?.find(ext => ext.url == POPULATION_BASIS_EXT);
  if (popBasisExt != undefined) {
    return popBasisExt.valueCode !== 'boolean';
  } else {
    return false;
  }
}

/**
 * Check if a group is an episode of care group or not. Look for the cqfm-populationBasis extension.
 * If it is found return true if valueCode is not 'boolean'. If the extension cannot be found, fallback
 * to looking at the measure.
 *
 * @param {fhir4.Measure} measure FHIR Measure resource.
 * @returns {boolean} true if this is an episode of care, false if it is a patient measure.
 */
export function isEpisodeOfCareGroup(measure: fhir4.Measure, group: fhir4.MeasureGroup): boolean {
  const popBasisExt = group.extension?.find(ext => ext.url == POPULATION_BASIS_EXT);
  if (popBasisExt != undefined) {
    return popBasisExt.valueCode !== 'boolean';
  } else if (
    getScoringCodeFromGroup(group) === MeasureScoreType.RATIO ||
    getScoringCodeFromMeasure(measure) === MeasureScoreType.RATIO
  ) {
    const populationsWithBasis = group.population?.filter(
      p =>
        codeableConceptToPopulationType(p.code) !== PopulationType.OBSERV &&
        p.extension?.find(ext => ext.url === POPULATION_BASIS_EXT) != null
    );

    if (populationsWithBasis && populationsWithBasis.length > 0) {
      return populationsWithBasis.some(
        p => p.extension?.find(ext => ext.url === POPULATION_BASIS_EXT)?.valueCode !== 'boolean'
      );
    }

    return isEpisodeOfCareMeasure(measure);
  } else {
    return isEpisodeOfCareMeasure(measure);
  }
}

/**
 * Measure Observation populations can specify which population in the measure they are drawing observations from (e.g. Numerator/Denominator/etc.)
 * This is done by referencing the ID of that population in the valueString of the cqfm-criteriaReference extension
 * This function identifies the ID used in one of those measure observation populations
 *
 * @param population within a Measure resource that may reference another population within the same Measure
 * @returns the corresponding ID from the extension used in the population, or null if none is found
 */
export function getCriteriaReferenceIdFromPopulation(population: fhir4.MeasureGroupPopulation): string | null {
  return (
    population.extension?.find(
      e => e.url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-criteriaReference'
    )?.valueString ?? null
  );
}

export function hasMultipleIPPs(group: fhir4.MeasureGroup) {
  return (
    (group.population?.filter(p => codeableConceptToPopulationType(p.code) === PopulationType.IPP) ?? []).length > 1
  );
}

/**
 * Uses the criteriaReference extension for a given population to look up which IPP it draws from
 * This is useful in the case of multiple IPPs in ratio measures, as the numerator and denominator can each draw from
 * different IPPs
 */
export function getRelevantIPPFromPopulation(
  group: fhir4.MeasureGroup,
  fromPopulationType: PopulationType
): fhir4.MeasureGroupPopulation | null {
  const fromPopulation = group.population?.find(p => codeableConceptToPopulationType(p.code) === fromPopulationType);
  if (fromPopulation == null) {
    return null;
  }

  const ippId = getCriteriaReferenceIdFromPopulation(fromPopulation);

  if (ippId == null) {
    return null;
  }

  return group.population?.find(p => p.id === ippId) ?? null;
}

/**
 * Finds the measure observation that references the desired population in its criteria reference
 * and returns its populationResult
 */
export function getObservationResultForPopulation(
  group: fhir4.MeasureGroup,
  popResults: PopulationResult[],
  desiredPopulationType: PopulationType
): PopulationResult | null {
  const popId = group?.population?.find(pop => codeableConceptToPopulationType(pop.code) === desiredPopulationType)?.id;

  if (popId) {
    const desiredObservation = group?.population?.find(pop => {
      return (
        codeableConceptToPopulationType(pop.code) === PopulationType.OBSERV &&
        getCriteriaReferenceIdFromPopulation(pop) === popId
      );
    });

    const criteriaCode = desiredObservation?.criteria?.expression;
    if (criteriaCode) {
      return popResults.find(e => e.criteriaExpression === criteriaCode) ?? null;
    }
  }

  return null;
}

/**
 * Population Type Code system.
 */
const POPULATION_TYPE_CODESYSTEM = 'http://terminology.hl7.org/CodeSystem/measure-population';

/**
 * Converts FHIR CodeableConcept value for the measure population type to a PopulationType enum value.
 *
 * @param {fhir4.CodeableConcept|undefined} concept The FHIR CodeableConcept value for the measure population.
 * @returns {PopulationType|null} null if not a proper population type. The PopulationType if it is.
 */
export function codeableConceptToPopulationType(concept: fhir4.CodeableConcept | undefined): PopulationType | null {
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
 * @param {fhir4.Bundle} measureBundle the FHIR Bundle object containing the Measure resource.
 * @returns {CalculationOptions} object with only the measurement period start/end fields filled out,
 * or the year 2019 set as the calculation period if not set in the Measure.
 */
export function extractMeasurementPeriod(measureBundle: fhir4.Bundle): CalculationOptions {
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');
  if (!measureEntry || !measureEntry.resource) {
    throw new UnexpectedResource('Measure resource was not found in provided measure bundle');
  }
  const measure = measureEntry.resource as fhir4.Measure;
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

export function extractLibrariesFromBundle(measureBundle: fhir4.Bundle): {
  cqls: ExtractedLibrary[];
  rootLibIdentifier: ELMIdentifier;
  elmJSONs: ELM[];
} {
  const measure = extractMeasureFromBundle(measureBundle);
  const rootLibRef = measure.library[0];
  let rootLibId: string;
  if (isValidLibraryURL(rootLibRef)) rootLibId = rootLibRef;
  else rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);

  const libraries: fhir4.Library[] = [];
  const elmJSONs: ELM[] = [];
  const cqls: { name: string; cql: string }[] = [];
  let rootLibIdentifier: ELMIdentifier = {
    id: '',
    version: ''
  };
  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType == 'Library') {
      const library = e.resource as fhir4.Library;
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
    throw new UnexpectedResource('No Root Library could be identified in provided measure bundle');
  }

  return { cqls, rootLibIdentifier, elmJSONs };
}

export type MeasureWithLibrary = fhir4.Measure & { library: string[] };

export function extractMeasureFromBundle(measureBundle: fhir4.Bundle): MeasureWithLibrary {
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure');

  if (!measureEntry) {
    throw new UnexpectedResource('Measure resource does not exist in provided measure bundle');
  }

  const measure = measureEntry.resource as MeasureWithLibrary;

  if (!measure.library) {
    throw new UnexpectedProperty('Measure resource must specify a "library"');
  }

  return measure;
}

/**
 * Detects missing ValueSets in the given measure bundle, retrieves them from VSAC, and adds
 * them as entries to the measure bundle.
 * @param {fhir4.Bundle} measureBundle the FHIR Bundle object containing the Measure resource
 * @param {CalculationOptions} options Options for calculation (may contain API key as an attribute)
 * @return {fhir4.Bundle} measure bundle with entries for missing ValueSets (fetched from VSAC)
 */
export async function addValueSetsToMeasureBundle(
  measureBundle: fhir4.Bundle,
  options: CalculationOptions
): Promise<valueSetOutput> {
  const missingVS = getMissingDependentValuesets(measureBundle);
  if (missingVS.length > 0) {
    const valueSets: fhir4.ValueSet[] = [];
    if (!options.vsAPIKey) {
      throw new UnexpectedResource(
        `Missing the following valuesets: ${missingVS.join(', ')}, and no API key was provided to resolve them`
      );
    }

    const vsr = new ValueSetResolver(options.vsAPIKey);
    const [expansions, errorMessages] = await vsr.getExpansionForValuesetUrls(missingVS);

    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join('\n'));
    }

    valueSets.push(...expansions);

    const newBundle: fhir4.Bundle = measureBundle;
    valueSets.forEach(vs => {
      newBundle.entry?.push({ resource: vs, request: { method: 'PUT', url: `ValueSet/${vs.id}` } });
    });
    return {
      results: newBundle
    };
  }
  // measure bundle is not missing any value sets
  return { results: measureBundle };
}
