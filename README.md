[![npm version](https://badge.fury.io/js/kefir.combines.svg)](http://badge.fury.io/js/kefir.combines) [![Build Status](https://travis-ci.org/calmm-js/kefir.combines.svg?branch=master)](https://travis-ci.org/calmm-js/kefir.combines) [![](https://david-dm.org/calmm-js/kefir.combines.svg)](https://david-dm.org/calmm-js/kefir.combines) [![](https://david-dm.org/calmm-js/kefir.combines/dev-status.svg)](https://david-dm.org/calmm-js/kefir.combines?type=dev)

The default import of this library

```js
import K from "kefir.combines"
```

is a special purpose [Kefir](http://rpominov.github.io/kefir/) observable
combinator designed for combining properties for a sink that accepts both
observables and constant values such as VDOM extended to accept observables.

Unlike typical observable combinators, when `K` is invoked with only constants
(no observables), then the result is computed immediately and returned as a
plain value.  This optimization eliminates redundant observables.

The basic semantics of `K` can be described as

```js
K(x1, ..., xN, fn) === combine([x1, ..., xN], fn).skipDuplicates(equals)
```

where [`combine`](http://rpominov.github.io/kefir/#combine)
and [`skipDuplicates`](http://rpominov.github.io/kefir/#skip-duplicates) come
from Kefir and [`equals`](http://ramdajs.com/docs/#equals)
from [Ramda](http://ramdajs.com/).  Duplicates are skipped, because that can
reduce unnecessary updates.  Ramda's `equals` provides a semantics of equality
that works well with immutable data.

Unlike with [`combine`](http://rpominov.github.io/kefir/#combine), any argument
of `K` is allowed to be
* a constant,
* an observable (including the combiner function), or
* an array or object containing observables.

In other words, `K` also provides functionality similar
to
[`combineTemplate`](https://github.com/baconjs/bacon.js#bacon-combinetemplate).

Note: `K` is carefully optimized for space&mdash;if you write equivalent
combinations using Kefir's own operators, they will likely take more memory.
