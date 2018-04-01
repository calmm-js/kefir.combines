import {Observable, constant as C, constantError as E, later} from 'kefir'
import * as R from 'ramda'

import {combine, lift, lift1, lift1Shallow} from '../dist/kefir.combines.cjs'

function show(x) {
  switch (typeof x) {
    case 'string':
    case 'object':
      return JSON.stringify(x)
    default:
      return `${x}`
  }
}

const objectConstant = {x: 1}

const toExpr = f =>
  f
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/^\s*function\s*\(\s*\)\s*{\s*(return\s*)?/, '')
    .replace(/\s*;?\s*}\s*$/, '')
    .replace(/function\s*(\([a-zA-Z0-9, ]*\))\s*/g, '$1 => ')
    .replace(/\(([^),]+)\) =>/, '$1 =>')
    .replace(/{\s*return\s*([^{;]+)\s*;\s*}/g, '$1')
    .replace(/{\s*return\s*([^{;]+)\s*;\s*}/g, '$1')
    .replace(/\(0, [^.]*[.]([^)]*)\)/g, '$1')

const testEq = (expect, thunk) =>
  it(`${toExpr(thunk)} => ${show(expect)}`, done => {
    const actual = thunk()
    function check(actual) {
      if (!R.equals(actual, expect))
        throw new Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
      done()
    }
    if (actual instanceof Observable) {
      actual.take(1).observe({value: check, error: check})
    } else {
      check(actual)
    }
  })

describe('combine', () => {
  testEq([], () => combine())

  testEq(['a'], () => combine('a'))
  testEq(['a'], () => combine(C('a')))

  testEq(['a', 'b'], () => combine('a', 'b'))
  testEq(['a', 'b'], () => combine('a', C('b')))
  testEq(['a', 'b'], () => combine(C('a'), 'b'))
  testEq(['a', 'b'], () => combine(later(10, 'a'), later(2, 'b')))

  testEq('aa', () => combine('a', x => x + x))
  testEq('aa', () => combine(C('a'), x => x + x))
  testEq('aa', () => combine(later(1, 'a'), x => x + x))
  testEq('aa', () => combine(C('a'), C(x => x + x)))

  testEq([4, 1, {y: {z: 'x'}}, 3], () =>
    combine([1, {y: {z: C('x')}}, C(3)], R.prepend(4))
  )

  testEq('e', () => combine(E('e')))
  testEq('e', () => combine(E('e'), x => x + x))
  testEq('e', () => combine(C('f'), E('e')))

  testEq(true, () =>
    combine(
      objectConstant,
      C(objectConstant),
      (o1, o2) => objectConstant === o1 && objectConstant === o2
    )
  )
})

describe('lift1', () => {
  testEq(3, () => lift1(R.add(1))(2))
  testEq(3, () => lift1(R.add(1))(C(2)))
  testEq([2, 3, 4], () => lift1(R.map(R.add(1)))([1, C(2), 3]))
  testEq([2, 3, 4], () => lift1(R.map(R.add(1)))([C(1), 2, C(3)]))
})

describe('lift1Shallow', () => {
  testEq(3, () => lift1Shallow(R.add(1))(2))
})

describe('lift', () => {
  testEq(42, () => lift(() => 42)())
  testEq(3, () => lift(R.add(1))(2))
  testEq(5, () => lift(R.add)(2, 3))
  testEq(5, () => lift(R.add)(2)(C(3)))
  testEq(5, () => lift(R.add)(C(3), 2))
  testEq([2, 3, 4], () => lift(R.map)(C(R.add(1)), [C(1), 2, C(3)]))
})
