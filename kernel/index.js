const HotelIntegrityEvaluator = require('./HotelIntegrityEvaluator');
const HotelVariableAccumulator = require('./HotelVariableAccumulator');
const HotelRouteDispatcher = require('./HotelRouteDispatcher');

function evaluateHotel(hotelData, exchangeRateSell = 60.25) {
  const evalResult = HotelIntegrityEvaluator.evaluate(hotelData, exchangeRateSell);
  const payload = HotelVariableAccumulator.accumulate(hotelData, exchangeRateSell, evalResult);
  const dispatch = HotelRouteDispatcher.dispatch(payload);

  return {
    evaluation: evalResult,
    payload,
    dispatch
  };
}

module.exports = {
  HotelIntegrityEvaluator,
  HotelVariableAccumulator,
  HotelRouteDispatcher,
  evaluateHotel
};
