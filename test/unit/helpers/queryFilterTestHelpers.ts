import { DuringFilter } from '../../../src/types/QueryFilterTypes';

export function removeIntervalFromFilter(filter: DuringFilter): DuringFilter {
  const { valuePeriod, ...rest } = filter;
  return {
    ...rest,
    valuePeriod: {
      start: valuePeriod.start,
      end: valuePeriod.end
    }
  };
}
