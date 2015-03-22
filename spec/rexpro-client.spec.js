
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
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
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
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
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
    })
    .catch(function(err) {
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
    })
    .catch(function(err) {
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
    })
    .catch(function(err) {
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

    this.UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    this.client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    this.query = {
      script: 'g.V.has("name", name)',
      bindings: {
        name: 'npm'
      }
    };

  });

  it('should be able to open a session', function(done) {

    var _this = this;

    this.client.openSession()
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      done();
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
      done();
    })
    .done();
  });

  it('should be able to execute queries with authentication' , function(done) {

    // If the authentication isn't turned on, it falls back to an
    // unauthenticated session.
    var sessionInfo = {
      username: 'rexster',
      password: 'rexster'
    };

    var _this = this;

    this.client.openSession(sessionInfo)
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      _this.query.session = uuid;
      _this.query.console = true;
      _this.query.script = 'g.V.has("name", name).name';
      return _this.client.execute(_this.query);
    })
    .then(function(data) {
      expect(data[0]).toBe('npm');
      return _this.client.closeSession(_this.query);
    })
    .then(function(response) {
      expect(response).toBeTruthy();
      done();
    })
    .catch(function(err) {
      expect(err).toBeUndefined()
      done();
    });
  });

  it('should be able to close a session', function(done) {

    var _this = this;

    var q1 = {
      script: 'g.V.has("name", name)',
    };

    this.client.openSession()
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      _this.currentUUID = uuid;
      _this.query.session = uuid;
      return _this.client.execute(_this.query);
    })
    .then(function(data) {
      expect(data[0]._properties.name).toBe('npm');
      var q2 = {
        session: _this.currentUUID
      };
      return _this.client.closeSession(q2);
    })
    .then(function(response) {
      expect(response).toBeTruthy();
      // Should fail because the session no longer exists.
      q1.session = _this.currentUUID;
      return _this.client.execute(q1);
    })
    .catch(function(err) {
      expect(err).toMatch(/^Error: SessionDoesntExist/);
      done();
    })
    .done();

  });

  it('should be albe to execute a query within a session', function(done) {

    var _this = this;

    var q1 = {
      script: 'g.V.has("name", name)',
      bindings: {
        name: 'npm',
        another: 'bower'
      }
    };

    var q2 = {
      script: 'g.V.has("name", another)',
    };


    this.client.openSession()
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      _this.currentUUID = uuid;
      q1.session = uuid;
      return _this.client.execute(q1);
    })
    .then(function(data) {
      expect(data[0]._properties.name).toBe('npm');
      q2.session = _this.currentUUID;
      return _this.client.execute(q2);
    })
    .then(function(data) {
      expect(data[0]._properties.name).toBe('bower');
      done();
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
      done();
    })
    .done();

  });
});
