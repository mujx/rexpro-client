
// Tests for the rexpro-client

'use strict';

var RexProClient = require('../lib/rexpro_client.js');

describe('Ad-hoc queries', function() {

  beforeEach(function() {
    this.graph = process.env.GRAPH_NAME;
    this.remoteHost = process.env.GRAPH_HOST;

    this.query = {
      script: 'g.V.has("name", name)',
      bindings: {
        name: 'npm'
      }
    };

  });

  it('should produce no errors with valid parameters[json]' , function(done) {

    var client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    client.execute(this.query)
    .then(function (data) {
      expect(data[0]._properties.name).toBe('npm');
      done();
    }, function(error) {
      expect(err).toBe(null);
      done();
    })
    .done();
  });

  it('should produce no errors with valid parameters[msgpack]', function(done) {

    var client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph,
      serializer: 'msgpack'
    });

    client.execute(this.query)
    .then(function(data) {
      expect(data[0]._properties.name).toBe('npm');
      done();
    }, function(err) {
      expect(err).toBe(null);
      done();
    })
    .done();
  });


  it('should return an exception if the graph doesnt exist', function(done) {

    var client = new RexProClient({
      host: this.remoteHost,
      graph: 'lol'
    });

    client.execute(this.query)
    .then(function(data) {
      expect(data).toBeUndefined();
      done();
    }, function(err) {
      expect(err).toMatch(/^Error: GraphDoesntExist/);
      done();
    })
    .done();
  });

  it('should return an exception if the host isnt a Rexster server', function(done) {
    var client = new RexProClient({
      host: 'localhost',
      graph: this.graph
    });

    client.execute(this.query)
    .then(function(data) {
      expect(data).toBeUndefined();
      done();
    }, function(err) {
      expect(err).toMatch(/^Error: connect ECONNREFUSED/);
      done();
    })
    .done();
  });

  it('should return an exception if the query is not valid', function(done) {

    var client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    var query = {
      script: 'g.N.has("name", name).out()',
      bindings: {
        name: 'npm'
      }
    };

    client.execute(query)
    .then(function(data) {
      expect(data).toBeUndefined();
      done();
    }, function(err) {
      expect(err).toMatch(/^Error: ScriptFailure/);
      done();
    })
    .done();
  });
});

describe('In session queries', function() {

  beforeEach(function() {
    this.graph = process.env.GRAPH_NAME;
    this.remoteHost = process.env.GRAPH_HOST;

    this.client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    this.query = {
      script: 'g.V.has("name", name).out()',
      bindings: {
        name: 'npm'
      }
    };

  });

  it('should be able to open a session', function(done) {

    var sessionInfo = {
      name: 'testing'
    };

    var UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    this.client.openSession(sessionInfo)
    .then(function(uuid) {
      expect(uuid).toMatch(UUID);
      done();
    }, function(err) {
      expect(err).toBe(null);
      done();
    })
    .done();
  });

  xit('should be able to open a session using authentication' , function() {

    var sessionInfo = {
      name: 'testing',
      username: 'user',
      password: 'user1234'
    };

    this.client.openSession(sessionInfo);

    expect(this.client.session('testing')).not.toBeUndefined();

  });

  xit('should be able to close a session', function() {

    var sessionInfo = {
      name: 'testing',
    };

    this.client.openSession(sessionInfo);

    expect(this.client.session('testing')).not.toBeUndefined();

    this.client.closeSession(sessionInfo);

    expect(this.client.session('testing')).toBeUndefined();

  });

  xit('should be albe to execute a query within a session', function() {

    var sessionInfo = {
      name: 'testing',
    };

    this.client.openSession(sessionInfo);

    expect(this.client.session('testing')).not.toBeUndefined();

    this.client
        .session('testing')
        .execute(this.query, function(err, data) {

      expect(err).toBe(null);
      expect(data).not.toBeUndefined();
    });

  });

  xit('should be able to choose different sessions', function() {

    var sessionInfo = {
      name: 'test1'
    };

    this.client.openSession(sessionInfo);

    expect(this.client.session('test1')).not.toBeUndefined();

    var sessionInfo = {
      name: 'test2'
    };

    this.client.openSession(sessionInfo);

    expect(this.client.session('test2')).not.toBeUndefined();

    expect(this.client.session('test1')).not.toBeUndefined();

  });

});
