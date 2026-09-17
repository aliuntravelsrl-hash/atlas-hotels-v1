class HotelVariableAccumulator {
  static accumulate(hotelData, exchangeRateSell, evaluationResult, marginPct = 15.0) {
    const baseUsd = hotelData.base_price_usd || (hotelData.rooms && hotelData.rooms[0] ? hotelData.rooms[0].price_per_night_usd : 0) || 0;
    const rateSell = exchangeRateSell || 1.0;
    const baseDop = Math.round((baseUsd * rateSell + Number.EPSILON) * 100) / 100;

    const normalizedRooms = (hotelData.rooms || []).map((r, idx) => ({
      room_id: r.room_id || ('room-' + (idx + 1)),
      name: r.name,
      max_adults: r.max_adults || 2,
      max_children: r.max_children || 0,
      price_per_night_usd: r.price_per_night_usd || baseUsd,
      price_per_night_dop: Math.round(((r.price_per_night_usd || baseUsd) * rateSell + Number.EPSILON) * 100) / 100
    }));

    return {
      hotel_id: hotelData.id || hotelData.hotel_id,
      name: hotelData.name,
      slug: hotelData.slug,
      zone: hotelData.zone,
      stars: hotelData.stars || 4,
      health_score: evaluationResult.score,
      health_verdict: evaluationResult.verdict,
      route_status: evaluationResult.score === 7 ? 'ACTIVE' : (evaluationResult.score >= 5 ? 'DEGRADED' : 'BLOCKED'),
      financials: {
        base_rate_usd: baseUsd,
        rate_sell_dop: rateSell,
        base_rate_dop: baseDop,
        commercial_margin_pct: marginPct
      },
      rooms: normalizedRooms,
      photos: hotelData.photos || [],
      policies: {
        check_in: (hotelData.policies && hotelData.policies.check_in) || '15:00',
        check_out: (hotelData.policies && hotelData.policies.check_out) || '12:00',
        cancellation: (hotelData.policies && hotelData.policies.cancellation) || 'Cancelacion estandar 48h'
      },
      accumulated_at: new Date().toISOString()
    };
  }
}

module.exports = HotelVariableAccumulator;
