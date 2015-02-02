"use strict";

var msgpack     = require("msgpack"),
    Parser      = require("binary-parser").Parser,
    conf        = require("./config.js"),
    Concentrate = require("concentrate");

var utils = {};

/**
 * Creates a parser for the RexPro header, using binary-parser
 *
 */
utils.headerParser = function headerParser() {

    return new Parser()
        .endianess("big")
        .uint8("protocol")
        .uint8("serializer")
        .uint32("empty")
        .uint8("type")
        .uint32("size");
};

/**
 *   Creates the header of the RexPro message as a Buffer
 *
 *   @param {number|string} serializer The type of the serializer.
 *   @param {number} msgType The type of the message.
 *   @param {number} msgLength The size of the message body.
 *
 *   @return {Buffer} msgHeader Returns a Buffer as the header.
 */
utils.createHeader = function createHeader(serializer, msgType, msgLength) {

    if (serializer === "json") {
        serializer = conf.serializers.json;
    } else if (serializer === "msgpack") {
        serializer = conf.serializers.msgpack;
    } else {
        throw new TypeError("Serializer type " + serializer + " is not supported.");
    }

    var msgHeader = Concentrate()
        .uint8(1)               // Protocol version
        .uint8(serializer)      // Serializer type 0: msgpack, 1: json
        .uint32be(0)            // Reserved 4 bytes
        .uint8(msgType)         // Message type
                                //   0: error   response
                                //   1: session request
                                //   2: session response
                                //   3: script  request
                                //   5: script  response
        .uint32be(msgLength)    // Message size
        .result();

    return msgHeader;
};

/**
 *   Creates the body of the RexPro message as a Buffer, using either JSON
 *   or msgpack for the serialization.
 *
 *   @param {Boolean} content.meta.inSession - Indicates this request should be executed
 *                                             in the supplied session.Defaults to false.
 *   @param {Boolean} content.meta.isolate - Bindings from previous messages are not available in subsequent requests.
 *                                           Defaults to true.
 *   @param {Boolean} content.meta.transaction - Executes script within a transaction, commiting if succesful, rolling back if not.
 *                                               Has no effect with non transactional graph. Defaults to true.
 *   @param {String} content.meta.graphName - The name of the graph to be used.
 *   @param {String} content.meta.graphObjName - The variable name of the graph object.
 *
 *   @param {number|string} content.serializer - The type of the serializer.
 *   @param {string} content.language - The name of the graph to be used.
 *   @param {Object} content.bindings - The bindings to the gremlin engine.
 *   @param {string} content.script - The script to be executed.
 *   @param {string} content.sessionUUID - The UUID for the session.
 *   @param {string} content.requestUUID - The UUID for the request.
 *
 *   @return {Buffer} msgBody - The Script Request Message as a Buffer.
 */
utils.createScriptRequestMessage = function createScriptRequestMessage(content) {

    var msgBody = [
        content.sessionUUID,
        content.requestUUID, {
            inSession: content.meta.inSession,
            isolate: content.meta.isolate,
            transaction: content.meta.transaction,
            graphName: content.meta.graphName,
            graphObjName: content.meta.graphObjName,
        },
        content.language,
        content.script,
        content.bindings
    ];

    if (content.serializer === "json") {
        msgBody = new Buffer(JSON.stringify(msgBody));
    } else if (content.serializer === "msgpack") {
        msgBody = msgpack.pack(msgBody);
    } else {
        throw new TypeError("Serializer type " + content.serializer + " is not supported.");
    }

    return msgBody;
};

/**
 * Looks into the response from the server for errors
 *
 * @param {Object} response - Contains info about the response
 *
 */
utils.handleErrors = function handleErrors(response) {
    if (response.header.type === conf.messageTypes.response.error) {
        // Check flag and throw appropriate message
        switch (response.results[2].flag) {
            case conf.errors.malformed:
                return Error("MalformedPacket " + response.results[3].toString());
            case conf.errors.sessionError:
                return Error("SessionDoesntExist " + response.results[3].toString());
            case conf.errors.scriptFailure:
                return Error("ScriptFailure " + response.results[3].toString());
            case conf.errors.authenticationError:
                return Error("AuthenticationFailed " + response.results[3].toString());
            case conf.errors.graphError:
                return Error("GraphDoesntExist " + response.results[3].toString());
            case conf.errors.serialization:
                return ("BindingsSerializationError " + response.results[3].toString());
            default:
                return ("UnknownError " + response.results[3].toString());
        }
    } else {
        return null;
    }
};

module.exports = utils;
