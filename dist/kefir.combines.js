(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.kefir || (g.kefir = {})).combines = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lift1 = exports.lift1Shallow = undefined;
exports.lift = lift;

exports.default = function () {
  for (var _len = arguments.length, template = Array(_len), _key = 0; _key < _len; _key++) {
    template[_key] = arguments[_key];
  }

  var n = countArray(template);
  switch (n) {
    case 0:
      return invoke(template);
    case 1:
      return template.length === 2 && template[0] instanceof _kefir.Observable && template[1] instanceof Function ? new CombineOneWith(template[0], template[1]) : new CombineOne(template);
    default:
      return new CombineMany(template, n);
  }
};

var _kefir = require("kefir");

var _infestines = require("infestines");

//

function forEach(template, fn) {
  if (template instanceof _kefir.Observable) fn(template);else if ((0, _infestines.isArray)(template)) for (var i = 0, n = template.length; i < n; ++i) {
    forEach(template[i], fn);
  } else if ((0, _infestines.isObject)(template)) for (var k in template) {
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
  if ((0, _infestines.isArray)(template)) return countArray(template);else if ((0, _infestines.isObject)(template)) return countObject(template);else return 0;
}

function count(template) {
  if (template instanceof _kefir.Observable) return 1;else return countTemplate(template);
}

function subscribe(template, handlers, self) {
  var index = -1;
  forEach(template, function (observable) {
    var handler = function handler(e) {
      return self._handleAny(handler, e);
    };
    handlers[++index] = handler;
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

function combine(template, values, state) {
  if (template instanceof _kefir.Observable) {
    return values[++state.index];
  } else if ((0, _infestines.isArray)(template)) {
    var n = template.length;
    var next = template;
    for (var i = 0; i < n; ++i) {
      var v = combine(template[i], values, state);
      if (!(0, _infestines.identicalU)(next[i], v)) {
        if (next === template) next = template.slice(0);
        next[i] = v;
      }
    }
    return next;
  } else if ((0, _infestines.isObject)(template)) {
    var _next = template;
    for (var k in template) {
      var _v = combine(template[k], values, state);
      if (!(0, _infestines.identicalU)(_next[k], _v)) {
        if (_next === template) _next = (0, _infestines.assocPartialU)(void 0, void 0, template); // Avoid Object.assign
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

//

function Combine() {
  _kefir.Property.call(this);
}

(0, _infestines.inherit)(Combine, _kefir.Property, {
  _maybeEmitValue: function _maybeEmitValue(next) {
    var prev = this._currentEvent;
    if (!prev || !(0, _infestines.identicalU)(prev.value, next)) this._emitValue(next);
  }
});

//

function CombineMany(template, n) {
  Combine.call(this);
  this._template = template;
  this._handlers = n;
  this._values = null;
}

(0, _infestines.inherit)(CombineMany, Combine, {
  _onActivation: function _onActivation() {
    var template = this._template;
    var n = this._handlers;
    var handlers = Array(n);
    var values = Array(n);
    for (var i = 0; i < n; ++i) {
      values[i] = this;
      handlers[i] = this;
    }
    this._handlers = handlers;
    this._values = values;
    subscribe(template, handlers, this);
  },
  _handleAny: function _handleAny(handler, e) {
    var handlers = this._handlers;
    var i = 0;
    while (handlers[i] !== handler) {
      ++i;
    }switch (e.type) {
      case "value":
        {
          var values = this._values;
          values[i] = e.value;
          for (var j = 0, n = values.length; j < n; ++j) {
            if (values[j] === this) return;
          }this._maybeEmitValue(invoke(combine(this._template, values, { index: -1 })));
          break;
        }
      case "error":
        {
          this._emitError(e.value);
          break;
        }
      default:
        {
          handlers[i] = null;
          for (var _j = 0, _n = handlers.length; _j < _n; ++_j) {
            if (handlers[_j]) return;
          }this._handlers = handlers.length;
          this._values = null;
          this._emitEnd();
          break;
        }
    }
  },
  _onDeactivation: function _onDeactivation() {
    var handlers = this._handlers;
    this._handlers = handlers.length;
    this._values = null;
    unsubscribe(this._template, handlers);
  }
});

//

function CombineOne(template) {
  Combine.call(this);
  this._template = template;
  this._handler = null;
}

(0, _infestines.inherit)(CombineOne, Combine, {
  _onActivation: function _onActivation() {
    var _this = this;

    var handler = function handler(e) {
      return _this._handleAny(e);
    };
    this._handler = handler;
    forEach(this._template, function (observable) {
      return observable.onAny(handler);
    });
  },
  _handleAny: function _handleAny(e) {
    switch (e.type) {
      case "value":
        this._maybeEmitValue(invoke(combine(this._template, [e.value], { index: -1 })));
        break;
      case "error":
        this._emitError(e.value);
        break;
      default:
        this._handler = null;
        this._emitEnd();
        break;
    }
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

function CombineOneWith(observable, fn) {
  Combine.call(this);
  this._observable = observable;
  this._fn = fn;
  this._handler = null;
}

(0, _infestines.inherit)(CombineOneWith, Combine, {
  _onActivation: function _onActivation() {
    var _this2 = this;

    var handler = function handler(e) {
      return _this2._handleAny(e);
    };
    this._handler = handler;
    this._observable.onAny(handler);
  },
  _handleAny: function _handleAny(e) {
    switch (e.type) {
      case "value":
        this._maybeEmitValue(this._fn(e.value));
        break;
      case "error":
        this._emitError(e.value);
        break;
      default:
        this._handler = null;
        this._emitEnd();
        break;
    }
  },
  _onDeactivation: function _onDeactivation() {
    var _handler = this._handler,
        _observable = this._observable;

    this._handler = null;
    _observable.offAny(_handler);
  }
});

//

var lift1Shallow = exports.lift1Shallow = function lift1Shallow(fn) {
  return function (x) {
    return x instanceof _kefir.Observable ? new CombineOneWith(x, fn) : fn(x);
  };
};

var lift1 = exports.lift1 = function lift1(fn) {
  return function (x) {
    if (x instanceof _kefir.Observable) return new CombineOneWith(x, fn);
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
      return (0, _infestines.arityN)(fnN, function () {
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

},{"infestines":undefined,"kefir":undefined}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva2VmaXIuY29tYmluZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7UUNvUmdCLEksR0FBQSxJOztrQkFvQkQsWUFBdUI7QUFBQSxvQ0FBVixRQUFVO0FBQVYsWUFBVTtBQUFBOztBQUNwQyxNQUFNLElBQUksV0FBVyxRQUFYLENBQVY7QUFDQSxVQUFRLENBQVI7QUFDRSxTQUFLLENBQUw7QUFBUSxhQUFPLE9BQU8sUUFBUCxDQUFQO0FBQ1IsU0FBSyxDQUFMO0FBQVEsYUFBUSxTQUFTLE1BQVQsS0FBb0IsQ0FBcEIsSUFDQSxTQUFTLENBQVQsOEJBREEsSUFFQSxTQUFTLENBQVQsYUFBdUIsUUFGdkIsR0FHRSxJQUFJLGNBQUosQ0FBbUIsU0FBUyxDQUFULENBQW5CLEVBQWdDLFNBQVMsQ0FBVCxDQUFoQyxDQUhGLEdBSUUsSUFBSSxVQUFKLENBQWUsUUFBZixDQUpWO0FBS1I7QUFBUyxhQUFPLElBQUksV0FBSixDQUFnQixRQUFoQixFQUEwQixDQUExQixDQUFQO0FBUFg7QUFTRCxDOztBQW5URDs7QUFDQTs7QUFTQTs7QUFFQSxTQUFTLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkIsRUFBM0IsRUFBK0I7QUFDN0IsTUFBSSxxQ0FBSixFQUNFLEdBQUcsUUFBSCxFQURGLEtBRUssSUFBSSx5QkFBUSxRQUFSLENBQUosRUFDSCxLQUFLLElBQUksSUFBRSxDQUFOLEVBQVMsSUFBRSxTQUFTLE1BQXpCLEVBQWlDLElBQUUsQ0FBbkMsRUFBc0MsRUFBRSxDQUF4QztBQUNFLFlBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFBckI7QUFERixHQURHLE1BR0EsSUFBSSwwQkFBUyxRQUFULENBQUosRUFDSCxLQUFLLElBQU0sQ0FBWCxJQUFnQixRQUFoQjtBQUNFLFlBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFBckI7QUFERjtBQUVIOztBQUVELFNBQVMsVUFB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QUEsWUFBOEIsS0FBSyxNQUFNLEdBQU4sQ0FBbkM7QUFDQSxhQUFLLElBQUksSUFBRSxDQUFYLEVBQWMsSUFBRSxHQUFoQixFQUFxQixFQUFFLENBQXZCO0FBQ0UsYUFBRyxDQUFILElBQVEsVUFBVSxDQUFWLENBQVI7QUFERixTQUVBLElBQU0sSUFBSSxXQUFXLEVBQVgsQ0FBVjtBQUNBLFlBQUksTUFBTSxDQUFWLEVBQ0UsT0FBTyxHQUFHLEtBQUgsQ0FBUyxJQUFULEVBQWUsRUFBZixDQUFQO0FBQ0YsV0FBRyxJQUFILENBQVEsRUFBUjtBQUNBLFlBQUksTUFBTSxDQUFWLEVBQ0UsSUFBSSxVQUFKLENBQWUsRUFBZjtBQUNGLGVBQU8sSUFBSSxXQUFKLENBQWdCLEVBQWhCLEVBQW9CLENBQXBCLENBQVA7QUFDRCxPQVhlLENBQVA7QUFIWDtBQWdCRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQge09ic2VydmFibGUsIFByb3BlcnR5fSBmcm9tIFwia2VmaXJcIlxuaW1wb3J0IHtcbiAgYXJpdHlOLFxuICBhc3NvY1BhcnRpYWxVLFxuICBpZGVudGljYWxVLFxuICBpbmhlcml0LFxuICBpc0FycmF5LFxuICBpc09iamVjdFxufSBmcm9tIFwiaW5mZXN0aW5lc1wiXG5cbi8vXG5cbmZ1bmN0aW9uIGZvckVhY2godGVtcGxhdGUsIGZuKSB7XG4gIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIE9ic2VydmFibGUpXG4gICAgZm4odGVtcGxhdGUpXG4gIGVsc2UgaWYgKGlzQXJyYXkodGVtcGxhdGUpKVxuICAgIGZvciAobGV0IGk9MCwgbj10ZW1wbGF0ZS5sZW5ndGg7IGk8bjsgKytpKVxuICAgICAgZm9yRWFjaCh0ZW1wbGF0ZVtpXSwgZm4pXG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRlbXBsYXRlKSlcbiAgICBmb3IgKGNvbnN0IGsgaW4gdGVtcGxhdGUpXG4gICAgICBmb3JFYWNoKHRlbXBsYXRlW2tdLCBmbilcbn1cblxuZnVuY3Rpb24gY291bnRBcnJheSh0ZW1wbGF0ZSkge1xuICBsZXQgYyA9IDBcbiAgZm9yIChsZXQgaT0wLCBuPXRlbXBsYXRlLmxlbmd0aDsgaTxuOyArK2kpXG4gICAgYyArPSBjb3VudCh0ZW1wbGF0ZVtpXSlcbiAgcmV0dXJuIGNcbn1cblxuZnVuY3Rpb24gY291bnRPYmplY3QodGVtcGxhdGUpIHtcbiAgbGV0IGMgPSAwXG4gIGZvciAoY29uc3QgayBpbiB0ZW1wbGF0ZSlcbiAgICBjICs9IGNvdW50KHRlbXBsYXRlW2tdKVxuICByZXR1cm4gY1xufVxuXG5mdW5jdGlvbiBjb3VudFRlbXBsYXRlKHRlbXBsYXRlKSB7XG4gIGlmIChpc0FycmF5KHRlbXBsYXRlKSlcbiAgICByZXR1cm4gY291bnRBcnJheSh0ZW1wbGF0ZSlcbiAgZWxzZSBpZiAoaXNPYmplY3QodGVtcGxhdGUpKVxuICAgIHJldHVybiBjb3VudE9iamVjdCh0ZW1wbGF0ZSlcbiAgZWxzZVxuICAgIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvdW50KHRlbXBsYXRlKSB7XG4gIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIE9ic2VydmFibGUpXG4gICAgcmV0dXJuIDFcbiAgZWxzZVxuICAgIHJldHVybiBjb3VudFRlbXBsYXRlKHRlbXBsYXRlKVxufVxuXG5mdW5jdGlvbiBzdWJzY3JpYmUodGVtcGxhdGUsIGhhbmRsZXJzLCBzZWxmKSB7XG4gIGxldCBpbmRleCA9IC0xXG4gIGZvckVhY2godGVtcGxhdGUsIG9ic2VydmFibGUgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBlID0+IHNlbGYuX2hhbmRsZUFueShoYW5kbGVyLCBlKVxuICAgIGhhbmRsZXJzWysraW5kZXhdID0gaGFuZGxlclxuICAgIG9ic2VydmFibGUub25BbnkoaGFuZGxlcilcbiAgfSlcbn1cblxuZnVuY3Rpb24gdW5zdWJzY3JpYmUodGVtcGxhdGUsIGhhbmRsZXJzKSB7XG4gIGxldCBpbmRleCA9IC0xXG4gIGZvckVhY2godGVtcGxhdGUsIG9ic2VydmFibGUgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1srK2luZGV4XVxuICAgIGlmIChoYW5kbGVyKVxuICAgICAgb2JzZXJ2YWJsZS5vZmZBbnkoaGFuZGxlcilcbiAgfSlcbn1cblxuZnVuY3Rpb24gY29tYmluZSh0ZW1wbGF0ZSwgdmFsdWVzLCBzdGF0ZSkge1xuICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBPYnNlcnZhYmxlKSB7XG4gICAgcmV0dXJuIHZhbHVlc1srK3N0YXRlLmluZGV4XVxuICB9IGVsc2UgaWYgKGlzQXJyYXkodGVtcGxhdGUpKSB7XG4gICAgY29uc3QgbiA9IHRlbXBsYXRlLmxlbmd0aFxuICAgIGxldCBuZXh0ID0gdGVtcGxhdGVcbiAgICBmb3IgKGxldCBpPTA7IGk8bjsgKytpKSB7XG4gICAgICBjb25zdCB2ID0gY29tYmluZSh0ZW1wbGF0ZVtpXSwgdmFsdWVzLCBzdGF0ZSlcbiAgICAgIGlmICghaWRlbnRpY2FsVShuZXh0W2ldLCB2KSkge1xuICAgICAgICBpZiAobmV4dCA9PT0gdGVtcGxhdGUpXG4gICAgICAgICAgbmV4dCA9IHRlbXBsYXRlLnNsaWNlKDApXG4gICAgICAgIG5leHRbaV0gPSB2XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXh0XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QodGVtcGxhdGUpKSB7XG4gICAgbGV0IG5leHQgPSB0ZW1wbGF0ZVxuICAgIGZvciAoY29uc3QgayBpbiB0ZW1wbGF0ZSkge1xuICAgICAgY29uc3QgdiA9IGNvbWJpbmUodGVtcGxhdGVba10sIHZhbHVlcywgc3RhdGUpXG4gICAgICBpZiAoIWlkZW50aWNhbFUobmV4dFtrXSwgdikpIHtcbiAgICAgICAgaWYgKG5leHQgPT09IHRlbXBsYXRlKVxuICAgICAgICAgIG5leHQgPSBhc3NvY1BhcnRpYWxVKHZvaWQgMCwgdm9pZCAwLCB0ZW1wbGF0ZSkgLy8gQXZvaWQgT2JqZWN0LmFzc2lnblxuICAgICAgICBuZXh0W2tdID0gdlxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV4dFxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0ZW1wbGF0ZVxuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZSh4cykge1xuICBpZiAoISh4cyBpbnN0YW5jZW9mIEFycmF5KSlcbiAgICByZXR1cm4geHNcblxuICBjb25zdCBubTEgPSB4cy5sZW5ndGgtMVxuICBjb25zdCBmID0geHNbbm0xXVxuICByZXR1cm4gZiBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgPyBmLmFwcGx5KHZvaWQgMCwgeHMuc2xpY2UoMCwgbm0xKSlcbiAgICA6IHhzXG59XG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmUoKSB7XG4gIFByb3BlcnR5LmNhbGwodGhpcylcbn1cblxuaW5oZXJpdChDb21iaW5lLCBQcm9wZXJ0eSwge1xuICBfbWF5YmVFbWl0VmFsdWUobmV4dCkge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9jdXJyZW50RXZlbnRcbiAgICBpZiAoIXByZXYgfHwgIWlkZW50aWNhbFUocHJldi52YWx1ZSwgbmV4dCkpXG4gICAgICB0aGlzLl9lbWl0VmFsdWUobmV4dClcbiAgfVxufSlcblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZU1hbnkodGVtcGxhdGUsIG4pIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlcnMgPSBuXG4gIHRoaXMuX3ZhbHVlcyA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lTWFueSwgQ29tYmluZSwge1xuICBfb25BY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVcbiAgICBjb25zdCBuID0gdGhpcy5faGFuZGxlcnNcbiAgICBjb25zdCBoYW5kbGVycyA9IEFycmF5KG4pXG4gICAgY29uc3QgdmFsdWVzID0gQXJyYXkobilcbiAgICBmb3IgKGxldCBpPTA7IGk8bjsgKytpKSB7XG4gICAgICB2YWx1ZXNbaV0gPSB0aGlzXG4gICAgICBoYW5kbGVyc1tpXSA9IHRoaXNcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlcnMgPSBoYW5kbGVyc1xuICAgIHRoaXMuX3ZhbHVlcyA9IHZhbHVlc1xuICAgIHN1YnNjcmliZSh0ZW1wbGF0ZSwgaGFuZGxlcnMsIHRoaXMpXG4gIH0sXG4gIF9oYW5kbGVBbnkoaGFuZGxlciwgZSkge1xuICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgICBsZXQgaT0wXG4gICAgd2hpbGUgKGhhbmRsZXJzW2ldICE9PSBoYW5kbGVyKVxuICAgICAgKytpXG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ2YWx1ZVwiOiB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuX3ZhbHVlc1xuICAgICAgICB2YWx1ZXNbaV0gPSBlLnZhbHVlXG4gICAgICAgIGZvciAobGV0IGo9MCwgbj12YWx1ZXMubGVuZ3RoOyBqPG47ICsrailcbiAgICAgICAgICBpZiAodmFsdWVzW2pdID09PSB0aGlzKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKGludm9rZShjb21iaW5lKHRoaXMuX3RlbXBsYXRlLCB2YWx1ZXMsIHtpbmRleDogLTF9KSkpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIFwiZXJyb3JcIjoge1xuICAgICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaGFuZGxlcnNbaV0gPSBudWxsXG4gICAgICAgIGZvciAobGV0IGo9MCwgbj1oYW5kbGVycy5sZW5ndGg7IGo8bjsgKytqKVxuICAgICAgICAgIGlmIChoYW5kbGVyc1tqXSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB0aGlzLl9oYW5kbGVycyA9IGhhbmRsZXJzLmxlbmd0aFxuICAgICAgICB0aGlzLl92YWx1ZXMgPSBudWxsXG4gICAgICAgIHRoaXMuX2VtaXRFbmQoKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgX29uRGVhY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgICB0aGlzLl9oYW5kbGVycyA9IGhhbmRsZXJzLmxlbmd0aFxuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGxcbiAgICB1bnN1YnNjcmliZSh0aGlzLl90ZW1wbGF0ZSwgaGFuZGxlcnMpXG4gIH1cbn0pXG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVPbmUodGVtcGxhdGUpIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lT25lLCBDb21iaW5lLCB7XG4gIF9vbkFjdGl2YXRpb24oKSB7XG4gICAgY29uc3QgaGFuZGxlciA9IGUgPT4gdGhpcy5faGFuZGxlQW55KGUpXG4gICAgdGhpcy5faGFuZGxlciA9IGhhbmRsZXJcbiAgICBmb3JFYWNoKHRoaXMuX3RlbXBsYXRlLCBvYnNlcnZhYmxlID0+IG9ic2VydmFibGUub25BbnkoaGFuZGxlcikpXG4gIH0sXG4gIF9oYW5kbGVBbnkoZSkge1xuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlIFwidmFsdWVcIjpcbiAgICAgICAgdGhpcy5fbWF5YmVFbWl0VmFsdWUoaW52b2tlKGNvbWJpbmUodGhpcy5fdGVtcGxhdGUsIFtlLnZhbHVlXSwge2luZGV4OiAtMX0pKSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgICAgIHRoaXMuX2VtaXRFbmQoKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfSxcbiAgX29uRGVhY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IHtfaGFuZGxlcn0gPSB0aGlzXG4gICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICBmb3JFYWNoKHRoaXMuX3RlbXBsYXRlLCBvYnNlcnZhYmxlID0+IG9ic2VydmFibGUub2ZmQW55KF9oYW5kbGVyKSlcbiAgfVxufSlcblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZU9uZVdpdGgob2JzZXJ2YWJsZSwgZm4pIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlXG4gIHRoaXMuX2ZuID0gZm5cbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lT25lV2l0aCwgQ29tYmluZSwge1xuICBfb25BY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBlID0+IHRoaXMuX2hhbmRsZUFueShlKVxuICAgIHRoaXMuX2hhbmRsZXIgPSBoYW5kbGVyXG4gICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShoYW5kbGVyKVxuICB9LFxuICBfaGFuZGxlQW55KGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSBcInZhbHVlXCI6XG4gICAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKHRoaXMuX2ZuKGUudmFsdWUpKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBcImVycm9yXCI6XG4gICAgICAgIHRoaXMuX2VtaXRFcnJvcihlLnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICAgICAgdGhpcy5fZW1pdEVuZCgpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9LFxuICBfb25EZWFjdGl2YXRpb24oKSB7XG4gICAgY29uc3Qge19oYW5kbGVyLCBfb2JzZXJ2YWJsZX0gPSB0aGlzXG4gICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICBfb2JzZXJ2YWJsZS5vZmZBbnkoX2hhbmRsZXIpXG4gIH1cbn0pXG5cbi8vXG5cbmV4cG9ydCBjb25zdCBsaWZ0MVNoYWxsb3cgPSBmbiA9PiB4ID0+XG4gIHggaW5zdGFuY2VvZiBPYnNlcnZhYmxlID8gbmV3IENvbWJpbmVPbmVXaXRoKHgsIGZuKSA6IGZuKHgpXG5cbmV4cG9ydCBjb25zdCBsaWZ0MSA9IGZuID0+IHggPT4ge1xuICBpZiAoeCBpbnN0YW5jZW9mIE9ic2VydmFibGUpXG4gICAgcmV0dXJuIG5ldyBDb21iaW5lT25lV2l0aCh4LCBmbilcbiAgY29uc3QgbiA9IGNvdW50VGVtcGxhdGUoeClcbiAgaWYgKDAgPT09IG4pXG4gICAgcmV0dXJuIGZuKHgpXG4gIGlmICgxID09PSBuKVxuICAgIHJldHVybiBuZXcgQ29tYmluZU9uZShbeCwgZm5dKVxuICByZXR1cm4gbmV3IENvbWJpbmVNYW55KFt4LCBmbl0sIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaWZ0KGZuKSB7XG4gIGNvbnN0IGZuTiA9IGZuLmxlbmd0aFxuICBzd2l0Y2ggKGZuTikge1xuICAgIGNhc2UgMDogcmV0dXJuIGZuXG4gICAgY2FzZSAxOiByZXR1cm4gbGlmdDEoZm4pXG4gICAgZGVmYXVsdDogcmV0dXJuIGFyaXR5Tihmbk4sIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IHhzTiA9IGFyZ3VtZW50cy5sZW5ndGgsIHhzID0gQXJyYXkoeHNOKVxuICAgICAgZm9yIChsZXQgaT0wOyBpPHhzTjsgKytpKVxuICAgICAgICB4c1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgICAgY29uc3QgbiA9IGNvdW50QXJyYXkoeHMpXG4gICAgICBpZiAoMCA9PT0gbilcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIHhzKVxuICAgICAgeHMucHVzaChmbilcbiAgICAgIGlmICgxID09PSBuKVxuICAgICAgICBuZXcgQ29tYmluZU9uZSh4cylcbiAgICAgIHJldHVybiBuZXcgQ29tYmluZU1hbnkoeHMsIG4pXG4gICAgfSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoLi4udGVtcGxhdGUpIHtcbiAgY29uc3QgbiA9IGNvdW50QXJyYXkodGVtcGxhdGUpXG4gIHN3aXRjaCAobikge1xuICAgIGNhc2UgMDogcmV0dXJuIGludm9rZSh0ZW1wbGF0ZSlcbiAgICBjYXNlIDE6IHJldHVybiAodGVtcGxhdGUubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlWzBdIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSAmJlxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVsxXSBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgID8gbmV3IENvbWJpbmVPbmVXaXRoKHRlbXBsYXRlWzBdLCB0ZW1wbGF0ZVsxXSlcbiAgICAgICAgICAgICAgICAgICAgOiBuZXcgQ29tYmluZU9uZSh0ZW1wbGF0ZSkpXG4gICAgZGVmYXVsdDogcmV0dXJuIG5ldyBDb21iaW5lTWFueSh0ZW1wbGF0ZSwgbilcbiAgfVxufVxuIl19
