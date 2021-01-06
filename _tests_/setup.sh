#!/bin/bash

echo "> Cloning FHIR Generated Patients..."
git clone --single-branch --branch master https://github.com/projecttacoma/fhir-patient-generator.git

git clone --single-branch --branch master https://github.com/projecttacoma/connectathon.git  

