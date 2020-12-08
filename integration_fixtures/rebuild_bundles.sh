#!/bin/bash

tooling_jar=./travis/tooling/tooling-1.1.0-SNAPSHOT-jar-with-dependencies.jar
rebuild_log=./travis/tooling/rebuildRun.log
ig_resource_path=./fhir401/input/connectathon.xml

# Remove EXM165 because it is unfinished
#rm ./fhir401/input/resources/measure/measure-EXM165_FHIR4-8.5.000.json
rm ./fhir401/input/pagecontent/cql/EXM165-9.0.000.cql

java -jar $tooling_jar -RefreshIG -ip="./fhir401/" -igrp="$ig_resource_path" -iv=fhir4 -t -d -v 2>&1 -fs http://localhost:8080/cqf-ruler-r4/fhir | tee $rebuild_log

if grep -q '^0 Measures failed refresh' $rebuild_log && grep -q '^0 Measures refreshed, but not bundled' $rebuild_log; then
  echo "Bundle rebuild appears to be successful"
else
  echo "Bundle rebuild appears to have failed"
  exit 1
fi