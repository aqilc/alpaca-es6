
// Object to URL query converter
import { query } from "./common.js";

// Holds orders
export class Orders {

  // Stores orders
  orders = new Map();

  // The constructor
  constructor(client, cache = false) {

    // Stores the client
    this.client = client;

    // If we want to cache or not
    this.cache = cache

    // Some convenience and sugar
    return new Proxy(this, {
      get: (_, p) => p in this ? this[p] : this.orders.get(p),
      deleteProperty: (_, p) => delete this.orders.delete(p),
      has: (_, p) => p in this || this.orders.has(p)
    });
  }

  /**
   * Gets and stores an order
   * @param {Object} order - The order info
   * @returns {this | Order}
   */
  async get(order = {}) {

    // Determines id of order(if any)
    const id = order.id || order.client_order_id;

    // If the client wants a specific order...
    if(id) {

      // Gets and stores the order
      const ord = new Order(this, await this.request({ method: "GET", endpoint: `orders/` + id + (order.nested ? "?nested=true" : "") }));

      // Stores the order if asked to cache
      if(this.cache)
        this.orders.set(ord.id, ord);
      
      // Returns the order
      return ord;
    }
    
    // Else just make the request to the main
    const orders = (await this.request({ method: "GET", endpoint: `orders` + order ? "?" + query(order) : "" })).map(p => new Order(this, p));

    // If we want to cache, loop through the returned orders
    if(this.cache)
      for(let i of orders)
        this.orders.set(i.id, i);

    // returns this object
    return orders;
  }

  /**
   * Places an order
   * @param {Object} order - The information needed to make the order
   * @returns {Order} The order you placed
   */
  async place(order) {

    // Places the order
    const ord = new Order(await this.client.request({ method: "POST", endpoint: `orders`, data: order }));

    // Stores the order if asked to cache
    if(this.cache)
      this.orders.set(ord.id, ord);

    // Stores and returns a new order
    return ord;
  }

  /**
   * !WARNING! Cancels all orders
   * @returns {this} The order instance
   */
  async cancel() {

    // Cancels everything
    await this.request({ method: "DELETE", endpoint: `orders` });

    // Deletes order cache
    this.orders.clear();

    // Returns the instance
    return this;
  }
}

export class Order {
  constructor(orders, order) {

    // Stores all properties
    this.client = orders.client;
    this.orders = orders;

    // Copies the order to the internals to store it.
    Object.assign(this, order);
  }

  async replace(data) {

    // You need data to replace!!
    if(!data) return this;

    // Sends a request to the server for replacement
    const order = await this.client.request({ method: "PATCH", endpoint: `orders/${this.id}`, data });

    // Returns the instance after syncing properties
    return Object.assign(this, order);
  }

  async cancel() {

    // Sends a request to delete the order
    await this.client.request({ method: "DELETE", endpoint: `orders/` + this.id })

    // Deletes it locally
    return this.orders.delete(this.id);
  }
}