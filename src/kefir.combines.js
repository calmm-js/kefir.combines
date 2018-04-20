import {Observable, Property} from 'kefir'
import * as I from 'infestines'

//

const isObservable = x => x instanceof Observable

function forEach(template, fn) {
  if (isObservable(template)) fn(template)
  else if (I.isArray(template))
    for (let i = 0, n = template.length; i < n; ++i) forEach(template[i], fn)
  else if (I.isObject(template))
    for (const k in template) forEach(template[k], fn)
}

function countArray(template) {
  let c = 0
  for (let i = 0, n = template.length; i < n; ++i) c += count(template[i])
  return c
}

function countObject(template) {
  let c = 0
  for (const k in template) c += count(template[k])
  return c
}

function countTemplate(template) {
  if (I.isArray(template)) return countArray(template)
  else if (I.isObject(template)) return countObject(template)
  else return 0
}

function count(template) {
  if (isObservable(template)) return 1
  else return countTemplate(template)
}

function combine(template, values, state) {
  if (isObservable(template)) {
    return values[++state.index]
  } else if (I.isArray(template)) {
    const n = template.length
    let next = template
    for (let i = 0; i < n; ++i) {
      const v = combine(template[i], values, state)
      if (!I.identicalU(next[i], v)) {
        if (next === template) next = template.slice(0)
        next[i] = v
      }
    }
    return next
  } else if (I.isObject(template)) {
    let next = template
    for (const k in template) {
      const v = combine(template[k], values, state)
      if (!I.identicalU(next[k], v)) {
        if (next === template) next = I.assocPartialU(void 0, void 0, template) // Avoid Object.assign
        next[k] = v
      }
    }
    return next
  } else {
    return template
  }
}

function invoke(xs) {
  if (!I.isArray(xs)) return xs

  const nm1 = xs.length - 1
  const f = xs[nm1]
  return I.isFunction(f) ? f.apply(null, xs.slice(0, nm1)) : xs
}

function subscribe(self) {
  let index = -1
  forEach(self._template, observable => {
    const handler = e => {
      const handlers = self._handlers
      let i = 0
      while (handlers[i] !== handler) ++i
      switch (e.type) {
        case 'value': {
          const values = self._values
          values[i] = e.value
          for (let j = 0, n = values.length; j < n; ++j)
            if (values[j] === self) return
          const template = self._template
          maybeEmitValue(self, invoke(combine(template, values, {index: -1})))
          break
        }
        case 'error': {
          self._emitError(e.value)
          break
        }
        default: {
          handlers[i] = null
          for (let j = 0, n = handlers.length; j < n; ++j)
            if (handlers[j]) return
          self._handlers = handlers.length
          self._values = null
          self._emitEnd()
          break
        }
      }
    }
    self._handlers[++index] = handler
    observable.onAny(handler)
  })
}

function unsubscribe(template, handlers) {
  let index = -1
  forEach(template, observable => {
    const handler = handlers[++index]
    if (handler) observable.offAny(handler)
  })
}

//

function maybeEmitValue(self, next) {
  const prev = self._currentEvent
  if (!prev || !I.identicalU(prev.value, next) || prev.type !== 'value')
    self._emitValue(next)
}

//

const CombineMany = I.inherit(
  function CombineMany(template, n) {
    Property.call(this)
    this._template = template
    this._handlers = n
    this._values = null
  },
  Property,
  {
    _onActivation() {
      const n = this._handlers
      const handlers = Array(n)
      const values = Array(n)
      for (let i = 0; i < n; ++i) {
        values[i] = this
        handlers[i] = this
      }
      this._handlers = handlers
      this._values = values
      subscribe(this)
    },
    _onDeactivation() {
      const handlers = this._handlers
      this._handlers = handlers.length
      this._values = null
      unsubscribe(this._template, handlers)
    }
  }
)

//

const CombineOne = I.inherit(
  function CombineOne(template) {
    Property.call(this)
    this._template = template
    this._handler = null
  },
  Property,
  {
    _onActivation() {
      const handler = e => {
        switch (e.type) {
          case 'value': {
            const template = this._template
            maybeEmitValue(
              this,
              invoke(combine(template, [e.value], {index: -1}))
            )
            break
          }
          case 'error':
            this._emitError(e.value)
            break
          default:
            this._handler = null
            this._emitEnd()
            break
        }
      }
      this._handler = handler
      forEach(this._template, observable => observable.onAny(handler))
    },
    _onDeactivation() {
      const {_handler} = this
      this._handler = null
      forEach(this._template, observable => observable.offAny(_handler))
    }
  }
)

//

const CombineOneWith = I.inherit(
  function CombineOneWith(observable, fn) {
    Property.call(this)
    this._observable = observable
    this._fn = fn
    this._handler = null
  },
  Property,
  {
    _onActivation() {
      const handler = e => {
        switch (e.type) {
          case 'value':
            maybeEmitValue(this, (0, this._fn)(e.value))
            break
          case 'error':
            this._emitError(e.value)
            break
          default:
            this._handler = null
            this._emitEnd()
            break
        }
      }
      this._handler = handler
      this._observable.onAny(handler)
    },
    _onDeactivation() {
      const {_handler, _observable} = this
      this._handler = null
      _observable.offAny(_handler)
    }
  }
)

//

export const lift1Shallow = fn => x =>
  isObservable(x) ? new CombineOneWith(x, fn) : fn(x)

export const lift1 = fn => x => {
  if (isObservable(x)) return new CombineOneWith(x, fn)
  const n = countTemplate(x)
  if (0 === n) return fn(x)
  if (1 === n) return new CombineOne([x, fn])
  return new CombineMany([x, fn], n)
}

export function lift(fn) {
  const fnN = fn.length
  switch (fnN) {
    case 0:
      return fn
    case 1:
      return lift1(fn)
    default:
      return I.arityN(fnN, function() {
        const xsN = arguments.length
        const xs = Array(xsN)
        for (let i = 0; i < xsN; ++i) xs[i] = arguments[i]
        const n = countArray(xs)
        if (0 === n) return fn.apply(null, xs)
        xs.push(fn)
        if (1 === n) new CombineOne(xs)
        return new CombineMany(xs, n)
      })
  }
}

function combinesArray(template) {
  const n = countArray(template)
  switch (n) {
    case 0:
      return invoke(template)
    case 1:
      return template.length === 2 &&
        isObservable(template[0]) &&
        I.isFunction(template[1])
        ? new CombineOneWith(template[0], template[1])
        : new CombineOne(template)
    default:
      return new CombineMany(template, n)
  }
}

export const combines = (...template) => combinesArray(template)

function liftRecHelper() {
  const n = arguments.length
  const xs = Array(n + 1)
  for (let i = 0; i < n; ++i) xs[i] = arguments[i]
  xs[n] = this
  return liftRec(combinesArray(xs))
}

export function liftRec(f) {
  if (I.isFunction(f)) {
    switch (f.length) {
      case 0:
        return function() {
          return liftRecHelper.apply(f, arguments)
        }
      case 1:
        return function(_1) {
          return liftRecHelper.apply(f, arguments)
        }
      case 2:
        return function(_1, _2) {
          return liftRecHelper.apply(f, arguments)
        }
      case 3:
        return function(_1, _2, _3) {
          return liftRecHelper.apply(f, arguments)
        }
      case 4:
        return function(_1, _2, _3, _4) {
          return liftRecHelper.apply(f, arguments)
        }
      default:
        return liftRecFail(f)
    }
  } else if (isObservable(f)) {
    return combines(f, liftRec)
  } else {
    return f
  }
}

function liftRecFail(f) {
  throw Error(`Arity of ${f} unsupported`)
}

export default combines
