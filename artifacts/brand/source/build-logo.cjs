const fs = require('node:fs');
const path = require('node:path');
const fontkit = require(path.join(process.env.TEMP, 'kindi-logo-tools-v2/node_modules/fontkit'));
const sharp = require('../../../node_modules/sharp');
const dir = path.resolve(__dirname, '..');
const thai = fontkit.openSync(path.join(__dirname,'Kanit-SemiBold.ttf'));
const latin = fontkit.openSync(path.resolve(__dirname,'../../../public/fonts/IBMPlexSansThai-Medium.ttf'));
function outline(font,text,size,tracking=0){
 const run=font.layout(text);let x=0,y=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const paths=[];
 run.glyphs.forEach((glyph,i)=>{
  const p=run.positions[i],gx=x+p.xOffset,gy=y+p.yOffset,b=glyph.bbox;
  if(glyph.path.commands.length){minX=Math.min(minX,gx+b.minX);maxX=Math.max(maxX,gx+b.maxX);minY=Math.min(minY,gy+b.minY);maxY=Math.max(maxY,gy+b.maxY);paths.push(`<path transform="translate(${gx} ${gy})" d="${glyph.path.toSVG()}"/>`);}
  x+=p.xAdvance+tracking;y+=p.yAdvance;
 });
 const s=size/font.unitsPerEm;
 return {width:(maxX-minX)*s,height:(maxY-minY)*s,svg:`<g transform="translate(${-minX*s} ${maxY*s}) scale(${s} ${-s})">${paths.join('')}</g>`};
}
const word=outline(thai,'กินดิ!',210);
const english=outline(latin,'KIN DI',24,140);
const width=Math.ceil(word.width+20),height=Math.ceil(word.height+english.height+37);
function svg(color){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">กินดิ! KIN DI</title><g fill="${color}" transform="translate(10 6)">${word.svg}<g transform="translate(2 ${word.height+23})">${english.svg}</g></g></svg>`;}
const iconLetter=outline(thai,'ก',150);
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="title"><title id="title">กินดิ!</title><rect width="256" height="256" rx="54" fill="#a33326"/><g fill="#fffdf8" transform="translate(${(256-iconLetter.width)/2} ${(256-iconLetter.height)/2})">${iconLetter.svg}</g></svg>`;
async function main(){
 for(const [name,color] of [['kindi-logo','#a33326'],['kindi-logo-black','#24211e'],['kindi-logo-white','#ffffff']]){fs.writeFileSync(path.join(dir,name+'.svg'),svg(color));await sharp(Buffer.from(svg(color))).resize({width:1600}).png().toFile(path.join(dir,name+'.png'));}
 fs.writeFileSync(path.join(dir,'kindi-icon.svg'),icon);await sharp(Buffer.from(icon)).resize(512).png().toFile(path.join(dir,'kindi-icon.png'));
 const regular=fs.readFileSync(path.resolve(__dirname,'../../../public/fonts/IBMPlexSansThai-Regular.ttf')).toString('base64');
 const html=`<!doctype html><html lang="th"><meta charset="utf-8"><title>KIN DI · Logo</title><style>@font-face{font-family:Plex;src:url(data:font/ttf;base64,${regular})}*{box-sizing:border-box}body{margin:0;padding:54px 70px;background:#fff;color:#302923;font-family:Plex,sans-serif}header{display:flex;justify-content:space-between;border-bottom:1px solid #e6dfd5;padding-bottom:22px;font-size:14px}header span:last-child{color:#76685c}main{height:495px;display:flex;justify-content:center;align-items:center}.main-logo{width:430px}.variants{display:grid;grid-template-columns:1fr 1fr 250px;gap:22px}.variant{height:230px;display:flex;align-items:center;justify-content:center;border:1px solid #e6dfd5;border-radius:3px;position:relative}.variant>svg{width:210px;max-height:140px}.variant.red{background:#a33326;border-color:#a33326}.variant.icon>svg{width:108px;height:108px}.caption{position:absolute;bottom:17px;left:20px;font-size:11px;color:#76685c}.red .caption{color:#f5ded3}footer{display:flex;justify-content:space-between;margin-top:29px;font-size:12px;color:#6e5d50}</style><header><span>KIN DI / กินดิ!</span><span>โลโก้แบบตัวอักษร · สีเดียว · ไม่มีเอฟเฟกต์</span></header><main><div class="main-logo">${svg('#a33326')}</div></main><section class="variants"><div class="variant">${svg('#24211e')}<span class="caption">สีเดียว / งานพิมพ์</span></div><div class="variant red">${svg('#ffffff')}<span class="caption">บนพื้นสีเข้ม</span></div><div class="variant icon">${icon}<span class="caption">ไอคอนย่อ</span></div></section><footer><span>ตัวอักษรกระชับ อ่านตรง ๆ จำจากชื่อ</span><span>CHILI RED #A33326</span></footer></html>`;
 fs.writeFileSync(path.join(dir,'preview.html'),html);
 console.log(JSON.stringify({width,height,files:fs.readdirSync(dir).filter(x=>/\.(svg|png)$/.test(x))}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
