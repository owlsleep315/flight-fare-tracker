import { nights } from '../public/lib.js';
export function validate(o, config) {
  const fail = message => { throw new Error(`${o.id || 'unknown'}: ${message}`); };
  if (o.schemaVersion !== 1 || !/^[a-zA-Z0-9_-]+$/.test(o.id)) fail('schemaVersion 또는 id 오류');
  if (!config.destinations.includes(o.destination) || o.origin !== config.origin) fail('노선 오류');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date) || !Number.isFinite(Date.parse(o.observedAt))) fail('조회 날짜 오류');
  const local = new Intl.DateTimeFormat('en-CA', {timeZone:config.timezone, year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(o.observedAt));
  if (local !== o.date) fail('조회일과 한국 시간 불일치');
  if (!['ok','error'].includes(o.status) || !Array.isArray(o.quotes)) fail('status/quotes 오류');
  if (o.status === 'error' && (!o.error || o.quotes.length)) fail('실패 기록은 오류 사유와 빈 quotes 필요');
  const ids = new Set();
  for (const q of o.quotes) {
    if (!q.id || ids.has(q.id)) fail('후보 ID 누락/중복'); ids.add(q.id);
    for (const d of [q.departure,q.return]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10) !== d) fail('일정 날짜 오류');
    if (nights(q.departure,q.return) < 0 || typeof q.direct !== 'boolean' || !q.airlines?.length) fail('일정 정보 오류');
    if (!q.prices || !['KRW','JPY'].every(c => q.prices[c] === null || (Number.isInteger(q.prices[c]) && q.prices[c] > 0))) fail('요금은 양의 정수 또는 null');
    if (q.prices.KRW === null) fail('KRW 없이는 순위 판단 불가');
    for (const u of Object.values(q.links || {})) if (u && !/^https:\/\/(www\.)?skyscanner\.(net|co\.kr|jp)\//.test(u)) fail('Skyscanner HTTPS 링크 필요');
  }
  return o;
}
