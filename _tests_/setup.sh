#!/bin/bash

echo "> Cloning FHIR Generated Patients..."
git clone --single-branch --branch master https://github.com/projecttacoma/fhir-patient-generator.git

git clone --single-branch --branch master https://github.com/projecttacoma/connectathon.git  

echo "> Fetching CQF-tooling JAR"
./_tests_/download_cqf_tooling.sh
