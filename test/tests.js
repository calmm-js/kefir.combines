import {Observable, constant as C, constantError as E, later} from 'kefir'
import * as R from 'ramda'

import {
  combines,
  lift,
  lift1,
  lift1Shallow,
  liftRec
} from '../dist/kefir.combines.cjs'

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

describe('combines', () => {
  testEq([], () => combines())

  testEq(['a'], () => combines('a'))
  testEq(['a'], () => combines(C('a')))

  testEq(['a', 'b'], () => combines('a', 'b'))
  testEq(['a', 'b'], () => combines('a', C('b')))
  testEq(['a', 'b'], () => combines(C('a'), 'b'))
  testEq(['a', 'b'], () => combines(later(10, 'a'), later(2, 'b')))

  testEq('aa', () => combines('a', x => x + x))
  testEq('aa', () => combines(C('a'), x => x + x))
  testEq('aa', () => combines(later(1, 'a'), x => x + x))
  testEq('aa', () => combines(C('a'), C(x => x + x)))

  testEq([4, 1, {y: {z: 'x'}}, 3], () =>
    combines([1, {y: {z: C('x')}}, C(3)], R.prepend(4))
  )

  testEq('e', () => combines(E('e')))
  testEq('e', () => combines(E('e'), x => x + x))
  testEq('e', () => combines(C('f'), E('e')))

  testEq(true, () =>
    combines(
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

describe('liftRec', () => {
  const __ = liftRec(R.__)
  const add = liftRec(R.add)
  const append = liftRec(R.append)
  const apply = liftRec(R.apply)
  const compose = liftRec(R.compose)
  const equals = liftRec(R.equals)
  const filter = liftRec(R.filter)
  const flip = liftRec(R.flip)
  const gt = liftRec(R.gt)
  const modulo = liftRec(R.modulo)
  const pipe = liftRec(R.pipe)
  const propEq = liftRec(R.propEq)
  const range = liftRec(R.range)
  const take = liftRec(R.take)
  const transduce = liftRec(R.transduce)

  testEq(3, () => add(1)(C(2)))
  testEq(3, () => add(C(1), C(2)))

  testEq(-1, () => pipe(x => x - 1, x => -x)(C(2)))
  testEq(-1, () => apply(pipe(add(C(-1)), x => -x), [C(2)]))
  testEq(-1, () => apply(pipe(add(__, C(-1)), x => -x), [C(2)]))

  testEq([1, 1], () => filter(gt(C(2)), C([3, 1, 4, 1])))
  testEq([3, 4], () => filter(gt(__, C(2)), C([3, 1, 4, 1])))

  testEq(true, () => propEq(C('x'), 10, {x: 10}))

  testEq([1, 3, 5], () =>
    transduce(
      compose(filter(pipe(modulo(__, C(2)), equals(C(1)))), take(C(3))),
      flip(append),
      C([]),
      range(0, C(100))
    )
  )

  it('Throws on unsupported arity', () => {
    let raised
    try {
      liftRec((_1, _2, _3, _4, _5) => {})
      raised = false
    } catch (e) {
      raised = true
    }
    if (!raised) throw Error('Expected to throw')
  })
})
