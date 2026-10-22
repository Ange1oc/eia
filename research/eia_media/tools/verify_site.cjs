/* Reader journeys, provenance, preservation, mobile layout and offline core. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.join(root,'dashboard'),base=process.env.EIA_TEST_URL||'http://127.0.0.1:8000/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{if(route.request().url().startsWith(base))return route.continue();external.push(route.request().url());return route.abort();});
 await page.goto(base);await page.waitForFunction(()=>window.EIA_APP);
 async function go(hash){await page.evaluate(h=>location.hash=h,hash);await page.waitForFunction(h=>location.hash==='#'+h,hash);await page.waitForTimeout(15);}
 assert.match(await page.locator('h1').innerText(),/медиавитриной/);assert.equal(await page.locator('.story-card').count(),6);
 const data=await page.evaluate(()=>EIA_DATA),stats={entities:data.entities.length,claims:data.claims.length,edges:data.edges.length,evidence:data.evidence.length,documents:Object.keys(data.documents).length};
 for(const [name,text] of Object.entries(data.documents)){
  assert.equal(text,fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n'),'Bundled original: '+name);
  assert.equal(text,fs.readFileSync(path.join(site,'archive',name),'utf8').replace(/\r\n/g,'\n'),'Download: '+name);
 }
 // Reader 1: what was Grebenskova's real role, why does it matter, where is it proved?
 await page.locator('a.story-card[href="#finding/c37"]').click();await page.waitForTimeout(30);
 assert.match(await page.locator('.fact-body').innerText(),/высшим коллегиальным/);assert.match(await page.locator('.fact-body').innerText(),/создании и управлении/);
 assert.match(await page.locator('.proof').first().innerText(),/Скареднова/);assert.match(await page.locator('.proof').first().innerText(),/PDF с.4/);
 assert.ok((await page.locator('.proof').first().locator('a').getAttribute('href')).endsWith('#page=4'));
 await page.locator('.proof [data-source]').first().click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));assert.match(await page.locator('#dialog-body').innerText(),/Президиум/);assert.equal(await page.locator('.technical[open]').count(),0);await page.keyboard.press('Escape');
 // Reader 2: distinguish an old consultative МВД role from current service.
 await go('finding/c33');assert.match(await page.locator('.fact-body').innerText(),/2008/);assert.match(await page.locator('.limits').innerText(),/не сотрудник МВД/);assert.match(await page.locator('.proof').first().innerText(),/12\. Рабинович/);
 // Reader 3: common business is affirmed; unknown financing is a separate scope.
 await go('finding/c05');assert.match(await page.locator('.fact-body').innerText(),/по 50%/);assert.match(await page.locator('main').innerText(),/подтверждено несколькими источниками/);assert.match(await page.locator('.limits').innerText(),/финансовых переводов/);assert.match(await page.locator('.proof').nth(1).innerText(),/50%/);
 // Reader 4: a minister's cover must not become an invented direct interview.
 await go('finding/c44');assert.match(await page.locator('.fact-body').innerText(),/NEWS.ru/);assert.match(await page.locator('.limits').innerText(),/прямой контакт/);assert.match(await page.locator('.proof').first().innerText(),/NEWS.ru/);
 await go('finding/c11');assert.match(await page.locator('.fact-body').innerText(),/заместителем генерального секретаря/);assert.match(await page.locator('.limits').innerText(),/сосуществовать/);
 await go('finding/c46');assert.match(await page.locator('.fact-body').innerText(),/Сергей Мурзин/);assert.match(await page.locator('.proof').nth(1).innerText(),/87190/);assert.match(await page.locator('.limits').innerText(),/перерегистрация/);
 // Curated routes have leg-by-leg meaning and proof; expansion reveals another actual relation.
 await go('explore/coalition');assert.match(await page.locator('#active-chain').innerText(),/оператором Коалиции/);const before=await page.locator('#active-chain .graph-node').count();await page.locator('[data-action="step-next"]').click();assert.equal(await page.locator('#active-chain .graph-node').count(),before+1);assert.equal(await page.locator('.route-step').count(),2);
 await page.locator('.route-step [data-edge]').nth(1).click();assert.match(await page.locator('#dialog-body').innerText(),/высший орган управления/);assert.match(await page.locator('#dialog-body .proof').first().innerText(),/Скареднова/);await page.keyboard.press('Escape');
 await page.locator('[data-action="zoom-in"]').first().click();assert.equal(await page.locator('#active-chain svg').getAttribute('data-zoom'),'1.25');await page.locator('[data-action="zoom-reset"]').first().click();
 // Weighted search must use the substantive executive edge rather than a parallel old advisory edge.
 const paths=await page.evaluate(()=>({direct:EIA_APP.getPath('rabinovich','assembly'),known:EIA_APP.getPath('eia','meat'),absent:EIA_APP.getPath('eia','vladivostok'),alternatives:EIA_APP.alternativePaths('eia','meat')}));assert.equal(paths.direct.edges[0].id,'e062');assert.ok(paths.known.edges.length>=2);assert.equal(paths.absent,null);assert.ok(paths.alternatives.length>1);
 await page.selectOption('#graph-period','current');assert.equal(await page.locator('#active-chain [data-edge="e063"]').count(),0);await page.locator('[data-action="reset-graph"]').click();
 // Cross-edition preservation and real Markdown: tables, emphasis, lists and inline source actions.
 await go('archive/FULL_REPORT.md');assert.ok(await page.locator('#full-document strong').count()>15);assert.ok(await page.locator('#full-document li').count()>=4);assert.ok(await page.locator('#full-document .inline-citation').count()>20);assert.match(await page.locator('#full-document').innerText(),/передаточные документы/);
 await go('archive/GOVERNMENT_CONNECTIONS.md');assert.ok(await page.locator('#full-document table tbody tr').count()>=10);
 await go('archive/'+encodeURIComponent('versions/2026-10-21/FINDINGS.md'));assert.match(await page.locator('main>.notice').innerText(),/ПРЕЖНЯЯ РЕДАКЦИЯ/);
 for(const file of Object.keys(data.documents)){await go('archive/'+encodeURIComponent(file));assert.ok((await page.locator('#full-document').innerText()).length>100,'Readable archive '+file);}
 // Untrusted Markdown remains text and cannot introduce scripts or javascript links.
 await page.evaluate(()=>EIA_DATA.documents['test.md']='<img src=x onerror="window.testInjection=1">\n\n[x](javascript:alert(1))');await go('archive/test.md');assert.equal(await page.locator('#full-document img').count(),0);assert.equal(await page.locator('#full-document a[href^="javascript:"]').count(),0);assert.equal(await page.evaluate(()=>window.testInjection),undefined);
 await go('entities');assert.equal(await page.locator('#entity-results>.card').count(),stats.entities);await page.locator('#entity-query').fill('Скареднова');assert.ok(await page.locator('#entity-results>.card').count()>0);await page.locator('#entity-query').fill('');await page.selectOption('#entity-kind','Судебное дело');assert.equal(await page.locator('#entity-results>.card').count(),3);
 for(const e of data.entities){await go('entity/'+e.id);assert.equal(await page.locator('h1').innerText(),e.id==='eia'?'EIA: компания, команда и связи':e.name);}
 for(const c of data.claims){await go('finding/'+c.id);assert.equal(await page.locator('h1').innerText(),c.title);assert.ok(await page.locator('.proof').count()>0);}
 await go('documents');assert.equal(await page.locator('.comparison').count(),3);await go('catalogue');assert.equal(await page.locator('#catalogue-results>.issue-card').count(),40);assert.match(await page.locator('.rights-status').first().innerText(),/отдельно не проверен/);await page.locator('#catalogue-query').fill('Сицинская');assert.equal(await page.locator('#catalogue-results>.issue-card').count(),1);
 await go('finance');assert.match(await page.locator('.money-table').innerText(),/5\s*434\s*000/);await go('sources');await page.selectOption('#source-filter','all');await page.locator('[data-action="source-next"]').click();assert.match(await page.locator('#sources-count').innerText(),/страница 2/);
 await page.locator('#global-search').fill('президиум');await page.locator('#global-search').press('Enter');await page.waitForTimeout(30);assert.ok(await page.locator('.list-item').count()>3);
 await go('home');await page.screenshot({path:'/tmp/eia-v2-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await go('home');await page.screenshot({path:'/tmp/eia-v2-mobile.png',fullPage:true});
 for(const hash of ['home','explore/coalition','documents','finance','archive/FULL_REPORT.md','archive/MEDIA_RIGHTS.md','entity/agency','finding/c37','sources']){await go(hash);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow '+hash);}
 await go('home');await page.locator('.menu-toggle').click();assert.ok(await page.locator('#sidebar').evaluate(e=>e.classList.contains('open')));await page.locator('#sidebar a[href="#entities"]').click();await page.waitForTimeout(30);assert.ok(!(await page.locator('#sidebar').evaluate(e=>e.classList.contains('open'))));
 assert.deepEqual(external,[],'Core site should make no automatic external requests');
 // Explicit image interaction, with an identified synthetic fixture; no external source verification implied.
 await page.unroute('**/*');await page.route('https://eia.media/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect width="100" height="120" fill="green"/></svg>'}));await go('entity/rabinovich');await page.locator('[data-image-load]').click();await page.waitForFunction(()=>document.querySelector('.photo-frame img')?.naturalWidth>0);await page.locator('.photo-frame img').click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 await browser.close();console.log(JSON.stringify({status:'passed',...stats,readerJourneys:6,coreExternalRequests:external.length,mobileWidth:390,browserErrors:errors,imageFixture:'synthetic interaction only'},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
