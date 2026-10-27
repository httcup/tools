/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{exampleVideoFile}from'./shared/example-video.js?v=212a067387';
export function makeExample(){
return exampleVideoFile('example.mp4',{width:1920,height:1080,seconds:5});
}
