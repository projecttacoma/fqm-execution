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
  AttributeFilter
} from '../types/QueryFilterTypes';
import { GracefulError, isOfTypeGracefulError } from '../types/errors/GracefulError';

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
      evidence: gr.guidanceResponses.map(gr => {
        return {
          detail: [{ reference: `#${gr.id}` }]
        };
      }),
      contained: gr.guidanceResponses
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

    // TODO: update system to be full URL once defined
    if (q.reasonDetail?.hasReasonDetail && q.reasonDetail.reasons.length > 0) {
      gapCoding = q.reasonDetail.reasons.map(generateReasonCoding);
    } else {
      gapCoding =
        improvementNotation === ImprovementNotation.POSITIVE
          ? [
              {
                system: 'CareGapReasonCodeSystem',
                code: CareGapReasonCode.MISSING,
                display: CareGapReasonCodeDisplay[CareGapReasonCode.MISSING]
              }
            ]
          : [
              {
                system: 'CareGapReasonCodeSystem',
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
    system: 'CareGapReasonCodeSystem',
    code: reason.code,
    display: CareGapReasonCodeDisplay[reason.code]
  };

  // If there is a referenced resource create and add the extension
  if (reason.reference) {
    const detailExt: fhir4.Extension = {
      url: 'ReasonDetail',
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
  const results = retrieves.map(r => {
    let reasonDetail: ReasonDetail;
    // If this is a positive improvement notation measure then we can look for reasons why the query wasn't satisfied
    if (improvementNotation === ImprovementNotation.POSITIVE) {
      // Create the initial reasonDetail information. There will be detail if the retrieve has a result but the query
      // that filters on the retrieve does not have any results.
      reasonDetail = {
        hasReasonDetail: r.retrieveHasResult === true && r.parentQueryHasResult === false,
        reasons: []
      };

      // If there are results for this clause and we have queryInfo then we can look at each of the
      // resources from the retrieve results and record reasons for each filter they did not satisfy
      if (reasonDetail.hasReasonDetail && r.queryInfo && detailedResult?.clauseResults) {
        const flattenedFilters = flattenFilters(r.queryInfo.filter);
        const resources = detailedResult.clauseResults?.find(
          cr => cr.libraryName === r.retrieveLibraryName && cr.localId === r.retrieveLocalId
        );

        if (resources) {
          // loop through resources from the results
          resources.raw.forEach((resource: any) => {
            // loop through each filter
            flattenedFilters.forEach(f => {
              // Separate interval handling for 'during' filters
              if (f.type === 'during') {
                const duringFilter = f as DuringFilter;

                if (duringFilter.valuePeriod.interval) {
                  const path = duringFilter.attribute.split('.');
                  const interval = duringFilter.valuePeriod.interval;

                  // Access desired property of FHIRObject
                  let desiredAttr = resource;
                  path.forEach(key => {
                    if (desiredAttr) {
                      desiredAttr = desiredAttr[key];
                    }
                  });

                  // Use DateOutOfRange code if data point is outside of the desired interval
                  if (desiredAttr?.value?.isDateTime) {
                    const isAttrContainedInInterval = interval.contains(desiredAttr.value);

                    if (isAttrContainedInInterval === false) {
                      reasonDetail.reasons.push({
                        code: CareGapReasonCode.DATEOUTOFRANGE,
                        path: duringFilter.attribute,
                        reference: `${resource._json.resourceType}/${resource.id.value}`
                      });
                    }
                  } else {
                    // if the attribute wasn't found then we can consider it missing
                    reasonDetail.reasons.push({
                      code: CareGapReasonCode.VALUEMISSING,
                      path: duringFilter.attribute,
                      reference: `${resource._json.resourceType}/${resource.id.value}`
                    });
                  }
                }
              } else if (f.type === 'notnull') {
                const notNullFilter = f as NotNullFilter;
                const attrPath = notNullFilter.attribute.split('.');

                // Access desired property of FHIRObject
                let desiredAttr = resource;
                attrPath.forEach(key => {
                  if (desiredAttr) {
                    desiredAttr = desiredAttr[key];
                  }
                });

                // Use VALUEMISSING code if data is null
                if (desiredAttr === null || desiredAttr === undefined) {
                  reasonDetail.reasons.push({
                    code: CareGapReasonCode.VALUEMISSING,
                    path: notNullFilter.attribute,
                    reference: `${resource._json.resourceType}/${resource.id.value}`
                  });
                }
              } else {
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

      // If no specific reason details found, default is missing
      if (reasonDetail.hasReasonDetail && reasonDetail.reasons.length === 0) {
        reasonDetail.reasons = [{ code: CareGapReasonCode.MISSING }];
      }
    } else {
      // TODO: Handle negative improvement cases, similar to above but it will be a bit more complicated.
      reasonDetail = {
        hasReasonDetail: false,
        reasons: []
      };
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
