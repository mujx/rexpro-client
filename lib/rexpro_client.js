'use strict';

var net = require('net');
var msgpack = require('msgpack');
var uuid = require('uuid');
var q = require('q');
var _ = require('underscore');
var BufferList = require('bl');

var utils = require('./utils.js');
var conf = require('./config.js');


function RexProClient(options) {

  var defaultSettings = {
    host: 'localhost',
    port: 8184,
    serializer: 'json',
    graph: 'tinkerpop',
    language: 'groovy',
    graphObjName: 'g',
    inSession: false,
    isolate: true,
    transaction: true
  };

  this.settings = _.defaults(options || {}, defaultSettings);

  this.sessions = {};

  this.socket = new net.Socket();

  this.bl = new BufferList();
}

RexProClient.prototype.constructor = RexProClient;

/**
 * Checks if a session exists.
 *
 * @param {String} name - The name of the session
 */

RexProClient.prototype.session = function(name) {

  if (this.sessions[name] !== undefined) {
    return this;
  } else {
    return undefined;
  }
};


/**
 * Opens a session with the server.
 *
 * Options:
 *
 * - name: the session's name for future reference
 * - username: the username to access the server asssuming Rexster
 *             authentication is turned on.
 * - password: the password to access the server assuming Rexster
 *             authentication is turned on.
 *
 * @param {Object} options
 */

RexProClient.prototype.openSession = function(options, callback) {

  var deferred = q.defer();
  var _this = this;
  var socket = new net.Socket();
  var bl = new BufferList();
  var sessionUUID = uuid.v1();
  var response;
  var packet;
  var msgBody;
  var msgHeader;

  // If the session name already exists.
  if (this.session(options.name) !== undefined) {
    // Return exception
  }

  // Body
  msgBody = utils.sessionRequest({
    sessionUUID: sessionUUID,
    requestUUID: uuid.v1(),
    meta: {
      graphName: this.settings.graph,
      graphObjName: this.settings.graphObjName,
      killSession: false
    },
    username: options.username,
    password: options.password,
    serializer: this.settings.serializer
  });


  // Header
  msgHeader = utils.createHeader(
    this.settings.serializer,
    conf.messageTypes.request.session,
    msgBody.length
  );

  packet = new Buffer.concat([msgHeader, msgBody]);

  response = {
    receivedHeader: false,
    header: {},
    bytesReceived: 0,
    results: [],
    bindings: [],
    flag: undefined
  };

  socket.connect(this.settings.port, this.settings.host);

  socket.on('error', function(error) {
    deferred.reject(error);
  });

  socket.on('connect', function() {
    socket.write(packet);
  });

  socket.on('data', function(chunk) {

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

      response.results = utils.parseBody(_this.settings.serializer, bl);

      switch (response.header.type) {

        case conf.messageTypes.error:
          deferred.reject(utils.handleErrors(response));
          break;

        case conf.messageTypes.response.session:
          // Registering the session with the received sessionUUID
          // for future requests.
          //_this.sessions[options.name] = {
           // user: options.username,
            //password: options.password,
           // sessionUUID: response.results[0]
          //};
          deferred.resolve(response.results[0]);
          break;

        default:
          deferred.reject(new Error('SessionError ' + response.header));
      }
    }
  });

  return deferred.promise;
};


/**
 * Send script with bindings to the Rexster server for execution.
 *
 *
 * @param {String} query.script - The script to be executed.
 * @param {Object} query.bindings - An object with the bindings to the
 *                 gremlin engine. Optional.
 *
 * @param {Function} callback - A callback function to be executed after
 *                   the transaction has been completed.
 */

RexProClient.prototype.execute = function(query) {

  var deferred = q.defer();

  // Keeping this
  var _this = this;

  // Assemble message body as an array using msgpack or json
  var msgBody = utils.scriptRequest({
    meta: {
      inSession: this.settings.inSession,
      isolate: this.settings.isolate,
      transaction: this.settings.transaction,
      graphName: this.settings.graph,
      graphObjName: this.settings.graphObjName
    },
    serializer: this.settings.serializer,
    language: this.settings.language,
    bindings: query.bindings || {},
    script: query.script,
    sessionUUID: uuid.v1(),
    requestUUID: uuid.v1()
  });

  // Assemble message header
  var msgHeader = utils.createHeader(
    this.settings.serializer,
    conf.messageTypes.request.script,
    msgBody.length
  );

  // Assemble the packet
  var packet = new Buffer.concat([msgHeader, msgBody]);

  var response = {
    receivedHeader: false,
    header: {},
    bytesReceived: 0,
    results: [],
    bindings: [],
    flag: undefined
  };

  this.socket.connect(this.settings.port, this.settings.host);

  this.socket.on('error', function(error) {
    deferred.reject(error);
  });

  this.socket.on('connect', function() {
    _this.socket.write(packet);
  });

  // Handle chucks of data as they come
  this.socket.on('data', function readStream(chunk) {

    response.bytesReceived += chunk.length;
    _this.bl.append(chunk);

    if (!response.receivedHeader) {
      response.header = utils.headerParser().parse(chunk);
      response.receivedHeader = true;
    }

    // When we receive the whole data close the connection
    // and unpack, removing the first 11 bytes of the header.
    if (response.header.size + 11 === response.bytesReceived) {

      _this.socket.end();

      response.results = utils.parseBody(_this.settings.serializer, _this.bl);

      var err = utils.handleErrors(response);

      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(response.results[3]);
      }

    }
  });

  return deferred.promise;
};

module.exports = RexProClient;
