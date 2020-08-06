/**
 * @module Stream
 */

import WebSocket from "ws";
import { EventEmitter } from "events";

/**
 * An alpaca stream
 * @param {module:Client~Client} client
 * @param {string} host
 * @param {Object} opts
 * @param {boolean} [opts.auto] - If you want it to auto-connect or not
 */
export class Stream extends EventEmitter {

  /**
   * Holds subscriptions
   */
  subscriptions = new Set();

  /**
   * Pre-auth queue
   */
  queue = [];

  /**
   * If you're authenticated or not
   */
  authenticated = false;

  /**
   * Stores the websocket connection
   * @type {WebSocket | null}
   */
  connection = null;

  // The constructor
  constructor(client, host, { auto = false }) {

    // Makes a new event emitter :D
    super();

    // Pls provide client
    if(!client)
      throw new Error("You need to input a client to authenticate a stream");

    // Since host is required.
    if(!host)
      throw new Error("You need to provide a host url to connect to!\n(Don't forget you can only have 1 websocket per host ;)");
    
    // Stores client
    this.client = client;

    // Stores Host
    this.host = host;

    // If you want to auto connect
    if (auto)
      this.connect();
  }

  /**
   * Sends a message to the connected websocket.
   * @param {any} message The message itself
   */
  send(message) {

    // You need to be authenticated to send further messages
    if(!this.authenticated)
      this.queue.push(message);

    // Sends the message.
    else this.connection.send(Buffer.from(typeof message === "string" ? message : JSON.stringify(message)));

    // Returns instance, making this chainable
    return this;
  }

  /**
   * Subscribes to channels
   * @param {string[] | string} channels The channels you want to subscribe to
   */
  subscribe(channels) {

    // You need to have channels you want to subscribe to
    if(!channels)
      return this;

    // Makes your channels an array forcefully
    if (typeof channels !== "string")
      channels = [channels];

    // Your channels simply need to be an array xP
    if (!Array.isArray(channels))
      return this;

    // If listens exists, it limits your channels to it
    if(this.listens)
      channels = channels.filter(c => this.listens.some(l => new RegExp(l).test(c)));

    // Filters channels based on subscriptions
    channels = channels.filter(this.subscriptions.has);

    // Just return if there are no channels left over
    if(!channels)
      return this;

    // Adds all subscriptions
    this.subscriptions.add(...channels)

    // Sends a message specifying to subscribe.
    return this.send({
      action: 'listen',
      data: { streams: channels }
    });
  }


  /**
   * Unsubscribes from given channels
   * @param {string[] | Set<string>} channels - The channels you want to unsubscribe from
   * @returns {this}
   */
  unsubscribe(channels) {

    // Removes these channels
    for (let i of channels)
      if (this.subscriptions.has(i))
        this.subscriptions.delete(i);

    // Send the removal to the websocket
    return this.send({
      action: 'unlisten',
      data: { streams: channels }
    });
  }

  /**
   * Connects to the websocket
   * @returns {this}
   */
  connect() {
    
    // Connect to the host
    this.connection = new WebSocket(this.host)
    
      // Emits when the websocket is open
      .once('open', () => {
        
        // Listens for reply to authentication
        this.connection.once("message", msg => {

          // Converts the received buffer into an object
          msg = JSON.parse(msg.toString());

          // Checks status and terminates stream if you didn't authorize
          if(msg.data?.status !== "authorized") {
            this.connection.terminate(); throw new Error("There was an error in authorizing your websocket connection. Object received: " + JSON.stringify(msg, null, 2)); }
          
          // else just send queued messages and emit the authorization event
          else this.authenticated = true, this.queue.forEach(m => this.send(m)), this.emit("authentication", this);
        })
        
          // Sends the message for authentication
          .send('{"action":"authenticate","data":{"key_id":"' + this.client.key + '","secret_key":"' + this.client.secret + '"}}');

        // Emits the open event
        this.emit("open", this)
      })

      // Emit a close event on websocket close.
      .once('close', () => this.emit("close", this))

      // listen to incoming messages
      .on('message', message => this.emit("message", JSON.parse(message.toString())))

      // Emits an error event.
      .on('error', err => this.emit("error", err));

    // For chainability
    return this;
  }
}

import { urls } from "./common.js"

// Market updates
export class Market extends Stream {
  
  // What you can listen to
  listens = ["T\\..*", "Q\\..*", "AM\\..*"]

  constructor(client, opts = {}) {

    // Calls Stream
    super(client, urls.market.stream, opts);

    // Listens to trade, quote, and minute bars events
    this.on("message", m => this.emit({ T: "trade", Q: "quote", AM: "minute" }[m.ev], m));
  }
}

// Account updates websocket listener
export class Account extends Stream {

  // What you can listen to
  listens = ["trade_updates", "account_updates"]

  // The constructor
  constructor(client, opts = {}) {

    // Calls Stream
    super(client, opts.paper ? urls.account.stream : urls.account.paper.stream, opts);

    // Sets up custom message listener for account and trade updates
    this.on("message", m => m.stream === "account_updates" ? this.emit("account_updates", m.data) : m.stream === "trade_updates" && this.emit("trade_updates", m.data));
  }
}