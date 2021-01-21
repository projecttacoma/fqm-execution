import { ClauseResult } from './src/types/Calculator';
import { FinalResult } from './src/types/Enums';

// export async function  parseResults() {

 //}
//check the correct highlighting was applied based on the clause results,
//return an array
//true == highlighting was correct
//false == incorrect
//if any entries in the array are false the test fails
//break on a failure don't continue parsing (or should we?)
export async function checkClauseMatches (detailedResults)
{

  let groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);
  const htmlString = patientExecutionResult.detailedGroupResult.html;
  while(groupResult){

  const clauseResults: ClauseResult[] = groupResult.clauseResults;
   if(clauseResults.final == FinalResult.TRUE){
     //  color: '#20744c',
     if(!(htmlString.contain('#20744c')))
     {
       return;
     } else continue;
   } else if (clauseResult.final === FinalResult.FALSE) {
     //does the string contain color: '#a63b12',
     if(!(htmlString.contain('#a63b12')))
     {
       return;
     } else continue;
  }
   groupResult = patientExecutionResult.detailedResults.pop(detailedGroupResult);

 }
 
}
