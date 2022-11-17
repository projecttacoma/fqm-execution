import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  DataTypeQuery,
  DetailedPopulationGroupResult,
  ExpressionStackEntry,
  GapsDataTypeQuery,
  ReasonDetail,
  ReasonDetailData
} from '../types/Calculator';
import { FinalResult, ImprovementNotation, CareGapReasonCode, CareGapReasonCodeDisplay } from '../types/Enums';
import {
  flattenFilters,
  generateDetailedCodeFilter,
  generateDetailedDateFilter,
  generateDetailedValueFilter
} from '../helpers/DataRequirementHelpers';
import {
  EqualsFilter,
  InFilter,
  DuringFilter,
  AnyFilter,
  NotNullFilter,
  AttributeFilter,
  ValueFilter
} from '../types/QueryFilterTypes';
import { GracefulError, isOfTypeGracefulError } from '../types/errors/GracefulError';
import { compareValues } from '../helpers/ValueComparisonHelpers';

/**
 * Iterate through base queries and add clause results for parent query and retrieve
 *
 * @param queries base queries parsed from ELM
 * @param detailedResult execution results for this patient
 * @returns same query info but with info about clause results for query and retrieve
 */
export function processQueriesForGaps(
  queries: DataTypeQuery[],
  detailedResult: DetailedPopulationGroupResult
): GapsDataTypeQuery[] {
  return queries.map(q => {
    // Determine satisfaction of parent query and leaf node retrieve
    const parentQueryResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === q.queryLibraryName && cr.localId === q.queryLocalId
    );

    const retrieveResult = detailedResult.clauseResults?.find(
      cr => cr.libraryName === q.retrieveLibraryName && cr.localId === q.retrieveLocalId
    );

    const parentQueryHasResult = parentQueryResult?.final === FinalResult.TRUE;
    const retrieveHasResult = retrieveResult?.final === FinalResult.TRUE;

    const gapQuery: GapsDataTypeQuery = {
      ...q,
      parentQueryHasResult,
      retrieveHasResult
    };

    return gapQuery;
  });
}

/**
 * Generate a FHIR DetectedIssue resource for Gaps in Care per http://build.fhir.org/ig/HL7/davinci-deqm/StructureDefinition-gaps-detectedissue-deqm.html
 *
 * @param queries numerator queries from a call to findRetrieves
 * @param measureReport FHIR MeasureReport to be referenced by the issue
 */
export function generateDetectedIssueResources(
  queries: GapsDataTypeQuery[],
  measureReport: fhir4.MeasureReport,
  improvementNotation: string
): { detectedIssues: fhir4.DetectedIssue[]; withErrors: GracefulError[] } {
  const relevantGapQueries = queries.filter(q =>
    // If positive improvement, we want queries with results as gaps. Vice versa for negative
    improvementNotation === ImprovementNotation.POSITIVE ? !q.parentQueryHasResult : q.parentQueryHasResult
  );

  const groupedQueries = groupGapQueries(relevantGapQueries);
  const guidanceResponses = groupedQueries.map(q =>
    generateGuidanceResponses(q, measureReport.measure, improvementNotation)
  );

  const formattedResponses: fhir4.DetectedIssue[] = guidanceResponses.map(gr => {
    // Uniquify a DetectedIssue's contained GuidanceResponses by deep equality on reasonCode and dataRequirement
    // a duplicate here indicates the exact same gap that could theoretically be parsed from different measure logic clauses
    const filteredGrs = _.uniqWith(
      gr.guidanceResponses,
      (gr1, gr2) => _.isEqual(gr1.dataRequirement, gr2.dataRequirement) && _.isEqual(gr1.reasonCode, gr2.reasonCode)
    );

    return {
      resourceType: 'DetectedIssue',
      id: uuidv4(),
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/detectedissue-category',
            code: 'care-gap',
            display: 'Gap in Care Detected'
          }
        ]
      },
      evidence: filteredGrs.map(gr => {
        return {
          detail: [{ reference: `#${gr.id}` }]
        };
      }),
      contained: filteredGrs
    };
  });
  //accumulate all error info into a single array
  const errorInfo = guidanceResponses.reduce((acc: GracefulError[], e) => {
    acc.push(...e.withErrors);
    return acc;
  }, []);

  return { detectedIssues: formattedResponses, withErrors: errorInfo };
}

/**
 * "Groups" gaps queries that are functionally the same in terms of putting a patient into the improvement population
 * (whether that is the numerator or the denominator, depending on the improvement notation). For the moment, only handles
 * "or"-d queries, where any one of the listed DataTypeQuery objects would put the patient into the improvement population.
 *
 * @param queries list of queries from the execution engine.
 * @returns an array of arrays of type DataTypeQuery
 */
export function groupGapQueries(queries: GapsDataTypeQuery[]): GapsDataTypeQuery[][] {
  const queryGroups = new Map<string, GapsDataTypeQuery[]>();
  const ungroupedQueries: GapsDataTypeQuery[][] = [];

  queries.forEach((q): void => {
    // Logic to determine grouped queries. Will likely get more complex
    // as query grouping evolves
    const stackOrEntry = getOrExpressionFromStack(q.expressionStack);

    if (stackOrEntry) {
      if (queryGroups.get(stackEntryString(stackOrEntry))) {
        // If we've already started a group for these queries, add to the group
        queryGroups.get(stackEntryString(stackOrEntry))?.push(q);
      } else {
        // Otherwise, start a new group
        queryGroups.set(stackEntryString(stackOrEntry), [q]);
      }
    } else {
      // collect queries that aren't part of a grouping
      ungroupedQueries.push([q]);
    }
  });

  return Array.from(queryGroups.values()).concat(ungroupedQueries);
}

/**
 * Detects scenario in expressionStack where this query is part of an "Or"
 * i.e. Either the first entry in the stack is an "Or," or it is an "ExpressionRef" right on top of an "Or"
 *
 * @param expressionStack the current expression stack for this query
 * @returns Matching "Or", or null if not found
 */
export function getOrExpressionFromStack(expressionStack?: ExpressionStackEntry[]): ExpressionStackEntry | null {
  if (expressionStack && expressionStack.length >= 2) {
    if (expressionStack[0].type === 'ExpressionRef') {
      return expressionStack[1].type === 'Or' ? expressionStack[1] : null;
    }

    return expressionStack[0].type === 'Or' ? expressionStack[0] : null;
  }

  return null;
}

function stackEntryString(entry: ExpressionStackEntry): string {
  return JSON.stringify(entry);
}

function didEncounterDetailedValueFilterErrors(tbd: fhir4.Extension | GracefulError): tbd is GracefulError {
  if ((tbd as GracefulError).message) {
    return true;
  } else {
    return false;
  }
}

/**
 * Generate FHIR GuidanceResponse resources for queries that are gaps
 *
 * @param queries list of all queries that are gaps for this measure
 * @param measureURL fully qualified URL referencing the measure
 * @param improvementNotation ImprovementNotation.POSITIVE or ImprovementNotation.NEGATIVE
 * @returns list of FHIR GuidanceResponse resources with detailed gaps information
 */
export function generateGuidanceResponses(
  queries: GapsDataTypeQuery[],
  measureURL: string,
  improvementNotation: string
): { guidanceResponses: fhir4.GuidanceResponse[]; withErrors: GracefulError[] } {
  const withErrors: GracefulError[] = [];
  const guidanceResponses: fhir4.GuidanceResponse[] = queries.map(q => {
    const dataTypeCodeFilter: { path: 'code'; valueSet?: string; code?: [{ code: string; system: string }] } = {
      path: 'code'
    };

    if (q.valueSet) {
      dataTypeCodeFilter.valueSet = q.valueSet;
    } else if (q.code) {
      dataTypeCodeFilter.code = [
        {
          code: q.code.code,
          system: q.code.system
        }
      ];
    }

    let gapCoding: fhir4.Coding[];

    if (q.reasonDetail?.hasReasonDetail && q.reasonDetail.reasons.length > 0) {
      gapCoding = q.reasonDetail.reasons.map(generateReasonCoding);
    } else {
      gapCoding =
        improvementNotation === ImprovementNotation.POSITIVE
          ? [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.NOTFOUND,
                display: CareGapReasonCodeDisplay[CareGapReasonCode.NOTFOUND]
              }
            ]
          : [
              {
                system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
                code: CareGapReasonCode.PRESENT,
                display: CareGapReasonCodeDisplay[CareGapReasonCode.PRESENT]
              }
            ];
    }

    const gapStatus: fhir4.CodeableConcept = {
      coding: gapCoding
    };

    const dataRequirement: fhir4.DataRequirement = {
      type: q.dataType,
      codeFilter: [{ ...dataTypeCodeFilter }]
    };

    addFiltersToDataRequirement(q, dataRequirement, withErrors);

    const guidanceResponse: fhir4.GuidanceResponse = {
      resourceType: 'GuidanceResponse',
      id: uuidv4(),
      dataRequirement: [dataRequirement],
      reasonCode: [gapStatus],
      status: 'data-required',
      moduleUri: measureURL
    };
    return guidanceResponse;
  });

  // Prefer GRs to be sorted by ones with more specific reasonCodes other than PRESENT or MISSING
  guidanceResponses.sort((gr1, gr2) => {
    if (hasDetailedReasonCode(gr1)) {
      return -1;
    } else if (hasDetailedReasonCode(gr2)) {
      return 1;
    }
    return 0;
  });

  return { guidanceResponses, withErrors };
}

/**
 * Creates a FHIR Coding object representing a reason detail for the GuidanceResponse resource.
 *
 * @param reason The reason detail data for a single reason.
 * @returns The FHIR Coding object to add to the GuidanceResponse.reasonCode.coding field.
 */
export function generateReasonCoding(reason: ReasonDetailData): fhir4.Coding {
  const reasonCoding: fhir4.Coding = {
    system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/care-gap-reason',
    code: reason.code,
    display: CareGapReasonCodeDisplay[reason.code]
  };

  // If there is a referenced resource create and add the extension
  if (reason.reference) {
    const detailExt: fhir4.Extension = {
      url: 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/reasonDetail',
      extension: [
        {
          url: 'reference',
          valueReference: {
            reference: reason.reference
          }
        }
      ]
    };
    if (reason.path) {
      detailExt.extension?.push({
        url: 'path',
        valueString: reason.path
      });
    }
    reasonCoding.extension = [detailExt];
  }
  return reasonCoding;
}

/**
 * Generate a Gaps in Care Bundle resource per http://build.fhir.org/ig/HL7/davinci-deqm/StructureDefinition-gaps-bundle-deqm.html
 *
 * @param detectedIssue FHIR DetectedIssue generated during gaps
 * @param measureReport FHIR MeasureReport generated during calculation
 * @param patient Current FHIR Patient processed in execution
 */
export function generateGapsInCareBundle(
  detectedIssues: fhir4.DetectedIssue[],
  measureReport: fhir4.MeasureReport,
  patient: fhir4.Patient
): fhir4.Bundle {
  const composition: fhir4.Composition = {
    resourceType: 'Composition',
    type: {
      coding: [
        {
          system: 'http://hl7.org/fhir/us/davinci-deqm/CodeSystem/gaps-doc-type',
          code: 'gaps-doc',
          display: 'Gaps in Care Report'
        }
      ]
    },
    author: [{ ...measureReport.subject }],
    subject: measureReport.subject,
    date: new Date().toISOString(),
    title: 'Gaps in Care Report',
    status: 'preliminary',
    section: [
      {
        title: measureReport.measure,
        focus: {
          reference: `MeasureReport/${measureReport.id}`
        },
        entry: detectedIssues.map(i => {
          return { reference: `DetectedIssue/${i.id}` };
        })
      }
    ]
  };
  const returnBundle: fhir4.Bundle = {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      {
        resource: composition
      },
      {
        resource: measureReport
      },
      {
        resource: patient
      }
    ]
  };
  detectedIssues.forEach(i => {
    returnBundle.entry?.push({ resource: i });
  });
  return returnBundle;
}

/**
 * Add reason detail data to each DataTypeQuery passed in
 *
 * @param retrieves numerator queries from a call to findRetrieves
 * @param improvementNotation string indicating positive or negative improvement notation for the measure being used
 * @param detailedResult result from calculation to look up clause values
 * @return mapped list of queries with reason detail info if relevant
 */
export function calculateReasonDetail(
  retrieves: GapsDataTypeQuery[],
  improvementNotation: string,
  detailedResult?: DetailedPopulationGroupResult
): { results: GapsDataTypeQuery[]; withErrors: GracefulError[] } {
  const withErrors: GracefulError[] = [];
  const isPositiveImprovement = improvementNotation === ImprovementNotation.POSITIVE;
  const results = retrieves.map(r => {
    const reasonDetail: ReasonDetail = {
      hasReasonDetail: false,
      reasons: []
    };

    // If this is a positive improvement notation measure then we can look for reasons why the query wasn't satisfied
    let shouldCalculateReasonDetail = false;
    if (r.queryInfo?.fromExternalClause === true) {
      // Clause doing the comparison of values
      const valueClauseResult = detailedResult?.clauseResults?.find(
        cr => cr.libraryName === r.retrieveLibraryName && cr.localId === r.valueComparisonLocalId
      );

      // reasonDetail occurs in this cause if the clause doing the comparison of some value
      // has a truthy result for negative imporve, falsy for pos,
      shouldCalculateReasonDetail = isPositiveImprovement
        ? valueClauseResult?.final === FinalResult.FALSE
        : valueClauseResult?.final === FinalResult.TRUE;
    } else {
      // Else, clause has come from the where part of a query
      // compute reasonDetail if the overall query was truthy for negative improve, falsy for pos
      shouldCalculateReasonDetail = shouldCalculateReasonDetail = isPositiveImprovement
        ? r.parentQueryHasResult === false
        : r.parentQueryHasResult === true;
    }

    // If we detect more going on, set the boolean to true
    // NOTE: this may still result in a basic reason code, but it allows the engine to recognize
    // that more information was processed
    reasonDetail.hasReasonDetail = shouldCalculateReasonDetail;

    if (shouldCalculateReasonDetail === true) {
      if (r.queryInfo && detailedResult?.clauseResults) {
        const flattenedFilters = flattenFilters(r.queryInfo.filter);
        const resources = detailedResult.clauseResults?.find(
          cr => cr.libraryName === r.retrieveLibraryName && cr.localId === r.retrieveLocalId
        );

        if (resources) {
          // Compute reason detail for every filter present on the found raw data from a retrieve
          resources.raw.forEach((resource: any) => {
            flattenedFilters.forEach(f => {
              // ValueFilters are handled for both positive and negative improvement measures
              if (f.type === 'value') {
                const valueFilter = f as ValueFilter;
                const reason: ReasonDetailData = <ReasonDetailData>{
                  path: valueFilter.attribute
                };

                // TODO: might need to check if we get an array or a singleton
                // a query could return either
                const attrPath = valueFilter.attribute?.split('.');

                // Access desired property of FHIRObject
                let desiredAttr = resource;
                attrPath?.forEach(key => {
                  if (desiredAttr) {
                    desiredAttr = desiredAttr[key];
                  }
                });

                let comparisonResult: boolean | null = null;
                if (valueFilter.valueQuantity?.value) {
                  const quantity = desiredAttr.value;
                  const actualValue = quantity.value as number;
                  const requiredValue = valueFilter.valueQuantity.value;

                  comparisonResult = compareValues(actualValue, requiredValue, valueFilter.comparator);
                } else if (valueFilter.valueInteger) {
                  comparisonResult = compareValues(
                    desiredAttr.value as number,
                    valueFilter.valueInteger,
                    valueFilter.comparator
                  );
                }

                // Resource caused gap
                if (isPositiveImprovement ? comparisonResult === false : comparisonResult === true) {
                  reason.reference = `${resource._json.resourceType}/${resource._json.id}`;
                  reason.code = CareGapReasonCode.VALUEOUTOFRANGE;
                  reasonDetail.reasons.push(reason);
                }
              } else if (isPositiveImprovement && f.type === 'during') {
                const duringFilter = f as DuringFilter;

                if (duringFilter.valuePeriod.interval) {
                  const path = duringFilter.attribute.split('.');
                  const interval = duringFilter.valuePeriod.interval;

                  // Access desired property of FHIRObject
                  let desiredAttr = resource;
                  const foundPath: string[] = [];
                  for (const key of path) {
                    foundPath.push(key);
                    if (desiredAttr) {
                      desiredAttr = desiredAttr[key];
                      /*
                       There's a chance that the desiredAttr isn't exactly at the described point in
                       the path. For this reason, just take the first attribute whose value is a Datetime
                      */
                      if (desiredAttr?.value?.isDateTime) {
                        break;
                      }
                    }
                  }

                  // Use DateOutOfRange code if data point is outside of the desired interval
                  if (desiredAttr?.value?.isDateTime) {
                    const isAttrContainedInInterval = interval.contains(desiredAttr.value);

                    if (isAttrContainedInInterval === false) {
                      reasonDetail.reasons.push({
                        code: CareGapReasonCode.DATEOUTOFRANGE,
                        path: foundPath.join('.'),
                        reference: `${resource._json.resourceType}/${resource.id.value}`
                      });
                    }
                  } else {
                    // if the attribute wasn't found then we can consider it NotFound (logical)
                    reasonDetail.reasons.push({
                      code: CareGapReasonCode.NOTFOUND,
                      path: duringFilter.attribute,
                      reference: `${resource._json.resourceType}/${resource.id.value}`
                    });
                  }
                }
              } else if (isPositiveImprovement && f.type === 'notnull') {
                const notNullFilter = f as NotNullFilter;
                const attrPath = notNullFilter.attribute.split('.');

                // Access desired property of FHIRObject
                let desiredAttr = resource;
                attrPath.forEach(key => {
                  if (desiredAttr) {
                    desiredAttr = desiredAttr[key];
                  }
                });

                /* 
                  Use NotFound code if data is null. NotFound is used both when the desired resource
                  is not found and when the desired resource is found, but the desired attribute is
                  missing from it
                */
                if (desiredAttr === null || desiredAttr === undefined) {
                  reasonDetail.reasons.push({
                    code: CareGapReasonCode.NOTFOUND,
                    path: notNullFilter.attribute,
                    reference: `${resource._json.resourceType}/${resource.id.value}`
                  });
                }
              } else if (isPositiveImprovement) {
                // TODO: This logic is not perfect, and can be corrupted by multiple resources spanning truthy values for all filters
                // For non-during filters, look up clause result by localId
                // Ideally we can look to modify cql-execution to help us with this flaw
                const clauseResult = detailedResult.clauseResults?.find(
                  cr => cr.libraryName === r.retrieveLibraryName && cr.localId === f.localId
                );

                // False clause means this specific filter was falsy
                if (clauseResult && clauseResult.final === FinalResult.FALSE) {
                  const code = getGapReasonCode(f);
                  if (!isOfTypeGracefulError(code)) {
                    // if this filter is filtering on an attribute of a resource then include info about the path to the
                    // attribute and reference the patient
                    if ((f as AttributeFilter).attribute) {
                      reasonDetail.reasons.push({
                        code: code,
                        path: (f as AttributeFilter).attribute,
                        reference: `${resource._json.resourceType}/${resource.id.value}`
                      });
                    } else {
                      reasonDetail.reasons.push({ code: code });
                    }
                  } else {
                    withErrors.push(code);
                  }
                }
              }
            });
          });
        }
      }
    }

    // If no specific reason details found, default is NotFound or Present based on ImprovementNotation
    if (reasonDetail.reasons.length === 0) {
      reasonDetail.reasons = isPositiveImprovement
        ? [{ code: CareGapReasonCode.NOTFOUND }]
        : [{ code: CareGapReasonCode.PRESENT }];
    }

    // add the reason detail we calculated to the query info and retrieve and return it
    return { ...r, reasonDetail };
  });
  return { results, withErrors };
}

function getGapReasonCode(filter: AnyFilter): CareGapReasonCode | GracefulError {
  switch (filter.type) {
    case 'equals':
    case 'in':
      return CareGapReasonCode.INVALIDATTRIBUTE;
    case 'during':
      return CareGapReasonCode.DATEOUTOFRANGE;
    default:
      return { message: `unknown reasonCode mapping for filter type ${filter.type}` } as GracefulError;
  }
}
/**
 *
 * @param q The query which contains the filters to add to the data requirement
 * @param dataRequirement Data requirement to add date filters to
 * @param withErrors Errors object which will eventually be returned to the user if populated
 * @returns void, but populated the dataRequirement filters
 */
export function addFiltersToDataRequirement(
  q: GapsDataTypeQuery | DataTypeQuery,
  dataRequirement: fhir4.DataRequirement,
  withErrors: GracefulError[]
) {
  if (q.queryInfo) {
    const detailedFilters = flattenFilters(q.queryInfo.filter);

    detailedFilters.forEach(df => {
      if (df.type === 'equals' || df.type === 'in') {
        const cf = generateDetailedCodeFilter(df as EqualsFilter | InFilter, q.dataType);

        if (cf !== null) {
          dataRequirement.codeFilter?.push(cf);
        }
      } else if (df.type === 'during') {
        const dateFilter = generateDetailedDateFilter(df as DuringFilter);
        if (dataRequirement.dateFilter) {
          dataRequirement.dateFilter.push(dateFilter);
        } else {
          dataRequirement.dateFilter = [dateFilter];
        }
      } else {
        const valueFilter = generateDetailedValueFilter(df);
        if (didEncounterDetailedValueFilterErrors(valueFilter)) {
          withErrors.push(valueFilter);
        } else if (valueFilter) {
          if (dataRequirement.extension) {
            dataRequirement.extension.push(valueFilter);
          } else {
            dataRequirement.extension = [valueFilter];
          }
        }
      }
    });
  }
}

export function hasDetailedReasonCode(gr: fhir4.GuidanceResponse) {
  return (
    gr.reasonCode?.some(c => {
      return c.coding?.[0]?.code !== CareGapReasonCode.NOTFOUND && c.coding?.[0]?.code !== CareGapReasonCode.PRESENT;
    }) || false
  );
}
