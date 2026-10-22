'use strict';
(() => {
const D=window.EIA_DATA;
const R=window.EIA_READER;
const $=s=>document.querySelector(s), content=$('#content');
if(!D){content.textContent='Не удалось загрузить материалы. Обновите страницу и попробуйте ещё раз.';return;}
const E=new Map(D.entities.map(x=>[x.id,x])), S=new Map(D.sources.map(x=>[x.id,x])), C=new Map(D.claims.map(x=>[x.id,x]));
const G=new Map(D.edges.map(x=>[x.id,x]));
const P=new Map(D.evidence.map(x=>[x.id,x]));
const factBadge=x=>`<span class="badge fact-status">${esc(x.fact_status||'Датированный источник')}</span>`;
const evidenceURL=p=>{const s=S.get(p.source),m=p.location.match(/PDF с\.(\d+)/);return (s?.url||'')+(m&&/\.pdf(?:$|\?)/i.test(s?.url||'')?'#page='+m[1]:'');};
function proofPanel(p){if(!p)return '';return `<section class="proof" data-proof="${p.id}"><div class="proof-label">ДОКАЗАТЕЛЬСТВО · ${esc(p.date||'Дата в документе')}</div><blockquote>${esc(p.quote)}</blockquote><p class="locator">${esc(p.location)}</p>${p.scope?`<p class="proof-scope">${esc(p.scope)}</p>`:''}<div class="actions"><a class="button subtle" href="${safeURL(evidenceURL(p))}" target="_blank" rel="noopener noreferrer">Открыть документ ↗</a><button class="citation" data-source="${p.source}" data-evidence="${p.id}">Происхождение и проверка</button></div></section>`;}
const markdown=window.markdownit({html:false,linkify:true,typographer:false});
markdown.linkify.set({fuzzyLink:false,fuzzyEmail:false});
const textRenderer=markdown.renderer.rules.text||((tokens,idx)=>esc(tokens[idx].content));
markdown.renderer.rules.text=(tokens,idx,options,env,self)=>{const raw=tokens[idx].content;const re=/\[([a-f0-9]{12})\]/g;let out='',last=0;for(const m of raw.matchAll(re)){out+=esc(raw.slice(last,m.index));out+=S.has(m[1])?`<button class="citation inline-citation" data-source="${m[1]}" title="${esc(S.get(m[1]).title||S.get(m[1]).url)}">${esc((S.get(m[1]).publisher||'Источник').replace('www.',''))} ↗</button>`:esc(m[0]);last=m.index+m[0].length;}return out+esc(raw.slice(last));};
const originalLink=markdown.renderer.rules.link_open||((t,i,o,e,self)=>self.renderToken(t,i,o));
markdown.renderer.rules.link_open=(t,i,o,e,self)=>{t[i].attrSet('rel','noopener noreferrer');if(/^https?:/.test(t[i].attrGet('href')||''))t[i].attrSet('target','_blank');return originalLink(t,i,o,e,self);};
const gradeNames={A:'Документ / опубликованный факт',B:'Согласующиеся сведения',C:'Атрибутированное заявление / предварительные данные',D:'Не подтверждено'};
const state={chain:null,step:99,sourcePage:0,sourceFilter:'used',sourceQuery:'',entityQuery:'',entityKind:'',entityCountry:'',catalogueQuery:'',graphGrade:'',graphPeriod:'',graphKind:'',graphCountry:'',graphNodeKind:'',path:null,alternatives:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLocaleLowerCase('ru').replace(/ё/g,'е');
const match=(text,q)=>norm(q).split(/\s+/).filter(Boolean).every(t=>norm(text).includes(t));
const safeURL=url=>/^https?:\/\//i.test(url)?esc(url):'#';
const money=v=>v===null?'Не установлено':new Intl.NumberFormat('ru-RU').format(v)+' ₽';
const shortName=id=>E.get(id)?.name.replace('Александр Леонидович Рабинович','Александр Рабинович').replace('Дмитрий Александрович Палагутин','Дмитрий Палагутин').replace('Екатерина Алексеевна Гребенскова','Екатерина Гребенскова')||id;
const badge=(grade,label)=>`<span class="badge ${esc(grade)}" title="${esc(gradeNames[grade]||'Статус')}">${esc(label||gradeNames[grade]||'')}</span>`;
const neutral=t=>`<span class="badge neutral">${esc(t)}</span>`;
const sources=ids=>`<div class="source-row">${[...new Set(ids)].map(id=>`<button class="citation" data-source="${esc(id)}" title="${esc(S.get(id)?.title||'Открыть источник')}">${esc(R.sourceName(S.get(id)))}</button>`).join('')}</div>`;
const objects=ids=>`<div class="chips">${[...new Set(ids)].map(id=>E.has(id)?`<a class="chip" href="#entity/${esc(id)}">${esc(shortName(id))}</a>`:'').join('')}</div>`;
const crumbs=(title,parent)=>`<div class="breadcrumb"><a href="#home">Исследование</a><span>/</span>${parent?`<a href="#${parent[0]}">${esc(parent[1])}</a><span>/</span>`:''}${esc(title)}</div>`;
function head(title,description,eyebrow='ОТКРЫТОЕ ДОСЬЕ'){return `<div class="page-head"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${description?`<p class="lead">${esc(description)}</p>`:''}</div>`;}
function inline(text){
 return esc(text).replace(/https?:\/\/[^\s<>]+/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`).replace(/\[([a-f0-9]{12})\]/g,(m,id)=>S.has(id)?`<button class="citation" data-source="${id}">${id}</button>`:m);
}
function md(text){return markdown.render(String(text));}

function claimCard(c){return V.claimCard(c);}

function entityCard(e){return V.entityCard(e);}
function showDialog(title,html){$('#dialog-body').innerHTML=`<h2 id="dialog-title">${esc(title)}</h2>${html}`;const d=$('#evidence-dialog');if(!d.open)d.showModal();}
function sourceDialog(id,evidenceId){return V.sourceDialog(id,evidenceId);}

const adjacency=new Map(D.entities.map(e=>[e.id,[]]));
for(const edge of D.edges){adjacency.get(edge.source)?.push({node:edge.target,edge});adjacency.get(edge.target)?.push({node:edge.source,edge});}
const findEdge=(a,b)=>D.edges.find(e=>(e.source===a&&e.target===b)||(e.source===b&&e.target===a));
const weakest=edges=>edges.reduce((g,e)=>e.grade>g?e.grade:g,'A');
function getPath(a,b,allowed=D.edges){
 if(a===b)return {nodes:[a],edges:[],cost:0};
 const cost=e=>1+(e.evidence?.length?0:4)+(e.fact_status==='предварительно'?2:e.fact_status==='заявление организации'?1:0)+(e.kind.includes('событ')||e.kind.includes('публикацион')?2:0)+(e.end?2:0)+(/консультатив/i.test(e.relation)?1:0);
 const dist=new Map([[a,0]]),prev=new Map(),open=new Set([a]);
 while(open.size){const u=[...open].sort((x,y)=>dist.get(x)-dist.get(y)||x.localeCompare(y))[0];open.delete(u);if(u===b)break;
 for(const e of allowed.filter(e=>e.source===u||e.target===u)){const v=e.source===u?e.target:e.source,n=dist.get(u)+cost(e);if(n<(dist.get(v)??Infinity)){dist.set(v,n);prev.set(v,[u,e]);open.add(v);}}}
 if(!prev.has(b))return null;const nodes=[b],edges=[];while(nodes[0]!==a){const [u,e]=prev.get(nodes[0]);nodes.unshift(u);edges.unshift(e);}return {nodes,edges,cost:dist.get(b),historical:edges.some(e=>e.end)};
}

function alternativePaths(a,b,allowed=D.edges){
 const first=getPath(a,b,allowed);if(!first)return [];const result=[first],seen=new Set([first.edges.map(e=>e.id).join('|')]);
 for(const edge of first.edges){const p=getPath(a,b,allowed.filter(e=>e.id!==edge.id));if(p){const key=p.edges.map(e=>e.id).join('|');if(!seen.has(key)){seen.add(key);result.push(p);}}}
 return result.sort((x,y)=>x.cost-y.cost).slice(0,4);
}

function networkGroups(){return V.networkGroups();}
function recommend(){
 const curated=D.routes.map(r=>({...r,edges:r.edge_ids.map(id=>G.get(id)),grade:weakest(r.edge_ids.map(id=>G.get(id))),score:100}));
 const candidates=[];
 for(const edge of D.edges.filter(e=>e.kind.includes('собственность')&&!e.end)){
  const path=getPath('eia',edge.target);if(!path||path.edges.length<2||path.edges.length>4)continue;
  if(curated.some(r=>path.nodes.every(n=>r.nodes.includes(n))))continue;
  const last=path.edges.at(-1),proofCount=path.edges.filter(e=>e.evidence?.length).length;
  candidates.push({...path,id:'auto-'+edge.id,title:'Капитал и управление: '+shortName(edge.target),body:last.significance,claims:D.claims.filter(c=>c.objects.includes(edge.target)).map(c=>c.id),grade:weakest(path.edges),category:'По данным',score:proofCount*3-path.cost});
 }
 const seen=new Set();return [...curated,...candidates.sort((a,b)=>b.score-a.score)].filter(r=>{const key=r.edges.map(e=>e.id).sort().join('|');if(seen.has(key))return false;seen.add(key);return true;});
}

const recommendations=recommend();
const V=window.createReaderViews({D,E,S,C,G,state,content,esc,head,crumbs,objects,sources,showDialog,graphPanel,imageBlock,comparisonCards,match,money,shortName,safeURL,proofPanel,chainCard,recommendations,md,highlightProse,notFound,filterCatalogue,filterTimeline,snippet,highlightText});
function graphSVG(nodes,edges,compact=false){
 if(!nodes.length)return '<div class="empty">Нет отношений по выбранным условиям.</div>';
 const root=nodes.includes('eia')?'eia':nodes[0],level=new Map([[root,0]]),queue=[root];
 while(queue.length){const u=queue.shift();for(const e of edges){if(![e.source,e.target].includes(u))continue;const v=e.source===u?e.target:e.source;if(nodes.includes(v)&&!level.has(v)){level.set(v,level.get(u)+1);queue.push(v);}}}
 const max=Math.max(0,...level.values());for(const id of nodes)if(!level.has(id))level.set(id,max+1);
 const groups=new Map();for(const id of nodes){const k=level.get(id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(id);}
 for(const list of groups.values())list.sort((a,b)=>E.get(a).kind.localeCompare(E.get(b).kind)||shortName(a).localeCompare(shortName(b),'ru'));
 const cols=Math.max(...groups.keys())+1,width=Math.max(900,cols*250),height=Math.max(300,...[...groups.values()].map(x=>x.length*125+70)),pos=new Map();
 for(const [lv,list] of groups)list.forEach((id,i)=>pos.set(id,{x:120+lv*(width-240)/Math.max(1,cols-1),y:(i+1)*height/(list.length+1)}));
 const colours={Человек:'#386675',Компания:'#976138',НКО:'#55754c',СМИ:'#795e88','Государственный институт':'#99504d','Государственное предприятие':'#99504d'};
 const lines=t=>{const out=[];let line='';for(const w of t.split(' ')){if((line+' '+w).length>24&&line){out.push(line);line=w;}else line+=(line?' ':'')+w;}if(line)out.push(line);return out.slice(0,4);};
 return `<svg class="network-svg${compact?' compact':''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Граф: слои от выбранного объекта, цвет по типу, исторические связи отмечены"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#d4cfbf"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#dots)"/>${edges.map(e=>{const a=pos.get(e.source),b=pos.get(e.target);if(!a||!b)return '';const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;return `<g class="graph-edge" data-edge="${e.id}" role="button" tabindex="0" aria-label="${esc(e.relation)}"><path d="M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}" fill="none" stroke="${e.end?'#aa725c':'#759282'}" stroke-width="2" ${e.fact_status==='предварительно'||e.fact_status==='заявление организации'?'stroke-dasharray="6 4"':''}/><path d="M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}" stroke="transparent" stroke-width="26" fill="none"/><circle cx="${mx}" cy="${my}" r="12" fill="#fffdf7" stroke="#8b9f91"/><text x="${mx}" y="${my+4}" text-anchor="middle" fill="#425d4c" font-size="12">${e.end?'◷':'↗'}</text></g>`;}).join('')}${nodes.map(id=>{const e=E.get(id),p=pos.get(id),ls=lines(shortName(id)),h=42+ls.length*15,col=colours[e.kind]||'#5c6b61';return `<g data-entity="${esc(id)}" tabindex="0" role="link" class="graph-node" aria-label="${esc(e.name)}"><rect x="${p.x-94}" y="${p.y-h/2}" width="188" height="${h}" rx="9" fill="${id==='eia'?'#e2e9dc':'#fffdf7'}" stroke="${col}"/><text x="${p.x}" y="${p.y-h/2+18}" fill="${col}" font-size="9" text-anchor="middle">${esc(e.closed?'ИСТОРИЧЕСКИЙ ОБЪЕКТ':e.kind.toUpperCase())}</text>${ls.map((l,i)=>`<text x="${p.x}" y="${p.y-h/2+38+i*15}" fill="#26352e" font-size="12" text-anchor="middle">${esc(l)}</text>`).join('')}</g>`;}).join('')}</svg>`;
}

function graphPanel(path,{steps=false,title='Отдельные отношения, а не общий контроль'}={}){
 const n=steps?Math.max(2,Math.min(state.step+1,path.nodes.length)):path.nodes.length;
 const nodes=path.nodes.slice(0,n),edges=path.edges.filter(e=>nodes.includes(e.source)&&nodes.includes(e.target));
 return `<div class="graph-panel"><div class="graph-toolbar"><span class="eyebrow" style="margin:0">${esc(title)}</span><small>${nodes.length} объектов · ${edges.length} отношений</small></div><div class="graph-zoom"><button class="button subtle" data-action="zoom-out" aria-label="Уменьшить граф">−</button><button class="button subtle" data-action="zoom-in" aria-label="Увеличить граф">+</button><button class="button subtle" data-action="zoom-reset">По ширине</button><span>Перемещайте схему прокруткой</span></div><div class="graph-wrap">${graphSVG(nodes,edges)}</div>${steps?`<div class="step-text">${state.step>=path.edges.length?'<strong>Вся цепочка раскрыта.</strong> Нажмите на линию, чтобы увидеть источник и период, или на узел, чтобы прочитать досье.':`<strong>Шаг ${state.step} из ${path.edges.length}.</strong> ${esc(path.edges[Math.max(0,state.step-1)]?.relation||'Выберите следующий шаг.')}`}</div><div class="graph-caption"><div class="step-controls"><button class="button" data-action="step-back" ${state.step<=1?'disabled':''}>← Назад</button><button class="button primary" data-action="step-next" ${state.step>=path.edges.length?'disabled':''}>Следующее звено →</button><span>${neutral('Период и доказательства — на каждом звене')}</span></div></div>`:''}<div class="graph-caption">Сплошная линия — документированное или согласованное отношение; пунктир — заявление/предварительные сведения. Часы отмечают завершённую историческую связь. Нажмите на линию: период, значение и точная цитата.</div></div>`;
}
function chainCard(r){return `<article class="card chain-card ${state.chain===r.id?'selected':''}" data-chain="${r.id}" tabindex="0" role="button" aria-label="Исследовать цепочку ${esc(r.title)}"><div class="meta">${neutral(r.category||"Связи по данным")}<span>${r.edges.length} отдельных отношений</span></div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p><div class="chain-line">${r.nodes.map((id,i)=>(i?'<i>→</i>':'')+`<span>${esc(shortName(id))}</span>`).join('')}</div><div class="card-foot"><span>Раскрыть по шагам</span><span>↗</span></div></article>`;}
function home(){return V.home();}

const topics=()=>[...new Set(D.claims.map(c=>c.topic))];
function topicPage(topic){
 const list=D.claims.filter(c=>c.topic===topic);
 content.innerHTML=crumbs(topic)+head(topic,'Все существенные утверждения по этому направлению. Открывайте источники и полные досье, чтобы оценить контекст и ограничения.')+`<div class="chips">${topics().map(t=>`<a class="chip ${t===topic?'active':''}" href="#topic/${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div><section class="section list">${list.map(claimCard).join('')||'<div class="empty">Для этой темы в корпусе пока нет утверждений.</div>'}</section>`;
}
function finding(id){return V.finding(id);}

function entityPage(id){return V.entityPage(id);}
function directory(){
 const kinds=[...new Set(D.entities.map(e=>e.kind))],countries=[...new Set(D.entities.map(e=>e.country))];
 content.innerHTML=crumbs('Люди и организации')+head('Люди и организации','Все исследованные объекты, включая исторические компании, неустановленные связи и исключённые совпадения. Карточки ведут к полному досье.')+`<div class="filterbar"><input id="entity-query" aria-label="Поиск объектов" placeholder="Имя, прежняя фамилия, ИНН, роль…" value="${esc(state.entityQuery)}"><label class="sr-only" for="entity-kind">Тип объекта</label><select id="entity-kind"><option value="">Все типы</option>${kinds.map(k=>`<option ${state.entityKind===k?'selected':''}>${esc(k)}</option>`).join('')}</select><label class="sr-only" for="entity-country">Страна</label><select id="entity-country"><option value="">Все юрисдикции</option>${countries.map(k=>`<option ${state.entityCountry===k?'selected':''}>${esc(k)}</option>`).join('')}</select></div><p id="entity-count" class="notice"></p><div class="grid" id="entity-results"></div>`;filterEntities();
}
function filterEntities(){const list=D.entities.filter(e=>(!state.entityKind||e.kind===state.entityKind)&&(!state.entityCountry||e.country===state.entityCountry)&&match(JSON.stringify(e),state.entityQuery));$('#entity-count').textContent=`Найдено ${list.length} из ${D.entities.length}. Исторические компании помечены отдельно.`;$('#entity-results').innerHTML=list.map(entityCard).join('')||'<div class="empty">Объект не найден. Попробуйте вариант имени или корпоративный номер.</div>';}
function allowedEdges(){return D.edges.filter(e=>(!state.graphGrade||e.grade===state.graphGrade)&&(!state.graphPeriod||(state.graphPeriod==='current'?!e.end:!!e.end))&&(!state.graphKind||e.kind===state.graphKind)&&(!state.graphCountry||[e.source,e.target].some(id=>E.get(id).country===state.graphCountry))&&(!state.graphNodeKind||[e.source,e.target].some(id=>E.get(id).kind===state.graphNodeKind)));}
function explore(chainId){
 if(chainId&&recommendations.some(r=>r.id===chainId)){if(state.chain!==chainId){state.chain=chainId;state.step=1;state.path=null;}}
 if(!state.chain)state.chain=recommendations[0]?.id;
 const allowed=allowedEdges(),allowedIds=new Set(allowed.map(e=>e.id)),filtered=recommendations.filter(r=>r.edges.every(e=>allowedIds.has(e.id)));
 let selected=state.path||recommendations.find(r=>r.id===state.chain);
 if(!state.path&&selected&&!filtered.includes(selected)){selected=filtered[0];state.chain=selected?.id;}
 const kinds=[...new Set(D.edges.map(e=>e.kind))];
 content.innerHTML=crumbs('Исследовать связи')+head('Связи, которые имеют смысл','Шесть редакционных маршрутов объясняют ключевые находки. Дополнительные рекомендации учитывают тип отношения, наличие доказательств и исторический период.')+`<div class="filterbar"><label for="graph-grade">Достоверность</label><select id="graph-grade"><option value="">Все степени подтверждения</option>${Object.entries(gradeNames).map(([g,n])=>`<option value="${g}" ${state.graphGrade===g?'selected':''}>${n}</option>`).join('')}</select><label class="sr-only" for="graph-period">Период</label><select id="graph-period"><option value="">Все периоды</option><option value="current" ${state.graphPeriod==='current'?'selected':''}>Без завершённых исторических долей</option><option value="past" ${state.graphPeriod==='past'?'selected':''}>Завершённые исторические доли</option></select><label class="sr-only" for="graph-kind">Отношение</label><select id="graph-kind"><option value="">Все отношения</option>${kinds.map(k=>`<option ${state.graphKind===k?'selected':''}>${esc(k)}</option>`).join('')}</select><label class="sr-only" for="graph-country">Юрисдикция</label><select id="graph-country"><option value="">Все юрисдикции</option>${[...new Set(D.entities.map(e=>e.country))].map(k=>`<option ${state.graphCountry===k?'selected':''}>${esc(k)}</option>`).join('')}</select><label class="sr-only" for="graph-node-kind">Тип узла</label><select id="graph-node-kind"><option value="">Все типы объектов</option>${[...new Set(D.entities.map(e=>e.kind))].map(k=>`<option ${state.graphNodeKind===k?'selected':''}>${esc(k)}</option>`).join('')}</select><button class="button" data-action="reset-graph">Сбросить</button></div><section id="active-chain">${selected?`<div class="section-heading"><div><h2>${esc(selected.title||'Выбранный путь')}</h2><p class="muted">${esc(selected.body||'Последовательность связей. У каждого перехода своё значение и период.')}</p></div></div>${graphPanel(selected,{steps:true,title:'Последовательность отдельных отношений'})}<div class="route-evidence">${selected.edges.slice(0,state.step>=selected.edges.length?selected.edges.length:state.step).map((e,i)=>`<article class="route-step"><span class="eyebrow">ЗВЕНО ${i+1} · ${esc(e.period)}</span><h3>${esc(shortName(e.source))} → ${esc(shortName(e.target))}</h3><p><strong>${esc(e.relation)}</strong></p><p>${esc(e.significance)}</p><button class="button" data-edge="${e.id}">Цитата и документ ↗</button></article>`).join('')}</div>${selected.claims?.length?`<div class="actions">${selected.claims.map(id=>`<a class="button subtle" href="#finding/${id}">${esc(C.get(id)?.title||id)} →</a>`).join('')}</div>`:''}`:graphPanel({nodes:[...new Set(allowed.flatMap(e=>[e.source,e.target]))].slice(0,8),edges:allowed.slice(0,8)},{title:'Отношения по фильтру'})}</section>${state.path&&state.alternatives.length>1?`<div class="section"><h3>Другие пути между выбранными объектами</h3><div class="list">${state.alternatives.map((p,i)=>`<button class="button" data-alternative="${i}">${esc(p.nodes.map(shortName).join(' → '))} · ${weakest(p.edges)}</button>`).join('')}</div><p class="notice">Альтернативы могут проходить через редакционное участие или опубликованное заявление. Каждый путь объясняет только свои отдельные звенья.</p></div>`:''}${networkGroups()}<section class="section recommendation"><div class="section-heading"><h2>Рекомендованные маршруты</h2><small>Разные истории: кто работает вместе и какое значение это имеет.</small></div><div class="grid two">${filtered.slice(0,12).map(chainCard).join('')||'<div class="empty">Целых рекомендованных цепочек по этим фильтрам нет. Отдельные отношения приведены ниже.</div>'}</div></section><details class="section"><summary>Найти путь между любыми двумя объектами</summary><p class="notice">Дополнительный инструмент. Поиск учитывает доказательства и тип связи; событийные, публикационные и завершённые исторические переходы имеют дополнительную стоимость. Это навигационная оценка, не вероятность влияния.</p><div class="path-controls"><select id="path-from" aria-label="Начало пути">${D.entities.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select><span>→</span><select id="path-to" aria-label="Конец пути">${D.entities.map(e=>`<option value="${e.id}" ${e.id==='meat'?'selected':''}>${esc(e.name)}</option>`).join('')}</select><button class="button primary" data-action="find-path">Найти</button></div><div id="path-status" aria-live="polite"></div></details><details class="section"><summary>Все отношения, соответствующие фильтрам (${allowed.length})</summary><div class="list section">${allowed.map(e=>`<div class="list-item"><div class="list-top">${factBadge(e)}<span>${esc(e.period)}${e.end?' — '+esc(e.end):''}</span></div><p>${esc(shortName(e.source))} → ${esc(shortName(e.target))}</p><button class="button" data-edge="${e.id}">${esc(e.relation)}</button></div>`).join('')}</div></details><div class="callout">Центры графа здесь — прежде всего люди с несколькими опубликованными ролями. Число связей зависит от доступности источников и не является мерой реального влияния.</div>`;
}
function edgeDialog(id){const e=G.get(id);if(!e)return;showDialog(e.relation,`${objects([e.source,e.target])}<p>${factBadge(e)} · ${esc(e.kind)}</p><p><strong>Период:</strong> ${esc(e.period)}${e.end?' · завершение: '+esc(e.end):''}</p><h3>Почему эта связь важна</h3><p>${esc(e.significance)}</p>${(e.evidence||[]).map(id=>proofPanel(P.get(id))).join('')}<details><summary>Предел интерпретации</summary><p>${esc(e.limits)} Путь через несколько отношений не создаёт нового юридического отношения между его концами.</p></details>`);}

function timelinePage(){return V.timelinePage();}
function filterTimeline(year){$('#timeline-results').innerHTML=D.timeline.filter(e=>!year||e.date.startsWith(year)).map(e=>`<article class="time-item"><time>${esc(e.date)}</time><div class="list-top">${badge(e.grade)}</div><h3>${esc(e.title)}</h3><p>${esc(e.body)}</p>${objects(e.objects)}${sources(e.sources)}</article>`).join('');}
function finance(){return V.finance();}
function comparisonCards(){return D.comparisons.map(c=>`<article class="card section"><div class="meta">${badge('A','Расхождение текстов')}<a href="#entity/${c.object}">Досье издания ↗</a></div><h3>${esc(c.name)}</h3><div class="comparison"><div><span>Контакты EIA</span><strong>${esc(c.web)}</strong></div><div class="pdf"><span>Выходные данные PDF</span><strong>${esc(c.pdf)}</strong><small>Страница PDF ${c.page}</small></div></div>${sources(c.sources)}<p class="notice">Юридически актуальная регистрация не установлена. Разные виды СМИ могут иметь разные свидетельства; официальный реестр необходим для проверки.</p></article>`).join('');}
function documents(){return V.documents();}
function imageBlock(url,label,extra=''){return `<div class="image-frame ${extra}"><span class="image-label">${esc(label.split(':')[0])}</span><button class="button image-button" data-image-load="${esc(url)}" data-image-caption="${esc(label)}">Показать изображение ↗</button></div>`;}
function catalogue(){return V.catalogue();}
function filterCatalogue(){return V.filterCatalogue();}
function sourceItem(s){return V.sourceItem(s);}
function sourcePage(id){return V.sourcePage(id);}
function sourcesPage(){return V.sourcesPage();}
function filterSources(){return V.filterSources();}
function leadsPage(id){return V.leadsPage(id);}
const archiveTitles={'GOVERNMENT_CONNECTIONS.md':'Государство и политическая среда','MEDIA_RIGHTS.md':'Матрица издательских прав','CORRECTIONS.md':'Исправления второй редакции','SOURCE_REVIEW.md':'Проверка вложений и URL','FULL_REPORT.md':'Главное расследование','PEOPLE.md':'Профессиональные досье','COMPANIES.md':'Компании и проекты','CONNECTIONS.md':'Цепочки связей','FINDINGS.md':'Все существенные утверждения','TIMELINE.md':'Полная хронология','SOURCES.md':'Все источники и обращения','LEADS.md':'Все открытые направления','FINANCES.md':'Финансы и поддержка','LEGAL.md':'Судебные зацепки','MEDIA.md':'Медиадеятельность и каталог','METHOD.md':'Методика и ограничения','RESEARCH_LOG.md':'Журнал исследования','RESEARCH_PLAN.md':'Исходный план','BRIEF.txt':'Задание пользователя','COVERAGE.md':'Проверка полноты'};
function archive(file='FULL_REPORT.md',query=''){return V.archive(file,query);}
function method(){return V.method();}

function snippet(text,q,len=240){const t=String(text).replace(/[#\n]+/g,' '),term=norm(q).split(/\s+/).filter(Boolean)[0]||'',idx=norm(t).indexOf(term),start=Math.max(0,idx-70);return (start?'…':'')+t.slice(start,start+len)+(start+len<t.length?'…':'');}
function highlightText(text,q){const tokens=norm(q).split(/\s+/).filter(Boolean);if(!tokens.length)return esc(text);const re=new RegExp(tokens.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'giu');let out='',last=0;const n=norm(text);for(const m of n.matchAll(re)){out+=esc(text.slice(last,m.index))+'<mark>'+esc(text.slice(m.index,m.index+m[0].length))+'</mark>';last=m.index+m[0].length;}return out+esc(text.slice(last));}
function highlightProse(q){const root=$('#full-document');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let n;while((n=walker.nextNode())){if(n.parentElement.closest('button,a'))continue;if(norm(n.textContent).includes(norm(q).split(/\s+/)[0]))nodes.push(n);}for(const n of nodes){const span=document.createElement('span');span.innerHTML=highlightText(n.textContent,q);n.replaceWith(span);}root.querySelector('mark')?.scrollIntoView({block:'center'});}
function searchPage(q){return V.searchPage(q);}
function notFound(){content.innerHTML=crumbs('Не найдено')+head('Такой записи в корпусе нет','Проверьте ссылку или найдите объект через поиск.')+'<a class="button" href="#home">К результатам →</a>';}
function router(){
 const dialog=$('#evidence-dialog');if(dialog.open)dialog.close();
 const parts=location.hash.slice(1).split('/').map(s=>{try{return decodeURIComponent(s);}catch{return s;}}),[page='home',id]=parts;
 document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===page||((page==='entity')&&a.dataset.nav==='entities')||((page==='finding'||page==='topic')&&a.dataset.nav==='home')||((page==='source')&&a.dataset.nav==='sources')||((page==='lead')&&a.dataset.nav==='leads');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#sidebar').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false');
 switch(page||'home'){
  case 'glossary':content.innerHTML=R.glossary();break;case 'home':home();break;case 'entities':directory();break;case 'entity':entityPage(id);break;case 'finding':finding(id);break;case 'topic':topicPage(id);break;case 'explore':explore(id);break;case 'timeline':timelinePage();break;case 'finance':finance();break;case 'documents':documents();break;case 'catalogue':catalogue();break;case 'catalogue-search':state.catalogueQuery=id||'';catalogue();break;case 'sources':sourcesPage();break;case 'source':sourcePage(id);break;case 'leads':leadsPage();break;case 'lead':leadsPage(id);break;case 'archive':archive(id);break;case 'archive-search':archive(id,parts[2]||'');break;case 'method':method();break;case 'search':searchPage(id||'');break;default:notFound();
 }
 R.enhance(content);
 document.title=($('#content h1')?.textContent||'EIA')+' · Открытое досье';
 if(page!=='archive-search')window.scrollTo({top:0,behavior:'instant'});
}
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-source],[data-edge],[data-entity],[data-chain],[data-action],[data-image-load],[data-image-enlarge],[data-alternative]');if(!el)return;
 if(el.dataset.alternative!==undefined){const p=state.alternatives[Number(el.dataset.alternative)];state.path={...p,title:shortName(p.nodes[0])+' → '+shortName(p.nodes.at(-1)),body:'Альтернативная последовательность отдельных отношений.'};state.step=99;explore();return;}
 if(el.dataset.source){sourceDialog(el.dataset.source,el.dataset.evidence);return;}if(el.dataset.edge){edgeDialog(el.dataset.edge);return;}if(el.dataset.entity){location.hash='entity/'+el.dataset.entity;return;}
 if(el.dataset.chain){state.chain=el.dataset.chain;state.step=1;state.path=null;if(location.hash==='#explore/'+state.chain)explore(state.chain);else location.hash='explore/'+state.chain;return;}
 if(el.dataset.imageLoad){
  const frame=el.closest('.image-frame'),url=el.dataset.imageLoad,label=el.dataset.imageCaption;frame.classList.add('loaded');frame.innerHTML='';const img=new Image();img.alt=label;img.referrerPolicy='no-referrer';img.loading='lazy';img.dataset.imageEnlarge=url;img.dataset.imageCaption=label;
  img.onerror=()=>{frame.classList.remove('loaded');frame.innerHTML='<p class="notice">Оригинал недоступен или нет интернета. Текст исследования доступен полностью.</p>';};frame.appendChild(img);img.src=url.replace('&w=3840','&w=640');return;
 }
 if(el.dataset.imageEnlarge){showDialog(el.dataset.imageCaption,`<img src="${safeURL(el.dataset.imageEnlarge.replace('&w=3840','&w=1200'))}" alt="${esc(el.dataset.imageCaption)}" referrerpolicy="no-referrer"><p class="notice">Оригинал опубликован EIA. Лицензия на самостоятельную перепубликацию не установлена.</p><a class="button" href="${safeURL(el.dataset.imageEnlarge)}" target="_blank" rel="noopener noreferrer">Открыть оригинал ↗</a>`);return;}
 switch(el.dataset.action){
  case 'zoom-in':case 'zoom-out':case 'zoom-reset':{const svg=el.closest('.graph-panel').querySelector('svg'),z=Number(svg.dataset.zoom||1),next=el.dataset.action==='zoom-reset'?1:Math.max(.75,Math.min(3,z+(el.dataset.action==='zoom-in'?.25:-.25)));svg.dataset.zoom=next;svg.style.width=(next*100)+'%';break;}
  case 'close-dialog':$('#evidence-dialog').close();break;
  case 'step-back':state.step=Math.max(1,state.step-1);explore();break;
  case 'step-next':state.step++;explore();break;
  case 'reset-graph':state.graphGrade=state.graphPeriod=state.graphKind=state.graphCountry=state.graphNodeKind='' ;state.path=null;state.chain=recommendations[0].id;state.step=99;explore();break;
  case 'find-path':{
   const a=$('#path-from').value,b=$('#path-to').value,p=getPath(a,b,allowedEdges());if(!p){$('#path-status').innerHTML='<div class="callout">В собранных данных по выбранным фильтрам путь не установлен. Это не доказательство отсутствия связи вне корпуса.</div>';return;}
   state.alternatives=alternativePaths(a,b,allowedEdges());state.path={...p,title:shortName(a)+' → '+shortName(b),body:'Путь выбран с учётом доказательств, типа связи и исторического периода. Это последовательность отношений, а не вывод о контроле.'};state.step=99;explore();$('#active-chain').scrollIntoView({behavior:'smooth',block:'start'});break;
  }
  case 'source-prev':state.sourcePage--;filterSources();$('#sources-count').scrollIntoView({block:'start'});break;
  case 'source-next':state.sourcePage++;filterSources();$('#sources-count').scrollIntoView({block:'start'});break;
 }
});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.target.matches('input,textarea,select')){e.preventDefault();$('#global-search').focus();}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-entity],[data-edge],[data-chain]')){e.preventDefault();e.target.click();}});
$('#search-form').addEventListener('submit',e=>{e.preventDefault();const q=$('#global-search').value.trim();if(q)location.hash='search/'+encodeURIComponent(q);});
$('.menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',String(open));});
$('#evidence-dialog').addEventListener('click',e=>{if(e.target===$('#evidence-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('input',e=>{switch(e.target.id){case 'entity-query':state.entityQuery=e.target.value;filterEntities();break;case 'source-query':state.sourceQuery=e.target.value;state.sourcePage=0;filterSources();break;case 'catalogue-query':state.catalogueQuery=e.target.value;filterCatalogue();break;}});
document.addEventListener('change',e=>{switch(e.target.id){case 'entity-kind':state.entityKind=e.target.value;filterEntities();break;case 'entity-country':state.entityCountry=e.target.value;filterEntities();break;case 'source-filter':state.sourceFilter=e.target.value;state.sourcePage=0;filterSources();break;case 'timeline-year':filterTimeline(e.target.value);break;case 'graph-grade':state.graphGrade=e.target.value;state.path=null;explore();break;case 'graph-period':state.graphPeriod=e.target.value;state.path=null;explore();break;case 'graph-kind':state.graphKind=e.target.value;state.path=null;explore();break;case 'graph-country':state.graphCountry=e.target.value;state.path=null;explore();break;case 'graph-node-kind':state.graphNodeKind=e.target.value;state.path=null;explore();break;}});
window.addEventListener('hashchange',router);
// Exposed read-only helpers make browser validation exercise the same live application.
window.EIA_APP=Object.freeze({getPath,alternativePaths,recommendations,graphSVG,route:router});
router();
})();
