#!/bin/bash

echo "> Rebuilding Measure Bundles and Loading CQF-Ruler"
if ! ./travis/rebuild_bundles.sh; then
  exit 1
fi

echo "> Starting Calculation and Comparison of MeasureReports"
node ./travis/calculateMeasures.js $1