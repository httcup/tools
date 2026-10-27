/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{markCanvas}from'./shared/example-mark.js?v=398cceeb70';
import{canvasFile}from'./shared/example-photo.js?v=398cceeb70';
export function makeExample(){
return canvasFile(markCanvas(720,{plate:false}),'example-mark.png','image/png');
}
