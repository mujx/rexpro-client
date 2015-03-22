'use strict';

var msgpack     = require('msgpack');
var Parser      = require('binary-parser').Parser;
var conf        = require('./config.js');
var Concentrate = require('concentrate');

var utils = {};

module.exports = utils;

/**
 * Creates a parser for the RexPro header.
 *
 */

utils.headerParser = function() {

  return new Parser()
             .endianess('big')
             .uint8('protocol')
             .uint8('serializer')
             .uint32('empty')
             .uint8('type')
             .uint32('size');
};

/**
 * Creates the header of the RexPro message as a Buffer
 *
 * @param {String} serializer The method of serialization to be used.
 * @param {number} type The type of the message.
 * @param {number} size The size of the body.
 *
 * @return {Buffer} header - Returns the header.
 */

utils.createHeader = function(serializer, type, size) {

  if (conf.serializers[serializer] === undefined) {
    throw new TypeError('Serializer type ' + serializer + ' is not supported.');
  }

  var header = new Concentrate()

                  // Protocl version
                  .uint8(1)

                  // Serializer. 0 for msgpack, 1 for json
                  .uint8(conf.serializers[serializer])

                  // Reserved 4 bytes
                  .uint32be(0)

                  // Message type
                  .uint8(type)

                  // Message size
                  .uint32be(size)
                  .result();

  return header;
};

/**
 * Creates the body of the RexPro message as a Buffer, using either JSON
 * or msgpack for the serialization.
 *
 * Options
 *
 * - inSession: indicates this request should be executed in the supplied
 *                   session. Defaults to false.
 * - isolate: bindings from previous messages are not available in
 *                 subsequent requests. Defaults to true.
 * - transaction: executes script within a transaction, commiting if
 *                     succesful, rolling back if not. Has no effect with non
 *                     transactional graph. Defaults to true.
 * - graphname: the name of the graph to be used.
 * - graphObjName: the variable name of the graph object.
 * - serializer: the method of serialization to be used.
 * - language: the gremlin flavor. Defaults to groovy.
 * - bindings: the bindings to the gremlin engine.
 * - script: the script to be executed.
 * - sessionUUID: the UUID for the session.
 * - requestUUID: the UUID for the request.
 *
 *   @param {Object} options
 *
 *   @return {Buffer} msg - The script request.
 */
utils.scriptRequest = function(options) {

  var msg = [
    options.sessionUUID,
    options.requestUUID, {
      inSession: options.inSession,
      isolate: options.isolate,
      transaction: options.transaction,
      graphName: options.graphName,
      graphObjName: options.graphObjName,
    },
    options.language,
    options.script,
    options.bindings
  ];

  return utils.serialize(msg, options.serializer);
};

/**
 * Creates a Session Message
 *
 * Options
 *
 * - serializer: the type of serialization to be used.
 * - sesssionUUID: the UUID for the session.
 * - requestUUID: the UUID for the request.
 * - graphName: the name of the graph to open a session on.
 * - graphObjName: the variable name of the graph object, defaults to g.
 * - killSession: if true, the given session will be destroyed.
 * - username: the username to access the RexPro server assuming Rexster
 *             authentication is turned on.
 * - password: the password to access the RexPro server assuming Rexster
 *             authentication is turned on.
 *
 * @param {Object} options
 */

utils.sessionRequest = function(options) {

   var msg = [
    options.sessionUUID,
    options.requestUUID, {
      graphName: options.graphName,
      graphObjName: options.graphObjName,
      killSession: options.killSession
    },
    options.username,
    options.password
  ];

  return utils.serialize(msg, options.serializer);
};


/**
 * Serializes a message using json or msgpack.
 *
 * @param {String} serializer
 * @param {Array} message
 *
 * @param {Buffer} msg
 */

utils.serialize = function(message, serializer) {

  var msg;

  if (serializer === 'json') {
    msg = new Buffer(JSON.stringify(message));
  } else if (serializer === 'msgpack') {
    msg = msgpack.pack(message);
  } else {
    throw new TypeError('Serializer type ' + serializer + ' is not supported.');
  }

  return msg;
};

/**
 * Looks into the response from the server for errors.
 *
 * @param {Object} response - Contains info about the response.
 *
 */
utils.handleErrors = function(response) {
  if (response.header.type === conf.messageTypes.response.error) {

    switch (response.results[2].flag) {
      case conf.errors.malformed:
        return Error('MalformedPacket ' + response.results[3].toString());
      case conf.errors.sessionError:
        return Error('SessionDoesntExist ' + response.results[3].toString());
      case conf.errors.scriptFailure:
        return Error('ScriptFailure ' + response.results[3].toString());
      case conf.errors.authenticationError:
        return Error('AuthenticationFailed ' + response.results[3].toString());
      case conf.errors.graphError:
        return Error('GraphDoesntExist ' + response.results[3].toString());
      case conf.errors.serialization:
        return ('BindingsSerializationError ' + response.results[3].toString());
      default:
        return ('UnknownError ' + response.results[3].toString());
    }
  }

  return null;
};


/**
 * Parses the body of a RexPro message.
 *
 * @param {BufferList} message - The original message.
 * @param {String} serializer - The serializer that will do the unpacking.
 *
 * @returns {Object} results - The unpacked message.
 */

utils.parseBody = function(serializer, message) {

  var i;
  var results = [];

  if (serializer === 'json') {
    for (i = 0; i < message._bufs.length; i++) {
      if (i === 0) {

        // Removing the first 11 bytes of the header.
        results += message._bufs[i].slice(11).toString();
      } else {
        results += message._bufs[i].toString();
      }
    }

    return JSON.parse(results);

  } else if (serializer === 'msgpack'){
    results = new Buffer.concat(message._bufs);

    // Removing the first 11 bytes of the header.
    return msgpack.unpack(results.slice(11));

  } else {
    throw new TypeError('Serializer type ' + serializer + ' is not supported.');
  }

};


/**
 * Creates Rexpro request messages.
 *
 * Configuration
 *
 * - serializer: the type of serializer to use.
 * - messageType: the type of Rexpro message.
 * - sessionUUID: the UUID for the current session.
 * - requestUUID: the UUID for the current request.
 * - username: the username to access the Rexpro server assuming Rexster
 *             authentication is turned on.
 * - password: the password to access the Rexpro server assuming Rexster
 *             authentication is turned on.
 * - graphName: the name of the graph to open a session on.
 * - graphObjeName: the variable name of the graph object.
 * - killSession: if true, the given session will be destroyed.
 * - language: the gremlin flavor to request the rexpro server.
 * - script: the gremlin script to be executed on the server.
 * - bindings: bindings are arguments passed with the script.
 * - inSession: indicates the requests should be executes in the supplied
 *              session.
 * - isolate: Bindings from previous messages are not available.
 * - transaction: Executes script within a transactiona.
 * - console_: a console response will be returned if true.
 *
 * @param {Object} options
 */

utils.messageFactory = function(options) {

  var msgBody;
  var msgHeader;

  switch (options.messageType) {
    case conf.messageTypes.request.script:
      msgBody = utils.scriptRequest(options);
      break;
    case conf.messageTypes.request.session:
      msgBody = utils.sessionRequest(options);
      break;
  }

  msgHeader = utils.createHeader(options.serializer,
                                 options.messageType,
                                 msgBody.length);

  return new Buffer.concat([msgHeader, msgBody]);
};
