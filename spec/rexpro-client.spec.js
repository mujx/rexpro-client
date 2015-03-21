
// Tests for the rexpro-client

'use strict';

var RexProClient = require('../lib/rexpro_client.js');

describe('Ad-hoc queries', function() {

  beforeEach(function() {
    this.graph = process.env.GRAPH_NAME;
    this.remote_host = process.env.GRAPH_HOST;

    this.query = {
      script: "g.V.has('name', name).out()",
      bindings: {
        name: 'npm'
      }
    };

  });

  it('should produce no errors with valid parameters' , function(done) {

    var client = RexProClient({
      host: this.remote_host,
      graph: this.graph
    });

    client.execute(this.query, function(err, data) {
      expect(err).toBe(null);
      done();
    })
  });

  it("should return an exception if the graph doesn't exist", function(done) {

    var client = RexProClient({
      host: this.remote_host,
      graph: 'lol'
    });

    client.execute(this.query, function(err, data) {
      expect(err).toMatch(/^Error: GraphDoesntExist/);
      expect(data).toBeUndefined();
      done();
    });
  });

  it("should return an exception if the host isn't a Rexster server", function(done) {
    var client = RexProClient({
      host: 'localhost',
      graph: this.graph
    });

    client.execute(this.query, function(err, data) {
      expect(err).toMatch(/^Error: ECONNREFUSED/);
      expect(data).toBeUndefined();
      done();
    });
  });

  it("should return an exception if the query is not valid", function(done) {

    var client = RexProClient({
      host: this.remote_host,
      graph: this.graph
    });

    var query = {
      script: "g.N.has('name', name).out()",
      bindings: {
        name: 'npm'
      }
    };

    client.execute(query, function(err, data) {
      expect(err).toMatch(/^Error: ScriptFailure/);
      expect(data).toBeUndefined();
      done();
    });
  });

});
