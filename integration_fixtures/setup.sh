#!/bin/bash

echo "> Cloning FHIR Generated Patients..."
git clone --single-branch --branch master https://github.com/projecttacoma/fhir-patient-generator.git

echo "> Fetching CQF-tooling JAR"
./travis/download_cqf_tooling.sh

echo "> Cloning fqm execution service..."
git clone --single-branch --branch master https://github.com/projecttacoma/fqm-execution-service.git

echo "> Setting Up fqm execution service"
#docker pull contentgroup/cqf-ruler:develop
#docker run --name cqf-ruler --rm -dit -p 8080:8080 contentgroup/cqf-ruler:develop
npm start 

echo "> Waiting for fqm execution service to start up"
until `curl --output /dev/null --silent --head --fail http://localhost:3000/POST/calculateRaw`; do printf '.'; sleep 5; done

# grab the status code and error the setup if it isn't 200
statusCode=`curl -s -o /dev/null -L -I -w "%{http_code}" http://localhost:3000/POST/calculateRaw`
if [[ "$statusCode" != "200" ]]; then
  echo "X fqm execution service has failed to start up properly"
  exit 1
fi