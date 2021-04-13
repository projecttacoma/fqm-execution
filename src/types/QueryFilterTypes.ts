import { R4 } from '@ahryman40k/ts-fhir-types';

export type AnyFilter =
  | Filter
  | AttributeFilter
  | AndFilter
  | OrFilter
  | UnknownFilter
  | InFilter
  | DuringFilter
  | NotNullFilter
  | EqualsFilter
  | TautologyFilter;

/** Detailed information about a query and the filtering it does. */
export interface QueryInfo {
  localId?: string;
  sources: SourceInfo[];
  filter: AnyFilter;
}

export interface SourceInfo {
  retrieveLocalId?: string;
  sourceLocalId?: string;
  alias: string;
  resourceType: string;
}

export interface Filter {
  type: string;
  localId?: string;
}

export interface AndFilter extends Filter {
  type: 'and';
  children: AnyFilter[];
}

export interface OrFilter extends Filter {
  type: 'or';
  children: AnyFilter[];
}

interface AttributeFilter extends Filter {
  alias: string;
  attribute: string;
}

export interface InFilter extends AttributeFilter {
  type: 'in';
  valueCodingList?: R4.ICoding[];
  valueList?: (string | number)[];
}

export interface DuringFilter extends AttributeFilter {
  type: 'during';
  valuePeriod: {
    ref?: string;
    start?: string;
    end?: string;
  };
}

export interface NotNullFilter extends AttributeFilter {
  type: 'notnull';
}

export interface EqualsFilter extends AttributeFilter {
  type: 'equals';
  value: string | number;
}

export interface UnknownFilter extends Filter {
  type: 'unknown';
  alias?: string;
  attribute?: string;
}

/**
 * Represents something that will always be true and can be removed. eg. checking if
 * the end of the Measurement Period exists.
 */
export interface TautologyFilter extends Filter {
  type: 'truth';
}
