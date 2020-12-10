/**
 * This will shell out either the cli or export the library functions to actually execute 
 * the tests against the measures
 */
//think these are the imports I need but I'm not sure 
import { R4 } from '@ahryman40k/ts-fhir-types';
import {
  ExecutionResult,
  CalculationOptions,
  PopulationResult,
  DetailedPopulationGroupResult
} from './src/Calculator';

// need to export the functions first:

//find data in folder
//run measure
//catch failures
//store results