# TRIVIAL TASKS

## Fix NPM Audit Issues

As of March 3, `npm audit` currently reports 14 vulnerabilities, 2 of which are _critical_ and 4 of which are _high_. Running `npm audit fix` resolves some vulnerabilities, but additional work will be needed to resolve all issues (including _critical_ and _high_ ones).

## Update IG Links

The README and code comments link to many IGs at the build.fhir.org domain. These are "current build" artifacts based on latest commits and may reflect changes that have not yet been balloted. In addition, build.fhir.org links are transient and may be broken if an IG has not been recently built. Unless the documentation is referring specifically to unballoted changes, link to the most recently published version (e.g., https://hl7.org/fhir/us/cqfmeasures/) or a specific release (e.g., https://hl7.org/fhir/us/cqfmeasures/STU5/) if relevant.

## Update Outdated Links and Text

* The [testing section of contributing/md](https://github.com/projecttacoma/fqm-execution/blob/master/contributing.md#testing) lists [ecqm-content-r4-2021](https://github.com/cqframework/ecqm-content-r4-2021) and [ecqm-content-qicore-2022](https://github.com/cqframework/ecqm-content-qicore-2022) as the current ecqm-content repositories. Update these to the relevant [recent ecqm-content repositories](https://github.com/cqframework?q=content&type=all&language=&sort=).
* The copyright statement indicates the dates 2020 - 2023. Update the date is [all files containing the copyright statement](https://github.com/search?q=repo:projecttacoma/fqm-execution%20copyright&type=code).

## Minor Clarifications in README

There are a few parts of the README that would benefit from minor clarifications / updates:
* The [meta.profile checking](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#metaprofile-checking) section indicates how to disable `meta.profile` checking but does not discuss the implications of doing so. Since disabling this may cause incorrect results, add a short description of how the engine operates when this feature is disabled.
* The [composite measures](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#composite-measures) section includes this warning: "Composite measure support is highly experimental, and may change as the specification evolves." If this is still the case, great! If it is not the case, update as necessary.
* The [composite measures](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#composite-measures) section should better clarify the difference between `detailedResults` and `compositeResults`, especially since they are _exactly the same_ in the provided example.
* The [data requirements testing](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#data-requirements-testing) section has a broken link to the data-requirements README.

## Review TODOs

Review all TODO comments in the source code. Create tasks for TODOs that are still relevant. Remove TODOs that are no longer relevant or are very unlikely to ever be done.

# MINOR TASKS

## Review Project For Feature / Option Bloat

FQM Execution provides some features that are ancillary to measure calculation (e.g., gaps in care, data requirements, query info). These additional capabilities make the project more difficult to understand (for new developers) and to maintain (for seasoned developers). Review these features and determine if they should still be maintained or if they can be deprecated. If they should still be maintained, consider if they belong in the fqm-execution project or should be refactored into separate modules.

Similarly review the many available options for measure calculation and determine if all options are still relevant. Create new tasks based on the outcome of this analysis.

In short, this project has a lot going on and we should seek to simplify it wherever possible.

## Review Gaps in Care Against Latest DEQM IG

The [FQM Execution Gaps in Care wiki documentation](https://github.com/projecttacoma/fqm-execution/wiki/Gaps-In-Care) was last updated in 2022 and points to a 2020 ballot version of the DEQM IG. Is the fqm-execution implementation of gaps in care up to date with the latest [DaVinci DEQM IG](https://hl7.org/fhir/us/davinci-deqm/)? If not, then update it or deprecate it (see "Review Project for Feature Bloat" above).

## Review Data Requirements for Parity w/ Java Implementation

The Java CQL stack includes an implementation of data requirements. Has the FQM data requirements implementation been compared with it to ensure consistent results? If MITRE will continue to maintain support for the data requirements extractor, consider testing this formally and/or creating a utility to automatically compare data requirements results between the FQM implementation and the Java implementation. If MITRE will not continue to maintain it, deprecate it (see "Review Project for Feature Bloat" above). _NOTE: The [elm-parser-for-ecqms](https://github.com/projecttacoma/elm-parser-for-ecqms/tree/fhir_review) project that the data requirements testing section of the README points to was last updated in 2023._

## Update Node to Recent Version

The [GitHub Action CI workflow](https://github.com/projecttacoma/fqm-execution/blob/master/.github/workflows/ci.yml) currently uses Node 14 and 16. These both reached end-of-life in 2023. The README does not indicate what versions of Node are supported. Ensure that recent versions of Node (at least v22) are compatible with fqm-execution, update the CI workflow to use recent versions (e.g., 22.x / 24.x), and update the README to indicate what versions of Node fqm-execution has been tested with. While you're in the CI file, go ahead and update the actions to their latest versions (e.g., `actions/checkout`, `actions/setup-node`). Consider including a [.tool-versions](https://asdf-vm.com/manage/configuration.html) file for ASDF users.

## Improve Organization of Documentation

The FQM Execution README is overwhelming. Consider covering the most important information in the README and linking out to additional pages for everything else. Consider moving most documentation to a wiki or GitHub pages.

## Improve Code Comments / Documentation

Document tricky bits of the code that are not already self-explanatory and/or might be confusing to new developers. In most cases, code comments are an appropriate form of documentation, but other cases (architecture, cross-component interactions) may benefit from diagrams.

## Review and Consider Generating API Documentation

If the [API reference](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#api-reference) is not already auto-generated, consider approaches to automatically generating it. In the meantime, review the documentation and ensure it is correct. It is difficult to manually keep API documentation in sync with actual APIs and developers are frustrated by incorrect and/or incomplete API documentation.

## Measure Execution Tutorial

Include an easy-to-use step-by-step tutorial that developers can follow to execute a measure. The tutorial should provide a measure bundle and synthetic patient data along with the results for that measure and data.

## Improve Process for Building Test Data

According to the [building test data](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#building-test-data) section of the README, developers should run  `npm run build:test-data` followed by `npm run build:elm-fixtures`. There are several issues with the current process:
* Since `build:test-data` starts the `cql-translation-service` docker container and then leaves it running, the `build:elm-fixtures` script fails when it attempts to start the already-running container again.
* If the `cql-translation-service` is manually stopped, then subsquent attempts to run `build:test-data` fail because the script thinks `cql-translation-service` is already running due to the presence of the `test/integration/.start-translator` file.
* Running `npm run build:elm-fixtures` generates files that show up as untracked files in source control.

This process and its documentation should be updated to improve the developer experience.

## Fix Integration Tests

Several integration tests are failing after running `FORCE=true npm run build:test-data` and `npm run test:integration`. Fix the tests and/or documentation as necessary so all tests pass.

## Integrate CQFramework CQL Tests and/or Support for CQL Test Runner

Continue the [CQL Execution spec tests](https://github.com/cqframework/cql-execution/tree/master/test/spec-tests) effort to integrate the [CQFramework CQL tests](https://github.com/cqframework/cql-tests) and extend it to report results in the expected [CQL results](https://github.com/cqframework/cql-tests-results/tree/main) format. Consider wrapping the engine in a simple service to support the [CQL Tests Runner](https://github.com/cqframework/cql-tests-runner/tree/main). This effort allows us to ensure our engine meets CQL execution requirements and is consistent with other CQL engines.

## Improve Coverage

Overall coverage is currently 85% statement coverage and 74% branch coverage, but several files have < 80% statement coverage and < 60% branch coverage. Run `npm run test:coverage` to identify uncovered code statements / branches and add tests to improve coverage.

## Improve Regression Scripts

The regression script can be very useful for ensuring that no regressions occur and/or that any changes are expected. Consider the following improvements:
* (REQUIRED) Update [Regression Testing](https://github.com/projecttacoma/fqm-execution?tab=readme-ov-file#regression-testing) section in README to reflect use of `-p` flag for pulling content repositories.
* (REQUIRED) If regression fails because the local content repositories are missing, provide a helpful error message instructing the user how to pull the content (i.e., the `-p` flag).
* (OPTIONAL) Improve efficiency of getting content repositories by doing a shallow clone (i.e. [--depth 1](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---depthdepth)) or downloading the zip distribution from GitHub (e.g., [connectathon's master.zip](https://github.com/DBCG/connectathon/archive/refs/heads/master.zip)).
* (OPTIONAL) Allow developers to optionally specify other content repositories to test via a CLI flag.
* (OPTIONAL) Instead of switching the local branch during testing, download and unzip the base branch in a temporary directory. This allows developers to run the regression without committing all changes. It also ensures the latest version of the base branch is always used.
* (OPTIONAL) Generate a user-friendly HTML report of the results with easy to view diffs for where regression failed.

In case it is helpful, the [SUSHI regression script](https://github.com/FHIR/sushi/tree/master/regression) implements some of these approaches.

## Improve Typing

* Review TypeScript typing in fqm-execution and improve as appropriate (e.g., replace `any` with more specific types, etc.).
* Review TypeScript typing in cql-execution and improve as appropriate (_NOTE: This may be a major task_).

## Tighten External API

Review exposed API (see `index.ts`) to determine if it includes functions and/or types that are not needed by library consumers. A more focused API is easier for consumers to use, easier for project developers to maintain, and more likely to remain stable over time.

## Move Types to cql-execution As Appropriate

Some types that are not FQM-specific (e.g., `types/ELMTypes.ts`) would fit better within the `cql-execution` library, allowing other projects to leverage them as well. Review FQM source code for general CQL/ELM types and move them to `cql-execution` as appropriate.

## Move Common ValueSet Logic To Other Modules If Applicable

Consider if value set functionality can or should be moved into `cql-vsac` or a new more generic FHIR-based TerminologyProvider in order to maximize re-use and consistency across implementations.

## Replace Moment with Active Date Module

The [moment](https://www.npmjs.com/package/moment) module is in maintenance mode and has not been updated since 2023. Replace with a more modern library such as [luxon](https://www.npmjs.com/package/luxon) (which is what cql-execution uses), [dayjs](https://www.npmjs.com/package/dayjs), or [date-fns](https://www.npmjs.com/package/date-fns).

## Use Constants for Default Values

Daefault values are sometimes embedded in the code where they are used (see `Calculator.ts` for examples). Consider specifying the defaults as constants at the top of relevant files and/or in a dedicated constants file (e.g., `const DEFAULT_CALCULATE_HTML = true`). This makes it easier for developers to find and see the default values for the many options that FQM supports.

## Check Bundles for Reference Integrity

FQM Execution currently assumes that all resources in a patient bundle pertain to the patient included in the bundle. Add support for an option to have FQM Execution report and/or ignore patient-focused resources that do not reference the patient. This should _not_ flag/ignore definition resources like [Medication](https://hl7.org/fhir/R4/medication.html). This should probably be mainly implemented in [cql-exec-fhir](https://github.com/cqframework/cql-exec-fhir). _Note: Also consider how [related context retrieves](https://cql.hl7.org/03-developersguide.html#related-context-retrieves) might affect the solution. CQL Execution does not currently support related context retrieves, but it may in the future._

## Review Areas of Known Technical Debt / High Complexity

Review code that was developed quickly or otherwise expected to hold technical debt or high complexity. Fix areas that need fixing and/or generate specific tasks to address discovered issues. (Note: `QueryFilterParser` was provided as an example are of expected technical debt).

## Minor Improvements to DataRequirements

If the data requirements logic will continue to be maintained, address the following issues:
* Query param handling does not properly escape query parameter values (`src/helpers/DataRequirementsHelpers.ts`).
* When building FHIR queries from data requirements, code systems are ignored in code match queries (`src/helpers/DataRequirementsHelpers.ts`).
* When building FHIR queries from data requirements, duration units are ignored in duration match queries (`src/helpers/DataRequirementsHelpers.ts`).

## Export Simple or Standardized Highlighting Format

Consider one of the following to improve the re-usability of highlighting data (vs HTML):
* Export highlighting information via a simple custom syntax and/or JSON schema with no assumptions about UI presentation/technology (allowing consumers to render it however they wish).
* Export highlighting information using an existing code coverage format so that open-source coverage renderers can be used. _NOTE: I like this idea, but I'm not sure if our approach to highlighting is compatible w/ other code coverage formats since we display truthy and falsey things rather than true coverage._

# MAJOR TASKS

## Design / Implement Advanced TerminologyProvider

The proposed [Advanced TerminologyProvider interface](https://github.com/cqframework/cql-execution/issues/299) provides a more flexible approach to interfacing with terminology providers. Consider finalizing the design of the advanced interface and implement a FHIR-based version that works with the VSAC FHIR endpoint (maybe in a new `cql-exec-fhir-terminology` module, maybe in the existing [cql-exec-fhir](https://github.com/cqframework/cql-exec-fhir) module, maybe in the existing [cql-vsac](https://github.com/cqframework/cql-exec-vsac) module).

## Implement New DataProvider API

The proposed [Advanced DataProvider interface](https://github.com/cqframework/cql-execution/issues/300) provides a more flexible approach to interfacing with patient data sources. Consider finalizing the design of the advanced interface and implement a FHIR-based version (ideally in [cql-exec-fhir](https://github.com/cqframework/cql-exec-fhir)).

# FUTURE STATE

## Integrate CQL Translator 4.x JavaScript Target for On-the-Fly Translation

The CQL community has debated whether or not ELM should be included in CQL packages and measure distributions. Supporting an in-process translator would allow fqm-execution to process measure bundles that don't include ELM and/or retranslate CQL logic when appropriate. It would also allow for more efficient CQL development cycles. _NOTE: It might be best to implement most of this change in cql-execution._

## Support FQM Execution in the VS Code CQL Extension

The VS Code CQL Extension currently executes CQL using the Java / Kotlin engine. Measure authors might appreciate the option to choose to use the FQM Execution engine instead. This would likely require integration of the CQL Translator 4.x JavaScript target first (see above).

## Export Results in Proposed CQL Serialization Format

Follow the status of the [proposed CQL serialization format](https://github.com/cqframework/clinical_quality_language/wiki/CQL-Serialization), including this [Kotlin CQL engine issue](https://github.com/cqframework/vscode-cql/issues/135) and consider exporting results in a format that uses the proposed CQL serialization format.

## Support Kotlin CQL Engine JavaScript Target

Abstract the interfaces to the current CQL Execution engine so that the upcoming JS engine (generated from Kotlin) can be swapped in. This would allow greater flexibility and choice for FQM Execution users and allow for easier comparison between the two engines.