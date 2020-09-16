#!/usr/bin/env ts-node --files

import { R4 } from '@ahryman40k/ts-fhir-types';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { calculateRaw } from './Calculator';

program
  .requiredOption('-m, --measure-bundle <measure-bundle>', 'path to measure bundle')
  .requiredOption('-p, --patient-bundle <patient-bundle>', 'path to  patient bundle')
  .parse(process.argv);

function parseBundle(filePath: string): R4.IBundle {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as R4.IBundle;
}

const measureBundle = parseBundle(path.resolve(program.measureBundle));
const patientBundle = parseBundle(path.resolve(program.patientBundle));

const result = calculateRaw(measureBundle, [patientBundle], {});
console.log(JSON.stringify(result, null, 2));
