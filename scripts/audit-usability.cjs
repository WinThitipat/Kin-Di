const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const result={};
if(process.env.RUN_HISTORICAL_AUDIT!=='1')throw new Error('Historical audit from before the database migration. Use verify-supabase-flow.cjs for current checks.');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  for(const quota of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const p=await context.newPage();await p.goto('http://127.0.0.1:3100/community');await p.waitForLoadState('networkidle');
   if(!quota){
    await p.locator('#recipe-name').fill('ฉบับร่างที่ยังไม่บันทึก');
    await p.getByRole('link',{name:'ค้นตู้เย็น',exact:true}).click();await p.waitForURL('**/fridge');
    await p.getByRole('link',{name:'แบ่งปันเมนู',exact:true}).click();await p.waitForURL('**/community');
    result.draftAfterNavigation=await p.locator('#recipe-name').inputValue();
   }
   await p.locator('#recipe-name').fill('สูตรตรวจสอบความผิดพลาด');
   await p.locator('#recipe-link').fill('https://www.wongnai.com/recipes');
   await p.locator('#recipe-desc').fill('สูตรตรวจสอบในเบราว์เซอร์ทดสอบเท่านั้น');
   await p.locator('#recipe-image-upload').setInputFiles('public/images/thai-table.jpg');await p.getByAltText('ตัวอย่างรูปอาหาร').waitFor();
   await p.getByRole('button',{name:'ถัดไป',exact:true}).click();await p.getByRole('button',{name:'ถัดไป',exact:true}).click();
   await p.getByRole('button',{name:'อื่นๆ (เพิ่มวัตถุดิบเอง)',exact:true}).click();
   await p.locator('#custom-ingredient-input').fill('ซอสลับที่ไม่ทราบส่วนประกอบ');
   await p.getByRole('button',{name:'+ เพิ่มวัตถุดิบ',exact:true}).click();
   await p.getByRole('button',{name:'ถัดไป: ตรวจสอบสูตร'}).click();
   if(quota)await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError')};});
   await p.getByRole('button',{name:'บันทึกเมนูอาหารเข้าสำรับ!'}).click();
   await p.getByRole('status').filter({hasText:'เพิ่มเมนูอาหารเรียบร้อยแล้ว'}).waitFor();
   const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('kindi:shared-recipes:v1')||'[]'));
   if(quota)result.quotaFailure={successMessageShown:true,savedCount:stored.length,formNameAfterSave:await p.locator('#recipe-name').inputValue()};
   else{
    result.unknownIngredient={assessmentStatuses:[...new Set(Object.values(stored[0].allergen_assessments).map(a=>a.status))],metadataComplete:stored[0].safety_metadata_complete,crossContact:stored[0].cross_contact_risk};
    result.deleteDialogs=0;p.on('dialog',async dialog=>{result.deleteDialogs++;await dialog.dismiss()});
    await p.getByRole('button',{name:'ลบเมนู สูตรตรวจสอบความผิดพลาด',exact:true}).click();
    result.recipesAfterDelete=await p.evaluate(()=>JSON.parse(localStorage.getItem('kindi:shared-recipes:v1')||'[]').length);
    result.undoVisible=await p.getByRole('button',{name:/เลิกทำ|กู้คืน|undo/i}).count()>0;
   }
   await context.close();
  }
  fs.mkdirSync('artifacts/audit',{recursive:true});fs.writeFileSync('artifacts/audit/usability-findings.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
