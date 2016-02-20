'use strict';

const tap = require('tap');
const stub = require('sinon').stub;

const createLoader = require('.');

tap.test('creates a function for all allowed args', (t) => {
  t.plan(1);
  const fn = createLoader(
    () => ({}),
    () => ({})
  );
  t.equal(typeof fn, 'function');
  t.end();
});

tap.test('calls the handler once for two equal calls', (t) => {
  t.plan(10);
  const value = { _value: 1 };
  const handler = stub().callsArgWith(2, null, value);
  const props = { query: { id: '2' } };
  const fn = createLoader(
    p => {
      t.equal(p, props);
      return p.query.id;
    },
    p => {
      t.equal(p, props);
      return 3;  // Just a constant value
    },
    handler
  );

  fn(props, test1);

  function test1(err, v, cached) {
    t.equal(v, value);
    t.equal(cached, false);
    fn(props, test2);
  }

  function test2(err, v, cached) {
    t.equal(v, value);
    t.equal(cached, true);
    t.ok(handler.calledOnce);
    t.deepEqual(handler.args[0].slice(0, 2), [props.query.id, 3]);
    t.end();
  }
});

tap.test('calls the handler twice for two different calls', (t) => {
  t.plan(7);
  const value = { _value: 1 };
  const handler = stub().callsArgWith(2, null, value);
  const props = { query: { id: '2' } };
  const props2 = { query: { id: '1' } };
  const fn = createLoader(
    p => p.query.id,
    () => 3,  // Just a constant value
    handler
  );

  fn(props, test1);

  function test1(err, v, cached) {
    t.equal(v, value);
    t.equal(cached, false);
    fn(props2, test2);
  }

  function test2(err, v, cached) {
    t.equal(v, value);
    t.equal(cached, false);
    t.ok(handler.calledTwice);
    t.deepEqual(handler.args[0].slice(0, 2), [props.query.id, 3]);
    t.deepEqual(handler.args[1].slice(0, 2), [props2.query.id, 3]);
    t.end();
  }
});

tap.test('takes loader as input', (t) => {
  t.plan(4);
  const props = { params: { id: '1' } };
  const res = { _res: 1 };
  const inputLoader = createLoader(
    props => props.params.id,
    (id, next) => {
      next(null, { _object: 1 });
    }
  );
  const loader = createLoader(
    props => props.params.id,
    inputLoader,
    (id, object, next) => {
      t.equal(id, props.params.id);
      t.deepEqual(object, { _object: 1 });
      next(null, res);
    }
  );
  loader(props, test);

  function test(err, v) {
    t.ok(err == null);
    t.equal(v, res);
    t.end();
  }
});

tap.test('use input loader cache (call once)', (t) => {
  t.plan(6);
  const props = { params: { id: '1' } };
  const value = { _value: 1 };
  const handler = stub().callsArgWith(1, null, value);
  const inputLoader = createLoader(
    props => props.params.id,
    (id, next) => {
      next(null, { _object: 1 });
    }
  );
  const loader = createLoader(inputLoader, handler);
  loader(props, test);

  function test(err, v) {
    t.ok(err == null);
    t.equal(v, value);
    loader(props, test2);
  }

  function test2(err, v) {
    t.ok(err == null);
    t.equal(v, value);
    t.ok(handler.calledOnce);
    t.deepEqual(handler.args[0][0], { _object: 1 });
    t.end();
  }
});

tap.test('use input loader cache (call twice)', (t) => {
  t.plan(7);
  const props = { params: { id: '1' } };
  const props2 = { params: { id: '2' } };
  const value = { _value: 1 };
  const handler = stub().callsArgWith(1, null, value);
  const inputLoader = createLoader(
    props => props.params.id,
    (id, next) => {
      next(null, { _object: id });
    }
  );
  const loader = createLoader(inputLoader, handler);
  loader(props, test);

  function test(err, v) {
    t.ok(err == null);
    t.equal(v, value);
    loader(props2, test2);
  }

  function test2(err, v) {
    t.ok(err == null);
    t.equal(v, value);
    t.ok(handler.calledTwice);
    t.deepEqual(handler.args[0][0], { _object: '1' });
    t.deepEqual(handler.args[1][0], { _object: '2' });
    t.end();
  }
});

tap.test('propagates error', (t) => {
  t.plan(1);
  const error = new Error();
  const loader = createLoader(
    (next) => { next(error); }
  );
  loader({}, next);

  function next(err) {
    t.equal(err, error);
    t.end();
  }
});

tap.test('propagates error of input', (t) => {
  t.plan(1);
  const error = new Error();
  const inputLoader = createLoader(
    (next) => { next(error); }
  );
  const loader = createLoader(
    inputLoader,
    (one, next) => { next(null, 1); }
  );
  loader({}, next);

  function next(err) {
    t.equal(err, error);
    t.end();
  }
});

tap.test('takes generic arguments', (t) => {
  const i = 3;
  const args = [{ _props: 1 }, { _state: 1 }];
  const inputStub = stub().returns(i);
  const output = 42;
  const outputStub = stub().callsArgWith(2, null, 42);
  const loader = createLoader(
    inputStub,
    inputStub,
    outputStub
  );

  loader.apply(undefined, args.concat([test]));

  function test(err, v) {
    t.equal(v, output);
    t.ok(inputStub.calledTwice);
    t.deepEqual(inputStub.args[0], args);
    t.deepEqual(inputStub.args[1], args);
    t.ok(outputStub.calledOnce);
    t.deepEqual(outputStub.args[0].slice(0, 2), [i, i]);
    t.equal(typeof outputStub.args[0][2], 'function');
    t.end();
  }
});
