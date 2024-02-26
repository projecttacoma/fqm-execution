import fs from 'fs';
import Papa from 'papaparse';
import * as csv from 'fast-csv';

// create directory for by_measure outputs if it doesn't exist
if (!fs.existsSync('./elm-parser-input/by_measure_all')) {
  fs.mkdirSync('./elm-parser-input/by_measure_all');
}

if (!fs.existsSync('./elm-parser-json')) {
  fs.mkdirSync('./elm-parser-json');
}

if (!fs.existsSync('./elm-parser-json/all')) {
  fs.mkdirSync('./elm-parser-json/all');
}

if (!fs.existsSync('./elm-parser-json/by_measure')) {
  fs.mkdirSync('./elm-parser-json/by_measure');
}

// Go through fhir_all.csv and split measures into their own csv files in the by_measure directory
const fhirAllFile = fs.createReadStream('./elm-parser-input/fhir_all.csv');
Papa.parse(fhirAllFile, {
  header: true,
  delimiter: '|',
  complete: (results: any) => {
    const groups: Record<string, any[]> = {};
    results.data.forEach((row: any) => {
      const attribute = row['Measure'];
      if (!groups[attribute]) {
        groups[attribute] = [];
      }
      groups[attribute].push(row);
    });
    for (const attribute in groups) {
      const ws = fs.createWriteStream(`./elm-parser-input/by_measure_all/${attribute}.csv`);
      csv.write(groups[attribute], { headers: true }).pipe(ws);
    }
  }
});

// Go through each of the csv files in elm_parser_input/by_measure_all and convert them to JSON
fs.readdirSync('./elm-parser-input/by_measure_all').forEach(file => {
  const fileStream = fs.createReadStream(`./elm-parser-input/by_measure_all/${file}`);
  Papa.parse(fileStream, {
    header: true,
    delimiter: ',',
    complete: (results: any) => {
      const fileName = file.split('.')[0];
      fs.writeFileSync(`./elm-parser-json/all/${fileName}.json`, JSON.stringify(results.data, null, 2), 'utf8');
    }
  });
});

// Go through each of the csv files in elm_parser_input/by_measure and convert them to JSON
fs.readdirSync('elm-parser-input/by_measure').forEach(file => {
  const fileStream = fs.createReadStream(`elm-parser-input/by_measure/${file}`);
  Papa.parse(fileStream, {
    header: false,
    delimiter: '|',
    complete: (results: any) => {
      let jsonResults: any[] = [];
      results.data.forEach((row: any) => {
        jsonResults.push({
          'Data Type': row[0],
          'Template Id': row[1],
          'Data Type Value OID': row[2],
          Attribute: row[3]
        });
      });
      const fileName = file.split('.')[0];
      fs.writeFileSync(`./elm-parser-json/by_measure/${fileName}.json`, JSON.stringify(jsonResults, null, 2), 'utf8');
    }
  });
});
