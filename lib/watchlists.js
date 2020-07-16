export class Watchlists {

  /**
   * Watchlists cache
   * @returns {Map<string, Watchlist>}
   */
  watchlists = new Map();

  // The constructor
  constructor(client, cache) {

    // Stores client to make requests
    this.client = client;

    // Whether we should cache or not
    this.cache = cache;

    // Some convenience and sugar
    return new Proxy(this, {
      get: (_, p) => p in this ? this[p] : this.watchlists.get(p),
      deleteProperty: (_, p) => delete this.watchlists.delete(p),
      has: (_, p) => p in this || this.watchlists.has(p)
    });
  }

  async get(uuid) {

    // If you provided a UUID to get
    if(uuid) {

      // Gets watchlists
      const watch = new Watchlist(this, await this.client.request({ endpoint: "watchlists/" + uuid }));

      // If set to cache, cache it
      if(this.cache)
        this.watchlists.set(watch.id, watch);

      // returns the watchlist
      return watch;
    }

    // Else, just get all watchlists
    const watches = (await this.client.request({ endpoint: "watchlists" })).map(p => new Watchlist(this, p))

    // Caches them if set to
    if(this.cache)
      for(let i of watches)
        this.watchlists.set(i.id, i);

    
    // Returns all retrieved watchlists
    return watches;
  }

  async create({ name, symbols = "" }) {

    // Name is required in the API
    if(!name)
      throw new Error("You need a name to create a watchlist!");

    // Makes the watchlists
    const watch = (await this.client.request({ method: "POST", endpoint: "watchlists/", data: { name, symbols }})).map(p => new Watchlist(this, p));

    // Caches them if asked to
    if(this.cache)
      for(let i of watch)
        this.watchlists.set(i.id, i);

    // Returns watchlists
    return watch;
  }
}


export class Watchlist {

  /**
   * Represents a watchlists and provides some custom methods for it
   * @param {Watchlists} watchlists 
   * @param {Object} watchlist 
   */
  constructor(watchlists, watchlist) {

    this.watchlists = watchlists;
    this.client = watchlists.client;

    Object.assign(this, watchlist);
  }

  async delete() {

    // Sends the request to delete
    await this.client.request({ method: "DELETE", endpoint: "watchlists/" + this.id })

    // Deletes it from the cache too and exits
    return this.watchlists.watchlists.delete(this.id);
  }

  async add(symbol) {
    return Object.assign(this, await this.request({ method: "POST", endpoint: "watchlist/" + this.id, data: { symbol } }));
  }

  async remove(symbol) {
    return Object.assign(this, await this.client.request({ method: "DELETE", endpoint: "watchlist/" + this.id + "/" + symbol }));
  }

  async update({ name, symbols }) {
    return Object.assign(this, await this.client.request({ method: "POST", endpoint: "watchlists/" + this.id, data: { name, symbols }}));
  }
}