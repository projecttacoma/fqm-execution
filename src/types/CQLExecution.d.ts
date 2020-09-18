/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module 'cql-execution' {
  interface CQLCode {
      system: string;
      code: string;
      display?: string;
      version?: string;
  }

  export interface ValueSetMap {
    [key: string]: {
      [key: string]: CQLCode[];
    };
  }

  export interface Results {
    patientResults: {
      [patientId: string]: StatementResults;
    };
    unfilteredResults: any;
    localIdPatientResultsMap: {
      [patientId: string]: LocalIdResults;
    };
  }

  export interface StatementResults {
    [statementName: string]: any;
  }

  export interface LocalIdResults {
    [libraryName: string]: {
      [localId: string]: any;
    };
  }

  export class Library {
    constructor(elm: any, repo?: Repository);
  }

  export class Executor {
    constructor(library: Library, codeService: CodeService, parameters: any);
    exec(patientsource: PatientSource, executionDateTime: any): Results;
  }

  export class Repository {
    constructor(elm: any);
    resolve(libraryName: string, version: string): any;
  }

  export class CodeService {
    constructor(valueSetsJson: ValueSetMap);
  }

  export const DateTime = {
    fromJSDate(date: Date, timezoneOffset: number): any
  };

  export class Interval {
    constructor(start: any, end: any);
  }
}
