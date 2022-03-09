import { PatientObject, DateTime } from 'cql-execution';

export interface CQLPatient extends PatientObject {
  birthDate?: { value: DateTime };
  _json: any;
}
