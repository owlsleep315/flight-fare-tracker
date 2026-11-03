import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { bestQuotes, dailyRecords, difference, comparison, nights, csvCell } from '../public/lib.js';
import { validate } from '../scripts/validate.mjs';
const config=JSON.parse(await readFile('config.json','utf8'));
const observations=await Promise.all((await readdir('data/observations')).filter(n=>n.endsWith('.json')).map(async n=>JSON.parse(await readFile('data/observations/'+n,'utf8'))));
const quote=(id,depart,ret,krw,jpy=1000,direct=true)=>({id,departure:depart,return:ret,direct,airlines:['Test'],prices:{KRW:krw,JPY:jpy}});
const observation=(date,quotes,at=date+'T09:00:00+09:00')=>({schemaVersion:1,id:date+'-NGO',date,observedAt:at,destination:'NGO',origin:'ICN',status:'ok',quotes});
test('전체 데이터 계약과 가격 단위를 검증한다',()=>{for(const o of observations)assert.equal(validate(o,config),o);});
test('3박 미만, 14박 이상, 월 밖 일정은 제외하고 동률은 짧은 순서',()=>{
  const o=observation('2026-11-03',[quote('short','2027-01-01','2027-01-03',10),quote('long','2027-01-01','2027-01-15',20),quote('out','2027-01-30','2027-02-03',30),quote('7','2027-01-13','2027-01-20',100),quote('6','2027-01-13','2027-01-19',100)]);
  assert.deepEqual(bestQuotes(o,config).map(q=>q.id),['6','7']);
});
test('조회 시각이 다르면 마지막 시각의 실패도 유지한다',()=>{
  const early=observation('2026-11-03',[quote('a','2027-01-13','2027-01-19',100)]);
  const late={...early,observedAt:'2026-11-03T02:00:00Z',status:'error',error:'API timeout',quotes:[]};
  assert.equal(dailyRecords([late,early],config)[0].status,'error');
});
test('JPY 누락과 전날 결측을 0%로 처리하지 않는다',()=>{
  assert.equal(difference(null,100),null);assert.equal(difference(100,null),null);
  const records=dailyRecords([observation('2026-11-01',[quote('a','2027-01-13','2027-01-19',100)]),observation('2026-11-03',[quote('b','2027-01-13','2027-01-19',80,null)])],config);
  assert.equal(comparison(records[1],records,'KRW').delta,null);
  assert.equal(comparison(records[1],records,'JPY').delta,null);
});
test('전일 변화율과 일정 변경, 동일 최저가 일정 겹침을 구분한다',()=>{
  const a=observation('2026-11-02',[quote('a','2027-01-13','2027-01-19',100)]);
  const b=observation('2026-11-03',[quote('b','2027-01-13','2027-01-20',80)]);
  let records=dailyRecords([a,b],config),c=comparison(records[1],records,'KRW');
  assert.equal(c.delta.percent,-20);assert.equal(c.changed,true);
  b.quotes.push(quote('c','2027-01-13','2027-01-19',80));records=dailyRecords([a,b],config);
  assert.equal(comparison(records[1],records,'KRW').changed,false);
});
test('직항 필터는 경유 후보를 제거하고 두 통화를 같은 일정에서 읽는다',()=>{
  const o=observation('2026-11-03',[quote('transfer','2027-01-13','2027-01-19',80,200,false),quote('direct','2027-01-13','2027-01-20',100,100,true)]);
  assert.equal(bestQuotes(o,config)[0].prices.JPY,200);
  assert.equal(bestQuotes(o,config,true)[0].id,'direct');
});
test('현재 실제 데이터의 최저가와 전일 비교를 확인한다',()=>{
  const records=dailyRecords(observations,config),ngo=records.find(r=>r.date==='2026-11-03'&&r.destination==='NGO'),cts=records.find(r=>r.destination==='CTS');
  assert.equal(ngo.best[0].prices.KRW,317699);assert.equal(ngo.best[0].prices.JPY,37307);
  assert.equal(comparison(ngo,records,'KRW').delta.amount,-3603);
  assert.equal(cts.best[0].prices.KRW,438592);assert.equal(cts.best[0].prices.JPY,51504);
  assert.equal(comparison(cts,records,'KRW').delta,null);
});
test('잘못된 날짜/0 요금/외부 링크를 거부한다',()=>{
  const o=observation('2026-11-03',[quote('a','2027-01-13','2027-01-19',100)]);
  for(const override of [{prices:{KRW:0,JPY:null}},{departure:'2027-02-30'},{links:{KRW:'javascript:alert(1)'}}])assert.throws(()=>validate({...o,quotes:[{...o.quotes[0],...override}]},config));
  assert.equal(nights('2027-01-13','2027-01-19'),6);assert.equal(csvCell('a,"b"'),'"a,""b"""');
});
