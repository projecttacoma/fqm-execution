#!/bin/bash

echo "> Rebuilding Measure Bundles and Loading CQF-Ruler"
if ! ./_tests_/rebuild_bundles.sh; then
  exit 1
fi

echo "> Starting Calculation and Comparison of MeasureReports"
node ./_tests_/calcurun_tests.ts $1
