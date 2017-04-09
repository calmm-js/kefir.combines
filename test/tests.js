import * as Kefir from "kefir"
import * as R     from "ramda"

import K, * as C  from "../dist/kefir.combines.cjs"

function show(x) {
  switch (typeof x) {
    case "string":
    case "object":
      return JSON.stringify(x)
    default:
      return `${x}`
  }
}

const objectConstant = {x: 1}

const testEq = (exprIn, expect) => {
  const expr = exprIn.replace(/[ \n]+/g, " ")
  it(`${expr} => ${show(expect)}`, done => {
    const actual = eval(`(C, K, Kefir, R, objectConstant) => ${expr}`)(
                          C, K, Kefir, R, objectConstant)
    const check = actual => {
      if (!R.equals(actual, expect))
        throw new Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
      done()
    }
    if (actual instanceof Kefir.Observable)
      actual.take(1).observe({value: check, error: check})
    else
      check(actual)
  })
}

describe("K", () => {
  testEq(`K()`, [])

  testEq(`K("a")`, ["a"])
  testEq(`K(Kefir.constant("a"))`, ["a"])

  testEq(`K("a", "b")`, ["a", "b"])
  testEq(`K("a", Kefir.constant("b"))`, ["a", "b"])
  testEq(`K(Kefir.constant("a"), "b")`, ["a", "b"])
  testEq(`K(Kefir.later(10,"a"), Kefir.later(2,"b"))`, ["a", "b"])

  testEq(`K("a", x => x + x)`, "aa")
  testEq(`K(Kefir.constant("a"), x => x + x)`, "aa")
  testEq(`K(Kefir.later(1,"a"), x => x + x)`, "aa")
  testEq(`K(Kefir.constant("a"), Kefir.constant(x => x + x))`, "aa")

  testEq(`K([1, {y: {z: Kefir.constant("x")}}, Kefir.constant(3)],
            R.prepend(4))`,
         [4, 1, {y: {z: "x"}}, 3])

  testEq(`K(Kefir.constantError("e"))`, "e")
  testEq(`K(Kefir.constantError("e"), x => x + x)`, "e")
  testEq(`K(Kefir.constant("f"), Kefir.constantError("e"))`, "e")

  testEq(`K(objectConstant,
            Kefir.constant(objectConstant),
            (o1, o2) => objectConstant === o1
                     && objectConstant === o2)`,
         true)
})

describe("lift1", () => {
  testEq(`C.lift1(R.add(1))(2)`, 3)
  testEq(`C.lift1(R.add(1))(Kefir.constant(2))`, 3)
  testEq(`C.lift1(R.map(R.add(1)))([1,Kefir.constant(2),3])`, [2,3,4])
  testEq(`C.lift1(R.map(R.add(1)))([Kefir.constant(1),2,Kefir.constant(3)])`,
         [2,3,4])
})

describe("lift1Shallow", () => {
  testEq(`C.lift1Shallow(R.add(1))(2)`, 3)
})

describe("lift", () => {
  testEq(`C.lift(() => 42)()`, 42)
  testEq(`C.lift(R.add(1))(2)`, 3)
  testEq(`C.lift(R.add)(2, 3)`, 5)
  testEq(`C.lift(R.add)(2)(Kefir.constant(3))`, 5)
  testEq(`C.lift(R.add)(Kefir.constant(3), 2)`, 5)
  testEq(`C.lift(R.map)(Kefir.constant(R.add(1)),
                        [Kefir.constant(1),2,Kefir.constant(3)])`,
         [2,3,4])
})
