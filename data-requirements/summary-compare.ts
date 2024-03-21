import fs from 'fs';
import _ from 'lodash';
import path from 'path';

const ELM_PARSER_DR_BASE_PATH = path.join(__dirname, './elm-parser-dr');
const FQM_E_DR_BASE_PATH = path.join(__dirname, './fqm-e-dr');

const measure = process.argv[2] ?? 'all';

const RESET = '\x1b[0m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';
const FG_RED = '\x1b[31m';

export type DRFilePath = {
  shortName: string;
  fullPath: string;
};

async function main() {
  let files: DRFilePath[] = [];

  // if no measure is specified, go through all the data requirements output for all of the measures
  if (measure === 'all') {
    // get all of the data-requirements output files from elm-parser-dr
    files = fs.readdirSync(ELM_PARSER_DR_BASE_PATH).map(f => ({
      shortName: f.split('.xml')[0],
      fullPath: path.join(ELM_PARSER_DR_BASE_PATH, f)
    }));
  } else {
    const file = fs.existsSync(path.join(ELM_PARSER_DR_BASE_PATH, `${measure}.xml.json`));
    if (file) {
      files = [{ shortName: measure, fullPath: path.join(ELM_PARSER_DR_BASE_PATH, `${measure}.xml.json`) }];
    } else {
      console.log(`No data-requirements output found for measure ${measure}`);
    }
  }

  for (const elmParserDRFile of files) {
    const measureName = elmParserDRFile.shortName;
    const fqmEDRFilePath = path.join(FQM_E_DR_BASE_PATH, `${measureName}-dr.json`);

    // Skip measures that do not have a corresponding data-requirements output in fqm-e-dr
    if (!fs.existsSync(fqmEDRFilePath)) continue;

    console.log(`\n-----Data Requirements Comparison for ${measureName}-----`);

    const fqmEDRLib = JSON.parse(fs.readFileSync(fqmEDRFilePath, 'utf8')) as fhir4.Library;
    const elmParserDRLib = JSON.parse(fs.readFileSync(elmParserDRFile.fullPath, 'utf8')) as fhir4.Library;

    if (!fqmEDRLib.resourceType) {
      console.log(
        `${FG_RED}%s${RESET}: An error occurred in calculating data-requirements in fqm-execution for ${measureName}`,
        'EXECUTION ERROR'
      );
      continue;
    }

    const fqmEDR = fqmEDRLib.dataRequirement as fhir4.DataRequirement[];
    const elmParserDR = elmParserDRLib.dataRequirement as fhir4.DataRequirement[];

    const fqmEData: Record<string, fhir4.DataRequirement[]> = {};
    fqmEDR.forEach(dr => {
      if (fqmEData[dr.type]) {
        fqmEData[dr.type].push(dr);
      } else {
        fqmEData[dr.type] = [dr];
      }
    });

    // Sort the data requirements by type alphabetically
    const sortedFqmEData: Record<string, fhir4.DataRequirement[]> = {};
    Object.keys(fqmEData)
      .sort()
      .forEach(key => {
        sortedFqmEData[key] = fqmEData[key];
      });

    // Group data requirements by type in Record<string, DataRequirementType[]>
    const elmParserData: Record<string, fhir4.DataRequirement[]> = {};
    elmParserDR.forEach(dr => {
      if (elmParserData[dr.type]) {
        elmParserData[dr.type].push(dr);
      } else {
        elmParserData[dr.type] = [dr];
      }
    });

    // Sort the data requirements by type alphabetically
    const sortedElmParserData: Record<string, fhir4.DataRequirement[]> = {};
    Object.keys(elmParserData)
      .sort()
      .forEach(key => {
        sortedElmParserData[key] = elmParserData[key];
      });

    // get the data requirements types that the output do not have in common, if any
    const keyDifferences = _.difference(Object.keys(sortedElmParserData), Object.keys(sortedFqmEData));

    if (keyDifferences.length > 0) {
      const missingElmParserKeys: string[] = [];
      const missingFqmEKeys: string[] = [];

      keyDifferences.forEach(key => {
        if (Object.keys(sortedElmParserData).includes(key)) {
          missingFqmEKeys.push(key);
        } else {
          missingElmParserKeys.push(key);
        }
      });
      console.log(`${FG_RED}%s${RESET}: Missing DR Types`, 'DIFF');
      if (missingElmParserKeys.length > 0) {
        console.log(
          `elm-parser: missing data-requirements of the following type(s): ${missingElmParserKeys.toString()}`
        );
      }
      if (missingFqmEKeys.length > 0) {
        console.log(`fqm-execution: missing data-requirements of the following type(s): ${missingFqmEKeys.toString()}`);
      }
    } else {
      console.log(`${FG_GREEN}%s${RESET}: No Missing DR Types`, 'PASS');
    }

    console.log('\n');

    // get the keys that both outputs have in common to go through
    const keys = _.intersection(Object.keys(sortedElmParserData), Object.keys(sortedFqmEData));

    for (const key of keys) {
      const elmParserDRByKey = sortedElmParserData[key];
      const fqmEDRByKey = sortedFqmEData[key];

      // get the data requirements from the elm-parser output that do not exist in the fqm-execution output
      // i.e. is there a data requirement in the fqm-execution output of the same type that has a codeFilter entry with
      // a valueSet that is the same
      const missingDRs = elmParserDRByKey.filter(dr =>
        fqmEDRByKey.every(dr2 => dr.codeFilter?.every(cf => dr2.codeFilter?.every(cf2 => cf.valueSet !== cf2.valueSet)))
      );

      // get the data requirements from the fqm-execution output that do not exist in the elm-parser output
      const missingELMDRs = fqmEDRByKey.filter(dr =>
        elmParserDRByKey.every(dr2 =>
          dr.codeFilter?.every(cf => dr2.codeFilter?.every(cf2 => cf.valueSet !== cf2.valueSet))
        )
      );

      if (missingDRs.length === 0 && missingELMDRs.length === 0 && elmParserDRByKey.length === fqmEDRByKey.length) {
        console.log(`${FG_GREEN}%s${RESET}: data requirements of type ${key} match`, `PASS (${key})`);
      } else if (missingDRs.length > 0 || missingELMDRs.length > 0) {
        console.log(`${FG_RED}%s${RESET}: `, `FAIL (${key})`);
        if (missingDRs.length > 0) {
          const missingvValueSets = missingDRs.map(dr => dr.codeFilter?.find(cf => cf.valueSet)?.valueSet);
          console.log(
            `fqm-execution is missing the data requirement of type ${key} for the following valuesets: ${JSON.stringify(
              missingvValueSets
            )}`
          );
        }
        if (missingELMDRs.length > 0) {
          const missingELMValueSets = missingELMDRs.map(dr => dr.codeFilter?.find(cf => cf.valueSet)?.valueSet);
          console.log(
            `elm-parser-for-ecqms is missing the data requirement(s) of type ${key} for the following valueset(s): ${JSON.stringify(
              missingELMValueSets
            )}`
          );
        }
      } else {
        console.log(
          `${FG_RED}%s${RESET}: something else went wrong (fqm-execution: ${fqmEDRByKey.length}, elm-parser: ${elmParserDRByKey.length})`,
          `FAIL (${key})`
        );
      }

      console.log(`${FG_YELLOW}%s${RESET}`, 'MUST SUPPORTS');

      // go through all of the data requirements from the elm-parser and if any of them have a codeFilter.valueSet that match a data requirement
      // from fqm-execution, then see if the mustSupports match and if they don't, print them out
      // TO DO: maybe make this a flag
      elmParserDRByKey.forEach(dr => {
        const elmParserMustSupports = dr.mustSupport;
        const elmParserValueSet = dr.codeFilter?.find(cf => cf.valueSet)?.valueSet;

        if (elmParserValueSet) {
          const fqmEMatchMustSupports = fqmEDRByKey.find(dr =>
            dr.codeFilter?.some(cf => cf.valueSet === elmParserValueSet)
          )?.mustSupport;

          const equalMustSupports = _.isEqual(elmParserMustSupports, fqmEMatchMustSupports);

          if (!equalMustSupports) {
            console.log(`${FG_RED}%s${RESET}:`, `MUST SUPPORTS FAIL (${key}-${elmParserValueSet})`);
            console.log(`fqm-execution has the following mustSupports: ${fqmEMatchMustSupports ?? ''}`);
            console.log(`elm-parser-for-ecqms has the following mustSupports: ${elmParserMustSupports}`);
          } else {
            console.log(
              `${FG_GREEN}%s${RESET}: matching mustSupports`,
              `MUST SUPPORTS PASS (${key}-${elmParserValueSet})`
            );
          }
        }
      });
      console.log('\n');
    }
  }
}

main().then(() => console.log('done'));
