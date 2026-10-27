/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{photoFile}from'./shared/example-photo.js?v=8889d13bf0';
export function makeExample(){
return photoFile('example.jpg',{width:2400,height:1600,seed:20260907});
}
