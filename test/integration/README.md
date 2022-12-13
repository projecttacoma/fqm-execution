# fqm-execution Integration Testing

This directory includes example CQL files that showcase specific types of eCQM logic. The measure bundles are auto-generated using the [ecqm-bundler](https://github.com/mgramigna/ecqm-bundler) CLI.

## Building Bundles from Existing CQL

Each subdirectory for a specific measure contains a `generate.sh` script which will ingest the main CQL logic and output a measure bundle JSON file using `ecqm-bundler`. Targets for running these scripts exist in [the Makefile](https://github.com/projecttacoma/fqm-execution/tree/master/test/integration/Makefile).
The `Makefile` also includes a target for starting up an instance of [cql-translation-service](https://github.com/cqframework/cql-translation-service), which is required for `ecqm-bundler` to translate CQL.

### Building from npm Script

`package.json` has a script for building all of the measures within the `test/integration` directory:

```bash
npm run build:test-data
```

### Building Using Make Targets

Individual measure bundles can be built with the `Makefile` in the `test/integration` directory. This requires `ecqm-bundler` to be installed globally:

```bash
npm install -g ecqm-bundler
```

To build a specific measure, use the `make` target corresponding to that measure's directory. For example:

```bash
make .start-translator # only necessary if one is not already running
make proportion-boolean # builds only the measure bundle for the logic in the proportion-boolean/ directory
```

## Writing New Cases

See the [document on naming conventions](https://gist.github.com/mgramigna/574b680fa13932254d5ce1513164d6ae) agreed upon for the integration tests for more context on directory and file names.

To get started creating a new measure bundle, first create the directory structure and the content of the actual CQL:

```
.
├── Makefile
├── README.md
└── [scoring-code]-[population-basis]
    └── cql
        └──[scoring-code]-[population-basis].cql
```

Next, create a `generate.sh` script with the necessary `ecqm-bundler` command to generate the measure bundle. See [the ecqm-bundler documentation](https://github.com/mgramigna/ecqm-bundler#usage) for more information.

```bash
#!/bin/bash

# test/integration/[scoring-code]-[population-basis]/generate.sh
dir=$(dirname $BASH_SOURCE)

ecqm-bundler -c $dir/cql/[scoring-code]-[population-basis].cql [... other options ...]
```

Lastly, add a target to `test/integration/Makefile` for the generation of this new measure bundle:

```makefile
# ...

[scoring-code]-[population-basis]:
    ./[scoring-code]-[population-basis]/generate.sh

# ...
```

The new test case can now be generated using either the npm script or the make target approaches defined above.
