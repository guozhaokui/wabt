
let fs = require('fs');

let funcs = JSON.parse(fs.readFileSync('F:/work/wasm/wabt/build/Debug/funcs.json','utf8'));

/**@type {{name:string,self:number,total:number,childs:string[]}[]} */
let funcArr=[];
for(let m in funcs){
    funcArr.push({name:m,self:funcs[m].self,total:funcs[m].total,childs:funcs[m].childs});
}

//自己排序
let sortedarr = funcArr.sort((a,b)=>{
    return b.self-a.self;
});
fs.writeFileSync('self.txt', JSON.stringify(sortedarr,null,'\t'));

//总和排序
sortedarr = funcArr.sort((a,b)=>{
    return b.total-a.total;
});
fs.writeFileSync('total.txt', JSON.stringify(sortedarr,null,'\t'));

