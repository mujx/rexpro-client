
// Tests for the rexpro-client

'use strict';

var RexProClient = require('../lib/rexpro_client.js');

describe('Ad-hoc queries', function() {

  beforeEach(function() {
    this.graph = 'graph';
    this.remoteHost = 'localhost';

    this.query = {
      script: 'g.V.has("name", name)',
      bindings: {
        name: 'saturn'
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
      expect(data[0]._properties.name).toBe('saturn');
      done();
    })
    .catch(function(err) {
      done(err);
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
      expect(data[0]._properties.name).toBe('saturn');
      done();
    })
    .catch(function(err) {
      done(err);
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

  it('should return an exception if the query is not valid', function(done) {

    var client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    var query = {
      script: 'g.N.has("name", name).out()',
      bindings: {
        name: 'saturn'
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
    this.graph = 'graph';
    this.remoteHost = 'localhost';

    this.UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    this.client = new RexProClient({
      host: this.remoteHost,
      graph: this.graph
    });

    this.query = {
      script: 'g.V.has("name", name)',
      bindings: {
        name: 'saturn'
      }
    };

  });

  it('should be able to open a session [json]', function(done) {

    var _this = this;

    this.client.openSession()
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      done();
    })
    .catch(function(err) {
      done(err);
    })
    .done();
  });

  it('should be able to open a session [msgpack]', function(done) {

    var _this = this;

    this.client.openSession({serializer: 'msgpack'})
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      done();
    })
    .catch(function(err) {
      done(err);
    })
    .done();
  });

  it('should be able to execute queries with authentication [json]' , function(done) {

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
      expect(data[0]).toBe('saturn');
      return _this.client.closeSession(_this.query);
    })
    .then(function(response) {
      expect(response).toBeTruthy();
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should be able to execute queries with authentication [msgpack]' , function(done) {

    // If the authentication isn't turned on, it falls back to an
    // unauthenticated session.
    var sessionInfo = {
      username: 'rexster',
      password: 'rexster',
      serializer: 'msgpack'
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
      expect(data[0]).toBe('saturn');
      return _this.client.closeSession(_this.query);
    })
    .then(function(response) {
      expect(response).toBeTruthy();
      done();
    })
    .catch(function(err) {
      done(err);
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
      expect(data[0]._properties.name).toBe('saturn');
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
        name: 'saturn',
        another: 'hydra'
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
      expect(data[0]._properties.name).toBe('saturn');
      q2.session = _this.currentUUID;
      return _this.client.execute(q2);
    })
    .then(function(data) {
      expect(data[0]._properties.name).toBe('hydra');
      done();
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
      done();
    })
    .done();

  });

  it('should be able to switch between sessions', function(done) {

    var _this = this;

    _this.session1 = '';
    _this.session2 = '';

    _this.q1 = {
      script: 'g.V.has("name", q1).name',
      bindings: {
        q1: 'saturn'
      }
    };
    _this.q2 = {
      script: 'g.V.has("name", q2).name',
      bindings: {
        q2: 'hercules'
      }
    };

    this.client.openSession()

    // Open a session and store the UUID.
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      _this.session1 = uuid;
      _this.q1.session = _this.session1;
      return _this.client.openSession();
    })

    // Open another session and store the new UUID.
    .then(function(uuid) {
      expect(uuid).toMatch(_this.UUID);
      _this.session2 = uuid;
      _this.q2.session = _this.session2;
      return _this.client.execute(_this.q1);
    })

    // Make a query on the first session with some bindings
    .then(function(data) {
      expect(data[0]).toBe('saturn');
      _this.q1.script = 'g.V.has("name", q1).name';
      _this.q1.bindings = {};
      return _this.client.execute(_this.q1);
    })

    // Make a query on the first using the bindngs.
    .then(function(data) {
      expect(data[0]).toBe('saturn');
      return _this.client.execute(_this.q2);
    })

    // Make a query on the second session with some other bindings.
    .then(function(data) {
      expect(data[0]).toBe('hercules');
      _this.q1.script = 'g.V.has("name", q2).name';
      _this.q1.bindings = {};
      return _this.client.execute(_this.q2);
    })

    // Make a query on the second session using the bindings.
    .then(function(data) {
      expect(data[0]).toBe('hercules');
      return _this.client.execute(_this.q2);
    })

    // Make a query again on the first session using the bindings
    // from the first session.
    .then(function(data) {
      expect(data[0]).toBe('hercules');
      return _this.client.closeSession({
        session: _this.session1
      });
    })

    // Close the first session.
    .then(function(response) {
      expect(response).toBeTruthy();
      return _this.client.closeSession({
        session: _this.session2
      });
    })

    // Close the second session.
    .then(function(response) {
      expect(response).toBeTruthy();
      done();
    })

    // Catch all the errors.
    .catch(function(err) {
      done(err);
    })
    .done();
  });
});
