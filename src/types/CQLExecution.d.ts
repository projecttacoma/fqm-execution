/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module 'cql-execution' {
  import { Results, ValueSetMap, DateTime } from './CQLTypes';

  export class Library {
    constructor(elm: any, repo?: Repository);
  }

  export class Executor {
    constructor(library: Library, codeService: CodeService, parameters: { [key: string]: any });
    exec(patientsource: IPatientSource, executionDateTime: any): Results;
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
    static parse(string: string): DateTime;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    timezoneOffset: number | undefined;
    toString(): string;
    add(offset: number, field: string): DateTime;
    static Unit: {
      YEAR: 'year';
      MONTH: 'month';
      WEEK: 'week';
      DAY: 'day';
      HOUR: 'hour';
      MINUTE: 'minute';
      SECOND: 'second';
      MILLISECOND: 'millisecond';
    };
  }

  export class Interval {
    constructor(low: any, high: any, lowClosed?: boolean, highClosed?: boolean);
    low: any;
    high: any;
    start(): DateTime;
    end(): DateTime;
    contains(item: any, precision?: any): boolean;
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

  export interface IPatientSource {
    currentPatient(): Patient | undefined;
    nextPatient(): Patient | undefined;
  }

  export interface IRecord {
    get(field: string): any;
    _json: any;
  }

  export interface IPatient extends IRecord {
    findRecords(profile: string): IRecord;
    findRecord(profile: string): IRecord;
    birthDate?: { value: DateTime };
  }
}
