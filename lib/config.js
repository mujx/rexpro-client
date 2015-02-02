"use strict";

/* Variables and configuration for the RexPro protocol */

var config = {

    serializers: {
        "msgpack": 0,
        "json": 1
    },

    messageTypes: {
        request: {
            "session": 1,
            "script": 3
        },
        response: {
            "error": 0,
            "session": 2,
            "script": 5
        }
    },

    errors: {
        "malformed": 0,
        "sessionError": 1,
        "scriptFailure": 2,
        "authenticationError": 3,
        "graphError": 4,
        "serialization": 6
    }
};


module.exports = config;
