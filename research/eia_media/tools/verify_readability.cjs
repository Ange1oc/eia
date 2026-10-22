/* Verify the reading experience, rather than counts alone. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=process.env.EIA_TEST_URL||'http://127.0.0.1:8000/';
const canonical=JSON.parse(fs.readFileSync(path.join(root,'data/research.json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{if(r.request().url().startsWith(base))return r.continue();external.push(r.request().url());return r.abort();});
 await page.goto(base+'#entity/eia');await page.waitForFunction(()=>window.EIA_APP&&window.EIA_READER);
 async function go(hash){await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(20);}
 const description=await page.locator('.reader-profile').innerText();
 assert.ok(description.length>4000,'EIA needs a self-contained explanation, not a short card');
 for(const question of ['кто ею руководит','На чём такая сеть может зарабатывать','Что означает связь с государством','Какие издания действительно связаны'])assert.ok(description.includes(question),question);
 assert.match(await page.locator('#entity-conclusion').innerText(),/через какие роли люди/);
 assert.ok(await page.locator('.local-explanation').count()>=6,'Related findings explained inline');
 assert.equal(await page.locator('.term-help[data-term="АО"]').count()>0,true);
 const definition=page.locator('.term-help[data-term="АО"]').first();await definition.focus();await page.keyboard.press('Enter');
 assert.match(await page.locator('#dialog-body').innerText(),/Владельцы акций/);await page.keyboard.press('Escape');
 assert.ok(await definition.evaluate(e=>e===document.activeElement),'Keyboard focus returns to the term');
 assert.equal(await page.evaluate(()=>location.hash),'#entity/eia','Term help must not navigate away');
 for(const e of canonical.entities){await go('entity/'+e.id);const text=await page.locator('.reader-profile').innerText();assert.ok(text.length>250,'Substantive explanation '+e.id);assert.ok(await page.locator('.reader-profile section').count()>=2,e.id);assert.ok((await page.locator('#entity-conclusion p').innerText()).length>60,'Individual conclusion '+e.id);assert.equal(await page.locator('.source-row .citation').evaluateAll(nodes=>nodes.some(n=>/^[a-f0-9]{12}$/.test(n.textContent))),false,'No cryptic source IDs '+e.id);}
 for(const c of canonical.claims){await go('finding/'+c.id);const text=await page.locator('.fact-body').innerText();assert.ok(text.includes(canonical.reader.findings[c.id].explanation),'Interpretation visible '+c.id);assert.ok((await page.locator('.reader-takeaways').innerText()).includes(canonical.reader.findings[c.id].conclusion),'Conclusion visible '+c.id);const quote=await page.locator('.proof blockquote').first().textContent();assert.equal(quote,canonical.evidence.find(p=>p.id===c.evidence[0]).quote,'Evidence stays verbatim '+c.id);}
 await go('archive/COMPANIES.md');
 assert.doesNotMatch(await page.locator('main').innerText(),/каноническ|data\/research\.json|Редактируйте структурированные|FULL_REPORT\.md|SHA-256|HTTP \d/);
 assert.equal(await page.locator('a[href="http://finances.md/"]').count(),0,'No accidental file-name domain links');
 await page.locator('#document-toc summary').click();await page.locator('#document-toc [data-scroll]').nth(2).click();
 assert.equal(await page.evaluate(()=>location.hash),'#archive/COMPANIES.md','Contents must preserve the route');
 await go('archive/FULL_REPORT.md');assert.ok(await page.locator('.reader-takeaways li').count()>=3);assert.ok(await page.locator('#document-toc [data-scroll]').count()>=8);
 await go('glossary');assert.equal(await page.locator('.glossary-entry').count(),canonical.reader.glossary.length);
 await page.locator('#global-search').fill('акционерное общество');await page.locator('#global-search').press('Enter');await page.waitForTimeout(40);assert.ok(await page.locator('main').innerText().then(t=>t.includes('Объяснение понятия')),'Definitions are searchable');
 await page.setViewportSize({width:390,height:844});await go('entity/eia');await page.waitForTimeout(220);
 await page.screenshot({path:'/tmp/eia-reading-mobile.png',fullPage:false});
 assert.ok(await page.locator('#sidebar').evaluate(e=>e.getBoundingClientRect().right<=1),'Mobile navigation starts closed');
 for(const hash of ['entity/eia','entity/grebenskova','finding/c37','archive/COMPANIES.md','archive/METHOD.md','glossary','finance','catalogue','sources','leads']){await go(hash);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile reading overflow '+hash);}
 await go('entity/eia');await page.locator('.term-help[data-term="АО"]').first().click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1000});await go('entity/eia');await page.waitForTimeout(220);await page.screenshot({path:'/tmp/eia-reading-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await browser.close();console.log(JSON.stringify({status:'passed',explainedDossiers:canonical.entities.length,explainedFindings:canonical.claims.length,glossaryTerms:canonical.reader.glossary.length,eiaDescriptionCharacters:description.length,keyboardHelp:'passed',verbatimEvidence:'passed',mobileWidth:390,externalRequests:0},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
