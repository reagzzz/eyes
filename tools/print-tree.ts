import fs from "fs";
import path from "path";
function walk(p:string, prefix=""){ 
  if(!fs.existsSync(p)) return console.log(prefix+"(absent) "+p);
  for(const f of fs.readdirSync(p)) {
    const full = path.join(p,f);
    const stat = fs.statSync(full);
    console.log(prefix + (stat.isDirectory()? "📁 ": "📄 ") + full);
    if(stat.isDirectory()) walk(full, prefix+"  ");
  }
}
walk(path.join(process.cwd(),"src","app","api"));


