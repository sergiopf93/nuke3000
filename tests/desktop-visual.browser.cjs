// Fixed scenes from ec9a955 vs current UI. Ignore only documented dynamic content.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const evidence=path.resolve(__dirname,'../docs/evidence/mobile-ux');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),results=[];
 const ignored=[{label:'Código aleatorio de sala',rect:[1000,50,1185,80]},{label:'Tooltip de hover (nombre corregido)',rect:[820,610,950,710]},{label:'LED de turno animado',rect:[30,115,60,150]}];
 for(const stage of ['map','combat']){
  const images=['before','after'].map(tag=>'data:image/png;base64,'+fs.readFileSync(path.join(evidence,tag+'-1440x900-'+stage+'.png')).toString('base64'));
  const diff=await page.evaluate(async({images,ignored})=>{
   const data=[];for(const src of images){const im=new Image();im.src=src;await im.decode();const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);data.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);}
   let pixels=0;for(let y=0;y<900;y++)for(let x=0;x<1440;x++){
    if(ignored.some(({rect:[x1,y1,x2,y2]})=>x>=x1&&x<=x2&&y>=y1&&y<=y2))continue;
    const k=(y*1440+x)*4;if(data[0][k]!==data[1][k]||data[0][k+1]!==data[1][k+1]||data[0][k+2]!==data[1][k+2])pixels++;
   }return pixels;
  },{images,ignored});results.push({stage,changedPixelsOutsideIgnored:diff});
 }
 fs.writeFileSync(path.join(evidence,'desktop-visual-comparison.json'),JSON.stringify({baseline:'ec9a955',viewport:{width:1440,height:900},ignored,results},null,2));
 for(const result of results)assert.equal(result.changedPixelsOutsideIgnored,0,JSON.stringify(result));
 console.log('PASS comparación desktop: mapa y combate sin diferencias fuera de código de sala, tooltip y LED animado');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});
