# Changelog

## 4.1.0

Kefir was changed from a dependency to a peer dependency to avoid the
possibility of having multiple versions of Kefir in a project.

## 3.0.0

Switched to using `infestines` instead of `ramda`.  This means that the `lift`
function has now faster, but also much more limited currying support.  Note that
you can implement `lift` with Ramda's currying with a 1-liner:

```js
const lift = fn => R.curryN(fn.length, (...xs) => K(...xs, fn))
```

## 2.0.0

Previously duplicates were skipped with Ramda's `equals`.  This is ideal in the
sense that unnecessary updates are eliminated.  Now duplicates are skipped with
Ramda's `identical`.  There are two main reasons for the change:

* Ramda's `equals` is very slow, because it uses Ramda's slow currying technique
  and because it handles arbitrary object graphs.  When either dealing with a
  large number of properties or with properties that are large objects, Ramda's
  `equals` becomes a bottleneck.

* In practise, when embedding properties to VDOM that are computed with lenses
  from a state atom, `identical` is enough to eliminate almost all unnecessary
  updates and can be implemented so that it works several orders magnitude
  faster than Ramda's `equals`.

In cases where you really want a more thorough equality check, you can
explicitly use Kefir's `skipDuplicates`.
