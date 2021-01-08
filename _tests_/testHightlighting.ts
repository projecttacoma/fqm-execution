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
export async function checkClauseMatches (detailedResults ) : bool compareResults []
{

  let groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);
  while(groupResult){

  const clauseResults: ClauseResult[] = groupResult.clauseResults;
   if(clauseResults.final == FinalResult.TRUE){


   } else if (clauseResult.final === FinalResult.FALSE) {
     
  }
   groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);

 }
 });
}
