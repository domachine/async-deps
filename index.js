'use strict';

const map = require('map-stream');
const array = require('from');
const reduce = require('stream-reduce');
const zip = require('lodash.zip');

module.exports = createLoader;

const concat = () =>
  reduce((result, value) => result.concat([value]), []);

const runInput = (props) =>
  map((i, next) =>
    !i[0].async
      ? next(null, {
        value: i[0](props),
        cached: i[0](props) === i[1],
      })
      : i[0](props, (err, value, cached) =>
        err ? next(err) : next(null, { value, cached })
      )
  );

function createLoader() {
  const args = Array.prototype.slice.call(arguments);
  let valueCache = null;  // Cache the value of the handler
  let cache = [];         // Cache the results of the input
                          // functions

  // Mark the loader fn as async
  loader.async = true;
  return loader;

  // Produce a function that takes the props and calls the handler if any of the input values has
  // changed.  If something has changed update the cache.
  function loader(props, next) {
    // Calculate input values
    const inputs = args.slice(0, -1);

    // Calculate cache result
    array(zip(inputs, cache))
      .pipe(runInput(props))
      .on('error', result.bind(this, null))
      .pipe(concat())
      .on('data', (res) => {
        const cached = !res.length
          ? false
          : res.reduce(
            (result, r) => r.cached && result,
            true
          );

        // Return the cached value if nothing changed
        if (cached) return next(null, valueCache, true);
        const inputValues = res.map(r => r.value);

        // otherwise call the handler to calculate a new value
        const callback = result.bind(this, inputValues);
        const params = inputValues.concat([callback]);
        args.slice(-1)[0].apply(this, params);
      });

    function result(inputs, err, value) {
      if (err) return next(err);

      // Update the caches
      cache = inputs;
      valueCache = value;
      next(null, value, false);
    }
  }
}
