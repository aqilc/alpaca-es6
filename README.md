
# alpaca-trade-api-ts

A TypeScript Node.js library for the <https://alpaca.markets> REST API and
WebSocket streams.

**Table of Contents:**

- [alpaca-trade-api-ts](#alpaca-trade-api-ts)
  - [TODO](#todo)
  - [Quick tips](#quick-tips)
  - [Installation](#installation)
  - [`alpaca.Client`](#alpacaclient)
    - [`Client` Initialization](#client-initialization)
    - [`Client` Properties](#client-properties)
      - [`authenticated` => `Promise<boolean>`](#authenticated--promiseboolean)
      - [`orders` => `new Orders(this, this.cache)`](#orders--new-ordersthis-thiscache)
    - [`Client` Methods](#client-methods)
      - [`info()`](#info)
  - [`alpaca.Stream`](#alpacastream)
    - [Initialization](#initialization)
    - [`Stream` Events](#stream-events)
      - [Event `"message"`](#event-message)
      - [Event `"authentication"`](#event-authentication)
  - [`alpaca.Market` extends `alpaca.stream`](#alpacamarket-extends-alpacastream)
    - [`Market` Events](#market-events)
      - [Event `"trade"`](#event-trade)
  - [`alpaca.urls`](#alpacaurls)
    - [`urls` Properties](#urls-properties)
      - [`urls.account`](#urlsaccount)
      - [`urls.market`](#urlsmarket)
  - [Contribute](#contribute)

## TODO

- Finish README
- Add more error detection and handling
- Improve performance
- Finish types

## Quick tips

I would personally use the `--experimental-top-level-await` tag with your node.js 14.3.0+ to allow for stuff like this:

```js
// Literally all you need from this api btw, ignore all the other classes
import { Client } from "alpaca-api";

const client = new Client({
  key: "your key id", secret: "your secret key" /** <- alpacas weird in it's naming schemes, and api access stuffs(like why have 2 keys lmao) ngl */
  auto: false, /** Auto-connects to sockets if true, but this checks for authentication as well so we don't want to do this yet :D */
});

// Yay it always confirms that you are able to connect with this, and just exits if you aren't
if(!await client.authenticated) {
  console.log("oh nu it doesn't work");
  process.exit();
}

// Connects and listens for events
client.connect().on("trade", console.log)

console.log("i think it works");
```

> returns `oh nu it doesn't work` btw

## Installation

```cmd
> npm i alpaca-api
```

## `alpaca.Client`

A client for handling all account based requests.

### `Client` Initialization

The standard way to initialize the client.

```ts
// Import the Client
import { Client } from 'alpaca-api'

// The actual initialization
const client = new Client({
  key: '...',
  secret: '...',
  paper: true,
  rate_limit: true,
})
```

You can also use environment variables which will be applied to every new
client.

```cmd
> set APCA_API_KEY_ID=yourKeyGoesHere
> set APCA_API_SECRET_KEY=yourKeyGoesHere
> set APCA_PAPER=true
```

### `Client` Properties

#### `authenticated` => `Promise<boolean>`

Checks if the client is authenticated.

```typescript

...

if(await client.authenticated) {
  // do something i guess
}

...
```

#### `orders` => `new Orders(this, this.cache)`

Orders class instance assigned to the current client.

```typescript
await client.orders.get('6187635d-04e5-485b-8a94-7ce398b2b81c');
```

### `Client` Methods

All Client instance methods.

#### `info()`

Gets some information about your Alpaca account.

```typescript
await client.info()
```

> More examples are coming soon... give me some time or feel free to contribute.

## `alpaca.Stream`

An Alpaca websocket API for streamlining the exchange of requests and data to and from the Alpaca servers. We will mostly handle this for you, and I would advise from actually using the `send` method.

### Initialization

An API key is allowed 1 simultaneous connection to each server. Connecting to them is easy:

```ts
// Imports the Alpaca websocket stream API
import { Stream, urls: { market } } } from 'alpaca-api';

// Creates a websocket stream
const stream = new Stream(client, market).connect();

// This subscribes to SPY's trade stream, and you can listen for it later
stream.subscribe(['T.SPY']);

// Will get called on each new trade event for SPY
stream.on("message", trade => console.log(trade));
```

### `Stream` Events

All stream events, able to be listened to by `Stream.on("eventname", data => /* do something with "data" here */)`

#### Event `"message"`

- `data`: The data containing the message info.

Emitted whenever any method is received from the stream

```ts
stream.on("message", data => console.log(JSON.stringify(data)));
```

#### Event `"authentication"`

- `client`: The stream instance that got authenticated.

Emitted on client authentication from websocket server.

```ts
stream.on("authenticated", auth => console.log("YAY!! We got authenticated :D"))
```

## `alpaca.Market` extends `alpaca.stream`

Market data websocket :D

### `Market` Events

#### Event `"trade"`

- `data`: The original message

```js
client.market.on("trade", t => console.log("this trade happened:", t));
```

## `alpaca.urls`

Contains 2 properties used for securing a connection to an Alpaca websocket, and 2 others for account related APIs:

### `urls` Properties

All the urls xddd

#### `urls.account`

Basically contains all links related to your account

**Properties:**

- `urls.account.rest`: Rest API base URL
  - `urls.account.rest.paper`: Relinked to `urls.account.paper.rest` for convenience
- `urls.account.stream`: WebSocket host URL
  - `urls.account.stream.paper`: Relinked to `urls.account.paper.stream` for convenience
- `urls.account.paper`: Paper version of above links
  - `urls.account.paper.rest`: Paper version of the `urls.account.rest` link
  - `urls.account.paper.stream`: Paper version of the `urls.account.stream` link

#### `urls.market`

Contains all links related to market data.

**Properties:**

- `urls.market.rest`: REST API url
- `urls.market.stream`: URL for market data websocket

## Contribute

Pull requests are encouraged. 😁
