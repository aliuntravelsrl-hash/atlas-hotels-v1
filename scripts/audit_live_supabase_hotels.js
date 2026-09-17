const { HotelIntegrityEvaluator, HotelVariableAccumulator, HotelRouteDispatcher } = require('../kernel');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oyihiyivdhfxpyiwnmqk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

async function auditLiveHotels() {
  console.log('🏛️ ATLAS HOTELS v1 — Auditoria con Mirror Kernel');
  console.log('Target SSOT:', SUPABASE_URL);

  if (!SUPABASE_KEY) {
    console.log('ℹ️ Modo standalone: ejecutando auditoria sobre fixtures canonicos...');
    const samplePass = require('../fixtures/sample_hotel_full_pass.json');
    const evalRes = HotelIntegrityEvaluator.evaluate(samplePass, 60.25);
    const accum = HotelVariableAccumulator.accumulate(samplePass, 60.25, evalRes);
    const dispatch = HotelRouteDispatcher.dispatch(accum);
    
    console.log('Resultado de Auditoria Fixture:', JSON.stringify({
      hotel: samplePass.name,
      score: evalRes.score + '/7',
      verdict: evalRes.verdict,
      route: dispatch.route_status,
      channels: dispatch.channels
    }, null, 2));
    return;
  }

  let rateSell = 60.25;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/exchange_rates?select=rate_sell&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rates = await res.json();
    if (rates && rates[0]) rateSell = Number(rates[0].rate_sell);
  } catch(e) {}
  console.log(`Tasa oficial detectada (FIN-ID-001): 1 USD = ${rateSell} DOP`);

  try {
    const resHotels = await fetch(`${SUPABASE_URL}/rest/v1/hotels_master?select=*&limit=5`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const hotels = await resHotels.json();
    console.log(`Auditando lote de ${hotels.length} hoteles...`);
    hotels.forEach(h => {
      const evalRes = HotelIntegrityEvaluator.evaluate(h, rateSell);
      console.log(`• [${evalRes.verdict}] ${h.name || h.hotel_name} -> Score: ${evalRes.score}/7 | Ruta: ${evalRes.score === 7 ? 'ACTIVE' : 'DEGRADED/BLOCKED'}`);
    });
  } catch(err) {
    console.error('Error consultando Supabase:', err);
  }
}

auditLiveHotels();
