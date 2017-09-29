
let fs = require('fs');

let dt = fs.readFileSync('F:/work/wasm/wabt/build/Debug/laya.wast','utf8');
let p1 = dt.indexOf(',\nfunction size end total');
dt = dt.substr(0,p1);
//console.log(dt);
let funcs = JSON.parse('{'+dt+'}');

/**@type {{name:string,self:number,total:number,childs:string[]}[]} */
let funcArr=[];
for(let m in funcs){
    let nc = funcs[m].childs;
    if(nc){
        nc= nc.concat();
        nc.forEach((v,i,arr)=>{
            arr[i] = v+':'+funcs[v].total;
        });
    }
    funcArr.push({name:m,self:funcs[m].self,total:funcs[m].total,childs:nc});
}

//自己排序
let sortedarr = funcArr.sort((a,b)=>{
    return b.self-a.self;
});
fs.writeFileSync('self.json', JSON.stringify(sortedarr,null,'\t'));

//总和排序
sortedarr = funcArr.sort((a,b)=>{
    return b.total-a.total;
});
fs.writeFileSync('total.json', JSON.stringify(sortedarr,null,'\t'));

let systemfunc=[

];
//各个类的统计
let classes=[
    'laya17JC2DShaderManager',
    'JCShaderManager',
    'laya20JCGpuProgramTemplate',
    'laya12JCGpuProgram',       //注意包含关系
    'laya14JCMaterialBase',
    'laya12JCMaterial',
    '$__ZN4laya11JCNamedData',
    '$__ZN4laya6JCMesh',
    '$__ZN4laya8JCMesh',
    '$__ZN4laya12JCVertexDesc',
    '$__ZN4laya10JCRenderer',
    '$__ZN4laya20JCFreeTypeFontRender',
    'JCGraphicsCmdDispatch',
    'JCParticleTemplate',
    'JCParticleTemplate2DCmdDispatch',
    'JCHtml5ContextDispatch',
    'JCNode2DCmdDispatch',
    'JCCmdDispathManager',
    
    '$__ZN4laya16JCParticleData',
    'JCParticleTemplate2D',
    'JSParticleTemplate2D',
    'JCParticle2DSubmit',
    'JCCmdSubmit',
    'JCDrawTextureSubmit',
    'JCStencilSubmit',
    'JCSkinMesh2DSubmit',
    'JCVGSubmit',
    'JCSubmit',
    'JCMesh2DSubmit',
    '$__ZN4laya14JCHtml5Context',
    '$__ZN4laya14JCImageManager',
    '$__ZN4laya15ContextDataInfo',
    '$__ZN4laya17JCContextSaveData',
    '$__ZN4laya10JCGraphics',
    '$__ZN4laya8JCNode2D',
    '$__ZN4laya6JCNode',
    '$__ZN4laya16JCNode2DRenderer',
    '$__ZN4laya18JCGraphicsWordInfo',
    '$__ZN4laya8JCIShape10createLine',
    
    'CmdDrawGlowRenderTarget',
    'CmdDrawImage',//5,9
    'CmdDrawSkinMesh',
    'CmdDrawParticle',
    'CmdDrawBlurRenderTarget',
    'CmdDrawCanvas',
    'CmdDrawIBVB',
    'CmdBase',
    'CmdClip',
    'CmdColorFilter',
    'CmdDrawText',
    'CmdFill',
    'CmdFillColor',
    'CmdFillImage',
    'CmdFunction',
    'CmdMatrixFilter',
    'CmdRestore',
    'CmdSave',
    'CmdStroke',
    'CmdSetTransform',
    
    'JCRenderContext',
    'JSHtml5Context',
    'JSImage',
    'JCConchRender',
    'JCScriptRuntime',
    'JCResource',
    'JCImage',
    'JCBufferManager',
    'JCRenderSaveData',
    'JSNode2D',
    'JSGraphics',
    'JCConch',
    'JCRenderContextManager',
    'JCResStateDispatcher',
    'JCColor',
    'JCFontManager',
    'JCTextManager',
    'JCFontInfo',
    'JCTexture',
    'JCWordRes',
    'JCRenderTarget',
    'JCResManager',
    'JCInAtlasRes',
    'JCDisplayRes',
    'JCAtlasManager',
    'JCAtlasGrid',
    'JCAtlas',
    'FontToken',
    'Matrix3',
    'JCMatrix44',
    'Rectangle',
    'JCVertexBuffer',
    'BitmapData',
    'JCMemClass',
    'JCShaderDefine',
    'JCNodeStyle',
    'RectGeometryColor',
    'RectGeometry',
    'JCSystemConfig'
];

let stls=[
    '$__ZNSt3',
    '$__ZNKSt3_'
];

let js_bind=[
    '$_emscripten_bind_'
];

let classstat={};
for(let m in funcs ){
    if(funcs[m].self<=0){
        //delete funcs[m];
    }
    classes.forEach((v)=>{
        if( m.indexOf(v)>=0){
            if(funcs[m].added)
                return;
            if(classstat[v]){
                classstat[v].sz+=funcs[m].self;
            }else{
                classstat[v]={sz:funcs[m].self?funcs[m].self:0};
            }
            //delete(funcs[m]); //统计类用的
            funcs[m].added=true;
        }
    });
    systemfunc.forEach((v)=>{
        if( m.indexOf(v)>=0){
            //delete(funcs[m]);
        }
    });
    stls.forEach((v)=>{
        if( m.indexOf(v)>=0){
            //delete(funcs[m]);
        }
    });
    js_bind.forEach((v)=>{
        if( m.indexOf(v)>=0){
            //delete(funcs[m]);
            if(classstat['emscripten']){
                classstat['emscripten'].sz+=funcs[m].self;
            }else{
                classstat['emscripten']={sz:funcs[m].self?funcs[m].self:0};
            }
        }
    });}

//fs.writeFileSync('funcs.json',JSON.stringify(funcs,null,'\t'));
let sum=0;
let cmdsz=0;
for( let m in classstat){
    sum+=classstat[m].sz;
    if(m.indexOf('Dispatch')>=0)
        cmdsz+=classstat[m].sz;
}
console.log(sum);
console.log(cmdsz);
fs.writeFileSync('classstat.json', JSON.stringify(classstat,null,'\t'));