/* eslint-disable @typescript-eslint/ban-types */

import fs from 'fs';
import path from 'path';
import * as translationService from 'cql-translation-service-client';

const TRANSLATION_SERVICE_URL = 'http://localhost:8080/cql/translator';

const client = new translationService.Client(TRANSLATION_SERVICE_URL);

// This interface is extended here to add the "annotation" property
// because the client type sets its value type to "object" rather than "object[]"
interface ElmLibrary extends translationService.ElmLibrary {
  library: {
    identifier: {
      id: string;
      version: string;
    };
    schemaIdentifier: {
      id: string;
      version: string;
    };
    usings?: {
      def: translationService.ElmUsing[];
    };
    includes?: {
      def: translationService.ElmIncludes[];
    };
    valueSets?: {
      def: translationService.ElmValueSet[];
    };
    codes?: {
      def: translationService.ElmCode[];
    };
    codeSystems?: {
      def: translationService.ElmCodeSystem[];
    };
    concepts?: {
      def: object[];
    };
    statements: {
      def: translationService.ElmStatement[];
    };
    annotation: object[];
    [x: string]: object | undefined;
  };
}

/**
 * Translate all cql
 *
 * @returns {translationService.ElmLibraries} ELM from translator
 */
async function translateCQL(): Promise<translationService.ElmLibraries> {
  const cqlPath = path.resolve(path.join(__dirname), './');
  const cqlFiles = fs.readdirSync(cqlPath).filter(f => path.extname(f) === '.cql');
  const cqlRequestBody: translationService.CqlLibraries = {};

  cqlFiles.forEach(f => {
    cqlRequestBody[path.basename(f, '.cql')] = {
      cql: fs.readFileSync(path.join(cqlPath, f), 'utf8')
    };
  });

  const elm = await client.convertCQL(cqlRequestBody);
  return elm;
}

/**
 * Find any errors found in the ELM annotation
 *
 * @param {ElmLibrary} elm ELM JSON to look for errors in
 * @returns {object[]} annotations with severity error
 */
function processErrors(elm: ElmLibrary): object[] {
  const errors: object[] = [];

  // Check annotations for errors. If no annotations, no errors
  if (elm.library.annotation) {
    elm.library.annotation.forEach((a: any) => {
      if (a.errorSeverity === 'error') {
        errors.push(a as object);
      }
    });
  }

  return errors;
}

translateCQL()
  .then(libraries => {
    const buildPath = path.join(__dirname, './output');
    Object.entries(libraries).forEach(([libName, elm]) => {
      const errors = processErrors(elm as ElmLibrary);
      if (errors.length === 0) {
        const elmPath = path.join(buildPath, `${libName}.json`);
        fs.writeFileSync(elmPath, JSON.stringify(elm), 'utf8');
        console.log(`Wrote ELM to ${elmPath}`);
      } else {
        console.error('Error translating to ELM');
        console.error(errors);
        process.exit(1);
      }
    });
  })
  .catch(e => {
    console.error(`HTTP error translating CQL: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  });
