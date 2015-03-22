'use strict';

var net = require('net');
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

}

RexProClient.prototype.constructor = RexProClient;

/**
 * Opens a session with the server.
 *
 * Options:
 *
 * - username: the username to access the server asssuming Rexster
 *             authentication is turned on.
 * - password: the password to access the server assuming Rexster
 *             authentication is turned on.
 * - graph: the name of the graph to open a session on. Optional.
 * - graphObjName: The variable name of the graph object. Optional.
 *
 * @param {Object} options
 */

RexProClient.prototype.openSession = function(options) {

  var _this = this;
  var deferred = q.defer();
  var socket = new net.Socket();
  var bl = new BufferList();

  options = options || {};

  var response = {
    receivedHeader: false,
    header: {},
    bytesReceived: 0,
    results: [],
    bindings: [],
    flag: undefined
  };

  var config = {
    serializer: this.settings.serializer,
    messageType: conf.messageTypes.request.session,
    sessionUUID: uuid.v1(),
    requestUUID: uuid.v1(),
    username: options.username || '',
    password: options.password || '',
    graphName: options.graph || this.settings.graph,
    graphObjName: options.graphObjName || this.settings.graphObjName,
    killSession: false
  };

  var packet = utils.messageFactory(config);

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

        case conf.messageTypes.response.error:
          deferred.reject(utils.handleErrors(response));
          break;

        case conf.messageTypes.response.session:

          // Returning the UUID for the session
          deferred.resolve(response.results[0]);
          break;

        default:
          deferred.reject(new Error('SessionError ' + response.header.type));
      }
    }
  });

  return deferred.promise;
};


/**
 * Sends script with bindings to the Rexster server for execution.
 *
 * Query options
 *
 * - session: the session's UUID. Optional.
 * - serializer: the type of serialization to be used for the request.
 * - graph: the name of the graph to open a session on.
 * - graphObjName: the variable name of the graph object.
 * - inSession: indicates this request should be executed in the supplied
 *              session.
 * - isolate: bindings from previous messages are not available.
 * - transaction: executse script within a transaction.
 * - console: a console response will be returned if true.
 * - script: the script to be executed. Optional.
 * - bindings: an object with the bindings to the gremlin engine. Optional.
 *
 *
 * @param {Object} query
 */

RexProClient.prototype.execute = function(query) {

  var deferred = q.defer();
  var socket = new net.Socket();
  var bl = new BufferList();

  var response = {
    receivedHeader: false,
    header: {},
    bytesReceived: 0,
    results: [],
    bindings: [],
    flag: undefined
  };

  var config = {
    serializer: query.serializer || this.settings.serializer,
    messageType: conf.messageTypes.request.script,
    sessionUUID: query.session || uuid.v1(),
    requestUUID: uuid.v1(),
    username: '',
    password: '',
    graphName: query.graph || this.settings.graph,
    graphObjName: query.graphObjName || this.settings.graphObjName,
    killSession: false,
    language: this.settings.language,
    script: query.script || '',
    bindings: query.bindings || {},
    inSession: query.session !== undefined,
    isolate: query.session === undefined,
    transaction: query.transaction,
    console: query.console
  };

  // Create the message.
  var packet = utils.messageFactory(config);

  socket.connect(this.settings.port, this.settings.host);

  socket.on('error', function(error) {
    deferred.reject(error);
  });

  socket.on('connect', function() {
    socket.write(packet);
  });

  // Handle chucks of data as they come.
  socket.on('data', function readStream(chunk) {

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

      response.results = utils.parseBody(config.serializer, bl);

      switch (response.header.type) {

        case conf.messageTypes.response.error:
          deferred.reject(utils.handleErrors(response));
          break;

        case conf.messageTypes.response.script:

          // Returning only the script response.
          deferred.resolve(response.results[3]);
          break;

        default:
          deferred.reject(new Error('RequestError ' + response.header.type));
      }
    }
  });

  return deferred.promise;
};

/**
 * Closes a session with the server.
 *
 * Options:
 *
 * - session: the UUID of the session you want to close.
 * - username: the username to access the server asssuming Rexster
 *             authentication is turned on.
 * - password: the password to access the server assuming Rexster
 *             authentication is turned on.
 *
 * @param {Object} options
 */

RexProClient.prototype.closeSession = function(options) {

  var _this = this;
  var deferred = q.defer();
  var socket = new net.Socket();
  var bl = new BufferList();

  options = options || {};

  var response = {
    receivedHeader: false,
    header: {},
    bytesReceived: 0,
    results: [],
    bindings: [],
    flag: undefined
  };

  var config = {
    serializer: this.settings.serializer,
    messageType: conf.messageTypes.request.session,
    sessionUUID: options.session,
    requestUUID: uuid.v1(),
    username: options.username || '',
    password: options.password || '',
    killSession: true
  };

  var packet = utils.messageFactory(config);

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

        case conf.messageTypes.response.error:
          deferred.reject(utils.handleErrors(response));
          break;

        case conf.messageTypes.response.session:

          // The session closed successfully.
          deferred.resolve(true);
          break;

        default:
          deferred.reject(new Error('SessionError ' + response.header.type));
      }
    }
  });

  return deferred.promise;
};


module.exports = RexProClient;

