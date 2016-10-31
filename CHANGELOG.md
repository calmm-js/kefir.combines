# Changelog

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
