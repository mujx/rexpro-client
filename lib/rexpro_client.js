"use strict";

var net         = require("net"),
    msgpack     = require("msgpack"),
    uuid        = require("uuid"),
    _           = require("underscore"),
    BufferList  = require("bl"),
    utils       = require("./utils.js"),
    conf        = require("./config.js");


function RexProClient(options) {

    var defaultSettings = {
        host: "localhost",
        port: 8184,
        serializer: "json",
        graph: "tinkerpop",
        language: "groovy",
        graphObjName: "g",
        inSession: false,
        isolate: true,
        transaction: true
    };

    var settings = _.defaults(options || {}, defaultSettings);

    var socket = new net.Socket();

    var bl = new BufferList();

    return {

        /**
         * Send script with bindings to the Rexster server for execution.
         *
         * @param {String} query.script - The script to be executed.
         * @param {Object} query.bindings - An object with the bindings to the
         *                                  gremlin engine. Optional.
         * @param {Function} callback - A callback function to be executed after
         *                              the transaction has been completed.
         */
        execute: function execute(query, callback) {

            /* Assemble message body as an array using msgpack or json */
            var msgBody = utils.createScriptRequestMessage({
                meta: {
                    inSession: settings.inSession,
                    isolate: settings.isolate,
                    transaction: settings.transaction,
                    graphName: settings.graph,
                    graphObjName: settings.graphObjName
                },
                serializer: settings.serializer,
                language: settings.language,
                bindings: query.bindings || {},
                script: query.script,
                sessionUUID: uuid.v1(),
                requestUUID: uuid.v1()
            });

            /* Assemble message header */
            var msgHeader = utils.createHeader(
                settings.serializer,
                conf.messageTypes.request.script,
                msgBody.length
            );

            /* Assemble the packet */
            var packet = new Buffer.concat([msgHeader, msgBody]);

            var response = {
                receivedHeader: false,
                header: {},
                bytesReceived: 0,
                results: [],
                bindings: [],
                flag: undefined
            };

            socket.connect(settings.port, settings.host);

            socket.on("connect", function() {
                socket.write(packet);
            });

            /* Handle chucks of data as they come */
            socket.on("data", function readStream(chunk) {

                response.bytesReceived += chunk.length;
                bl.append(chunk);

                if (!response.receivedHeader) {
                    response.header = utils.headerParser().parse(chunk);
                    response.receivedHeader = true;
                }

                // When we receive the whole data close the connection
                // and unpack, removing the first 11 bytes of the header.
                if (response.header.size + 11 === response.bytesReceived) {

                    socket.end();

                    var i;
                    var results = [];

                    if (settings.serializer === "json") {
                        for (i = 0; i < bl._bufs.length; i++) {
                            if (i === 0) {
                                results += bl._bufs[i].slice(11).toString();
                            } else {
                                results += bl._bufs[i].toString();
                            }
                        }
                        response.results = JSON.parse(results);
                    } else {
                        results = new Buffer.concat(bl._bufs);
                        response.results = msgpack.unpack(results.slice(11));
                    }

                    var err = utils.handleErrors(response);

                    if (err) {
                        callback(err);
                    } else {
                        callback(null, response.results[3]);
                    }

                }
            });
        }
    };
}

module.exports = RexProClient;
