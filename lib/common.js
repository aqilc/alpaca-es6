
// All urls the client will need
export const urls = {
  account: {
    toString: () => urls.account.rest,
    rest: 'https://api.alpaca.markets/v2',
    stream: 'wss://api.alpaca.markets/stream',
    paper: {
      rest: "https://paper-api.alpaca.markets/v2",
      stream: "wss://paper-api.alpaca.markets/stream"
    }
  },
  market: {
    toString: () => urls.market.rest,
    rest: 'data.alpaca.markets/v1',
    stream: 'wss://data.alpaca.markets/stream'
  }
}

// ez querystring replacement
export const query = obj => Object.keys(obj).map(p => obj[p] ? p + "=" + obj[p] : false).filter(p => p).join("&");

// Clears empty object values
export const pick = obj => (Object.keys(obj).map(p => !obj[p] && delete obj[p]), obj);