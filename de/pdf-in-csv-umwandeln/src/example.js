/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{examplePdfFile}from'./shared/example-pdf.js?v=cdbecdf51b';
export function makeExample(){
return examplePdfFile('example-statement.pdf',{pages:3,ledger:true});
}
