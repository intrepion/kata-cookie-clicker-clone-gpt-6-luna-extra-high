'use strict';
const {chromium}=require('playwright');const {mkdir,readFile,writeFile}=require('node:fs/promises');const {createHash}=require('node:crypto');const path=require('node:path');
(async()=>{
 const output=process.env.CAPTURE_OUTPUT||'/tmp/cookie-captures',site=process.env.CAPTURE_SITE||'capture-site';await mkdir(output,{recursive:true});const inputs={};for(const f of ['index.html','styles.css','game.js'])inputs[f]=createHash('sha256').update(await readFile(path.join(site,f))).digest('hex');const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'en-US',reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4176/',{waitUntil:'domcontentloaded'});const cookie=page.locator('#cookie-button');await cookie.waitFor();
  for(let i=0;i<24;i++)await cookie.click();
  await page.screenshot({path:path.join(output,'bakery-01.png'),animations:'disabled'});
  await page.getByRole('button',{name:/Buy 1 Cursor for/}).click();
  for(let i=0;i<100;i++)await cookie.click();
  await page.getByRole('button',{name:/Buy 1 Grandma for/}).click();
  await page.screenshot({path:path.join(output,'bakery-02.png'),animations:'disabled'});
  await writeFile(path.join(output,'capture.json'),JSON.stringify({schemaVersion:1,workflowCommit:process.env.GITHUB_SHA||null,sourceCommit:process.env.GAME_SOURCE_COMMIT||null,runId:process.env.GITHUB_RUN_ID||null,url:'http://127.0.0.1:4176/',inputs,browser:browser.version(),viewport:{width:1440,height:1000},screenshots:['bakery-01.png','bakery-02.png']},null,2)+'\n');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
