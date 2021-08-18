/**
 * Defines the custom errors used in fqm-execution and the use cases for each one.
 * NOTE: regular Errors are also thrown in certain situations where we have limited
 * information on the crash.
 */

import { DebugOutput } from '../Calculator';

export class ErrorWithDebugInfo extends Error {
  debugOutput: any;

  constructor(message: string, debugOutput: DebugOutput | undefined = undefined) {
    super(message);
    this.debugOutput = debugOutput;
  }
}

/** Thrown when a resource is improperly formatted or empty
ex. patient bundle has no entries, measure bundle has no libraries*/
export class UnexpectedResource extends ErrorWithDebugInfo {
  name: string;
  constructor(message: string, debugOutput = undefined) {
    super(message, debugOutput);
    this.name = 'UnexpectedResource';
  }
}
/** Used when a resource largely valid/syntactically correct, but has conflicting
info, is impossibly formatted, or is missing specific needed fields
ex. Measure Bundle does not contain improvement notation */
export class UnexpectedProperty extends ErrorWithDebugInfo {
  name: string;
  constructor(message: string, debugOutput = undefined) {
    super(message, debugOutput);
    this.name = 'UnexpectedProperty';
  }
}

/** Used when all resources are valid but are requesting services we do not yet support
ex. user is trying to calculate measure reports with a report type other than 'summary' or 'individual'*/
export class UnsupportedProperty extends ErrorWithDebugInfo {
  name: string;
  constructor(message: string, debugOutput = undefined) {
    super(message, debugOutput);
    this.name = 'UnsupportedProperty';
  }
}
