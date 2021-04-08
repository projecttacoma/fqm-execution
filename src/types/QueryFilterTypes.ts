import { R4 } from '@ahryman40k/ts-fhir-types';

export interface Filter {
  type: string;
  localId?: string;
}

export interface AndFilter extends Filter {
  type: 'and';
  children: Filter[];
}

export interface OrFilter extends Filter {
  type: 'or';
  children: Filter[];
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

export interface UnknownAttributeFilter extends AttributeFilter {
  type: 'unknown';
}

export interface UnknownFilter extends Filter {
  type: 'unknown';
}

/**
 * Represents something that will always be true and can be removed. eg. checking if
 * the end of the Measurement Period exists.
 */
export interface TautologyFilter extends Filter {
  type: 'truth';
}
