import { Interval } from 'cql-execution';
import { GracefulError } from './errors/GracefulError';

/** Any type of query filter. */
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

/**
 * Detailed information about a query and the filtering it does.
 */
export interface QueryInfo {
  localId?: string;
  sources: SourceInfo[];
  filter: AnyFilter;
  libraryName?: string;
  withError?: GracefulError;
}

/**
 * Information about a single source in a query.
 */
export interface SourceInfo {
  retrieveLocalId?: string;
  sourceLocalId?: string;
  alias: string;
  resourceType: string;
}

/**
 * Information for that all filters contain.
 */
export interface Filter {
  type: string;
  localId?: string;
  notes?: string;
  libraryName?: string;
  withError?: GracefulError;
}

/**
 * Represents an `and` filter. Which is a collection of filters that must all be true.
 */
export interface AndFilter extends Filter {
  type: 'and';
  children: AnyFilter[];
}

/**
 * Represents a `or` filter. Collection of filters where one must be true.
 */
export interface OrFilter extends Filter {
  type: 'or';
  children: AnyFilter[];
}

/**
 * "Abstract" interface for a filter that checks the value of an attribute of a source resource.
 */
export interface AttributeFilter extends Filter {
  alias: string;
  attribute: string;
}

/**
 * Represents a filter on a value that should be in a list of items. This can either be a list of
 * FHIR Codings or list of strings or numbers.
 */
export interface InFilter extends AttributeFilter {
  type: 'in';
  valueCodingList?: fhir4.Coding[];
  valueList?: (string | number)[];
}

/**
 * Represents a filter on a time value that should be in a specified time period.
 */
export interface DuringFilter extends AttributeFilter {
  type: 'during';
  valuePeriod: {
    start?: string;
    end?: string;
    interval?: Interval;
  };
}

/**
 * Represents a filter that checks if a value is not null.
 */
export interface NotNullFilter extends AttributeFilter {
  type: 'notnull';
}

/**
 * Represents a filter that checks if a value is equal to another value.
 */
export interface EqualsFilter extends AttributeFilter {
  type: 'equals';
  value: string | number;
}

/**
 * Represents a filter that we were unable to parse.
 */
export interface UnknownFilter extends Filter {
  type: 'unknown';
  alias?: string;
  attribute?: string;
}

/**
 * Represents a filter that will always be true and can be removed. eg. checking if
 * the end of the Measurement Period exists.
 */
export interface TautologyFilter extends Filter {
  type: 'truth';
}

export interface ParsedFilterInterval {
  start?: string;
  end?: string;
  interval?: Interval;
}

/**
 * Represents query object containing endpoint and object for query parameters
 * and their corresponding values.
 */
export interface codeFilterQuery {
  endpoint: string;
  params: Record<string, string | undefined>;
}

export interface ValueFilter extends Filter {
  type: 'value';
  attribute?: string;
  alias?: string;
  comparator?: ValueFilterComparator;
  valueBoolean?: boolean;
  valueString?: string;
  valueInteger?: number;
  valueQuantity?: fhir4.Quantity;
  valueRatio?: fhir4.Ratio;
  valueRange?: fhir4.Range;
}

export type ValueFilterComparator = 'eq' | 'gt' | 'lt' | 'ge' | 'le' | 'sa' | 'eb';
