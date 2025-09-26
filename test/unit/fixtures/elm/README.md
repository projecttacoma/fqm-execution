## Prerequisites

* `node` version `12.x` or greater, with `ts-node` installed globally
    * `npm install -g ts-node`
* `Docker`

## Use

To use the `Makefile` provided in this directory to translate CQL into ELM JSON:

* Navigate to the `test/unit/fixtures/elm` directory in the command line
* Put your CQL in a file (or multiple files) in the `elm` directory, with the `.cql` extension
* run `make` in this directory. `make` will:
    * Start the translation service in Docker (if not already started)
    * Translate all files in the `elm` directory into ELM JSON
    * Place the translated JSON files into `output/`

If the translation service returns any errors from translation, the parser will output errors for the first file it comes to with errors. That file, and any after it, will not be written to `output/`

The translation service is called with `EnableAnnotations` and `EnableLocators` set, through URL query parameters.

## Cleanup

To stop the translation service, run `make clean`. This will not delete any translated JSON in `output/`.


## Building from npm Script

`package.json` has a script for building all of the CQL files within the `test/unit/fixtures/elm` directory:

```bash
npm run build:elm-fixtures
```

This will translate all CQL files within the elm/ directory structure to the output/ directory. It will then clean up the translation service. The user can inspect translated files and decide whether to replace the existing fixture.