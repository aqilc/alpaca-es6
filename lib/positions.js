export class Positions {

  // Positions cache
  positions = new Map();

  constructor(client, cache) {

    // You need credentials to see your positions
    if (!client)
      throw new Error("You need to input your client to see your positions!")

    // Stores parameters
    this.client = client;
    this.cache = cache;
    
  }

  async get(symbol) {

    let pos = await this.client.request({ endpoint: `positions` + symbol ? "/" + symbol : "" });

    if (Array.isArray(pos)) {
      pos = pos.map(p => new Position(this, p))
      if(this.cache)
        pos.forEach(p => this.positions.set(p.id, p));
      return pos;
    } else {
      pos = new Position(this, pos);
      if(this.cache)
        this.positions.set(pos.id, pos);
      return pos;
    }
  }

  close(symbol) {
    return this.client.request({ method: "DELETE", endpoint: `positions` + symbol ? "/" + symbol : "" })
  }
}

export class Position {
  
  constructor(positions, pos) {

    this.positions = positions;
    this.client = positions.client;
    
    // Copies properties
    Object.assign(this, pos);
    
  }

  close() {
    this.positions.positions.delete(this.id)
    return this.client.request({ endpoint: "positions/" + this.symbol })
  }
}