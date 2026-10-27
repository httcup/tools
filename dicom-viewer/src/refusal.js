/* Built from https://github.com/httcup/tools by build.py. Verify with: python build.py --check */
export function refuse(key,values={}){
const error=new Error(key);
error.values=values;
return error;
}
