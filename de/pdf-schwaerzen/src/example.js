/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{examplePdfFile}from'./shared/example-pdf.js?v=aba738fc2c';
export function makeExample(){
return examplePdfFile('example.pdf',{pages:3});
}
