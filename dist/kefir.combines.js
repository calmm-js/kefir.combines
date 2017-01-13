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
  if (template instanceof _kefir.Observable) {
    fn(template);
  } else {
    var _constructor = template && template.constructor;

    if (_constructor === Array) for (var i = 0, n = template.length; i < n; ++i) {
      forEach(template[i], fn);
    } else if (_constructor === Object) for (var k in template) {
      forEach(template[k], fn);
    }
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
  if (template) {
    var _constructor2 = template.constructor;
    if (_constructor2 === Array) return countArray(template);
    if (_constructor2 === Object) return countObject(template);
  }
  return 0;
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
  } else {
    var _constructor3 = template && template.constructor;

    if (_constructor3 === Array) {
      var n = template.length;
      var next = Array(n);
      for (var i = 0; i < n; ++i) {
        next[i] = combine(template[i], values, state);
      }return next;
    } else if (_constructor3 === Object) {
      var _next = {};
      for (var k in template) {
        _next[k] = combine(template[k], values, state);
      }return _next;
    } else {
      return template;
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva2VmaXIuY29tYmluZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7UUMyUWdCLEksR0FBQSxJOztrQkFvQkQsWUFBdUI7QUFBQSxvQ0FBVixRQUFVO0FBQVYsWUFBVTtBQUFBOztBQUNwQyxNQUFNLElBQUksV0FBVyxRQUFYLENBQVY7QUFDQSxVQUFRLENBQVI7QUFDRSxTQUFLLENBQUw7QUFBUSxhQUFPLE9BQU8sUUFBUCxDQUFQO0FBQ1IsU0FBSyxDQUFMO0FBQVEsYUFBUSxTQUFTLE1BQVQsS0FBb0IsQ0FBcEIsSUFDQSxTQUFTLENBQVQsOEJBREEsSUFFQSxTQUFTLENBQVQsYUFBdUIsUUFGdkIsR0FHRSxJQUFJLGNBQUosQ0FBbUIsU0FBUyxDQUFULENBQW5CLEVBQWdDLFNBQVMsQ0FBVCxDQUFoQyxDQUhGLEdBSUUsSUFBSSxVQUFKLENBQWUsUUFBZixDQUpWO0FBS1I7QUFBUyxhQUFPLElBQUksV0FBSixDQUFnQixRQUFoQixFQUEwQixDQUExQixDQUFQO0FBUFg7QUFTRCxDOztBQTFTRDs7QUFDQTs7QUFFQTs7QUFFQSxTQUFTLE9BQVQsQ0FBaUIsUUFBakIsRUFBMkIsRUFBM0IsRUFBK0I7QUFDN0IsTUFBSSxxQ0FBSixFQUFvQztBQUNsQyxPQUFHLFFBQUg7QUFDRCxHQUZELE1BRU87QUFDTCxRQUFNLGVBQWMsWUFBWSxTQUFTLFdBQXpDOztBQUVBLFFBQUksaUJBQWdCLEtBQXBCLEVBQ0UsS0FBSyxJQUFJLElBQUUsQ0FBTixFQUFTLElBQUUsU0FBUyxNQUF6QixFQUFpQyxJQUFFLENBQW5DLEVBQXNDLEVBQUUsQ0FBeEM7QUFDRSxjQUFRLFNBQVMsQ0FBVCxDQUFSLEVBQXFCLEVBQXJCO0FBREYsS0FERixNQUdLLElBQUksaUJBQWdCLE1BQXBCLEVBQ0gsS0FBSyxJQUFNLENBQVgsSUFBZ0IsUUFBaEI7QUFDRSxjQUFRLFNBQVMsQ0FB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LElBQVQsRUFBZSxFQUFmLENBQVA7QUFDRixXQUFHLElBQUgsQ0FBUSxFQUFSO0FBQ0EsWUFBSSxNQUFNLENBQVYsRUFDRSxJQUFJLFVBQUosQ0FBZSxFQUFmO0FBQ0YsZUFBTyxJQUFJLFdBQUosQ0FBZ0IsRUFBaEIsRUFBb0IsQ0FBcEIsQ0FBUDtBQUNELE9BWGUsQ0FBUDtBQUhYO0FBZ0JEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7T2JzZXJ2YWJsZSwgUHJvcGVydHl9IGZyb20gXCJrZWZpclwiXG5pbXBvcnQge2FyaXR5TiwgaWRlbnRpY2FsVSwgaW5oZXJpdH0gZnJvbSBcImluZmVzdGluZXNcIlxuXG4vL1xuXG5mdW5jdGlvbiBmb3JFYWNoKHRlbXBsYXRlLCBmbikge1xuICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBPYnNlcnZhYmxlKSB7XG4gICAgZm4odGVtcGxhdGUpXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSB0ZW1wbGF0ZSAmJiB0ZW1wbGF0ZS5jb25zdHJ1Y3RvclxuXG4gICAgaWYgKGNvbnN0cnVjdG9yID09PSBBcnJheSlcbiAgICAgIGZvciAobGV0IGk9MCwgbj10ZW1wbGF0ZS5sZW5ndGg7IGk8bjsgKytpKVxuICAgICAgICBmb3JFYWNoKHRlbXBsYXRlW2ldLCBmbilcbiAgICBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PT0gT2JqZWN0KVxuICAgICAgZm9yIChjb25zdCBrIGluIHRlbXBsYXRlKVxuICAgICAgICBmb3JFYWNoKHRlbXBsYXRlW2tdLCBmbilcbiAgfVxufVxuXG5mdW5jdGlvbiBjb3VudEFycmF5KHRlbXBsYXRlKSB7XG4gIGxldCBjID0gMFxuICBmb3IgKGxldCBpPTAsIG49dGVtcGxhdGUubGVuZ3RoOyBpPG47ICsraSlcbiAgICBjICs9IGNvdW50KHRlbXBsYXRlW2ldKVxuICByZXR1cm4gY1xufVxuXG5mdW5jdGlvbiBjb3VudE9iamVjdCh0ZW1wbGF0ZSkge1xuICBsZXQgYyA9IDBcbiAgZm9yIChjb25zdCBrIGluIHRlbXBsYXRlKVxuICAgIGMgKz0gY291bnQodGVtcGxhdGVba10pXG4gIHJldHVybiBjXG59XG5cbmZ1bmN0aW9uIGNvdW50VGVtcGxhdGUodGVtcGxhdGUpIHtcbiAgaWYgKHRlbXBsYXRlKSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSB0ZW1wbGF0ZS5jb25zdHJ1Y3RvclxuICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gQXJyYXkpXG4gICAgICByZXR1cm4gY291bnRBcnJheSh0ZW1wbGF0ZSlcbiAgICBpZiAoY29uc3RydWN0b3IgPT09IE9iamVjdClcbiAgICAgIHJldHVybiBjb3VudE9iamVjdCh0ZW1wbGF0ZSlcbiAgfVxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb3VudCh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBPYnNlcnZhYmxlKVxuICAgIHJldHVybiAxXG4gIGVsc2VcbiAgICByZXR1cm4gY291bnRUZW1wbGF0ZSh0ZW1wbGF0ZSlcbn1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHRlbXBsYXRlLCBoYW5kbGVycywgc2VsZikge1xuICBsZXQgaW5kZXggPSAtMVxuICBmb3JFYWNoKHRlbXBsYXRlLCBvYnNlcnZhYmxlID0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gZSA9PiBzZWxmLl9oYW5kbGVBbnkoaGFuZGxlciwgZSlcbiAgICBoYW5kbGVyc1srK2luZGV4XSA9IGhhbmRsZXJcbiAgICBvYnNlcnZhYmxlLm9uQW55KGhhbmRsZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIHVuc3Vic2NyaWJlKHRlbXBsYXRlLCBoYW5kbGVycykge1xuICBsZXQgaW5kZXggPSAtMVxuICBmb3JFYWNoKHRlbXBsYXRlLCBvYnNlcnZhYmxlID0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbKytpbmRleF1cbiAgICBpZiAoaGFuZGxlcilcbiAgICAgIG9ic2VydmFibGUub2ZmQW55KGhhbmRsZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGNvbWJpbmUodGVtcGxhdGUsIHZhbHVlcywgc3RhdGUpIHtcbiAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSkge1xuICAgIHJldHVybiB2YWx1ZXNbKytzdGF0ZS5pbmRleF1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IHRlbXBsYXRlICYmIHRlbXBsYXRlLmNvbnN0cnVjdG9yXG5cbiAgICBpZiAoY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICBjb25zdCBuID0gdGVtcGxhdGUubGVuZ3RoXG4gICAgICBjb25zdCBuZXh0ID0gQXJyYXkobilcbiAgICAgIGZvciAobGV0IGk9MDsgaTxuOyArK2kpXG4gICAgICAgIG5leHRbaV0gPSBjb21iaW5lKHRlbXBsYXRlW2ldLCB2YWx1ZXMsIHN0YXRlKVxuICAgICAgcmV0dXJuIG5leHRcbiAgICB9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgIGNvbnN0IG5leHQgPSB7fVxuICAgICAgZm9yIChjb25zdCBrIGluIHRlbXBsYXRlKVxuICAgICAgICBuZXh0W2tdID0gY29tYmluZSh0ZW1wbGF0ZVtrXSwgdmFsdWVzLCBzdGF0ZSlcbiAgICAgIHJldHVybiBuZXh0XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0ZW1wbGF0ZVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2UoeHMpIHtcbiAgaWYgKCEoeHMgaW5zdGFuY2VvZiBBcnJheSkpXG4gICAgcmV0dXJuIHhzXG5cbiAgY29uc3Qgbm0xID0geHMubGVuZ3RoLTFcbiAgY29uc3QgZiA9IHhzW25tMV1cbiAgcmV0dXJuIGYgaW5zdGFuY2VvZiBGdW5jdGlvblxuICAgID8gZi5hcHBseSh2b2lkIDAsIHhzLnNsaWNlKDAsIG5tMSkpXG4gICAgOiB4c1xufVxuXG4vL1xuXG5mdW5jdGlvbiBDb21iaW5lKCkge1xuICBQcm9wZXJ0eS5jYWxsKHRoaXMpXG59XG5cbmluaGVyaXQoQ29tYmluZSwgUHJvcGVydHksIHtcbiAgX21heWJlRW1pdFZhbHVlKG5leHQpIHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fY3VycmVudEV2ZW50XG4gICAgaWYgKCFwcmV2IHx8ICFpZGVudGljYWxVKHByZXYudmFsdWUsIG5leHQpKVxuICAgICAgdGhpcy5fZW1pdFZhbHVlKG5leHQpXG4gIH1cbn0pXG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVNYW55KHRlbXBsYXRlLCBuKSB7XG4gIENvbWJpbmUuY2FsbCh0aGlzKVxuICB0aGlzLl90ZW1wbGF0ZSA9IHRlbXBsYXRlXG4gIHRoaXMuX2hhbmRsZXJzID0gblxuICB0aGlzLl92YWx1ZXMgPSBudWxsXG59XG5cbmluaGVyaXQoQ29tYmluZU1hbnksIENvbWJpbmUsIHtcbiAgX29uQWN0aXZhdGlvbigpIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlXG4gICAgY29uc3QgbiA9IHRoaXMuX2hhbmRsZXJzXG4gICAgY29uc3QgaGFuZGxlcnMgPSBBcnJheShuKVxuICAgIGNvbnN0IHZhbHVlcyA9IEFycmF5KG4pXG4gICAgZm9yIChsZXQgaT0wOyBpPG47ICsraSkge1xuICAgICAgdmFsdWVzW2ldID0gdGhpc1xuICAgICAgaGFuZGxlcnNbaV0gPSB0aGlzXG4gICAgfVxuICAgIHRoaXMuX2hhbmRsZXJzID0gaGFuZGxlcnNcbiAgICB0aGlzLl92YWx1ZXMgPSB2YWx1ZXNcbiAgICBzdWJzY3JpYmUodGVtcGxhdGUsIGhhbmRsZXJzLCB0aGlzKVxuICB9LFxuICBfaGFuZGxlQW55KGhhbmRsZXIsIGUpIHtcbiAgICBjb25zdCBoYW5kbGVycyA9IHRoaXMuX2hhbmRsZXJzXG4gICAgbGV0IGk9MFxuICAgIHdoaWxlIChoYW5kbGVyc1tpXSAhPT0gaGFuZGxlcilcbiAgICAgICsraVxuICAgIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgICBjYXNlIFwidmFsdWVcIjoge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSB0aGlzLl92YWx1ZXNcbiAgICAgICAgdmFsdWVzW2ldID0gZS52YWx1ZVxuICAgICAgICBmb3IgKGxldCBqPTAsIG49dmFsdWVzLmxlbmd0aDsgajxuOyArK2opXG4gICAgICAgICAgaWYgKHZhbHVlc1tqXSA9PT0gdGhpcylcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB0aGlzLl9tYXliZUVtaXRWYWx1ZShpbnZva2UoY29tYmluZSh0aGlzLl90ZW1wbGF0ZSwgdmFsdWVzLCB7aW5kZXg6IC0xfSkpKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY2FzZSBcImVycm9yXCI6IHtcbiAgICAgICAgdGhpcy5fZW1pdEVycm9yKGUudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGhhbmRsZXJzW2ldID0gbnVsbFxuICAgICAgICBmb3IgKGxldCBqPTAsIG49aGFuZGxlcnMubGVuZ3RoOyBqPG47ICsrailcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbal0pXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgdGhpcy5faGFuZGxlcnMgPSBoYW5kbGVycy5sZW5ndGhcbiAgICAgICAgdGhpcy5fdmFsdWVzID0gbnVsbFxuICAgICAgICB0aGlzLl9lbWl0RW5kKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9vbkRlYWN0aXZhdGlvbigpIHtcbiAgICBjb25zdCBoYW5kbGVycyA9IHRoaXMuX2hhbmRsZXJzXG4gICAgdGhpcy5faGFuZGxlcnMgPSBoYW5kbGVycy5sZW5ndGhcbiAgICB0aGlzLl92YWx1ZXMgPSBudWxsXG4gICAgdW5zdWJzY3JpYmUodGhpcy5fdGVtcGxhdGUsIGhhbmRsZXJzKVxuICB9XG59KVxuXG4vL1xuXG5mdW5jdGlvbiBDb21iaW5lT25lKHRlbXBsYXRlKSB7XG4gIENvbWJpbmUuY2FsbCh0aGlzKVxuICB0aGlzLl90ZW1wbGF0ZSA9IHRlbXBsYXRlXG4gIHRoaXMuX2hhbmRsZXIgPSBudWxsXG59XG5cbmluaGVyaXQoQ29tYmluZU9uZSwgQ29tYmluZSwge1xuICBfb25BY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBlID0+IHRoaXMuX2hhbmRsZUFueShlKVxuICAgIHRoaXMuX2hhbmRsZXIgPSBoYW5kbGVyXG4gICAgZm9yRWFjaCh0aGlzLl90ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiBvYnNlcnZhYmxlLm9uQW55KGhhbmRsZXIpKVxuICB9LFxuICBfaGFuZGxlQW55KGUpIHtcbiAgICBzd2l0Y2ggKGUudHlwZSkge1xuICAgICAgY2FzZSBcInZhbHVlXCI6XG4gICAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKGludm9rZShjb21iaW5lKHRoaXMuX3RlbXBsYXRlLCBbZS52YWx1ZV0sIHtpbmRleDogLTF9KSkpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIFwiZXJyb3JcIjpcbiAgICAgICAgdGhpcy5fZW1pdEVycm9yKGUudmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLl9oYW5kbGVyID0gbnVsbFxuICAgICAgICB0aGlzLl9lbWl0RW5kKClcbiAgICAgICAgYnJlYWtcbiAgICB9XG4gIH0sXG4gIF9vbkRlYWN0aXZhdGlvbigpIHtcbiAgICBjb25zdCB7X2hhbmRsZXJ9ID0gdGhpc1xuICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgZm9yRWFjaCh0aGlzLl90ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiBvYnNlcnZhYmxlLm9mZkFueShfaGFuZGxlcikpXG4gIH1cbn0pXG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVPbmVXaXRoKG9ic2VydmFibGUsIGZuKSB7XG4gIENvbWJpbmUuY2FsbCh0aGlzKVxuICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZVxuICB0aGlzLl9mbiA9IGZuXG4gIHRoaXMuX2hhbmRsZXIgPSBudWxsXG59XG5cbmluaGVyaXQoQ29tYmluZU9uZVdpdGgsIENvbWJpbmUsIHtcbiAgX29uQWN0aXZhdGlvbigpIHtcbiAgICBjb25zdCBoYW5kbGVyID0gZSA9PiB0aGlzLl9oYW5kbGVBbnkoZSlcbiAgICB0aGlzLl9oYW5kbGVyID0gaGFuZGxlclxuICAgIHRoaXMuX29ic2VydmFibGUub25BbnkoaGFuZGxlcilcbiAgfSxcbiAgX2hhbmRsZUFueShlKSB7XG4gICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJ2YWx1ZVwiOlxuICAgICAgICB0aGlzLl9tYXliZUVtaXRWYWx1ZSh0aGlzLl9mbihlLnZhbHVlKSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgICAgIHRoaXMuX2VtaXRFbmQoKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfSxcbiAgX29uRGVhY3RpdmF0aW9uKCkge1xuICAgIGNvbnN0IHtfaGFuZGxlciwgX29ic2VydmFibGV9ID0gdGhpc1xuICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgX29ic2VydmFibGUub2ZmQW55KF9oYW5kbGVyKVxuICB9XG59KVxuXG4vL1xuXG5leHBvcnQgY29uc3QgbGlmdDFTaGFsbG93ID0gZm4gPT4geCA9PlxuICB4IGluc3RhbmNlb2YgT2JzZXJ2YWJsZSA/IG5ldyBDb21iaW5lT25lV2l0aCh4LCBmbikgOiBmbih4KVxuXG5leHBvcnQgY29uc3QgbGlmdDEgPSBmbiA9PiB4ID0+IHtcbiAgaWYgKHggaW5zdGFuY2VvZiBPYnNlcnZhYmxlKVxuICAgIHJldHVybiBuZXcgQ29tYmluZU9uZVdpdGgoeCwgZm4pXG4gIGNvbnN0IG4gPSBjb3VudFRlbXBsYXRlKHgpXG4gIGlmICgwID09PSBuKVxuICAgIHJldHVybiBmbih4KVxuICBpZiAoMSA9PT0gbilcbiAgICByZXR1cm4gbmV3IENvbWJpbmVPbmUoW3gsIGZuXSlcbiAgcmV0dXJuIG5ldyBDb21iaW5lTWFueShbeCwgZm5dLCBuKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlmdChmbikge1xuICBjb25zdCBmbk4gPSBmbi5sZW5ndGhcbiAgc3dpdGNoIChmbk4pIHtcbiAgICBjYXNlIDA6IHJldHVybiBmblxuICAgIGNhc2UgMTogcmV0dXJuIGxpZnQxKGZuKVxuICAgIGRlZmF1bHQ6IHJldHVybiBhcml0eU4oZm5OLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCB4c04gPSBhcmd1bWVudHMubGVuZ3RoLCB4cyA9IEFycmF5KHhzTilcbiAgICAgIGZvciAobGV0IGk9MDsgaTx4c047ICsraSlcbiAgICAgICAgeHNbaV0gPSBhcmd1bWVudHNbaV1cbiAgICAgIGNvbnN0IG4gPSBjb3VudEFycmF5KHhzKVxuICAgICAgaWYgKDAgPT09IG4pXG4gICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCB4cylcbiAgICAgIHhzLnB1c2goZm4pXG4gICAgICBpZiAoMSA9PT0gbilcbiAgICAgICAgbmV3IENvbWJpbmVPbmUoeHMpXG4gICAgICByZXR1cm4gbmV3IENvbWJpbmVNYW55KHhzLCBuKVxuICAgIH0pXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKC4uLnRlbXBsYXRlKSB7XG4gIGNvbnN0IG4gPSBjb3VudEFycmF5KHRlbXBsYXRlKVxuICBzd2l0Y2ggKG4pIHtcbiAgICBjYXNlIDA6IHJldHVybiBpbnZva2UodGVtcGxhdGUpXG4gICAgY2FzZSAxOiByZXR1cm4gKHRlbXBsYXRlLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVswXSBpbnN0YW5jZW9mIE9ic2VydmFibGUgJiZcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVbMV0gaW5zdGFuY2VvZiBGdW5jdGlvblxuICAgICAgICAgICAgICAgICAgICA/IG5ldyBDb21iaW5lT25lV2l0aCh0ZW1wbGF0ZVswXSwgdGVtcGxhdGVbMV0pXG4gICAgICAgICAgICAgICAgICAgIDogbmV3IENvbWJpbmVPbmUodGVtcGxhdGUpKVxuICAgIGRlZmF1bHQ6IHJldHVybiBuZXcgQ29tYmluZU1hbnkodGVtcGxhdGUsIG4pXG4gIH1cbn1cbiJdfQ==
