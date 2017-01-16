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
    var next = Array(n);
    for (var i = 0; i < n; ++i) {
      next[i] = combine(template[i], values, state);
    }return next;
  } else if ((0, _infestines.isObject)(template)) {
    var _next = {};
    for (var k in template) {
      _next[k] = combine(template[k], values, state);
    }return _next;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva2VmaXIuY29tYmluZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7UUNpUWdCLEksR0FBQSxJOztrQkFvQkQsWUFBdUI7QUFBQSxvQ0FBVixRQUFVO0FBQVYsWUFBVTtBQUFBOztBQUNwQyxNQUFNLElBQUksV0FBVyxRQUFYLENBQVY7QUFDQSxVQUFRLENBQVI7QUFDRSxTQUFLLENBQUw7QUFBUSxhQUFPLE9BQU8sUUFBUCxDQUFQO0FBQ1IsU0FBSyxDQUFMO0FBQVEsYUFBUSxTQUFTLE1BQVQsS0FBb0IsQ0FBcEIsSUFDQSxTQUFTLENBQVQsOEJBREEsSUFFQSxTQUFTLENBQVQsYUFBdUIsUUFGdkIsR0FHRSxJQUFJLGNBQUosQ0FBbUIsU0FBUyxDQUFULENBQW5CLEVBQWdDLFNBQVMsQ0FBVCxDQUFoQyxDQUhGLEdBSUUsSUFBSSxVQUFKLENBQWUsUUFBZixDQUpWO0FBS1I7QUFBUyxhQUFPLElBQUksV0FBSixDQUFnQixRQUFoQixFQUEwQixDQUExQixDQUFQO0FBUFg7QUFTRCxDOztBQWhTRDs7QUFDQTs7QUFFQTs7QUFFQSxTQUFTLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkIsRUFBM0IsRUFBK0I7QUFDN0IsTUFBSSxxQ0FBSixFQUNFLEdBQUcsUUFBSCxFQURGLEtBRUssSUFBSSx5QkFBUSxRQUFSLENBQUosRUFDSCxLQUFLLElBQUksSUFBRSxDQUFOLEVBQVMsSUFBRSxTQUFTLE1BQXpCLEVBQWlDLElBQUUsQ0FBbkMsRUFBc0MsRUFBRSxDQUF4QztBQUNFLFlBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFBckI7QUFERixHQURHLE1BR0EsSUFBSSwwQkFBUyxRQUFULENBQUosRUFDSCxLQUFLLElBQU0sQ0FBWCxJQUFnQixRQUFoQjtBQUNFLFlBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFBckI7QUFERjtBQUVIOztBQUVELFNBQVMsVUFB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QixFQUFvQixDQUFwQixDQUFQO0FBQ0QsT0FYZSxDQUFQO0FBSFg7QUFnQkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHtPYnNlcnZhYmxlLCBQcm9wZXJ0eX0gZnJvbSBcImtlZmlyXCJcbmltcG9ydCB7YXJpdHlOLCBpZGVudGljYWxVLCBpbmhlcml0LCBpc0FycmF5LCBpc09iamVjdH0gZnJvbSBcImluZmVzdGluZXNcIlxuXG4vL1xuXG5mdW5jdGlvbiBmb3JFYWNoKHRlbXBsYXRlLCBmbikge1xuICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBPYnNlcnZhYmxlKVxuICAgIGZuKHRlbXBsYXRlKVxuICBlbHNlIGlmIChpc0FycmF5KHRlbXBsYXRlKSlcbiAgICBmb3IgKGxldCBpPTAsIG49dGVtcGxhdGUubGVuZ3RoOyBpPG47ICsraSlcbiAgICAgIGZvckVhY2godGVtcGxhdGVbaV0sIGZuKVxuICBlbHNlIGlmIChpc09iamVjdCh0ZW1wbGF0ZSkpXG4gICAgZm9yIChjb25zdCBrIGluIHRlbXBsYXRlKVxuICAgICAgZm9yRWFjaCh0ZW1wbGF0ZVtrXSwgZm4pXG59XG5cbmZ1bmN0aW9uIGNvdW50QXJyYXkodGVtcGxhdGUpIHtcbiAgbGV0IGMgPSAwXG4gIGZvciAobGV0IGk9MCwgbj10ZW1wbGF0ZS5sZW5ndGg7IGk8bjsgKytpKVxuICAgIGMgKz0gY291bnQodGVtcGxhdGVbaV0pXG4gIHJldHVybiBjXG59XG5cbmZ1bmN0aW9uIGNvdW50T2JqZWN0KHRlbXBsYXRlKSB7XG4gIGxldCBjID0gMFxuICBmb3IgKGNvbnN0IGsgaW4gdGVtcGxhdGUpXG4gICAgYyArPSBjb3VudCh0ZW1wbGF0ZVtrXSlcbiAgcmV0dXJuIGNcbn1cblxuZnVuY3Rpb24gY291bnRUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICBpZiAoaXNBcnJheSh0ZW1wbGF0ZSkpXG4gICAgcmV0dXJuIGNvdW50QXJyYXkodGVtcGxhdGUpXG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRlbXBsYXRlKSlcbiAgICByZXR1cm4gY291bnRPYmplY3QodGVtcGxhdGUpXG4gIGVsc2VcbiAgICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb3VudCh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBPYnNlcnZhYmxlKVxuICAgIHJldHVybiAxXG4gIGVsc2VcbiAgICByZXR1cm4gY291bnRUZW1wbGF0ZSh0ZW1wbGF0ZSlcbn1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHRlbXBsYXRlLCBoYW5kbGVycywgc2VsZikge1xuICBsZXQgaW5kZXggPSAtMVxuICBmb3JFYWNoKHRlbXBsYXRlLCBvYnNlcnZhYmxlID0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gZSA9PiBzZWxmLl9oYW5kbGVBbnkoaGFuZGxlciwgZSlcbiAgICBoYW5kbGVyc1srK2luZGV4XSA9IGhhbmRsZXJcbiAgICBvYnNlcnZhYmxlLm9uQW55KGhhbmRsZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIHVuc3Vic2NyaWJlKHRlbXBsYXRlLCBoYW5kbGVycykge1xuICBsZXQgaW5kZXggPSAtMVxuICBmb3JFYWNoKHRlbXBsYXRlLCBvYnNlcnZhYmxlID0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbKytpbmRleF1cbiAgICBpZiAoaGFuZGxlcilcbiAgICAgIG9ic2VydmFibGUub2ZmQW55KGhhbmRsZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGNvbWJpbmUodGVtcGxhdGUsIHZhbHVlcywgc3RhdGUpIHtcbiAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSkge1xuICAgIHJldHVybiB2YWx1ZXNbKytzdGF0ZS5pbmRleF1cbiAgfSBlbHNlIGlmIChpc0FycmF5KHRlbXBsYXRlKSkge1xuICAgIGNvbnN0IG4gPSB0ZW1wbGF0ZS5sZW5ndGhcbiAgICBjb25zdCBuZXh0ID0gQXJyYXkobilcbiAgICBmb3IgKGxldCBpPTA7IGk8bjsgKytpKVxuICAgICAgbmV4dFtpXSA9IGNvbWJpbmUodGVtcGxhdGVbaV0sIHZhbHVlcywgc3RhdGUpXG4gICAgcmV0dXJuIG5leHRcbiAgfSBlbHNlIGlmIChpc09iamVjdCh0ZW1wbGF0ZSkpIHtcbiAgICBjb25zdCBuZXh0ID0ge31cbiAgICBmb3IgKGNvbnN0IGsgaW4gdGVtcGxhdGUpXG4gICAgICBuZXh0W2tdID0gY29tYmluZSh0ZW1wbGF0ZVtrXSwgdmFsdWVzLCBzdGF0ZSlcbiAgICByZXR1cm4gbmV4dFxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0ZW1wbGF0ZVxuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZSh4cykge1xuICBpZiAoISh4cyBpbnN0YW5jZW9mIEFycmF5KSlcbiAgICByZXR1cm4geHNcblxuICBjb25zdCBubTEgPSB4cy5sZW5ndGgtMVxuICBjb25zdCBmID0geHNbbm0xXVxuICByZXR1cm4gZiBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgPyBmLmFwcGx5KHZvaWQgMCwgeHMuc2xpY2UoMCwgbm0xKSlcbiAgICA6IHhzXG59XG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmUoKSB7XG4gIFByb3BlcnR5LmNhbGwodGhpcylcbn1cblxuaW5oZXJpdChDb21iaW5lLCBQcm9wZXJ0eSwge1xuICBfbWF5YmVFbWl0VmFsdWUobmV4dCkge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9jdXJyZW50RXZlbnRcbiAgICBpZiAoIXByZXYgfHwgIWlkZW50aWNhbFUocHJldi52YWx1ZSwgbmV4dCkpXG4gICAgICB0aGlzLl9lbWl0VmFsdWUobmV4dClcbiAgfVxufSlcblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZU1hbnkodGVtcGxhdGUsIG4pIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlcnMgPSBuXG4gIHRoaXMuX3ZhbHVlcyA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lTWFueSwgQ29tYmluZSwge1xuICBfb25BY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVcbiAgICBjb25zdCBuID0gdGhpcy5faGFuZGxlcnNcbiAgICBjb25zdCBoYW5kbGVycyA9IEFycmF5KG4pXG4gICAgY29uc3QgdmFsdWVzID0gQXJyYXkobilcbiAgICBmb3IgKGxldCBpPTA7IGk8bjsgKytpKSB7XG4gICAgICB2YWx1ZXNbaV0gPSB0aGlzXG4gICAgICBoYW5kbGVyc1tpXSA9IHRoaXNcbiAgICB9XG4gICAgdGhpcy5faGFuZGxlcnMgPSBoYW5kbGVyc1xuICAgIHRoaXMuX3ZhbHVlcyA9IHZhbHVlc1xuICAgIHN1YnNjcmliZSh0ZW1wbGF0ZSwgaGFuZGxlcnMsIHRoaXMpXG4gIH0sXG4gIF9oYW5kbGVBbnkoaGFuZGxlciwgZSkge1xuICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgICBsZXQgaT0wXG4gICAgd2hpbGUgKGhhbmRsZXJzW2ldICE9PSBoYW5kbGVyKVxuICAgICAgKytpXG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ2YWx1ZVwiOiB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuX3ZhbHVlc1xuICAgICAgICB2YWx1ZXNbaV0gPSBlLnZhbHVlXG4gICAgICAgIGZvciAobGV0IGo9MCwgbj12YWx1ZXMubGVuZ3RoOyBqPG47ICsrailcbiAgICAgICAgICBpZiAodmFsdWVzW2pdID09PSB0aGlzKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKGludm9rZShjb21iaW5lKHRoaXMuX3RlbXBsYXRlLCB2YWx1ZXMsIHtpbmRleDogLTF9KSkpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIFwiZXJyb3JcIjoge1xuICAgICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgaGFuZGxlcnNbaV0gPSBudWxsXG4gICAgICAgIGZvciAobGV0IGo9MCwgbj1oYW5kbGVycy5sZW5ndGg7IGo8bjsgKytqKVxuICAgICAgICAgIGlmIChoYW5kbGVyc1tqXSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB0aGlzLl9oYW5kbGVycyA9IGhhbmRsZXJzLmxlbmd0aFxuICAgICAgICB0aGlzLl92YWx1ZXMgPSBudWxsXG4gICAgICAgIHRoaXMuX2VtaXRFbmQoKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgX29uRGVhY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgICB0aGlzLl9oYW5kbGVycyA9IGhhbmRsZXJzLmxlbmd0aFxuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGxcbiAgICB1bnN1YnNjcmliZSh0aGlzLl90ZW1wbGF0ZSwgaGFuZGxlcnMpXG4gIH1cbn0pXG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVPbmUodGVtcGxhdGUpIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lT25lLCBDb21iaW5lLCB7XG4gIF9vbkFjdGl2YXRpb24oKSB7XG4gICAgY29uc3QgaGFuZGxlciA9IGUgPT4gdGhpcy5faGFuZGxlQW55KGUpXG4gICAgdGhpcy5faGFuZGxlciA9IGhhbmRsZXJcbiAgICBmb3JFYWNoKHRoaXMuX3RlbXBsYXRlLCBvYnNlcnZhYmxlID0+IG9ic2VydmFibGUub25BbnkoaGFuZGxlcikpXG4gIH0sXG4gIF9oYW5kbGVBbnkoZSkge1xuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlIFwidmFsdWVcIjpcbiAgICAgICAgdGhpcy5fbWF5YmVFbWl0VmFsdWUoaW52b2tlKGNvbWJpbmUodGhpcy5fdGVtcGxhdGUsIFtlLnZhbHVlXSwge2luZGV4OiAtMX0pKSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgICAgIHRoaXMuX2VtaXRFbmQoKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfSxcbiAgX29uRGVhY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IHtfaGFuZGxlcn0gPSB0aGlzXG4gICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICBmb3JFYWNoKHRoaXMuX3RlbXBsYXRlLCBvYnNlcnZhYmxlID0+IG9ic2VydmFibGUub2ZmQW55KF9oYW5kbGVyKSlcbiAgfVxufSlcblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZU9uZVdpdGgob2JzZXJ2YWJsZSwgZm4pIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlXG4gIHRoaXMuX2ZuID0gZm5cbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbn1cblxuaW5oZXJpdChDb21iaW5lT25lV2l0aCwgQ29tYmluZSwge1xuICBfb25BY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBlID0+IHRoaXMuX2hhbmRsZUFueShlKVxuICAgIHRoaXMuX2hhbmRsZXIgPSBoYW5kbGVyXG4gICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShoYW5kbGVyKVxuICB9LFxuICBfaGFuZGxlQW55KGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSBcInZhbHVlXCI6XG4gICAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKHRoaXMuX2ZuKGUudmFsdWUpKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBcImVycm9yXCI6XG4gICAgICAgIHRoaXMuX2VtaXRFcnJvcihlLnZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICAgICAgdGhpcy5fZW1pdEVuZCgpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9LFxuICBfb25EZWFjdGl2YXRpb24oKSB7XG4gICAgY29uc3Qge19oYW5kbGVyLCBfb2JzZXJ2YWJsZX0gPSB0aGlzXG4gICAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgICBfb2JzZXJ2YWJsZS5vZmZBbnkoX2hhbmRsZXIpXG4gIH1cbn0pXG5cbi8vXG5cbmV4cG9ydCBjb25zdCBsaWZ0MVNoYWxsb3cgPSBmbiA9PiB4ID0+XG4gIHggaW5zdGFuY2VvZiBPYnNlcnZhYmxlID8gbmV3IENvbWJpbmVPbmVXaXRoKHgsIGZuKSA6IGZuKHgpXG5cbmV4cG9ydCBjb25zdCBsaWZ0MSA9IGZuID0+IHggPT4ge1xuICBpZiAoeCBpbnN0YW5jZW9mIE9ic2VydmFibGUpXG4gICAgcmV0dXJuIG5ldyBDb21iaW5lT25lV2l0aCh4LCBmbilcbiAgY29uc3QgbiA9IGNvdW50VGVtcGxhdGUoeClcbiAgaWYgKDAgPT09IG4pXG4gICAgcmV0dXJuIGZuKHgpXG4gIGlmICgxID09PSBuKVxuICAgIHJldHVybiBuZXcgQ29tYmluZU9uZShbeCwgZm5dKVxuICByZXR1cm4gbmV3IENvbWJpbmVNYW55KFt4LCBmbl0sIG4pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaWZ0KGZuKSB7XG4gIGNvbnN0IGZuTiA9IGZuLmxlbmd0aFxuICBzd2l0Y2ggKGZuTikge1xuICAgIGNhc2UgMDogcmV0dXJuIGZuXG4gICAgY2FzZSAxOiByZXR1cm4gbGlmdDEoZm4pXG4gICAgZGVmYXVsdDogcmV0dXJuIGFyaXR5Tihmbk4sIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IHhzTiA9IGFyZ3VtZW50cy5sZW5ndGgsIHhzID0gQXJyYXkoeHNOKVxuICAgICAgZm9yIChsZXQgaT0wOyBpPHhzTjsgKytpKVxuICAgICAgICB4c1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgICAgY29uc3QgbiA9IGNvdW50QXJyYXkoeHMpXG4gICAgICBpZiAoMCA9PT0gbilcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIHhzKVxuICAgICAgeHMucHVzaChmbilcbiAgICAgIGlmICgxID09PSBuKVxuICAgICAgICBuZXcgQ29tYmluZU9uZSh4cylcbiAgICAgIHJldHVybiBuZXcgQ29tYmluZU1hbnkoeHMsIG4pXG4gICAgfSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoLi4udGVtcGxhdGUpIHtcbiAgY29uc3QgbiA9IGNvdW50QXJyYXkodGVtcGxhdGUpXG4gIHN3aXRjaCAobikge1xuICAgIGNhc2UgMDogcmV0dXJuIGludm9rZSh0ZW1wbGF0ZSlcbiAgICBjYXNlIDE6IHJldHVybiAodGVtcGxhdGUubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlWzBdIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSAmJlxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVsxXSBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgID8gbmV3IENvbWJpbmVPbmVXaXRoKHRlbXBsYXRlWzBdLCB0ZW1wbGF0ZVsxXSlcbiAgICAgICAgICAgICAgICAgICAgOiBuZXcgQ29tYmluZU9uZSh0ZW1wbGF0ZSkpXG4gICAgZGVmYXVsdDogcmV0dXJuIG5ldyBDb21iaW5lTWFueSh0ZW1wbGF0ZSwgbilcbiAgfVxufVxuIl19
