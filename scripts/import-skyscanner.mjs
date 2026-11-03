import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { validate } from './validate.mjs';
// npm run import -- --krw /tmp/NGO-KRW.json --jpy /tmp/NGO-JPY.json --at 2026-11-04T09:30:00+09:00
const args=Object.fromEntries(process.argv.slice(2).reduce((out,value,index,array)=>{if(index%2===0)out.push([value.replace(/^--/,''),array[index+1]]);return out;},[]));
if(!args.krw||!args.at)throw new Error('필수 인자: --krw <응답.json> --at <실제 조회 ISO 시간>. 선택: --jpy <응답.json>');
const unwrap=async file=>{const v=JSON.parse(await readFile(file,'utf8'));return v.structuredContent||v;};
const krw=await unwrap(args.krw),jpy=args.jpy?await unwrap(args.jpy):null;
const config=JSON.parse(await readFile('config.json','utf8'));
const city=krw.search_params?.destination;
function checkResponse(response,currency) {
  if(!response||!Array.isArray(response.quotes)||response.search_params?.currency!==currency)throw new Error('잘못된 통화 응답: '+currency);
  const p=response.search_params;
  if(p.origin!==config.origin||!config.destinations.includes(p.destination)||p.destination!==city||p.market!==config.market||!p.is_return||`${p.year}-${String(p.month).padStart(2,'0')}`!==config.travelMonth)throw new Error('응답의 노선/월/시장/왕복 조건이 config와 다릅니다.');
}
checkResponse(krw,'KRW');if(jpy)checkResponse(jpy,'JPY');
if(!Number.isFinite(Date.parse(args.at))||!/(Z|[+-]\d\d:\d\d)$/.test(args.at))throw new Error('--at는 타임존을 포함한 실제 조회 시간이어야 합니다.');
const date=new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(args.at));
const id=`${date}-${city}-${new Date(args.at).toISOString().slice(11,19).replaceAll(':','')}`;
const names=Object.fromEntries(krw.carriers.map(c=>[c.carrier_id,({'Jeju Air':'제주항공','Peach':'피치항공','Jin Air':'진에어'})[c.name]||c.name]));
const ds=d=>`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
function amount(q) {if(q.min_price?.unit!=='PRICE_UNIT_WHOLE')throw new Error('지원하지 않는 가격 단위');return Number(q.min_price.amount);}
const quoteMap=new Map((jpy?.quotes||[]).map(q=>[q.quote_id,q]));
const quotes=krw.quotes.map(q=>{
  const jq=quoteMap.get(q.quote_id);
  if(jq&&(ds(jq.outbound_leg.departure_date_time)!==ds(q.outbound_leg.departure_date_time)||ds(jq.inbound_leg.departure_date_time)!==ds(q.inbound_leg.departure_date_time)||jq.is_direct!==q.is_direct||jq.outbound_leg.carrier_id!==q.outbound_leg.carrier_id||jq.inbound_leg.carrier_id!==q.inbound_leg.carrier_id))throw new Error('동일 ID의 일정/항공사 불일치');
  return {id:q.quote_id,departure:ds(q.outbound_leg.departure_date_time),return:ds(q.inbound_leg.departure_date_time),direct:q.is_direct,airlines:[...new Set([names[q.outbound_leg.carrier_id]||q.outbound_leg.carrier_id,names[q.inbound_leg.carrier_id]||q.inbound_leg.carrier_id])],prices:{KRW:amount(q),JPY:jq?amount(jq):null},baggage:'unknown',links:{KRW:krw.referral_links?.flight_day_view?.find(l=>l.quote_id===q.quote_id)?.url,JPY:jq?jpy.referral_links?.flight_day_view?.find(l=>l.quote_id===q.quote_id)?.url:undefined}};
});
const evidence=[`data/evidence/${id}-KRW.json`,...(jpy?[`data/evidence/${id}-JPY.json`]:[])];
const o=validate({schemaVersion:1,id,date,observedAt:args.at,timePrecision:'second',origin:config.origin,destination:city,status:'ok',provenance:'skyscanner-monthly',coverage:'returned-candidates',source:'Skyscanner',evidence,quotes},config);
for(const dir of ['data/evidence','data/observations'])await mkdir(dir,{recursive:true});
// wx prevents silently replacing evidence or an existing observation.
await writeFile(evidence[0],JSON.stringify(krw,null,2)+'\n',{flag:'wx'});
if(jpy)await writeFile(evidence[1],JSON.stringify(jpy,null,2)+'\n',{flag:'wx'});
const target=path.join('data/observations',id+'.json');
await writeFile(target,JSON.stringify(o,null,2)+'\n',{flag:'wx'});
console.log(`Added ${target} · ${quotes.length} candidates · ${quotes.filter(q=>q.prices.JPY===null).length} JPY unavailable`);
