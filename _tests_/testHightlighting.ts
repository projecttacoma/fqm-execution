import { Annotation, ELM } from './src/types/ELMTypes';
import Handlebars from 'handlebars';
import { ClauseResult, StatementResult } from './src/types/Calculator';
import { FinalResult, Relevance } from './src/types/Enums';
import mainTemplate from './src/templates/main';
import clauseTemplate from './src/templates/clause';
import {cqlLogicClauseTrueStyle, cqlLogicClauseFalseStyle} from '/src/HTMLGenerator';

//since the return is a string will need to simply parse the string to pick
// out the various clauses
 export async function  parseResults(string : results):: string[] {

 }

 //this is the function that will be called to check the highlighting is correc
 //aplied to clauses that eval to cqlLogicClauseTrueStyle


//check the correct highlighting was applied based on the clause results,
//return an array
//true == highlighting was correct
//false == incorrect
//if any entries in the array are false the test fails
//break on a failure don't continue parsing (or should we?)
export async function checkClauseMatches (detailedResults )
{

  let groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);
  let htmlString = patientExecutionResult.detailedGroupResult.html;
  while(groupResult){

  const clauseResults: ClauseResult[] = groupResult.clauseResults;
   if(clauseResults.final == FinalResult.TRUE){
     //  color: '#20744c',
     if(!(htmlString.contain("#20744c")))
     {
       return;
     } else continue;
   } else if (clauseResult.final === FinalResult.FALSE) {
     //does the string contain color: '#a63b12',
     if(!(htmlString.contain("#a63b12")))
     {
       return;
     } else continue;
  }
   groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);

 }
 });
}
