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

  export class Library {
    constructor(elm: any, repo?: Repository);
  }

  export class Executor {
    constructor(library: Library, codeService: CodeService, parameters: any);
    exec(patientsource: PatientSource, executionDateTime: any): any;
  }

  export class Repository {
    constructor(elm: any);
    resolve(libraryName: string, version: string): any;
  }

  export class CodeService {
    constructor(valueSetsJson: ValueSetMap);
  }

  export class DateTime {
    static fromJSDate(date: Date, timezoneOffset: number): any;
    toString(): string;
  }

  export class Interval {
    constructor(start: any, end: any);
    low: any;
    high: any;
  }

  export class Code {
    system: string;
    code: string;
  }

  export class Quantity {
    value: number;
    unit: string;
  }
}
