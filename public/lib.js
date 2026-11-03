export const CITY = { NGO: '나고야', CTS: '삿포로' };
export const SOURCE = 'https://skyscanner.net/g/referrals/v1/flights/home?mediaPartnerId=2850210&utm_term=skyscanner_chatgpt_app_data';
export const nights = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const previousDate = date => new Date(Date.parse(date) - 86400000).toISOString().slice(0, 10);
export const money = (value, currency) => value == null ? '미조회' : new Intl.NumberFormat('ko-KR').format(value) + (currency === 'KRW' ? '원' : '엔');
export const difference = (value, before) => value == null || before == null || before === 0 ? null : { amount: value - before, percent: (value - before) / before * 100 };
export function eligible(quote, config, directOnly = false) {
  const duration = nights(quote.departure, quote.return);
  return quote.departure.startsWith(config.travelMonth) && quote.return.startsWith(config.travelMonth)
    && duration >= config.minNights && duration <= config.maxNights && (!directOnly || quote.direct);
}
export function bestQuotes(observation, config, directOnly = false) {
  if (!observation || observation.status !== 'ok') return [];
  const sorted = observation.quotes.filter(q => eligible(q, config, directOnly) && q.prices.KRW != null)
    .sort((a, b) => a.prices.KRW - b.prices.KRW || nights(a.departure, a.return) - nights(b.departure, b.return) || a.departure.localeCompare(b.departure));
  return sorted.filter(q => q.prices.KRW === sorted[0]?.prices.KRW);
}
export function dailyRecords(observations, config, directOnly = false) {
  const map = new Map();
  for (const o of [...observations].sort((a,b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))) map.set(o.date + o.destination, o);
  return [...map.values()].map(o => ({ ...o, best: bestQuotes(o, config, directOnly) })).sort((a,b) => a.date.localeCompare(b.date) || a.destination.localeCompare(b.destination));
}
export function comparison(record, records, currency) {
  const before = records.find(r => r.destination === record.destination && r.date === previousDate(record.date));
  const nowQuote = record.best[0], oldQuote = before?.best[0];
  return { delta: difference(nowQuote?.prices[currency], oldQuote?.prices[currency]), before,
    changed: !!(nowQuote && oldQuote && !before.best.some(q => record.best.some(n => n.departure === q.departure && n.return === q.return))) };
}
export function searchUrl(city, q, currency) {
  if (q.links?.[currency]) return q.links[currency];
  const params = new URLSearchParams({ mediaPartnerId:'2850210', utm_term:'skyscanner_chatgpt_mcp_app', origin:'ICN', destination:city, outboundDate:q.departure, inboundDate:q.return, cabinclass:'economy', locale:'ko-KR', currency, market:'KR' });
  return 'https://skyscanner.net/g/referrals/v1/flights/day-view?' + params;
}
export function csvCell(value) { return '"' + String(value ?? '').replace(/"/g, '""') + '"'; }
