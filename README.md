# rexpro-client

A simple Rexster client for node.js implementing the binary protocol RexPro.

For more information about the RexPro protocol visit Rexster's [wiki].

The client is implemented using [q], so every method returns a promise.

### Installation

```sh
npm install rexpro-client
```
### Examples

#### Ad-hoc query

``` javascript
var RexProClient = require("rexpro-client");

var client = RexProClient({
    host: "localhost",      // default
    port: 8184,             // default
    graph: "tinkerpop",
    serializer: "msgpack"   // Defining a serializer is optional,
});                         // 'json' is the default.

var query = {
    script: "g.V.has('name', name).out()",
    bindings: {
        name: "titan"
    }
};

client.execute(query)
.then(function(data) {
    console.log(data);
})
.catch(function(err) {
    throw err;
})
.done();

```

#### In session query

``` javascript
var session;

client.openSession()
.then(function(uuid) {
    // Use the UUID to execute a query
    // within the context of this session.
    session = uuid;
    query.session = uuid;
    return client.execute(query);
})
.then(function(data) {
    console.log(data);
    return client.closeSession(session);
})
.catch(function(err) {
    throw err;
})
.done();

```

### API

For a more detailed explanation about the parameters see the Rexster's [wiki].

`openSession(options)`  Opens a session and returns the UUID for the session. 
- `options.graph` - The name of the graph to open a session on. Optional.
- `options.graphObjName` - The variable name of the graph object. Optional.
- `options.username` - Used for authentication. Optional.
- `options.password` - Used for authentication. Optional.

`closeSession(options)` Closes a session and returns true if it was successful.
- `options.session` - The UUID of the session you want to close.
- `options.username` - Used for authentication. Optional.
- `options.password` - Used for authentication. Optional.

`execute(options)` Sends a script for execution to the server.
- `options.session` - The session's UUID. Optional.
- `options.serializer` - The type of serialization that this request will use. Optional
- `options.graph` - The name of the graph to open a session on. Optional.
- `options.graphObjName` - The variable name of the graph object. Optional.
- `inSession` - Indicates this request should be executed in the supplied session. Defaults to false.
- `isolate` - If true bindings from previous messages are not available. Defaults to true.
- `transaction` - Execute the script within a transaction. Defaults to true.
- `console` - If true a console response will be returned. Defaults to false.
- `script` - The script to be executed. Optional.
- `bindings` - An object with the bindings tot he gremlin engine. Optional.



License
---
MIT

[wiki]:https://github.com/tinkerpop/rexster/wiki/RexPro
[q]:https://github.com/kriskowal/q
