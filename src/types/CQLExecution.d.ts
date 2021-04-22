/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module 'cql-execution' {
  import { Results, ValueSetMap } from './CQLTypes';

  export class Library {
    constructor(elm: any, repo?: Repository);
  }

  export class Executor {
    constructor(library: Library, codeService: CodeService, parameters: { [key: string]: any });
    exec(patientsource: PatientSource, executionDateTime: any): Results;
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
    constructor(low: any, high: any, lowClosed?: boolean, highClosed?: boolean);
    low: any;
    high: any;
    start(): DateTime;
    end(): DateTime;
  }

  export class Code {
    system: string;
    code: string;
  }

  export class Quantity {
    value: number;
    unit: string;
  }

  export class Expression {
    constructor(json: any);
    execute(context: any);
    arg: Expression;
  }

  export class PatientContext {
    constructor(library: Library, patient: any, codeService: any, parameters: any);
  }
}
