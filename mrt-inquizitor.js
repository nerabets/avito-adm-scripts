// ==UserScript==
// @name         Мрт-Инквизитор 3000
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Панель MRT-заказов
// @author       nerabets
// @match        NDA
// @grant        GM_xmlhttpRequest
// @connect      NDA
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    /*** ====== Константы ====== ***/
    const URL_BUTTON = 'NDA/tasks/apply-filters?page=1&tab=new-ex&filters[0][code]=task_type&filters[0][values][0]=mrt_order&filters[1][code]=mrt-order-source&filters[1][values][0]=button';
    const URL_INCOMING = 'NDA/tasks/apply-filters?page=1&tab=new-ex&filters[0][code]=task_type&filters[0][values][0]=mrt_order&filters[1][code]=mrt-order-source&filters[1][values][0]=incomingCall';
    const ASSIGN_URL = 'NDA/service-auto-crm/web/1/task/assign';

    const PANEL_ID = 'mrt-task-panel';
    const LIST_ID = 'mrt-task-list';
    const LAST_UPDATED_ID = 'mrt-last-updated';
    const COUNT_ID = 'mrt-count';
    const POLLING_INTERVAL = 3000; // 3 сек
    const AGENT_ID = 235235

    /*** ====== Утилиты ====== ***/
    const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('ru-RU') : '—';
    const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('ru-RU') : '—';

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else { fn(); }
    }

    function injectStyles() {
        if (document.getElementById('mrt-panel-styles')) return;
        const style = document.createElement('style');
        style.id = 'mrt-panel-styles';
        style.textContent = `
            #${PANEL_ID} { position: fixed; top: 10px; right: 10px; width: 360px; max-height: 80vh;
                background: #fff; border: 1px solid #ddd; border-radius: 10px;
                box-shadow: 0 6px 18px rgba(0,0,0,0.15); z-index: 99999; font-family: system-ui, sans-serif; overflow: hidden; font-size: 14px; cursor: move; }
            #${PANEL_ID} .header { display:flex; align-items:center; gap:8px; justify-content:space-between; padding: 10px 12px; background: #f7f7f8; border-bottom: 1px solid #eee; cursor: move; }
            #${PANEL_ID} .title { font-weight: 700; }
            #${PANEL_ID} .meta { font-size: 12px; color:#666; display:flex; gap:10px; align-items: baseline; }
            #${PANEL_ID} .controls { display:flex; gap:8px; }
            #${PANEL_ID} .btn { border: 1px solid #ccc; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
            #${PANEL_ID} .btn:hover { background:#f0f0f0; }
            #${LIST_ID} { max-height: calc(80vh - 60px); overflow-y: auto; }
            .task { display:flex; justify-content:space-between; gap:8px; padding:10px 12px; border-bottom: 1px solid #eee; transition: background 0.5s; }
            .task.new { background: #fff7c2; }
            .task .body { flex: 1; min-width: 0; }
            .task .body h4 { margin: 0 0 6px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .task .info { font-size: 12px; color:#666; display:grid; gap:2px; }
            .task .actions { display:flex; align-items:center; }
            .btn-accept { background: #16a34a; color:#fff; border:none; border-radius: 8px; padding: 6px 10px; cursor:pointer; }
            .btn-accept:hover { background:#12833c; }
            .empty { padding: 14px; text-align:center; color:#999; font-style: italic; }
            .pill { font-size: 11px; padding: 2px 6px; border-radius: 999px; background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; }
        `;
        document.head.appendChild(style);
    }

    function ensurePanel() {
        if (document.getElementById(PANEL_ID)) return;
        const panel = document.createElement('div');
        panel.id = PANEL_ID;

        const header = document.createElement('div');
        header.className = 'header';

        const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
        const title = document.createElement('div'); title.className='title'; title.textContent='Мрт-Инквизитор 3000';
        const meta = document.createElement('div'); meta.className='meta';
        const pill = document.createElement('span'); pill.className='pill'; pill.id=COUNT_ID; pill.textContent='0';
        const last = document.createElement('span'); last.id=LAST_UPDATED_ID; last.textContent='—';
        meta.appendChild(pill); meta.appendChild(last);
        left.appendChild(title); left.appendChild(meta);

        const controls = document.createElement('div'); controls.className='controls';
        const btnRefresh = document.createElement('button'); btnRefresh.className='btn'; btnRefresh.textContent='🔄 Обновить';
        btnRefresh.addEventListener('click',()=>fetchAndRender(true)); controls.appendChild(btnRefresh);

        header.appendChild(left); header.appendChild(controls);

        const list = document.createElement('div'); list.id=LIST_ID; list.innerHTML=`<div class="empty">Загрузка…</div>`;

        panel.appendChild(header); panel.appendChild(list);
        document.body.appendChild(panel);

        // ===== Перетаскивание =====
        let offsetX=0, offsetY=0, isDragging=false;
        header.addEventListener('mousedown', e => { isDragging=true; offsetX=e.clientX-panel.offsetLeft; offsetY=e.clientY-panel.offsetTop; });
        document.addEventListener('mousemove', e => { if(isDragging){ panel.style.left=(e.clientX-offsetX)+'px'; panel.style.top=(e.clientY-offsetY)+'px'; } });
        document.addEventListener('mouseup', ()=>{ isDragging=false; });
    }

    /*** ====== Работа с задачами ====== ***/
    const cards = new Map();

    function parseTasks(text){
        let tasks=[]; try{ const json=JSON.parse(text);
            if(Array.isArray(json.tasks)) tasks=json.tasks;
            else if(json.data) tasks=Array.isArray(json.data.items)?json.data.items:Array.isArray(json.data.tasks)?json.data.tasks:[];
        }catch(e){console.error('Ошибка парсинга',e);} return tasks;
    }

    function getMrtOrderData(task){
        const meta=Array.isArray(task.meta)?task.meta.find(m=>m.type==='mrt_order'):null;
        if(!meta||!meta.data) return null;
        try{ return typeof meta.data==='string'?JSON.parse(meta.data):meta.data; } catch{return null;}
    }

    function isAvailable(task){
        const can=typeof task.canSelfAssignTask==='boolean'?task.canSelfAssignTask:true;
        const hasManager=!!(task.manager && task.manager.id);
        return can && !hasManager;
    }

    function createOrUpdateCard(task,isNew){
        const list=document.getElementById(LIST_ID); if(!list) return;
        const existing=cards.get(task.id); const mrt=getMrtOrderData(task)||{};
        const machinery=mrt.machineryTitle || (task.title || 'Без названия');
        const startAt=fmtDateTime(mrt.startAt); const created=fmtDate(task.readyAt);
        const source=mrt.sourceTitle || '—';

        if(existing){
            existing.querySelector('h4').textContent=machinery;
            existing.querySelector('.info .created').textContent=`Создан: ${created}`;
            existing.querySelector('.info .start').textContent=`Начало: ${startAt}`;
            existing.querySelector('.info .source').textContent=`Источник: ${source}`;
            return existing;
        }

        const card=document.createElement('div'); card.className='task'; if(isNew) card.classList.add('new'); card.dataset.taskId=String(task.id);
        const body=document.createElement('div'); body.className='body';
        const h4=document.createElement('h4'); h4.textContent=machinery;
        const info=document.createElement('div'); info.className='info';
        const createdDiv=document.createElement('div'); createdDiv.className='created'; createdDiv.textContent=`Создан: ${created}`;
        const startDiv=document.createElement('div'); startDiv.className='start'; startDiv.textContent=`Начало: ${startAt}`;
        const sourceDiv=document.createElement('div'); sourceDiv.className='source'; sourceDiv.textContent=`Источник: ${source}`;
        info.appendChild(createdDiv); info.appendChild(startDiv); info.appendChild(sourceDiv);
        body.appendChild(h4); body.appendChild(info);

        const actions=document.createElement('div'); actions.className='actions';
        const btn=document.createElement('button'); btn.className='btn-accept'; btn.textContent='Принять';
        btn.addEventListener('click',()=>acceptTask(task.id,card)); actions.appendChild(btn);

        card.appendChild(body); card.appendChild(actions); list.appendChild(card);
        if(isNew) setTimeout(()=>card.classList.remove('new'),2500); cards.set(task.id,card);
        return card;
    }

    function removeMissingCards(nextIds){
        for(const [id,el] of cards.entries()){
            if(!nextIds.has(id)){ if(el&&el.parentNode) el.parentNode.removeChild(el); cards.delete(id); }
        }
    }

    function updateHeaderMeta(count){
        const pill=document.getElementById(COUNT_ID);
        const last=document.getElementById(LAST_UPDATED_ID);
        if(pill) pill.textContent=String(count);
        if(last) last.textContent=new Date().toLocaleTimeString('ru-RU');
    }

    /*** ====== Сеть ====== ***/
    async function fetchAndRender(){
        try{
            const results=await Promise.all([fetchUrl(URL_BUTTON),fetchUrl(URL_INCOMING)]);
            const allTasks=results.flat().filter(isAvailable);
            const list=document.getElementById(LIST_ID); if(!list) return;
            if(allTasks.length===0){ list.innerHTML=`<div class="empty">Ждём заказы…</div>`; removeMissingCards(new Set()); updateHeaderMeta(0); return; }
            if(list.querySelector('.empty')) list.innerHTML='';
            const nextIds=new Set();
            for(const t of allTasks){ nextIds.add(t.id); createOrUpdateCard(t,!cards.has(t.id)); }
            removeMissingCards(nextIds); updateHeaderMeta(allTasks.length);
        }catch(e){console.error('Ошибка fetchAndRender',e);}
    }

    function fetchUrl(url){
        return new Promise((resolve,reject)=>{
            GM_xmlhttpRequest({
                method:'GET', url, headers:{'Accept':'application/json'},
                onload: res => { if(res.status!==200) return reject(new Error('Статус '+res.status)); resolve(parseTasks(res.responseText)); },
                onerror: err => reject(err)
            });
        });
    }

    function acceptTask(taskId, cardEl){
        const body = JSON.stringify({ taskId, assigneeId: AGENT_ID }); 
        GM_xmlhttpRequest({
            method:'POST', url:ASSIGN_URL, headers:{'Content-Type':'application/json'}, data:body,
            onload: res => {
                if(res.status>=200 && res.status<300){
                    if(cardEl&&cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
                    cards.delete(taskId);
                    updateHeaderMeta(cards.size);
                } else {
                    console.error('Не удалось принять', taskId, res.status);
                }
            },
            onerror:()=>console.error('Ошибка сети при принятии заказа')
        });
    }

    function init(){ injectStyles(); ensurePanel(); fetchAndRender(); setInterval(fetchAndRender,POLLING_INTERVAL); }

    ready(init);
})();
