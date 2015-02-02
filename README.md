# rexpro-client

A simple Rexster client for node.js implementing the binary protocol RexPro.

For the present moment it only supports sessionless ad-hoc queries, passed as strings.

For more information about the RexPro protocol visit Rexster's [wiki].

### Installation

```sh
npm install rexpro-client
```

### Example

``` javascript
var RexProClient = require("rexpro-client");

var client = RexProClient({
    host: "localhost",      // default
    port: 8184,             // default
    graph: "tinkerpop",
    serializer: "msgpack"   // Defining a serializer is optional
});                         // 'json' is the default.

var query = {
    script: "g.V.has('name', name).out()",
    bindings: {
        name: "titan"
    }
};

client.execute(query, function(err, data) {
    if (err) {
        throw err;
    }
    console.log(data);   // data is an array with the results
});

```

### TODO
- Implement Sessions
- Write tests
- Improve existing API

License
---
MIT

[wiki]:https://github.com/tinkerpop/rexster/wiki/RexPro
