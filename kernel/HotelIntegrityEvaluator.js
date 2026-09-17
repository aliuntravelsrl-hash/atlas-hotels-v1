class HotelIntegrityEvaluator {
  static evaluate(hotelData, exchangeRateSell) {
    const pillars = {
      p1_identity: false,
      p2_rooms: false,
      p3_rates: false,
      p4_seasons: false,
      p5_multimedia: false,
      p6_policies: false,
      p7_currency_fin_id_001: false
    };
    const gaps = [];

    if (hotelData.id && hotelData.name && hotelData.slug && hotelData.zone && hotelData.is_active === true) {
      pillars.p1_identity = true;
    } else {
      gaps.push('P1_IDENTITY: Faltan campos basicos o is_active != true');
    }

    if (Array.isArray(hotelData.rooms) && hotelData.rooms.length > 0) {
      const validRooms = hotelData.rooms.every(r => r.name && r.max_adults >= 1);
      if (validRooms) pillars.p2_rooms = true;
      else gaps.push('P2_ROOMS: Habitaciones con estructura incompleta');
    } else {
      gaps.push('P2_ROOMS: Sin habitaciones configuradas');
    }

    if (hotelData.base_price_usd > 0 || (Array.isArray(hotelData.rates) && hotelData.rates.length > 0)) {
      pillars.p3_rates = true;
    } else {
      gaps.push('P3_RATES: Sin tarifas validas');
    }

    if (Array.isArray(hotelData.seasons) && hotelData.seasons.length > 0) {
      pillars.p4_seasons = true;
    } else if (hotelData.has_default_season) {
      pillars.p4_seasons = true;
    } else {
      gaps.push('P4_SEASONS: Sin temporadas activas');
    }

    if (Array.isArray(hotelData.photos) && hotelData.photos.length >= 3) {
      const allHttps = hotelData.photos.every(p => typeof p === 'string' && p.startsWith('http'));
      if (allHttps) pillars.p5_multimedia = true;
      else gaps.push('P5_MULTIMEDIA: URLs de fotos no validas');
    } else {
      gaps.push('P5_MULTIMEDIA: Menos de 3 fotos en CDN');
    }

    if (hotelData.policies && hotelData.policies.check_in && hotelData.policies.cancellation) {
      pillars.p6_policies = true;
    } else {
      gaps.push('P6_POLICIES: Politicas de check_in o cancelacion incompletas');
    }

    if (typeof exchangeRateSell === 'number' && exchangeRateSell > 1) {
      pillars.p7_currency_fin_id_001 = true;
    } else {
      gaps.push('P7_CURRENCY: Tasa cambiaria oficial invalida');
    }

    const score = Object.values(pillars).filter(Boolean).length;
    let verdict = 'FAIL';
    if (score === 7) verdict = 'PASS';
    else if (score >= 5) verdict = 'DEGRADED';

    return {
      score,
      max_score: 7,
      verdict,
      pillars,
      gaps,
      evaluated_at: new Date().toISOString()
    };
  }
}

module.exports = HotelIntegrityEvaluator;
