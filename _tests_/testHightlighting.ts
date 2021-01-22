import { ClauseResult } from '../src/types/Calculator';
import { FinalResult } from '../src/types/Enums';

//check the correct highlighting was applied based on the clause results,
//return an array
//true == highlighting was correct
//false == incorrect
//if any entries in the array are false the test fails
//break on a failure don't continue parsing (or should we?)
export async function checkClauseMatches (detailedResults)
{

  let groupResult = detailedResults.pop(detailedResults.detailedGroupResult);
  const htmlString = groupResult.detailedGroupResult.html;
  while(groupResult){

  const clauseResults: ClauseResult[] = groupResult.clauseResults;
  const libraryName: string = groupResult.data.root.libraryName;
  const clauseResult = clauseResults.find(result => result.libraryName === libraryName && result.localId === localId);
   if(clauseResult.final == FinalResult.TRUE){
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
   groupResult = detailedResults.pop(detailedResults.detailedGroupResult);

 }
 
}
