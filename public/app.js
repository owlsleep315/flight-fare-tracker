import { CITY, SOURCE, nights, previousDate, money, dailyRecords, comparison, searchUrl, csvCell } from './lib.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = d => `${Number(d.slice(5,7))}.${Number(d.slice(8))}`;
const itinerary = q => `${dateLabel(q.departure)} — ${dateLabel(q.return)}`;
const yen = n => n == null ? '엔화 미조회' : `¥${n.toLocaleString('ko-KR')}`;
const state = { currency:'KRW', period:'7', city:'all', directOnly:false, data:null };
let records = [];
$('#source-link').href = SOURCE;
function changeHTML(delta, expanded = false) {
  if (!delta) return '<span class="neutral">비교 기록 없음</span>';
  const cls = delta.amount < 0 ? 'down' : delta.amount > 0 ? 'up' : 'neutral';
  const sign = delta.amount < 0 ? '↓' : delta.amount > 0 ? '↑' : '';
  return `<span class="change ${cls}">${sign} ${Math.abs(delta.percent).toFixed(2)}%${expanded ? ` <span>(${money(Math.abs(delta.amount),state.currency)})</span>` : ''}</span>`;
}
function windowRecords() {
  if (!records.length) return [];
  const latest = records.at(-1)?.date;
  const first = state.period === 'all' ? '0000-00-00' : new Date(Date.parse(latest) - (Number(state.period)-1)*86400000).toISOString().slice(0,10);
  return records.filter(r => r.date >= first);
}
function cityIcon(city) {
  return city === 'NGO' ? '<svg width="29" height="29" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25h22M8 25V14h16v11M12 25v-6h8v6M5 14l11-6 11 6M9 8l7-5 7 5" fill="none" stroke="#3182f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg width="29" height="29" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l5-2-1-5M23 25l-1-5 5-2M5 18l5 2-1 5M23 7l-1 5 5 2" stroke="#9272df" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
}
function renderCards() {
  $('#cards').innerHTML = Object.keys(CITY).map(city => {
    const r = records.filter(r => r.destination === city).at(-1), q = r?.best[0];
    const top = `<div class="card-top"><div class="city-group"><div class="city-icon ${city.toLowerCase()}">${cityIcon(city)}</div><div><h3 class="city-name">${CITY[city]}</h3><p class="city-code">INCHEON → ${city}</p></div></div>${q ? `<span class="tag ${q.direct?'':'connecting'}">${q.direct?'직항':'경유'}</span>` : ''}</div>`;
    if (!q) return `<article class="card ${city.toLowerCase()}">${top}<div class="card-empty"><h3>${r?.status === 'error' ? '이번 조회에 실패했어요' : '조건에 맞는 후보가 없어요'}</h3><p>${esc(r?.error || (state.directOnly?'반환된 후보에서 조건에 맞는 직항편을 찾지 못했어요. 직항이 없다는 뜻은 아니에요.':'첫 번째 가격 기록을 기다리고 있어요.'))}</p>${r?`<p>${esc(r.date)} 조회</p>`:''}</div></article>`;
    const {delta,changed} = comparison(r,records,state.currency);
    const price = q.prices[state.currency];
    return `<article class="card ${city.toLowerCase()}">${top}<p class="price-caption">1인 왕복 · 조회 후보 최저가</p><div class="price">${price == null ? '미조회' : price.toLocaleString('ko-KR')}<span>${price == null ? '' : state.currency==='KRW'?'원':'엔'}</span></div><p class="secondary-price">${state.currency==='KRW'?yen(q.prices.JPY):money(q.prices.KRW,'KRW')} <span class="hint">· 별도 통화 조회</span></p><div class="change-line">${changeHTML(delta,true)}<span class="compare-label">${delta?'전날 대비':r.provenance==='restored'?'복원 기록':'첫 기록 또는 전날 미조회'}${changed?' · 최저가 일정 변경':''}</span></div><div class="itinerary"><strong>${itinerary(q)}<span class="nights">${nights(q.departure,q.return)}박${q.direct?'':' 후보'}</span></strong><span class="hint">2027년</span></div><p class="airline">${esc(q.airlines.join(' · '))} · 위탁 수하물 미확인</p>${r.best.length>1?`<details class="ties"><summary>동일 최저가 일정 ${r.best.length-1}개 더 보기</summary>${r.best.slice(1).map(t=>`<p><a href="${esc(searchUrl(city,t,state.currency))}" target="_blank" rel="noopener noreferrer">${itinerary(t)} · ${nights(t.departure,t.return)}박 ↗</a></p>`).join('')}</details>`:''}<a class="search-button" href="${esc(searchUrl(city,q,state.currency))}" target="_blank" rel="noopener noreferrer">이 일정으로 Skyscanner 검색 <span aria-hidden="true">↗</span></a><p class="hint" style="text-align:center;margin-top:10px">${esc(r.date)} · ${r.provenance==='restored'?'기존 브리핑 복원':'Skyscanner 월간 조회'}</p></article>`;
  }).join('');
}
function renderChart() {
  const subset = windowRecords();
  const data = subset.filter(r => r.best[0]?.prices[state.currency] != null);
  if (!data.length) { $('#chart').innerHTML='<p class="empty">표시할 가격 기록이 없어요.</p>'; return; }
  const minDate = subset[0].date, maxDate = subset.at(-1).date;
  const days = nights(minDate,maxDate), width=Math.max(270,Math.min(940,$('#chart').clientWidth || window.innerWidth-84)), height=width<500?220:260, left=54, right=22, top=26, bottom=38;
  const values = data.map(r=>r.best[0].prices[state.currency]);
  const low = Math.min(...values), high = Math.max(...values), pad = Math.max((high-low)*.28,high*.035);
  const min = Math.max(0,low-pad), max=high+pad;
  const x = date => days===0 ? (width+left-right)/2 : left+nights(minDate,date)/days*(width-left-right);
  const y = value => top+(max-value)/(max-min)*(height-top-bottom);
  const grid = Array.from({length:4},(_,i)=>{ const value=min+(max-min)*i/3, yy=y(value); return `<line x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}" stroke="#edf0f3" stroke-dasharray="3 5"/><text x="${left-12}" y="${yy+4}" text-anchor="end">${state.currency==='KRW'?(value/10000).toFixed(1)+'만':(value/10000).toFixed(1)+'만 엔'}</text>`; }).join('');
  const tickCount = Math.min(days+1,width<500?4:7);
  const ticks = Array.from({length:tickCount},(_,i)=>{const d=new Date(Date.parse(minDate)+Math.round(i*Math.max(days,1)/Math.max(tickCount-1,1))*86400000).toISOString().slice(0,10); return `<text x="${x(d)}" y="${height-10}" text-anchor="middle">${dateLabel(d)}</text>`;}).join('');
  const paths = Object.keys(CITY).map(city=>{
    const points=data.filter(r=>r.destination===city), color=city==='NGO'?'#3182f6':'#8b6ceb';
    const path=points.map((r,i)=>`${i && previousDate(r.date)===points[i-1].date?'L':'M'} ${x(r.date)} ${y(r.best[0].prices[state.currency])}`).join(' ');
    return `<path d="${path}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`+points.map(r=>{
      const value=r.best[0].prices[state.currency], label=`${r.date} ${CITY[city]} ${money(value,state.currency)}, ${itinerary(r.best[0])}`;
      return `<g class="plot-dot" tabindex="0" role="button" data-detail="${esc(label)}" aria-label="${esc(label)}"><circle cx="${x(r.date)}" cy="${y(value)}" r="13" fill="transparent"/><circle cx="${x(r.date)}" cy="${y(value)}" r="4.5" fill="white" stroke="${color}" stroke-width="2.5"/><title>${esc(label)}</title></g>`;
    }).join('');
  }).join('');
  $('#chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${esc(minDate)}부터 ${esc(maxDate)}까지 일별 최저 표시 요금. 상세 값은 아래 기록 표에서도 볼 수 있어요.">${grid}${ticks}${paths}</svg>`;
  document.querySelectorAll('[data-detail]').forEach(p=>{const update=()=>$('#chart-detail').textContent=p.dataset.detail;p.addEventListener('click',update);p.addEventListener('focus',update);p.addEventListener('mouseenter',update);p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();update();}});});
}
function filteredRows() { return windowRecords().filter(r => state.city==='all'||r.destination===state.city).sort((a,b)=>b.date.localeCompare(a.date)||a.destination.localeCompare(b.destination)); }
function renderRows() {
  const rows=filteredRows();
  $('#record-count').textContent=`${rows.length}개 기록 · 선택 기간 기준`;
  $('#empty').hidden=rows.length>0;
  $('#rows').innerHTML=rows.map(r=>{
    const q=r.best[0], {delta,changed}=comparison(r,records,state.currency);
    return `<tr><td>${esc(r.date)}<small>${r.provenance==='restored'?'브리핑 복원':'월간 후보 조회'}</small></td><td><strong>${CITY[r.destination]}</strong><small>${q?itinerary(q)+' · '+nights(q.departure,q.return)+'박'+(r.best.length>1?' 외 '+(r.best.length-1)+'개':''):r.status==='error'?'조회 실패':'조건 일치 후보 없음'}</small></td><td><strong>${q?money(q.prices[state.currency],state.currency):'—'}</strong><small>${q?(state.currency==='KRW'?yen(q.prices.JPY):money(q.prices.KRW,'KRW')):'요금 없음'}</small></td><td>${changeHTML(delta)}${changed?'<small>최저가 일정 변경</small>':''}</td><td>${q?(q.direct?'직항':'경유'):'—'}<small>${q?esc(q.airlines.join(' · ')):''}</small></td><td>${q?`<a class="table-link" href="${esc(searchUrl(r.destination,q,state.currency))}" target="_blank" rel="noopener noreferrer" aria-label="${CITY[r.destination]} ${itinerary(q)} Skyscanner 검색">↗</a>`:'—'}</td></tr>`;
  }).join('');
}
function render() {
  if(!state.data)return;
  records=dailyRecords(state.data.observations,state.data.config,state.directOnly);
  if (!records.length) { $('#updated').textContent='아직 조회 기록이 없어요';$('#cards').innerHTML='<p class="empty">첫 번째 조회 파일을 추가해 주세요.</p>';$('#chart').innerHTML='';renderRows();return; }
  renderCards();renderChart();renderRows();
  $('#chart-detail').textContent='점을 선택하면 해당 날짜의 가격을 볼 수 있어요.';
  $('#updated').textContent=`최근 기록 ${records.at(-1).date} · KST`;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const outdated=Object.keys(CITY).filter(city=>records.filter(r=>r.destination===city).at(-1)?.date!==today);
  $('#stale').hidden=!outdated.length;
  $('#stale').textContent=`${outdated.map(c=>CITY[c]).join('·')}의 오늘 조회 기록이 아직 없어요. 아래는 마지막으로 기록된 결과이며 실시간 요금이 아니에요.`;
}
async function loadData() {
  $('#loading').hidden=false;$('#error').hidden=true;$('#content').hidden=true;
  try {
    const response=await fetch('./data/history.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(data.schemaVersion!==1||!Array.isArray(data.observations)||!data.config)throw new Error('Invalid data');
    state.data=data;
    const c=data.config;
    $('#criteria').textContent=`인천 ICN 출발 · 성인 ${c.adults}명 · 일반석 왕복 · ${c.minNights}–${c.maxNights}박 · 1월 내 출국·귀국`;
    $('#methodology').textContent=`${c.travelMonth} 여행, ICN–NGO·CTS 왕복, 성인 ${c.adults}명 일반석. 출국일과 귀국일 차이가 ${c.minNights}–${c.maxNights}일인 후보를 비교합니다. 경유편은 실제 도착일에 따라 체류 박수가 달라질 수 있습니다. 동률이면 짧은 일정, 빠른 출발 순으로 대표 일정을 표시합니다. 직항 필터를 바꾸면 전체 기록을 같은 조건으로 다시 계산합니다.`;
    render();$('#content').hidden=false;
  } catch(error) { console.error(error);$('#error').hidden=false; }
  finally { $('#loading').hidden=true; }
}
for(const [attribute,key] of [['currency','currency'],['period','period'],['city','city']]) document.querySelectorAll(`[data-${attribute}]`).forEach(button=>button.addEventListener('click',()=>{
  state[key]=button.dataset[attribute];document.querySelectorAll(`[data-${attribute}]`).forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();
}));
$('#direct').addEventListener('change',e=>{state.directOnly=e.target.checked;render();});
$('#retry').addEventListener('click',loadData);
$('#export').addEventListener('click',()=>{
  const rows=[['조회일','도시','출국','귀국','박수(날짜차)','KRW','JPY','비교통화','전일대비금액','전일대비율(%)','직항','항공사','상태','출처']];
  for(const r of filteredRows()) { const q=r.best[0],{delta}=comparison(r,records,state.currency);rows.push([r.date,CITY[r.destination],q?.departure,q?.return,q?nights(q.departure,q.return):'',q?.prices.KRW,q?.prices.JPY,state.currency,delta?.amount,delta?.percent.toFixed(4),q?(q.direct?'직항':'경유'):'',q?.airlines.join(' / '),r.status,r.provenance]); }
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`farelog-${state.currency}-${records.at(-1)?.date||'empty'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
loadData();
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(records.length)renderChart();},100);});
