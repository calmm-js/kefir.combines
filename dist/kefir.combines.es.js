import { Observable, Property } from 'kefir';
import { arityN, assocPartialU, identicalU, inherit, isArray, isObject } from 'infestines';

//

function forEach(template, fn) {
  if (template instanceof Observable) fn(template);else if (isArray(template)) for (var i = 0, n = template.length; i < n; ++i) {
    forEach(template[i], fn);
  } else if (isObject(template)) for (var k in template) {
    forEach(template[k], fn);
  }
}

function countArray(template) {
  var c = 0;
  for (var i = 0, n = template.length; i < n; ++i) {
    c += count(template[i]);
  }return c;
}

function countObject(template) {
  var c = 0;
  for (var k in template) {
    c += count(template[k]);
  }return c;
}

function countTemplate(template) {
  if (isArray(template)) return countArray(template);else if (isObject(template)) return countObject(template);else return 0;
}

function count(template) {
  if (template instanceof Observable) return 1;else return countTemplate(template);
}

function combine(template, values, state) {
  if (template instanceof Observable) {
    return values[++state.index];
  } else if (isArray(template)) {
    var n = template.length;
    var next = template;
    for (var i = 0; i < n; ++i) {
      var v = combine(template[i], values, state);
      if (!identicalU(next[i], v)) {
        if (next === template) next = template.slice(0);
        next[i] = v;
      }
    }
    return next;
  } else if (isObject(template)) {
    var _next = template;
    for (var k in template) {
      var _v = combine(template[k], values, state);
      if (!identicalU(_next[k], _v)) {
        if (_next === template) _next = assocPartialU(void 0, void 0, template); // Avoid Object.assign
        _next[k] = _v;
      }
    }
    return _next;
  } else {
    return template;
  }
}

function invoke(xs) {
  if (!(xs instanceof Array)) return xs;

  var nm1 = xs.length - 1;
  var f = xs[nm1];
  return f instanceof Function ? f.apply(void 0, xs.slice(0, nm1)) : xs;
}

function subscribe(self) {
  var index = -1;
  forEach(self._template, function (observable) {
    var handler = function handler(e) {
      var handlers = self._handlers;
      var i = 0;
      while (handlers[i] !== handler) {
        ++i;
      }switch (e.type) {
        case "value":
          {
            var values = self._values;
            values[i] = e.value;
            for (var j = 0, n = values.length; j < n; ++j) {
              if (values[j] === self) return;
            }var template = self._template;
            maybeEmitValue(self, invoke(combine(template, values, { index: -1 })));
            break;
          }
        case "error":
          {
            self._emitError(e.value);
            break;
          }
        default:
          {
            handlers[i] = null;
            for (var _j = 0, _n = handlers.length; _j < _n; ++_j) {
              if (handlers[_j]) return;
            }self._handlers = handlers.length;
            self._values = null;
            self._emitEnd();
            break;
          }
      }
    };
    self._handlers[++index] = handler;
    observable.onAny(handler);
  });
}

function unsubscribe(template, handlers) {
  var index = -1;
  forEach(template, function (observable) {
    var handler = handlers[++index];
    if (handler) observable.offAny(handler);
  });
}

//

function maybeEmitValue(self, next) {
  var prev = self._currentEvent;
  if (!prev || !identicalU(prev.value, next) || prev.type !== "value") self._emitValue(next);
}

//

var CombineMany = /*#__PURE__*/inherit(function CombineMany(template, n) {
  Property.call(this);
  this._template = template;
  this._handlers = n;
  this._values = null;
}, Property, {
  _onActivation: function _onActivation() {
    var n = this._handlers;
    var handlers = Array(n);
    var values = Array(n);
    for (var i = 0; i < n; ++i) {
      values[i] = this;
      handlers[i] = this;
    }
    this._handlers = handlers;
    this._values = values;
    subscribe(this);
  },
  _onDeactivation: function _onDeactivation() {
    var handlers = this._handlers;
    this._handlers = handlers.length;
    this._values = null;
    unsubscribe(this._template, handlers);
  }
});

//

var CombineOne = /*#__PURE__*/inherit(function CombineOne(template) {
  Property.call(this);
  this._template = template;
  this._handler = null;
}, Property, {
  _onActivation: function _onActivation() {
    var _this = this;

    var handler = function handler(e) {
      switch (e.type) {
        case "value":
          {
            var template = _this._template;
            maybeEmitValue(_this, invoke(combine(template, [e.value], { index: -1 })));
            break;
          }
        case "error":
          _this._emitError(e.value);
          break;
        default:
          _this._handler = null;
          _this._emitEnd();
          break;
      }
    };
    this._handler = handler;
    forEach(this._template, function (observable) {
      return observable.onAny(handler);
    });
  },
  _onDeactivation: function _onDeactivation() {
    var _handler = this._handler;

    this._handler = null;
    forEach(this._template, function (observable) {
      return observable.offAny(_handler);
    });
  }
});

//

var CombineOneWith = /*#__PURE__*/inherit(function CombineOneWith(observable, fn) {
  Property.call(this);
  this._observable = observable;
  this._fn = fn;
  this._handler = null;
}, Property, {
  _onActivation: function _onActivation() {
    var _this2 = this;

    var handler = function handler(e) {
      switch (e.type) {
        case "value":
          maybeEmitValue(_this2, (0, _this2._fn)(e.value));
          break;
        case "error":
          _this2._emitError(e.value);
          break;
        default:
          _this2._handler = null;
          _this2._emitEnd();
          break;
      }
    };
    this._handler = handler;
    this._observable.onAny(handler);
  },
  _onDeactivation: function _onDeactivation() {
    var _handler = this._handler,
        _observable = this._observable;

    this._handler = null;
    _observable.offAny(_handler);
  }
});

//

var lift1Shallow = function lift1Shallow(fn) {
  return function (x) {
    return x instanceof Observable ? new CombineOneWith(x, fn) : fn(x);
  };
};

var lift1 = function lift1(fn) {
  return function (x) {
    if (x instanceof Observable) return new CombineOneWith(x, fn);
    var n = countTemplate(x);
    if (0 === n) return fn(x);
    if (1 === n) return new CombineOne([x, fn]);
    return new CombineMany([x, fn], n);
  };
};

function lift(fn) {
  var fnN = fn.length;
  switch (fnN) {
    case 0:
      return fn;
    case 1:
      return lift1(fn);
    default:
      return arityN(fnN, function () {
        var xsN = arguments.length,
            xs = Array(xsN);
        for (var i = 0; i < xsN; ++i) {
          xs[i] = arguments[i];
        }var n = countArray(xs);
        if (0 === n) return fn.apply(null, xs);
        xs.push(fn);
        if (1 === n) new CombineOne(xs);
        return new CombineMany(xs, n);
      });
  }
}

var kefir_combines = function () {
  for (var _len = arguments.length, template = Array(_len), _key = 0; _key < _len; _key++) {
    template[_key] = arguments[_key];
  }

  var n = countArray(template);
  switch (n) {
    case 0:
      return invoke(template);
    case 1:
      return template.length === 2 && template[0] instanceof Observable && template[1] instanceof Function ? new CombineOneWith(template[0], template[1]) : new CombineOne(template);
    default:
      return new CombineMany(template, n);
  }
};

export { lift1Shallow, lift1, lift };
export default kefir_combines;
