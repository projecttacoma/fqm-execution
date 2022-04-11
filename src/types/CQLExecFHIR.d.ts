declare module 'cql-exec-fhir' {
  import { IPatientSource, IPatient, IRecord } from 'cql-execution';
  class FHIRObject implements IRecord {
    get(field: string): any;
  }
  class Patient extends FHIRObject implements IPatient {
    findRecords(profile: string): FHIRObject;
    findRecord(profile: string): FHIRObject;
  }
  class AsyncPatient extends FHIRObject implements IPatient {
    findRecords(profile: string): FHIRObject;
  }
  export class PatientSource implements IPatientSource {
    constructor();
    loadBundles(bundles: fhir4.Bundle[]): void;
    currentPatient(): Patient | undefined;
    nextPatient(): Patient | undefined;
    reset(): void;
    static FHIRv401(shouldCheckProfile?: boolean): PatientSource;
  }
  export class AsyncPatientSource {
    constructor(serverInfo: string);
    loadPatientIds(ids: string[]): void;
    currentPatient(): AsyncPatient | undefined;
    nextPatient(): AsyncPatient | undefined;
    reset: void;
    static FHIRv401(serverInfo: string, shouldCheckProfile?: boolean): AsyncPatientSource;
  }
  export class FHIRWrapper {
    constructor(filePathOrXML: string);
    wrap(fhirJson: R4, fhirResourceType?: string): any;
    static FHIRv401(): FHIRWrapper;
  }
}
