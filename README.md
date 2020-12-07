# FHIR Quality Measure Execution and Highlighting

Library for executing FHIR-based Electronic Clinical Quality Measures (eCQMs) written in Clinical Quality Language (CQL)

* [Installation](#installation)
* [Usage](#usage)
  * [Module](#module)
  * [CLI](#cli)
  * [TypeScript](#typescript)
* [Local Development](#local-development)
  * [Prerequisites](#prerequisites)
  * [Local Installation/Usage](#local-installation%2Fusage)
  * [Debugging in VS Code](#debugging-in-vs-code)
  * [Testing](#testing)
  * [Checks](#checks)
* [License](#license)

## Installation

`fqm-execution` can be installed into your project with npm:

```
$ npm install --save https://github.com/projecttacoma/fqm-execution.git
```

To install the global command line interface (CLI), use npm global installation:

```
$ npm install -g https://github.com/projecttacoma/fqm-execution.git
```

## Usage

### Module

#### ES6
``` JavaScript
import { Calculator } from 'fqm-execution';

const rawResults = Calculator.calculateRaw(measureBundle, patientBundles, options); // Get raw results from CQL engine for each patient
const rawResults = Calculator.calculate(measureBundle, patientBundles, options); // Get detailed population results for each patient
const rawResults = Calculator.calculateMeasureReports(measureBundle, patientBundles, options); // Get individual FHIR MeasureReports for each patient
```

#### Require
``` JavaScript
const { Calculator } = require('fqm-execution');

const rawResults = Calculator.calculateRaw(measureBundle, patientBundles, options); // Get raw results from CQL engine for each patient
const rawResults = Calculator.calculate(measureBundle, patientBundles, options); // Get detailed population results for each patient
const rawResults = Calculator.calculateMeasureReports(measureBundle, patientBundles, options); // Get individual FHIR MeasureReports for each patient
```

### CLI

To run the globally installed CLI (see above), use the global `fqm-exeuction command`

```
Usage: fqm-execution [options]

Options:
  -o, --output-type <type>                    type of output, "raw", "detailed", "reports" (default: "detailed")
  -m, --measure-bundle <measure-bundle>       path to measure bundle
  -p, --patient-bundles <patient-bundles...>  paths to patient bundle
  -h, --help                                  display help for command
```

E.g.

```
$ fqm-execution -o reports -m /path/to/measure/bundle.json -p /path/to/patient1/bundle.json > reports.json
```

### TypeScript

`fqm-execution` exports custom-defined TypeScript interfaces used within the code to allow for easy integration into other TypeScript projects. The TypeScript files defining these interfaces can be found [here](https://github.com/projecttacoma/fqm-execution/tree/master/src/types)

## Local Development

### Prerequisites

* [Node.js >=10.15.1](https://nodejs.org/en/)
* [Git](https://git-scm.com/)

### Local Installation/Usage

Clone the source code:

```
$ git clone https://github.com/projecttacoma/fqm-execution.git
```

Install dependencies:

```
$ npm install
```

Optionally, you can install the `ts-node` utility globally to execute the TypeScript files directly instead of running the build script:

```
$ npm install -g ts-node
```

Run the CLI with ts-node:

```
$ ts-node src/cli.ts [options]
```

Or using the built JavaScript:

```
$ npm run build
$ node build/cli.js [options]
```


### Debugging in VS Code

To attach a debugger to the TypeScript files for deeper inspection of the tool's functionality, we recommend using the [VS Code text editor](https://code.visualstudio.com/) to be able to provide easy debugger configuration.

Add the following contents to `.vscode/launch.json` in the root of the project directory:

```JSON
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
            "args": ["-m", "${workspaceFolder}/relative/path/to/measure/bundle.json", "-p", "${workspaceFolder}/relative/path/to/patient/bundle.json", "-o", "<reports | detailed | raw>"]
          }
    ]
}

```

This will allow you to run the CLI from the `Run` tab in VS Code, and will halt execution of the program at any breakpoints or `debugger` statements in the code, to allow for debugging of the functionality.

### Testing

We use [Jest](https://jestjs.io/en/) for unit-testing `fqm-execution`. Tests can be running using the `test` script in package.json:

```
$ npm test
```

### Checks

When contributing new code, ensure that all tests, lint, and prettier checks pass with the following command:

```
$ npm run check
```


## License

Copyright 2020 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

```
http://www.apache.org/licenses/LICENSE-2.0
```

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
