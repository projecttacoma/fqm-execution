import { PopulationType, MeasureScoreType, CompositeScoreType } from '../types/Enums';
import { CalculationOptions, ComponentResults, PopulationResult, valueSetOutput } from '../types/Calculator';
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
const IMPROVEMENT_NOTATION_EXT = 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-improvementNotation';

export function getImprovementNotationFromGroup(group?: fhir4.MeasureGroup): string | null {
  return (
    group?.extension?.find(ext => ext.url === IMPROVEMENT_NOTATION_EXT)?.valueCodeableConcept?.coding?.[0].code ?? null
  );
}

export function getScoringCodeFromGroup(group?: fhir4.MeasureGroup): string | null {
  return group?.extension?.find(ext => ext.url === SCORING_CODE_EXT)?.valueCodeableConcept?.coding?.[0].code ?? null;
}

export function getScoringCodeFromMeasure(measure: fhir4.Measure): string | undefined {
  return measure.scoring?.coding?.find(
    c =>
      c.system === 'http://hl7.org/fhir/measure-scoring' ||
      c.system === 'http://terminology.hl7.org/CodeSystem/measure-scoring'
  )?.code;
}

export function getCompositeScoringFromMeasure(measure: fhir4.Measure): CompositeScoreType | undefined {
  return measure.compositeScoring?.coding?.find(
    c => c.system === 'http://terminology.hl7.org/CodeSystem/composite-measure-scoring'
  )?.code as CompositeScoreType | undefined;
}

/**
 * Extracts all component measures that are defined on the relatedArtifact of a composite measure.
 * @param compositeMeasureResource composite measure resource
 * @param measureBundle FHIR Measure Bundle
 * @returns array of measures with libraries included
 */
export function extractComponentsFromMeasure(
  compositeMeasureResource: fhir4.Measure,
  measureBundle: fhir4.Bundle
): MeasureWithLibrary[] {
  const componentRefs = compositeMeasureResource.relatedArtifact?.filter(ra => ra.type === 'composed-of');
  if (componentRefs == null || componentRefs.length < 2) {
    throw new Error('Composite measures must specify at least two components');
  }

  const uniqueCanonicalsFromComposite = new Set(componentRefs.map(ra => ra.resource as string));

  const allMeasuresInBundle =
    measureBundle.entry
      ?.filter(
        e =>
          // Ensure that only measures with logic libraries should be considered
          e.resource?.resourceType === 'Measure' && (e.resource as fhir4.Measure).url !== compositeMeasureResource.url
      )
      .map(e => e.resource as fhir4.Measure) ?? [];

  const uniqueCanonicalsInBundle = new Set(allMeasuresInBundle.map(m => `${m.url}${m.version ? `|${m.version}` : ''}`));

  const missingCanonicalsInBundle = new Set(
    [...uniqueCanonicalsFromComposite].filter(c => !uniqueCanonicalsInBundle.has(c))
  );

  if (missingCanonicalsInBundle.size > 0) {
    throw new Error(`Missing components from measure bundle: "${[...missingCanonicalsInBundle].join(', ')}"`);
  }

  return allMeasuresInBundle.filter(measure => {
    if (!measure.library) {
      throw new UnexpectedProperty(`Measure resource "Measure/${measure.id}" must specify a "library"`);
    }

    if (!measure.url) return false;

    if (uniqueCanonicalsFromComposite.has(measure.url)) {
      return true;
    }

    if (measure.version) {
      return uniqueCanonicalsFromComposite.has(`${measure.url}|${measure.version}`);
    }

    return false;
  }) as MeasureWithLibrary[];
}

export function extractCompositeMeasure(measureBundle: fhir4.Bundle): fhir4.Measure | undefined {
  const allCompositeMeasures = measureBundle.entry
    ?.filter(
      e =>
        e.resource?.resourceType === 'Measure' && getScoringCodeFromMeasure(e.resource as fhir4.Measure) === 'composite'
    )
    ?.map(e => e.resource as fhir4.Measure);

  if (!allCompositeMeasures || allCompositeMeasures.length === 0) {
    return undefined;
  }

  if (allCompositeMeasures.length > 1) {
    throw new Error(
      'Composite measure calculation must only include one composite Measure resource in the measure bundle'
    );
  }

  return allCompositeMeasures[0];
}

/**
 * Extracts CQFM Group Id from a given composite measure Related Artifact.
 * https://build.fhir.org/ig/HL7/cqf-measures/StructureDefinition-cqfm-groupId.html
 * @param relatedArtifact related artifact defined on the composite measure
 * @returns group id, if defined
 */
export function getGroupIdForComponent(relatedArtifact: fhir4.RelatedArtifact): string | null {
  const groupIdExtension = relatedArtifact.extension?.filter(
    ({ url }) => url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-groupId'
  );
  if (groupIdExtension && groupIdExtension.length > 1) {
    throw new Error(
      `Only one CQFM Group Id extension can be defined on a component, but ${groupIdExtension.length} were provided.`
    );
  }
  return groupIdExtension?.[0]?.valueString ?? null;
}

/**
 * Extracts CQFM Weight from a given composite measure Related Artifact.
 * https://build.fhir.org/ig/HL7/cqf-measures/StructureDefinition-cqfm-weight.html
 * @param relatedArtifact related artifact defined on the composite measure
 * @returns weight extension value, if defined
 */
export function getWeightForComponent(relatedArtifact: fhir4.RelatedArtifact): number | null {
  const weightExtension = relatedArtifact.extension?.filter(
    ({ url }) => url === 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-weight'
  );

  if (weightExtension && weightExtension.length > 1) {
    throw new Error(
      `Only one CQFM Weight extension can be defined on a component, but ${weightExtension.length} were provided.`
    );
  }
  return weightExtension?.[0]?.valueDecimal ?? null;
}

/**
 * Filters component results using mapping of group ids defined by the CQFM Group Id extension on the
 * composite measure. Throws error if a component contains multiple groups but no group is specified to
 * be used for measure score calculation.
 * @param componentGroupIds mapping of components to group ids defined by the CQFM Group Id extension on the composite
 * @param componentResults array of component results from detailed results
 * @returns component results, filtered by desired group Ids
 */
export function filterComponentResults(
  componentGroupIds: Record<string, Record<string, number> | number>,
  componentResults?: ComponentResults[]
): ComponentResults[] {
  const filteredComponentResults = componentResults?.filter(cr => {
    // keep component result if its group matches the group defined on the group Id extension
    if (
      cr.componentCanonical &&
      typeof componentGroupIds[cr.componentCanonical] === 'object' &&
      Object.keys(componentGroupIds[cr.componentCanonical]).includes(cr.groupId)
    ) {
      return true;
    }
    // keep component result if only one group is defined for the given component
    else if (
      cr.componentCanonical &&
      typeof componentGroupIds[cr.componentCanonical] === 'number' &&
      componentResults.filter(c => c.componentCanonical === cr.componentCanonical).length === 1
    ) {
      return true;
    } else {
      // throw error if no group Id is defined for the component
      if (
        cr.componentCanonical &&
        componentGroupIds[cr.componentCanonical] &&
        typeof componentGroupIds[cr.componentCanonical] === 'number' &&
        componentResults.filter(c => c.componentCanonical === cr.componentCanonical).length > 1
      ) {
        throw new Error(
          'For component measures that contain multiple population groups, the composite measure SHALL specify a specific group, but no group was specified.'
        );
      }
    }
  });
  // throw error if defined group Id does not correspond to a group on the component
  for (const key in componentGroupIds) {
    const definedGroupIds = componentResults?.filter(cr => cr.componentCanonical === key).map(cr => cr.groupId) ?? [];
    if (typeof componentGroupIds[key] === 'object') {
      Object.keys(componentGroupIds[key]).forEach(groupId => {
        if (!definedGroupIds.includes(groupId)) {
          throw new Error(
            'For component measures that contain multiple population groups, the composite measure SHALL specify a specific group. The specified group does not exist.'
          );
        }
      });
    }
  }
  return filteredComponentResults ?? [];
}

/**
 * Checks if a given measure/measure group has scoring code 'ratio.'
 * @param group measure group (used to extract scoring code if present on the group)
 * @param measureScoringCode scoring code for measure (used if scoring code not provided at the group level)
 * @returns true if scoring code is 'ratio' for the group or at the measure root, false otherwise
 */
export function isRatioMeasure(group?: fhir4.MeasureGroup, measureScoringCode?: string): boolean {
  return getScoringCodeFromGroup(group) === MeasureScoreType.RATIO || measureScoringCode === MeasureScoreType.RATIO;
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
    if (criteriaCode && desiredObservation) {
      return (
        popResults.find(
          e =>
            e.criteriaExpression === criteriaCode && (e.populationId ? e.populationId === desiredObservation.id : true)
        ) ?? null
      );
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
 * Pulls the measurement period out of the provided FHIR Measure resource, assuming one is set.
 * NOTE: the default start/end values are also set in Execution.ts
 * so if this date is changed from 2019 it must also be changed there
 *
 * @param measure FHIR Measure resource
 * @returns {CalculationOptions} object with only the measurement period start/end fields filled out,
 * or the year 2019 set as the calculation period if not set in the Measure.
 */
export function extractMeasurementPeriod(measure: fhir4.Measure): CalculationOptions {
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

/**
 * Returns the cqls, rootLibIdentifier, and elmJSONs for a collection of libraries
 * within a Library Bundle
 */
export function extractLibrariesFromLibraryBundle(
  libraryBundle: fhir4.Bundle,
  rootLibRef: string
): {
  cqls: ExtractedLibrary[];
  rootLibIdentifier: ELMIdentifier;
  elmJSONs: ELM[];
} {
  const { libId: rootLibId, libVersion: rootLibVersion } = parseLibRef(rootLibRef);

  const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromBundle(libraryBundle, rootLibId, rootLibVersion);

  if (rootLibIdentifier.id === '') {
    throw new UnexpectedResource('No Root Library could be identified in provided library bundle');
  }

  return { cqls, rootLibIdentifier, elmJSONs };
}

/**
 * Parses a library reference as canonical url or Library/id to an id and version.
 *
 * @param rootLibRef
 * @returns Library id and version
 */
export function parseLibRef(libRef: string): { libId: string; libVersion: string | undefined } {
  let libId: string;
  let libVersion: string | undefined;
  if (isValidLibraryURL(libRef)) {
    if (libRef.includes('|')) {
      const splitLibRef = libRef.split('|');
      libId = splitLibRef[0];
      libVersion = splitLibRef[1];
    } else {
      libId = libRef;
    }
  } else libId = libRef.substring(libRef.indexOf('/') + 1);

  return { libId, libVersion };
}

/**
 * Returns the cqls, rootLibIdentifier, and elmJSONs for a collection of libraries
 * within a Bundle
 */
export function extractLibrariesFromBundle(
  bundle: fhir4.Bundle,
  rootLibId: string,
  rootLibVersion?: string
): {
  cqls: ExtractedLibrary[];
  rootLibIdentifier: ELMIdentifier;
  elmJSONs: ELM[];
} {
  const libraries: fhir4.Library[] = [];
  const elmJSONs: ELM[] = [];
  const cqls: { name: string; cql: string }[] = [];
  let rootLibIdentifier: ELMIdentifier = {
    id: '',
    version: ''
  };
  bundle.entry?.forEach(e => {
    if (e.resource?.resourceType == 'Library') {
      const library = e.resource as fhir4.Library;
      libraries.push(library);
      const elmsEncoded = library.content?.filter(a => a.contentType === 'application/elm+json');
      elmsEncoded?.forEach(elmEncoded => {
        if (elmEncoded.data) {
          const decoded = Buffer.from(elmEncoded.data, 'base64').toString('binary');
          const elm = JSON.parse(decoded) as ELM;
          // If url matches and we have a defined rootLibVersion, check that version matches also
          if (library.url === rootLibId && (!rootLibVersion || library.version === rootLibVersion)) {
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
  return { cqls, rootLibIdentifier, elmJSONs };
}

/**
 * Returns the cqls, rootLibIdentifier, and elmJSONs for a collection of libraries
 * within a Measure Bundle
 */
export function extractLibrariesFromMeasureBundle(
  measureBundle: fhir4.Bundle,
  measure?: MeasureWithLibrary
): {
  cqls: ExtractedLibrary[];
  rootLibIdentifier: ELMIdentifier;
  elmJSONs: ELM[];
} {
  const rootLibRef = measure ? measure.library[0] : extractMeasureFromBundle(measureBundle).library[0];
  let rootLibId: string;
  if (isValidLibraryURL(rootLibRef)) rootLibId = rootLibRef;
  else rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);

  const { cqls, rootLibIdentifier, elmJSONs } = extractLibrariesFromBundle(measureBundle, rootLibId);

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
    throw new UnexpectedProperty(`Measure resource "Measure/${measure.id}" must specify a "library"`);
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
