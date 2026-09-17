class HotelRouteDispatcher {
  static dispatch(accumulatedPayload) {
    const status = accumulatedPayload.route_status;
    return {
      hotel_id: accumulatedPayload.hotel_id,
      slug: accumulatedPayload.slug,
      route_status: status,
      channels: {
        b2c_booking: status === 'ACTIVE',
        b2b_ota_feed: status === 'ACTIVE',
        hermes_commercial_quote: status === 'ACTIVE' || status === 'DEGRADED',
        comparator_ui: status === 'ACTIVE'
      },
      telemetry_target: status === 'ACTIVE' ? 'EVENT_BUS' : 'ARIADNE_DATA_WARN'
    };
  }
}

module.exports = HotelRouteDispatcher;
