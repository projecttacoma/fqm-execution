import { R4 } from '@ahryman40k/ts-fhir-types';
import { CalculationOptions, RawExecutionData } from './types/Calculator';

// import { PatientSource } from 'cql-exec-fhir';
import cql from 'cql-execution';
import { PatientSource } from 'cql-exec-fhir';
import { ELM, ELMIdentifier } from './types/ELMTypes';
import { dumpELMJSONs, dumpObject, dumpVSMap } from './DebugHelper';
import { parseTimeStringAsUTC, valueSetsForCodeService } from './ValueSetHelper';
import { group } from 'console';
import { codeableConceptToPopulationType } from './MeasureHelpers';
import { PopulationType } from './types/Enums';
import { generateELMJSONFunction } from './CalculatorHelpers';

export function execute(
  measureBundle: R4.IBundle,
  patientBundles: R4.IBundle[],
  options: CalculationOptions
): RawExecutionData {
  // Determine "root" library by looking at which lib is referenced by populations, and pull out the ELM
  const measureEntry = measureBundle.entry?.find(e => e.resource?.resourceType === 'Measure') as R4.IBundle_Entry;
  const measure = measureEntry.resource as R4.IMeasure;
  if (measure?.library === undefined) {
    // TODO: handle no library case
    return { errorMessage: 'library not identified in measure' };
  }
  const rootLibRef = measure?.library[0];
  const rootLibId = rootLibRef.substring(rootLibRef.indexOf('/') + 1);

  const libraries: R4.ILibrary[] = [];
  const elmJSONs: ELM[] = [];
  let rootLibIdentifer: ELMIdentifier = {
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
          if (library.id === rootLibId) {
            rootLibIdentifer = elm.library.identifier;
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
    }
  });

  // TODO: throw an error here if we can't find the root lib
  if (rootLibIdentifer.id === '') {
    return { errorMessage: 'no library' };
  }

  const valueSets: R4.IValueSet[] = [];
  measureBundle.entry?.forEach(e => {
    if (e.resource?.resourceType === 'ValueSet') {
      valueSets.push(e.resource as R4.IValueSet);
    }
  });
  const vsMap = valueSetsForCodeService(valueSets);

  // Measure datetime stuff
  let start;
  let end;
  if (options.measurementPeriodStart) {
    start = parseTimeStringAsUTC(options.measurementPeriodStart);
  } else {
    start = new Date('2019-01-01');
  }
  if (options.measurementPeriodEnd) {
    end = parseTimeStringAsUTC(options.measurementPeriodEnd);
  } else {
    end = new Date('2019-12-31');
  }
  const startCql = cql.DateTime.fromJSDate(start, 0); // No timezone offset for start
  const endCql = cql.DateTime.fromJSDate(end, 0); // No timezone offset for stop

  const patientSource = new PatientSource.FHIRv401();
  patientSource.loadBundles(patientBundles);

  // add expressions for collecting for all measure observations
  measure.group?.forEach(group => {
    group.population
      ?.filter(population => codeableConceptToPopulationType(population.code) === PopulationType.OBSERV)
      ?.forEach(obsrvPop => {
        const msrPop = group.population?.find(
          population => codeableConceptToPopulationType(population.code) === PopulationType.MSRPOPL
        );
        if (msrPop?.criteria?.expression && obsrvPop.criteria?.expression) {
          const mainLib = elmJSONs.find(elm => elm.library.identifier.id === rootLibIdentifer.id);
          if (mainLib) {
            mainLib.library.statements.def.push(
              generateELMJSONFunction(obsrvPop.criteria.expression, msrPop.criteria.expression)
            );
          }
        }
      });
  });

  const codeService = new cql.CodeService(vsMap);
  const parameters = { 'Measurement Period': new cql.Interval(startCql, endCql) };
  const executionDateTime = cql.DateTime.fromJSDate(new Date(), 0);
  const rep = new cql.Repository(elmJSONs);
  const lib = rep.resolve(rootLibIdentifer.id, rootLibIdentifer.version);

  dumpELMJSONs(elmJSONs);
  dumpVSMap(vsMap);

  const executor = new cql.Executor(lib, codeService, parameters);
  const results = executor.exec(patientSource, executionDateTime);

  dumpObject(results, 'rawResults.json');
  return { rawResults: results, elmLibraries: elmJSONs, mainLibraryName: rootLibIdentifer.id };
}
