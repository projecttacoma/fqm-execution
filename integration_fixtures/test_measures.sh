#!/bin/bash

echo "> Rebuilding Measure Bundles and Loading CQF-Ruler"
if ! ./integration_fixtures/rebuild_bundles.sh; then
  exit 1
fi

echo "> Starting Calculation and Comparison of MeasureReports"
node ./integration_fixtures/calcurun_tests.ts $1