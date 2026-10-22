'use strict';
/* Presentation helpers use authored explanations; source facts remain separate. */
(() => {
  const D = window.EIA_DATA;
  if (!D) return;
  const guide = D.reader || {profiles: {}, findings: {}, glossary: []};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value ?? '').toLocaleLowerCase('ru').replace(/ё/g, 'е');
  const titles = {
    'FULL_REPORT.md':'Как устроена сеть EIA', 'GOVERNMENT_CONNECTIONS.md':'Какие связи с государством установлены',
    'FINANCES.md':'Откуда могут поступать деньги', 'MEDIA_RIGHTS.md':'Кто выпускает журналы и кому они принадлежат',
    'PEOPLE.md':'Люди: роли, биографии и связи', 'COMPANIES.md':'Компании и организации: чем они связаны',
    'FINDINGS.md':'Все находки и их значение', 'CONNECTIONS.md':'Как читать связи между участниками',
    'TIMELINE.md':'Как складывалась история', 'MEDIA.md':'Журналы, публикации и редакционная работа',
    'LEGAL.md':'Что известно о судебных спорах', 'LEADS.md':'Вопросы, на которые пока нет ответа',
    'METHOD.md':'Как мы проверяем сведения', 'CORRECTIONS.md':'Что уточнено в расследовании',
    'SOURCE_REVIEW.md':'Как проверялось дополнительное исследование', 'SOURCES.md':'Документы и публикации',
    'AUDIT_2026-10-22.md':'С чего началась переработка исследования', 'COVERAGE.md':'Какие материалы сохранены',
    'VALIDATION.md':'Что проверено перед публикацией', 'RESEARCH_LOG.md':'История работы над расследованием',
    'RESEARCH_PLAN.md':'Первоначальные вопросы исследования', 'BRIEF.txt':'Исходное задание'
  };
  const summaries = {
    'FULL_REPORT.md':['Команда и часть её проектов существовали до нынешнего АО.','Сеть связана общей собственностью, редакционной работой и общественными площадками.','Список акционеров и прямые источники бюджета агентства остаются неизвестными.'],
    'GOVERNMENT_CONNECTIONS.md':['Государственные связи имеют разные формы и разные даты.','Общественный совет, работа в университете и государственный издатель не означают одно и то же.','Установленные контакты не складываются автоматически в доказательство государственного контроля.'],
    'FINANCES.md':['Оборот компаний участников не равен бюджету EIA.','Рекламные предложения и платное партнёрство показывают возможные способы заработка.','Фактические продажи и переводы в агентство требуют отдельных документов.'],
    'MEDIA_RIGHTS.md':['У журнала могут быть разные учредитель, издатель и редактор.','В каталоге EIA есть продукты самостоятельных внешних издателей.','Право на конкретное издание устанавливается документами, а не общей обложкой каталога.'],
    'PEOPLE.md':['Руководитель компании, её владелец и редактор журнала — разные роли.','У каждого человека ниже объяснены конкретная связь и её значение.','Исторические должности рассматриваются в своём времени.'],
    'COMPANIES.md':['Общий участник связывает организации, но не объединяет их имущество автоматически.','Действующие, закрытые и одноимённые компании различаются по документам.','Ниже объяснено, зачем каждая организация включена в расследование.'],
    'FINDINGS.md':['Каждая находка содержит факт, понятное объяснение и вывод.','Рядом указано, какие дальнейшие утверждения документ пока не позволяет сделать.','Цитаты дают возможность проверить основание, а не просто довериться пересказу.'],
    'CONNECTIONS.md':['У каждой связи свой смысл: владение, работа, выпуск журнала или участие в событии.','Путь через нескольких знакомых не создаёт прямого отношения между его концами.','Маршруты помогают понять устройство сотрудничества, а не измеряют скрытое влияние.'],
    'TIMELINE.md':['История людей и изданий начинается раньше нынешней компании.','Создание организации, выпуск журнала и назначение на должность — разные события.','Последовательность дат помогает увидеть развитие, но не доказывает передачу прав.'],
    'MEDIA.md':['Часть команды повторяется в нескольких журналах.','Другие издания имеют самостоятельных учредителей и издателей.','Авторство, распространение и собственность проверяются раздельно.'],
    'LEGAL.md':['Найдены конкретные карточки дел отдельных организаций.','Без текста требований и решения нельзя уверенно оценить исход и ответственность.','Судебная история партнёра не становится автоматически судебной историей EIA.'],
    'LEADS.md':['Главные открытые вопросы — собственники АО, платежи и договоры на издания.','У некоторых прежних вопросов уже есть частичный или полный ответ.','Неизвестность обозначает следующий шаг исследования, а не готовое обвинение.'],
    'METHOD.md':['Мы отделяем документ, заявление участника и собственную интерпретацию.','Проверяем имя, конкретную роль и дату, а не только похожие названия.','Вывод должен быть соразмерен тому, что действительно показывает источник.'],
    'CORRECTIONS.md':['Должность Рабиновича в Ассамблее уточнена.','Учредительные документы раскрыли устройство оператора Коалиции.','Ранний выпуск «Народной дипломатии» показал другую стадию истории издания.'],
    'SOURCE_REVIEW.md':['Присланное исследование использовано как направление поиска.','Доступ к странице и подтверждение конкретного утверждения — разные результаты.','Дополнительно найдены документы, которые существенно уточнили первоначальную картину.'],
    'SOURCES.md':['Здесь собраны публикации, документы и сведения о компаниях.','Источник оценивается применительно к конкретному утверждению.','Несколько справочников могут пересказывать одну и ту же государственную запись.']
  };
  const appendices = {
    'SOURCE_REVIEW.md': 'Все 44 внешние ссылки из дополнительного исследования были запрошены в ходе предыдущего этапа. Часть страниц удалось прочитать, часть не отдала содержимое. Сам факт получения страницы не считался подтверждением всех утверждений вложения: проверялись конкретные имена, роли и фрагменты.\n\nПо ссылкам организаций дополнительно найдены устав и учредительный протокол оператора Коалиции. Они дали более определённый ответ об управлении, чем публичные титулы. Отдельно сопоставлены ранние и поздние журналы и разные юридические лица с похожими названиями.\n\nНаш вывод: присланный текст оказался полезной картой направлений, но итоговая картина основана на самостоятельном сопоставлении документов. Исходный список ссылок и результаты получения сохранены в полном материале для скачивания.',
    'AUDIT_2026-10-22.md': 'Первоначальная проверка показала, что многие связи были описаны одинаковыми осторожными фразами. Из-за этого читатель видел перечень фамилий, но не понимал, как устроена совместная работа. Переработка сосредоточена на индивидуальных объяснениях, точных цитатах и разделении факта и вывода.',
    'COVERAGE.md': 'Сохранены основные главы, досье, находки, документы и предыдущая редакция. Каталог содержит 40 записей выпусков, однако выходные данные проверены у части номеров. Полнота сохранённых материалов не означает, что установлены все существующие обстоятельства деятельности EIA.',
    'VALIDATION.md': 'Перед публикацией проверены чтение основных страниц, поиск, переходы к доказательствам, работа графа и отображение на телефоне. Дополнительно проверяется, что объяснения присутствуют во всех досье, а технические инструкции не попадают в читательские разделы. Эти проверки относятся к качеству представления; они не заменяют отсутствующие договоры и выписки.',
    'RESEARCH_LOG.md': 'Работа началась с проверки прежних материалов и присланного дополнения. Затем сопоставлялись карточки компаний, страницы организаций и выходные данные журналов. Существенные новые результаты — уточнение роли Рабиновича в Ассамблее, обнаружение учредительных документов Коалиции и различий между ранними и поздними выпусками «Народной дипломатии».',
    'RESEARCH_PLAN.md': 'Основные вопросы исследования: кто руководит EIA, какие связи подтверждены, что представляет собой работа организаций, как устроено издательское сотрудничество и какие государственные, судебные и финансовые обстоятельства действительно найдены. Открытые вопросы сохраняются отдельно от сделанных выводов.',
    'BRIEF.txt': 'Исходное задание определило предмет исследования: EIA, её руководство, компании, медиапроекты и общественно значимые связи. В читательских главах представлены результаты проверки; само задание не является источником доказанных фактов.'
  };
  function documentTitle(file) {
    const name = file.split('/').at(-1);
    if (file.startsWith('imports/')) return name.endsWith('.md') ? 'Присланное дополнительное исследование' : 'Дополнительное задание';
    const title = titles[name] || name.replace(/\.(md|txt)$/i, '').replaceAll('_', ' ');
    return file.startsWith('versions/') ? title + ' · прежняя редакция' : title;
  }
  function takeaway(items, title='Главное в этом разделе') {
    if (!items?.length) return '';
    return `<section class="reader-takeaways" aria-label="${esc(title)}"><h2>${esc(title)}</h2><ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>`;
  }
  function profile(entity) {
    const item = guide.profiles[entity.id];
    if (!item) return '';
    return `${takeaway(item.takeaways || [item.conclusion], 'Что важно понять')}<div class="reader-profile prose" id="entity-description">${item.sections.map(([title,text], i)=>`<section id="profile-section-${i}"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('')}</div><section class="reader-conclusion" id="entity-conclusion"><span class="eyebrow">НАШ ВЫВОД</span><h2>Что это объясняет в истории EIA</h2><p>${esc(item.conclusion)}</p></section>`;
  }
  function finding(claim) { return guide.findings[claim.id]; }
  function sourceName(source) {
    const domain = (source?.publisher || '').replace(/^www\./, '');
    const names = [['companium','Компаниум: сведения о компании'],['rusprofile','Rusprofile: сведения о компании'],['rbc','РБК Компании'],['spark','СПАРК: сведения о компании'],['eia.media','Публикация EIA'],['world-assembly','Сайт Ассамблеи'],['healthcare-brics','Документы Коалиции здоровья'],['worldbrics','Сайт WORLDBRICS'],['arcticugol','Сайт издателя «Арктикуголь»'],['mpgu','Сайт университета МПГУ'],['spbu','Сайт университета СПбГУ'],['garant','ГАРАНТ: правовой документ'],['egoistmag','Сайт журнала «Эгоист»']];
    return names.find(([key])=>domain.includes(key))?.[1] || domain || 'Документ';
  }
  function sourceState(source) {
    if (source?.error || (source?.characters || 0) < 100) return 'Содержание пока не получено';
    return source?.evidence_ids?.length ? 'Использован для проверки выводов' : 'Сохранён для дополнительной проверки';
  }
  function date(value) {
    if (!value) return 'Дата не указана';
    if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Minsk'}).format(new Date(value.slice(0,10)+'T12:00:00Z'));
    if (/^\d{4}-\d{2}$/.test(value)) return new Intl.DateTimeFormat('ru-RU', {month:'long',year:'numeric',timeZone:'Europe/Minsk'}).format(new Date(value+'-15T12:00:00Z'));
    return value;
  }
  function terms(container) {
    const definitions = guide.glossary.filter(t=>t.term.length>1);
    const count = new Map();
    const escapeRE = t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const regex = new RegExp('(?<![А-Яа-яЁёA-Za-z0-9])('+definitions.map(t=>escapeRE(t.term)).sort((a,b)=>b.length-a.length).join('|')+')(?![А-Яа-яЁёA-Za-z0-9])','giu');
    const lookup = new Map(definitions.map(t=>[norm(t.term),t]));
    const walker = document.createTreeWalker(container,NodeFilter.SHOW_TEXT), candidates=[];
    let node;
    while ((node=walker.nextNode())) {
      if (!node.parentElement.closest('.prose,.fact-cell,.reading-intro,.reader-takeaways,.reader-conclusion,.route-step,.meaning,.limits')) continue;
      if (node.parentElement.closest('a,button,code,pre,blockquote,summary,.glossary-list,.reader-toc,.reader-inpage-nav')) continue;
      candidates.push(node);
    }
    for (const node of candidates) {
      const raw=node.textContent;let last=0, changed=false;
      const frag=document.createDocumentFragment();
      for (const match of raw.matchAll(regex)) {
        const key=norm(match[0]), definition=lookup.get(key);
        if (!definition || (count.get(key)||0)>=2) continue;
        frag.append(document.createTextNode(raw.slice(last,match.index)));
        const button=document.createElement('button');button.className='term-help';button.dataset.term=definition.term;
        button.textContent=match[0];button.title=definition.title+' — нажмите для объяснения';
        button.setAttribute('aria-label',match[0]+': '+definition.title+'. Открыть объяснение');
        frag.append(button);last=match.index+match[0].length;count.set(key,(count.get(key)||0)+1);changed=true;
      }
      if (changed) {frag.append(document.createTextNode(raw.slice(last)));node.replaceWith(frag);}
    }
  }
  function enhance(container) {
    const toc=container.querySelector('#document-toc');
    if (toc) {
      const headings=[...container.querySelectorAll('#full-document h2')];
      if (headings.length>2) {
        toc.innerHTML=`<details class="reader-toc"><summary>Содержание · ${headings.length} разделов</summary><nav aria-label="Содержание текста">${headings.map((h,i)=>{h.id='reading-section-'+i;return `<button data-scroll="${h.id}">${esc(h.textContent)}</button>`;}).join('')}</nav></details>`;
      }
    }
    const length=container.querySelector('.reader-profile,#full-document,.fact-body')?.textContent.length||0;
    const duration=container.querySelector('[data-reading-time]');
    if (duration) duration.textContent='Около '+Math.max(1,Math.ceil(length/1200))+' мин чтения';
    terms(container);
  }
  function glossary() {
    return `<div class="page-head"><span class="eyebrow">ПОНЯТНОЕ ЧТЕНИЕ</span><h1>Словарь без специальных знаний</h1><p class="lead">Объяснения сокращений и понятий, которые встречаются в расследовании. Подчёркнутое слово на любой странице можно открыть и прочитать здесь же.</p></div><div class="glossary-list">${guide.glossary.map(item=>`<article class="glossary-entry"><span class="glossary-term">${esc(item.term)}</span><div><h2>${esc(item.title)}</h2><p>${esc(item.text)}</p></div></article>`).join('')}</div>`;
  }
  function showTerm(term) {
    const item=guide.glossary.find(t=>t.term===term);if(!item)return;
    const body=document.getElementById('dialog-body');
    body.innerHTML=`<span class="eyebrow">ПРОСТЫМИ СЛОВАМИ</span><h2 id="dialog-title">${esc(item.title)}</h2><p class="term-definition">${esc(item.text)}</p><a class="button subtle" href="#glossary">Открыть весь словарь →</a>`;
    const dialog=document.getElementById('evidence-dialog');if(!dialog.open)dialog.showModal();
  }
  document.addEventListener('click', event=>{
    const term=event.target.closest('[data-term]');if(term){showTerm(term.dataset.term);return;}
    const scroll=event.target.closest('[data-scroll]');if(scroll){const target=document.getElementById(scroll.dataset.scroll);if(target){target.scrollIntoView({block:'start',behavior:'smooth'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}
  });
  window.EIA_READER=Object.freeze({guide,esc,titles,summaries,appendices,documentTitle,takeaway,profile,finding,sourceName,sourceState,date,enhance,glossary});
})();
