/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module 'cql-execution' {
  import { Results, ValueSetMap } from './CQLTypes';

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
    fromJSDate(date: Date, timezoneOffset: number): any;
  };

  export class Interval {
    constructor(start: any, end: any);
  }
}
