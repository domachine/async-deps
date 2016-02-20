'use strict';

module.exports = createLoader;

const runInput = (i, args, next) =>
  !i[0].async
    ? next(null, (value => ({ value, cached: value === i[1] }))(
      i[0].apply(undefined, args)
    ))
    : i[0].apply(undefined, args.concat([(err, value, cached) =>
      err ? next(err) : next(null, { value, cached })
    ]));

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
  function loader() {
    const inputArgs = Array.prototype.slice.call(arguments, 0, -1);
    const next = Array.prototype.slice.call(arguments, -1)[0];

    // Calculate cache result
    runInputs(args.slice(0, -1), 0, []);

    function runInputs(inputFns, i, res) {
      const inputFn = inputFns[0];
      if (!inputFn) return runHandler(res);
      runInput([inputFn, cache[i]], inputArgs, nextInput);

      function nextInput(err, r) {
        if (err) return next(err);
        runInputs(inputFns.slice(1), i + 1, res.concat([r]));
      }
    }

    function runHandler(res) {
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
      const callback = result.bind(undefined, inputValues);
      const params = inputValues.concat([callback]);
      args.slice(-1)[0].apply(undefined, params);
    }

    function result(inputs, err, value) {
      if (err) return next(err);

      // Update the caches
      cache = inputs;
      valueCache = value;
      next(null, value, false);
    }
  }
}
