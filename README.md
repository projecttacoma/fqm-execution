# FHIR Quality Measure Execution and Highlighting

Library for executing FHIR-based Electronic Clinical Quality Measures (eCQMs) written in Clinical Quality Language (CQL)

- [Installation](#installation)

- [Usage](#usage)

  - [API](#api)
  - [Calculation Options](#calculation-options)
  - [CLI](#cli)
  - [TypeScript](#typescript)

- [Local Development](#local-development)

  - [Prerequisites](#prerequisites)
  - [Local Installation/Usage](#local-installationusage)
  - [Debugging in VS Code](#debugging-in-vs-code)
  - [Testing](#testing)
  - [Checks](#checks)

- [Contributions](#contributions)

- [License](#license)

## Installation

`fqm-execution` can be installed into your project with [npm](https://www.npmjs.com/package/fqm-execution):

```bash
npm install --save fqm-execution
```

To install the global command line interface (CLI), use npm global installation:

```bash
npm install -g fqm-execution
```

## Usage

### API

Import the necessary modules:

```JavaScript
import { Calculator, MeasureBundleHelpers } from 'fqm-execution';
```

The following API functions are defined:

#### Calculator.calculateRaw()

Get raw results from CQL engine for each patient.

```JavaScript
const rawResults = await Calculator.calculateRaw(measureBundle, patientBundles, options, valueSetCache);
```

#### Calculator.calculate()

Get detailed population results for each patient.

```JavaScript
const detailedResults = await Calculator.calculate(measureBundle, patientBundles, options, valueSetCache);
```

#### Calculator.calculateMeasureReports()

Get individual FHIR MeasureReports for each patient.

```JavaScript
const measureReports = await Calculator.calculateMeasureReports(measureBundle, patientBundles, options, valueSetCache);
```

#### Calculator.calculateMeasureReports() with custom patientSource

Get individual FHIR MeasureReports for each patient given a custom patientSource in the options object.

```JavaScript
const measureReports = await Calculator.calculateMeasureReports(measureBundle, [], options, valueSetCache);
```

#### Calculator.calculateGapsInCare()

Get gaps in care for each patient, if present.

```JavaScript
const gapsInCare = await Calculator.calculateGapsInCare(measureBundle, patientBundles, options, valueSetCache);
```

#### Calculator.calculateDataRequirements()

Get data requirements for a given measure (in a bundle).

```JavaScript
const dataRequirements = await Calculator.calculateDataRequirements(measureBundle);
```

#### Calculator.calculateLibraryDataRequirements()

Get data requirements for a given library bundle with a root Library reference.
In this case, the measureBundle is a Library Bundle.

```Javascript
const libraryDataRequirements = await Calculator.calculateLibraryDataRequirements(measureBundle, rootLibRef);
```

#### Calculator.calculateQueryInfo()

Get detailed query info for all statements in a measure.

```JavaScript
const queryInfo = await Calculator.calculateQueryInfo(measureBundle);
```

#### MeasureBundleHelpers.addValueSetsToMeasureBundle()

Add missing ValueSet resources to a measure bundle.

```JavaScript
const valueSets = await MeasureBundleHelpers.addValueSetsToMeasureBundle(measureBundle, options);
```

#### Arguments

- `measureBundle`: Bundle containing a FHIR Measure and its dependent Libraries. FHIR ValueSets may be included as well.
- `patientBundles`: Array of FHIR Bundles containing patient data.
- `options` (optional): Object of calculation options (see below).
- `valueSetCache` (optional): Array of FHIR ValueSet resources to use for calculation.

#### Calculation Options

The options that we support for calculation are as follows:
| option | type | optional? | description |
| :--------------------- | :-----: | :-------: | :--------------------------------------------------------------------------------- |
| verboseCalculationResults | boolean | yes | Use the detailed results interfaces for calculation. Defaults to true. |
| enableDebugOutput | boolean | yes | Enable debug output from function calls. Defaults to false. |
| includeClauseResults | boolean | yes | Option to include clause results. Defaults to false. |
| measurementPeriodStart | string | yes | Start of measurement period. |
| measurementPeriodEnd | string | yes | End of measurement period. |
| patientSource | DataProvider | yes | PatientSource to use. If provided, the patientBundles are not required. The PatientSource/DataProvider interface is defined in TypeScript by [cql-execution](https://github.com/cqframework/cql-execution/blob/master/src/types/cql-patient.interfaces.ts). |
| reportType | string | yes | Type of MeasureReport to generate: "summary", "subject-list" (not yet supported), or "individual". |
| calculateSDEs | boolean | yes | Include Supplemental Data Elements in calculation. Defaults to true. |
| calculateHTML | boolean | yes | Include HTML structure for highlighting. Defaults to true. |
| calculateClauseCoverage | boolean | yes | Include HTML structure with coverage highlighting. Defaults to true. |
| vsAPIKey | string | yes | API key, to be used to access a ValueSet API for downloading any missing ValueSets |
| useValueSetCaching | boolean | yes | Whether to cache ValueSets obtained by an API on the filesystem. Defaults to false. |
| useElmJsonsCaching | boolean | yes | Whether to cache the ELM JSONs and associated information from calculation. Defaults to false. |
| clearElmJsonsCache | boolean | yes | Whether to clear the ELM JSONs cache before running calculation. Defaults to false. |
| trustMetaProfile | boolean | yes | To "trust" the content of meta.profile as a source of truth for what profiles the data that [cql-exec-fhir](https://github.com/projecttacoma/cql-exec-fhir) grabs validates against. Defaults to false.|

### CLI

To run the globally installed CLI (see above), use the global `fqm-execution command`

```bash
Usage: fqm-execution [command] [options]

Commands:
  detailed
  reports
  raw
  gaps
  dataRequirements
  libraryDataRequirements
  queryInfo
  valueSets
  help [command]                              display help for command

Options:
  --debug                                     Enable debug output. (default: false)
  --slim                                      Use slimmed-down calculation results interfaces (default: false)
  --report-type <report-type>                 Type of report, "individual", "summary", "subject-list".
  -m, --measure-bundle <measure-bundle>       Path to measure bundle.
  -p, --patient-bundles <patient-bundles...>  Paths to patient bundles. Required unless output type is one of the following: dataRequirements, queryInfo, valueSets.
  --as-patient-source                         Load bundles by creating cql-exec-fhir PatientSource to pass into library calls.
  -s, --measurement-period-start <date>       Start date for the measurement period, in YYYY-MM-DD format (defaults to the start date defined in the Measure, or 2019-01-01 if not set there).
  -e, --measurement-period-end <date>         End date for the measurement period, in YYYY-MM-DD format (defaults to the end date defined in the Measure, or 2019-12-31 if not set there).
  --vs-api-key <key>                          API key, to authenticate against the ValueSet service to be used for resolving missing ValueSets.
  --cache-valuesets                           Whether or not to cache ValueSets retrieved from the ValueSet service. (default: false)
  --trust-meta-profile                        To "trust" the content of meta.profile as a source of truth for what profiles the data that cql-exec-fhir grabs validates against. (default: false)
  -o, --out-file [file-path]                  Path to a file that fqm-execution will write the calculation results to (default: output.json)
  --root-lib-ref <root-lib-ref>               Reference to the root Library
  -h, --help                                  display help for command
```

E.g.

```bash
# Generate a MeasureReport by calculating a measure on a patient bundle:
fqm-execution reports -m /path/to/measure/bundle.json -p /path/to/patient/bundle.json  -o reports.json

# Generate a MeasureReport by calculating a measure on multiple patient bundles:
fqm-execution reports -m /path/to/measure/bundle.json -p /path/to/patient1/bundle.json /path/to/patient2/bundle.json -o reports.json
```

### ValueSets

If the Measure bundle provided doesn't contain all the required `ValueSet` resources (with expansions or composes) to calculate the measure, an API key can be provided to resolve the ValueSets from their provided URLs. Currently only tested with ValueSets from [The NLM FHIR ValueSet API](https://cts.nlm.nih.gov/fhir).

To find your VSAC API key, sign into [the UTS homepage](https://uts.nlm.nih.gov/uts/), click on `My Profile` in the top right, and copy the `API KEY` value from the `UMLS Licensee Profile`.

### TypeScript

`fqm-execution` exports custom-defined TypeScript interfaces used within the code to allow for easy integration into other TypeScript projects. The TypeScript files defining these interfaces can be found [here](https://github.com/projecttacoma/fqm-execution/tree/master/src/types).

The TypeScript interfaces can be imported into another project like so:

```JavaScript
import { CalculatorTypes } from 'fqm-execution'

const options: CalculatorTypes.CalculationOptions = { /* .. */ }
```

## Local Development

### Prerequisites

- [Node.js >=14.0.0](https://nodejs.org/en/)
- [Git](https://git-scm.com/)

### Local Installation/Usage

Clone the source code:

```bash
git clone https://github.com/projecttacoma/fqm-execution.git
```

Install dependencies:

```bash
npm install
```

Run the CLI with ts-node:

```bash
npm run cli -- [command] [options]
```

Or using the built JavaScript:

```bash
npm run build
node build/cli.js [command] [options]
```

Optionally, you can install the `ts-node` utility globally to execute the TypeScript files directly instead of running the build script:

```bash
npm install -g ts-node
ts-node src/cli.ts [command] [options]
```

### Debug Option

The CLI comes built with a debug option (`-d/--debug`) which will include a `debugOutput` property on the results object containing any CQL, ELM, ValueSets, and engine results processed during execution.

### Debugging in VS Code

To attach a debugger to the TypeScript files for deeper inspection of the tool's functionality, we recommend using the [VS Code text editor](https://code.visualstudio.com/) to be able to provide easy debugger configuration.

Add the following contents to `.vscode/launch.json` in the root of the project directory:

```JavaScript
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
              "<node_internals>/**"
            ],
            "preLaunchTask": "npm: build",
            "program": "${workspaceFolder}/src/cli.ts",
            "outFiles": [
              "${workspaceFolder}/build/**/*.js"
            ],
            "internalConsoleOptions": "openOnSessionStart",
            "args": ["<reports | detailed | raw | gaps | dataRequirements | queryInfo | valueSets>", "-m", "${workspaceFolder}/relative/path/to/measure/bundle.json", "-p", "${workspaceFolder}/relative/path/to/patient/bundle.json", "-o"]
          }
    ]
}
```

This will allow you to run the CLI from the `Run` tab in VS Code, and will halt execution of the program at any breakpoints or `debugger` statements in the code, to allow for debugging of the functionality.

(Note: the `dataRequirements`, `queryInfo`, and `valueSets` commands do not require patient bundle(s) to be specified in the `args` array)

### Testing

We use [Jest](https://jestjs.io/en/) for unit-testing `fqm-execution`. Tests can be running using the `test` script in package.json:

```bash
npm test
```

For integration testing, see [the integration testing README](https://github.com/projecttacoma/fqm-execution/blob/master/test/integration/README.md) for more information. The integration tests can be run with the following command:

```bash
npm run test:integration
```

### Checks

When contributing new code, ensure that all tests, lint, and prettier checks pass with the following command:

```bash
npm run check
```

### Architecture Overview

![Overview](doc/FQM.png)

A visual representation of the calculate sequence of the application can be seen below:

![Calculate](doc/calculate_Sequence.png)

## Contributions

For suggestions or contributions, please use [GitHub Issues](https://github.com/projecttacoma/fqm-execution/issues) or open a [Pull Request](https://github.com/projecttacoma/fqm-execution/pulls).

## License

Copyright 2020-2022 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```bash
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
