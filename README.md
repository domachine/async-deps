# async-props

[![Build Status](https://travis-ci.org/domachine/async-deps.svg?branch=master)](https://travis-ci.org/domachine/async-deps)
[![Coverage Status](https://coveralls.io/repos/github/domachine/async-deps/badge.svg?branch=master)](https://coveralls.io/github/domachine/async-deps?branch=master)

A javascript module to load and cache asynchronous dependencies.

## Usage

```js
const customerLoader = createLoader(
  (props) => props.customer,
  (id, next) => {
    console.log('Loading ...');
    fetchCustomer(id, (err, customer) => {
      if (err) return next(err);
      next(null, { customer });
    });
  }
);

const props = { customer: '1' };
customerLoader(props, (err, state) => {  // => "Loading ..."
  // ...

  loadSecondTime();
});

function loadSecondTime() {
  customerLoader(props, (err, state) => {
    // The asynchronous function to fetch the customer
    // isn't called again.  Instead the previous cached value
    // is used.  Therefore is `state` the same object as
    // before.
  });
}

function loadWithDifferentProps() {
  props.customer = '2';
  customerLoader(props, (err, state) => {  // => "Loading ..."
    // Since the id in the props changed, the function is
    // called again.
  });
}
```

## Tests

    $ npm test
