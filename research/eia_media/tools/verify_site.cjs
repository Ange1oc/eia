const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.join(root,'dashboard');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8000/'))requests.push(r.url());});
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8000/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:8000/');
 await page.waitForFunction(()=>window.EIA_APP);
 assert.match(await page.locator('h1').innerText(),/Кто стоит за EIA/);
 const stats=await page.evaluate(()=>({entities:EIA_DATA.entities.length,claims:EIA_DATA.claims.length,edges:EIA_DATA.edges.length,catalogue:EIA_DATA.catalogue.length,docs:Object.keys(EIA_DATA.documents).length,recs:EIA_APP.recommendations.length}));
 assert.equal(stats.catalogue,40);assert.ok(stats.recs>5);
 const embedded=await page.evaluate(()=>EIA_DATA.documents);
 for(const [name,text] of Object.entries(embedded)){
  const original=fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n');
  assert.equal(text,original,'Full text coverage: '+name);
  assert.equal(fs.readFileSync(path.join(site,'archive',name),'utf8').replace(/\r\n/g,'\n'),text,'Download coverage: '+name);
 }
 const integrity=await page.evaluate(()=>{
  const d=EIA_DATA,ids=new Set(d.entities.map(x=>x.id)),sources=new Set(d.sources.map(x=>x.id));
  return {badEdges:d.edges.filter(e=>!ids.has(e.source)||!ids.has(e.target)||!e.sources.every(s=>sources.has(s))),badRefs:[...d.claims,...d.entities].filter(e=>!e.sources.every(s=>sources.has(s))),knownPath:EIA_APP.getPath('eia','peshev'),noPath:EIA_APP.getPath('eia','vladivostok'),alternatives:EIA_APP.alternativePaths('eia','peshev')};
 });
 assert.equal(integrity.badEdges.length,0);assert.equal(integrity.badRefs.length,0);assert.ok(integrity.knownPath.edges.length>1);assert.equal(integrity.noPath,null);assert.ok(integrity.alternatives.length>1);
 async function route(hash,selector='h1'){await page.evaluate(h=>location.hash=h,hash);await page.waitForTimeout(25);await page.locator(selector).first().waitFor();}
 await page.screenshot({path:'/tmp/eia-desktop.png',fullPage:true});
 await route('entities');assert.equal(await page.locator('#entity-results>.card').count(),48);
 await page.locator('#entity-query').fill('Скареднова');assert.ok(await page.locator('#entity-results>.card').count()>0);
 await page.locator('#entity-query').fill('');await page.selectOption('#entity-kind','Судебное дело');assert.equal(await page.locator('#entity-results>.card').count(),3);
 await route('entity/palagutin');assert.match(await page.locator('h1').innerText(),/Палагутин/);assert.match(await page.locator('.prose').innerText(),/50 000/);
 await page.locator('[data-source]').first().click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
 await route('explore');await page.locator('[data-chain]').first().click();await page.waitForTimeout(40);
 const before=await page.locator('#active-chain .graph-node').count();await page.locator('[data-action="step-next"]').click();const after=await page.locator('#active-chain .graph-node').count();assert.equal(after,before+1);
 await page.locator('#active-chain [data-edge]').first().click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
 await page.selectOption('#graph-grade','A');assert.equal(await page.locator('#active-chain .graph-edge').count(),await page.locator('#active-chain .graph-edge').evaluateAll(es=>es.filter(e=>e.textContent.includes('A')).length));
 await page.locator('[data-action="reset-graph"]').click();await page.selectOption('#graph-node-kind','СМИ');assert.ok(await page.locator('h2').filter({hasText:'Основные группы отношений'}).count());await page.locator('[data-action="reset-graph"]').click();
 await page.locator('details').first().locator('summary').click();await page.selectOption('#path-from','eia');await page.selectOption('#path-to','vladivostok');await page.locator('[data-action="find-path"]').click();assert.match(await page.locator('#path-status').innerText(),/путь не установлен/);
 await page.selectOption('#path-to','peshev');await page.locator('[data-action="find-path"]').click();assert.ok(await page.locator('#active-chain .graph-node').count()>2);
 await route('timeline');const timeline=await page.locator('.time-item').count();await page.selectOption('#timeline-year','2026');assert.ok(await page.locator('.time-item').count()<timeline);
 await route('finance');assert.match(await page.locator('h1').innerText(),/Деньги/);assert.match(await page.locator('.money-table').innerText(),/5\s*434\s*000/);
 await route('documents');assert.equal(await page.locator('.comparison').count(),3);
 await route('catalogue');assert.equal(await page.locator('#catalogue-results>.issue-card').count(),40);await page.locator('#catalogue-query').fill('Сицинская');assert.equal(await page.locator('#catalogue-results>.issue-card').count(),1);
 await route('sources');await page.selectOption('#source-filter','all');assert.equal(await page.locator('#sources-results>.list-item').count(),15);await page.locator('[data-action="source-next"]').click();assert.match(await page.locator('#sources-count').innerText(),/страница 2/);await page.locator('#source-query').fill('1267800056204');assert.ok(await page.locator('#sources-results>.list-item').count()>0);
 await page.locator('#global-search').fill('Скареднова');await page.locator('#global-search').press('Enter');await page.waitForTimeout(40);assert.ok(await page.locator('.list-item').count()>4);
 await route('archive/FULL_REPORT.md');assert.match(await page.locator('#full-document').innerText(),/Отправка запросов организациям/);
 for(const id of await page.evaluate(()=>EIA_DATA.entities.map(e=>e.id))){await route('entity/'+id);assert.ok((await page.locator('h1').innerText()).length>0);}
 const normalized=t=>t.replace(/^#{1,3}\s+/gm,'').replace(/^[-*] /gm,'').replace(/\[([a-f0-9]{12})\]/g,'$1').replace(/\s+/g,' ').trim();
 for(const file of Object.keys(embedded)){
  await route('archive/'+file);const visible=normalized(await page.locator('#full-document').innerText());
  for(const paragraph of embedded[file].split(/\n\s*\n/))assert.ok(visible.includes(normalized(paragraph)),'Every paragraph accessible: '+file+' / '+paragraph.slice(0,90));
 }
 for(const routeName of ['home','method','leads','topic/Международные связи','finding/c01','source/16f84fec8ec4'])await route(routeName);
 assert.deepEqual(requests,[],'Offline pages must not make automatic network requests');assert.deepEqual(errors,[],'Browser errors');
 await page.setViewportSize({width:390,height:844});await route('home');await page.waitForTimeout(250);await page.screenshot({path:'/tmp/eia-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile homepage overflow');
 await page.locator('.menu-toggle').click();assert.ok(await page.locator('#sidebar').evaluate(e=>e.classList.contains('open')));await page.locator('#sidebar a[href="#entities"]').click();await page.waitForTimeout(30);assert.ok(!(await page.locator('#sidebar').evaluate(e=>e.classList.contains('open'))));
 for(const r of ['explore','documents','finance','archive/FULL_REPORT.md','entity/agency','sources']){await route(r);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow: '+r);}
 const automaticRequests=requests.length;
 // TLS-verified original is supplied by the fixture fetch; this tests image loading and zoom
 // without changing the managed browser's certificate trust or bypassing source access.
 const image=fs.readFileSync('/tmp/eia-original-portrait.bin'),imageType=fs.readFileSync('/tmp/eia-original-portrait.type','utf8');
 await page.route('https://eia.media/**',r=>r.fulfill({status:200,contentType:imageType,body:image}));
 await route('entity/rabinovich');await page.locator('[data-image-load]').click();await page.waitForFunction(()=>document.querySelector('.photo-frame img')?.naturalWidth>0);await page.locator('.photo-frame img').click();assert.ok(await page.locator('#evidence-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log(JSON.stringify({status:'passed',...stats,fullTextComparisons:Object.keys(embedded).length,offlineNetworkRequests:automaticRequests,browserErrors:errors,checkedEntityPages:48,mobileWidths:[390],imageLoadingAndZoom:'passed with verified original fixture'},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
