#!/bin/bash

echo "> Cloning FHIR Generated Patients..."
git clone --single-branch --branch master https://github.com/projecttacoma/fhir-patient-generator.git

echo "> Fetching CQF-tooling JAR"
./integration_fixtures/download_cqf_tooling.sh

echo "> Cloning fqm execution service..."
git clone --single-branch --branch master https://github.com/projecttacoma/fqm-execution-service.git

echo "> "