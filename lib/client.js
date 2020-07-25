/**
 * @module Client
 */


import { urls, query, pick } from './common.js';
import fetch from "./fetch.js";
import { Orders } from "./orders.js";
import { Watchlists } from "./watchlists.js";
import { EventEmitter } from 'events';
import { Positions } from './positions.js';
import { Account, Market } from "./streams.js";

/**
 * @class
 */
export class Client extends EventEmitter {

  // Default for ratelimiter
  rate_limit = true;

  // The key id
  key = "";

  // The secret key
  secret = "";

  // Timestamp of the last request made
  lastreq = 0;

  // Stores websockets
  account = null; market = null;

  // Constructor
  constructor({ key, secret, paper = true, rate_limit = true, cache = false, auto = false }) {

    // Makes this an eventemitter
    super();
    
    // Sets ratelimit boolean
    if(!rate_limit)
      this.rate_limit = false;

    // If the alpaca key hasn't been provided, try env var
    if (!key && !(this.key = process.env.APCA_API_KEY_ID))
        throw new Error("You need a key given in the options of the client or set as environment variables!")

    // If the alpaca secret hasn't been provided, try env var
    if (!secret && !(this.secret = process.env.APCA_API_SECRET_KEY))
        throw new Error("You need your secret key given in the options of the client or set as environment variables!")

    // If url has been set as an env var, check if it's for paper
    if (!paper || process.env.APCA_PAPER && process.env.APCA_PAPER != 'true')
      this.paper = false;


    // Initiates orders
    this.orders = new Orders(this, cache);

    // So its easier to place orders
    this.order = this.orders.place;

    // Initiates watchlists
    this.watchlists = new Watchlists(this, cache);

    // Initiates Positions
    this.positions = new Positions(this, cache);

    // Sets up streams
    this.account = new Account(this);
    this.market = new Market(this);

    // Auto connect
    if (auto)
      this.connect();
  }

  /**
   * Gets market clock
   * @returns {Object} The properties of the market clock
   */
  get clock() {
    return this.request({ endpoint: `clock` })
  }
  
  /**
   * Gets calendars 
   * @param {Object} dates The dates on where to get the calendars from in history
   * @param {string} dates.start The first date to retrieve data from
   * @param {string} dates.end The last date to retrieve data for
   */
  calendar({ start, end }) {
    return this.request({ endpoint: `calendar` + start || end ? "?" + query({ start, end }) : "" })
  }

  get authenticated() {

    // Returns a new promise, so be sure to await it
    return new Promise(res => {

      // Checks by sending a request, resolves true if it succeeded
      this.info().then(() => res(true)).catch(() => res(false));
    });
  }

  /**
   * Basic information about your account
   * @returns {Object}
   */
  get info() { return this.request({ method: "GET", endpoint: 'account' }) }

  /**
   * Gets your portfolio history
   * @param {Object} [params] - The query
   * @param {string} [params.period] - The duration of the data in <number> + <unit>, such as 1D, where <unit> can be D for day, W for week, M for month and A for year. Defaults to 1M.
   * @param {string} [params.timeframe] - The resolution of time window. 1Min, 5Min, 15Min, 1H, or 1D. If omitted, 1Min for less than 7 days period, 15Min for less than 30 days, or otherwise 1D.
   * @param {string} [params.date_end] - The date the data is returned up to, in “YYYY-MM-DD” format. Defaults to the current market date (rolls over at the market open if extended_hours is false, otherwise at 7am ET)
   * @param {string} [params.extended_hours] - If true, include extended hours in the result. This is effective only for timeframe less than 1D.
   * @returns {Object}
   */
  portfolio(params) {
    return this.request({ endpoint: `account/portfolio/history` + params ? "?" + query(params) : "" });
  }

  assets({ id, symbol, status, asset_class }) {
    if(id || symbol)
      return this.request({ endpoint: "assets" + id || symbol });
    else return this.request({ endpoint: "assets" + status || asset_class ? "?" + query({ status, asset_class }) : "" })
  }

  get config() {
    return {
      get: () => this.request({ endpoint: `account/configurations` }),

      /**
       * Updates your account configurations
       * @param {Object} params
       * @param {"all" | "none"} params.emails - all or none. If none, emails for order fills are not sent.
       */
      update: ({ emails: trade_confirm_email, dtpb: dtpb_check, shorting: no_shorting, suspend: suspend_trade }) => this.request({ method: "PATCH", endpoint: `account/configurations`, data: pick({ suspend_trade, dtpb_check, no_shorting, trade_confirm_email }) })
    }
  }

  /**
   * Gets all account activities
   * @param {Object} data
   * @param {string} data.date The date to get activities from
   */
  activities({ type, types, date, until, after, direction = "desc", page: { size, token } = {} }) {

    if(type) {

      if(date)
        until = after = undefined;
      else size = Math.min(size, 100);

      if(direction !== "desc")
        direction = "asc";

      return this.request({ endpoint: `account/activities/` + type + "?" + query({ date, until, after, direction, page_size: size, page_token: token }) });
    }

    // Just straight up send the request otherwise
    return this.request({ endpoint: "account/activities" + types ? "?activity_types=" + types : ""})
  }

  /**
   * Gets bars
   * @param {Object} bars
   * @param {string} bars.time
   * @param {string[] | string} bars.symbol
   * @param {string} [bars.start]
   * @param {string} [bars.end]
   * @param {string} [bars.after]
   * @param {string} [bars.until]
   * @param {number} [bars.limit]
   */
  bars({ time, symbols, start, end, after, until, limit = 1000 }) {

    // Since they are incompatible...
    if(start) after = false;
    if(end) until = false;

    // Gets URL query string
    const q = query({ symbols, start, end, after, until, limit });

    // Makes the request
    return this.request({ url: urls.market, endpoint: `bars/` + time + (q ? "?" + q : "")  })
  }

  get last() {
    return {
      trade: symbol => this.request({ url: urls.market, endpoint: `last/stocks/` + symbol }),
      quote: symbol => this.request({ url: urls.market, endpoint: `last_quote/stocks/` + symbol })
    }
  }

  async request({ method = "GET", url = urls.account, endpoint, data }) {

    // modify the base url if paper is true
    if (this.paper && url == urls.account.rest)
      url = urls.account.rest.paper;

    // convert any dates to ISO 8601 for Alpaca
    if (data) for (let [key, value] of Object.entries(data))
      if (value instanceof Date)
        data[key] = value.toISOString();

    // Do rate limiting
    if (this.rate_limit) {
      const now = Date.now();
      if(now - this.lastreq < 300)
        await new Promise(res => setTimeout(() => (res(), this.lastreq = Date.now()), 300 - (now - this.lastreq)))
      else this.lastreq = now;
    }

    // Fetches the response and converts it to JSON
    const res = (await fetch(`https://` + url + "/" + endpoint, {
      method, headers: {
        'APCA-API-KEY-ID': this.key,
        'APCA-API-SECRET-KEY': this.secret,
      }, data: JSON.stringify(data),
    }).catch(err => { throw new Error(err) }));
      
    // Is it an alpaca error response?
    if('code' in res && 'message' in res)
      throw new Error("Alpaca error detected in request response: " + JSON.stringify(res));

    // Returns the finalized response.
    return res;
  }


  /**
   * Connects to the websocket
   */
  connect() {

    this.account.connect().on("trade_updates", m => this.emit("trade_updates", m)).on("account_updates", m => this.emit("account_updates", m));
    this.market.connect().on("trade", m => this.emit("trades", m)).on("quote", m => this.emit("quote", m)).on("minute", m => this.emit("minute", m));

    this.emit("connected", this);
  }
}
