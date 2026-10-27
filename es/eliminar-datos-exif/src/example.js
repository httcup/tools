/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
import{photoCanvas,canvasFile}from'./shared/example-photo.js?v=b1175e8a95';
import{withExif}from'./shared/example-exif.js?v=b1175e8a95';
export async function makeExample(){
const plain=await canvasFile(photoCanvas(1600,1200),'example.jpg');
return withExif(plain,'example.jpg');
}
