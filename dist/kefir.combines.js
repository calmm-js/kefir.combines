(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.kefir || (g.kefir = {})).combines = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lift = exports.lift1 = exports.lift1Shallow = undefined;

exports.default = function () {
  for (var _len2 = arguments.length, template = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    template[_key2] = arguments[_key2];
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

Combine.prototype = Object.create(_kefir.Property.prototype);

Combine.prototype._maybeEmitValue = function (next) {
  var prev = this._currentEvent;
  if (!prev || !(0, _infestines.identicalU)(prev.value, next)) this._emitValue(next);
};

//

function CombineMany(template, n) {
  Combine.call(this);
  this._template = template;
  this._handlers = n;
  this._values = null;
}

CombineMany.prototype = Object.create(Combine.prototype);

CombineMany.prototype._onActivation = function () {
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
};

CombineMany.prototype._handleAny = function (handler, e) {
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
};

CombineMany.prototype._onDeactivation = function () {
  var handlers = this._handlers;
  this._handlers = handlers.length;
  this._values = null;
  unsubscribe(this._template, handlers);
};

//

function CombineOne(template) {
  Combine.call(this);
  this._template = template;
  this._handler = null;
}

CombineOne.prototype = Object.create(Combine.prototype);

CombineOne.prototype._onActivation = function () {
  var _this = this;

  var handler = function handler(e) {
    return _this._handleAny(e);
  };
  this._handler = handler;
  forEach(this._template, function (observable) {
    return observable.onAny(handler);
  });
};

CombineOne.prototype._handleAny = function (e) {
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
};

CombineOne.prototype._onDeactivation = function () {
  var _handler = this._handler;

  this._handler = null;
  forEach(this._template, function (observable) {
    return observable.offAny(_handler);
  });
};

//

function CombineOneWith(observable, fn) {
  Combine.call(this);
  this._observable = observable;
  this._fn = fn;
  this._handler = null;
}

CombineOneWith.prototype = Object.create(Combine.prototype);

CombineOneWith.prototype._onActivation = function () {
  var _this2 = this;

  var handler = function handler(e) {
    return _this2._handleAny(e);
  };
  this._handler = handler;
  this._observable.onAny(handler);
};

CombineOneWith.prototype._handleAny = function (e) {
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
};

CombineOneWith.prototype._onDeactivation = function () {
  var _handler = this._handler,
      _observable = this._observable;

  this._handler = null;
  _observable.offAny(_handler);
};

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

var lift = exports.lift = function lift(fn) {
  return (0, _infestines.arityN)(fn.length, function () {
    for (var _len = arguments.length, xs = Array(_len), _key = 0; _key < _len; _key++) {
      xs[_key] = arguments[_key];
    }

    if (1 === xs.length) return lift1(fn)(xs[0]);
    var n = countArray(xs);
    if (0 === n) return fn.apply(undefined, xs);
    if (1 === n) new CombineOne([].concat(xs, [fn]));
    return new CombineMany([].concat(xs, [fn]), n);
  });
};

},{"infestines":undefined,"kefir":undefined}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva2VmaXIuY29tYmluZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O2tCQzRSZSxZQUF1QjtBQUFBLHFDQUFWLFFBQVU7QUFBVixZQUFVO0FBQUE7O0FBQ3BDLE1BQU0sSUFBSSxXQUFXLFFBQVgsQ0FBVjtBQUNBLFVBQVEsQ0FBUjtBQUNFLFNBQUssQ0FBTDtBQUFRLGFBQU8sT0FBTyxRQUFQLENBQVA7QUFDUixTQUFLLENBQUw7QUFBUSxhQUFRLFNBQVMsTUFBVCxLQUFvQixDQUFwQixJQUNBLFNBQVMsQ0FBVCw4QkFEQSxJQUVBLFNBQVMsQ0FBVCxhQUF1QixRQUZ2QixHQUdFLElBQUksY0FBSixDQUFtQixTQUFTLENBQVQsQ0FBbkIsRUFBZ0MsU0FBUyxDQUFULENBQWhDLENBSEYsR0FJRSxJQUFJLFVBQUosQ0FBZSxRQUFmLENBSlY7QUFLUjtBQUFTLGFBQU8sSUFBSSxXQUFKLENBQWdCLFFBQWhCLEVBQTBCLENBQTFCLENBQVA7QUFQWDtBQVNELEM7O0FBdlNEOztBQUNBOztBQUVBOztBQUVBLFNBQVMsT0FBVCxDQUFpQixRQUFqQixFQUEyQixFQUEzQixFQUErQjtBQUM3QixNQUFJLHFDQUFKLEVBQW9DO0FBQ2xDLE9BQUcsUUFBSDtBQUNELEdBRkQsTUFFTztBQUNMLFFBQU0sZUFBYyxZQUFZLFNBQVMsV0FBekM7O0FBRUEsUUFBSSxpQkFBZ0IsS0FBcEIsRUFDRSxLQUFLLElBQUksSUFBRSxDQUFOLEVBQVMsSUFBRSxTQUFTLE1BQXpCLEVBQWlDLElBQUUsQ0FBbkMsRUFBc0MsRUFBRSxDQUF4QztBQUNFLGNBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFBckI7QUFERixLQURGLE1BR0ssSUFBSSxpQkFBZ0IsTUFBcEIsRUFDSCxLQUFLLElBQU0sQ0FBWCxJQUFnQixRQUFoQjtBQUNFLGNBQVEsU0FBUyxDQUFULENBQVIsRUFBcUIsRUFB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LFFBQU0sSUFBSSxXQUFXLEVBQVgsQ0FBVjtBQUNBLFFBQUksTUFBTSxDQUFWLEVBQ0UsT0FBTyxvQkFBTSxFQUFOLENBQVA7QUFDRixRQUFJLE1BQU0sQ0FBVixFQUNFLElBQUksVUFBSixXQUFtQixFQUFuQixHQUF1QixFQUF2QjtBQUNGLFdBQU8sSUFBSSxXQUFKLFdBQW9CLEVBQXBCLEdBQXdCLEVBQXhCLElBQTZCLENBQTdCLENBQVA7QUFDRCxHQVR5QixDQUFOO0FBQUEsQ0FBYiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQge09ic2VydmFibGUsIFByb3BlcnR5fSBmcm9tIFwia2VmaXJcIlxuaW1wb3J0IHthcml0eU4sIGlkZW50aWNhbFV9IGZyb20gXCJpbmZlc3RpbmVzXCJcblxuLy9cblxuZnVuY3Rpb24gZm9yRWFjaCh0ZW1wbGF0ZSwgZm4pIHtcbiAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSkge1xuICAgIGZuKHRlbXBsYXRlKVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gdGVtcGxhdGUgJiYgdGVtcGxhdGUuY29uc3RydWN0b3JcblxuICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gQXJyYXkpXG4gICAgICBmb3IgKGxldCBpPTAsIG49dGVtcGxhdGUubGVuZ3RoOyBpPG47ICsraSlcbiAgICAgICAgZm9yRWFjaCh0ZW1wbGF0ZVtpXSwgZm4pXG4gICAgZWxzZSBpZiAoY29uc3RydWN0b3IgPT09IE9iamVjdClcbiAgICAgIGZvciAoY29uc3QgayBpbiB0ZW1wbGF0ZSlcbiAgICAgICAgZm9yRWFjaCh0ZW1wbGF0ZVtrXSwgZm4pXG4gIH1cbn1cblxuZnVuY3Rpb24gY291bnRBcnJheSh0ZW1wbGF0ZSkge1xuICBsZXQgYyA9IDBcbiAgZm9yIChsZXQgaT0wLCBuPXRlbXBsYXRlLmxlbmd0aDsgaTxuOyArK2kpXG4gICAgYyArPSBjb3VudCh0ZW1wbGF0ZVtpXSlcbiAgcmV0dXJuIGNcbn1cblxuZnVuY3Rpb24gY291bnRPYmplY3QodGVtcGxhdGUpIHtcbiAgbGV0IGMgPSAwXG4gIGZvciAoY29uc3QgayBpbiB0ZW1wbGF0ZSlcbiAgICBjICs9IGNvdW50KHRlbXBsYXRlW2tdKVxuICByZXR1cm4gY1xufVxuXG5mdW5jdGlvbiBjb3VudFRlbXBsYXRlKHRlbXBsYXRlKSB7XG4gIGlmICh0ZW1wbGF0ZSkge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gdGVtcGxhdGUuY29uc3RydWN0b3JcbiAgICBpZiAoY29uc3RydWN0b3IgPT09IEFycmF5KVxuICAgICAgcmV0dXJuIGNvdW50QXJyYXkodGVtcGxhdGUpXG4gICAgaWYgKGNvbnN0cnVjdG9yID09PSBPYmplY3QpXG4gICAgICByZXR1cm4gY291bnRPYmplY3QodGVtcGxhdGUpXG4gIH1cbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY291bnQodGVtcGxhdGUpIHtcbiAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgT2JzZXJ2YWJsZSlcbiAgICByZXR1cm4gMVxuICBlbHNlXG4gICAgcmV0dXJuIGNvdW50VGVtcGxhdGUodGVtcGxhdGUpXG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZSh0ZW1wbGF0ZSwgaGFuZGxlcnMsIHNlbGYpIHtcbiAgbGV0IGluZGV4ID0gLTFcbiAgZm9yRWFjaCh0ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGUgPT4gc2VsZi5faGFuZGxlQW55KGhhbmRsZXIsIGUpXG4gICAgaGFuZGxlcnNbKytpbmRleF0gPSBoYW5kbGVyXG4gICAgb2JzZXJ2YWJsZS5vbkFueShoYW5kbGVyKVxuICB9KVxufVxuXG5mdW5jdGlvbiB1bnN1YnNjcmliZSh0ZW1wbGF0ZSwgaGFuZGxlcnMpIHtcbiAgbGV0IGluZGV4ID0gLTFcbiAgZm9yRWFjaCh0ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiB7XG4gICAgY29uc3QgaGFuZGxlciA9IGhhbmRsZXJzWysraW5kZXhdXG4gICAgaWYgKGhhbmRsZXIpXG4gICAgICBvYnNlcnZhYmxlLm9mZkFueShoYW5kbGVyKVxuICB9KVxufVxuXG5mdW5jdGlvbiBjb21iaW5lKHRlbXBsYXRlLCB2YWx1ZXMsIHN0YXRlKSB7XG4gIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIE9ic2VydmFibGUpIHtcbiAgICByZXR1cm4gdmFsdWVzWysrc3RhdGUuaW5kZXhdXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSB0ZW1wbGF0ZSAmJiB0ZW1wbGF0ZS5jb25zdHJ1Y3RvclxuXG4gICAgaWYgKGNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuICAgICAgY29uc3QgbiA9IHRlbXBsYXRlLmxlbmd0aFxuICAgICAgY29uc3QgbmV4dCA9IEFycmF5KG4pXG4gICAgICBmb3IgKGxldCBpPTA7IGk8bjsgKytpKVxuICAgICAgICBuZXh0W2ldID0gY29tYmluZSh0ZW1wbGF0ZVtpXSwgdmFsdWVzLCBzdGF0ZSlcbiAgICAgIHJldHVybiBuZXh0XG4gICAgfSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICBjb25zdCBuZXh0ID0ge31cbiAgICAgIGZvciAoY29uc3QgayBpbiB0ZW1wbGF0ZSlcbiAgICAgICAgbmV4dFtrXSA9IGNvbWJpbmUodGVtcGxhdGVba10sIHZhbHVlcywgc3RhdGUpXG4gICAgICByZXR1cm4gbmV4dFxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlKHhzKSB7XG4gIGlmICghKHhzIGluc3RhbmNlb2YgQXJyYXkpKVxuICAgIHJldHVybiB4c1xuXG4gIGNvbnN0IG5tMSA9IHhzLmxlbmd0aC0xXG4gIGNvbnN0IGYgPSB4c1tubTFdXG4gIHJldHVybiBmIGluc3RhbmNlb2YgRnVuY3Rpb25cbiAgICA/IGYuYXBwbHkodm9pZCAwLCB4cy5zbGljZSgwLCBubTEpKVxuICAgIDogeHNcbn1cblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZSgpIHtcbiAgUHJvcGVydHkuY2FsbCh0aGlzKVxufVxuXG5Db21iaW5lLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUHJvcGVydHkucHJvdG90eXBlKVxuXG5Db21iaW5lLnByb3RvdHlwZS5fbWF5YmVFbWl0VmFsdWUgPSBmdW5jdGlvbiAobmV4dCkge1xuICBjb25zdCBwcmV2ID0gdGhpcy5fY3VycmVudEV2ZW50XG4gIGlmICghcHJldiB8fCAhaWRlbnRpY2FsVShwcmV2LnZhbHVlLCBuZXh0KSlcbiAgICB0aGlzLl9lbWl0VmFsdWUobmV4dClcbn1cblxuLy9cblxuZnVuY3Rpb24gQ29tYmluZU1hbnkodGVtcGxhdGUsIG4pIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlcnMgPSBuXG4gIHRoaXMuX3ZhbHVlcyA9IG51bGxcbn1cblxuQ29tYmluZU1hbnkucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb21iaW5lLnByb3RvdHlwZSlcblxuQ29tYmluZU1hbnkucHJvdG90eXBlLl9vbkFjdGl2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5fdGVtcGxhdGVcbiAgY29uc3QgbiA9IHRoaXMuX2hhbmRsZXJzXG4gIGNvbnN0IGhhbmRsZXJzID0gQXJyYXkobilcbiAgY29uc3QgdmFsdWVzID0gQXJyYXkobilcbiAgZm9yIChsZXQgaT0wOyBpPG47ICsraSkge1xuICAgIHZhbHVlc1tpXSA9IHRoaXNcbiAgICBoYW5kbGVyc1tpXSA9IHRoaXNcbiAgfVxuICB0aGlzLl9oYW5kbGVycyA9IGhhbmRsZXJzXG4gIHRoaXMuX3ZhbHVlcyA9IHZhbHVlc1xuICBzdWJzY3JpYmUodGVtcGxhdGUsIGhhbmRsZXJzLCB0aGlzKVxufVxuXG5Db21iaW5lTWFueS5wcm90b3R5cGUuX2hhbmRsZUFueSA9IGZ1bmN0aW9uIChoYW5kbGVyLCBlKSB7XG4gIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgbGV0IGk9MFxuICB3aGlsZSAoaGFuZGxlcnNbaV0gIT09IGhhbmRsZXIpXG4gICAgKytpXG4gIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgY2FzZSBcInZhbHVlXCI6IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IHRoaXMuX3ZhbHVlc1xuICAgICAgdmFsdWVzW2ldID0gZS52YWx1ZVxuICAgICAgZm9yIChsZXQgaj0wLCBuPXZhbHVlcy5sZW5ndGg7IGo8bjsgKytqKVxuICAgICAgICBpZiAodmFsdWVzW2pdID09PSB0aGlzKVxuICAgICAgICAgIHJldHVyblxuICAgICAgdGhpcy5fbWF5YmVFbWl0VmFsdWUoaW52b2tlKGNvbWJpbmUodGhpcy5fdGVtcGxhdGUsIHZhbHVlcywge2luZGV4OiAtMX0pKSlcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGNhc2UgXCJlcnJvclwiOiB7XG4gICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGhhbmRsZXJzW2ldID0gbnVsbFxuICAgICAgZm9yIChsZXQgaj0wLCBuPWhhbmRsZXJzLmxlbmd0aDsgajxuOyArK2opXG4gICAgICAgIGlmIChoYW5kbGVyc1tqXSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgIHRoaXMuX2hhbmRsZXJzID0gaGFuZGxlcnMubGVuZ3RoXG4gICAgICB0aGlzLl92YWx1ZXMgPSBudWxsXG4gICAgICB0aGlzLl9lbWl0RW5kKClcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG59XG5cbkNvbWJpbmVNYW55LnByb3RvdHlwZS5fb25EZWFjdGl2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IGhhbmRsZXJzID0gdGhpcy5faGFuZGxlcnNcbiAgdGhpcy5faGFuZGxlcnMgPSBoYW5kbGVycy5sZW5ndGhcbiAgdGhpcy5fdmFsdWVzID0gbnVsbFxuICB1bnN1YnNjcmliZSh0aGlzLl90ZW1wbGF0ZSwgaGFuZGxlcnMpXG59XG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVPbmUodGVtcGxhdGUpIHtcbiAgQ29tYmluZS5jYWxsKHRoaXMpXG4gIHRoaXMuX3RlbXBsYXRlID0gdGVtcGxhdGVcbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbn1cblxuQ29tYmluZU9uZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbWJpbmUucHJvdG90eXBlKVxuXG5Db21iaW5lT25lLnByb3RvdHlwZS5fb25BY3RpdmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCBoYW5kbGVyID0gZSA9PiB0aGlzLl9oYW5kbGVBbnkoZSlcbiAgdGhpcy5faGFuZGxlciA9IGhhbmRsZXJcbiAgZm9yRWFjaCh0aGlzLl90ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiBvYnNlcnZhYmxlLm9uQW55KGhhbmRsZXIpKVxufVxuXG5Db21iaW5lT25lLnByb3RvdHlwZS5faGFuZGxlQW55ID0gZnVuY3Rpb24gKGUpIHtcbiAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICBjYXNlIFwidmFsdWVcIjpcbiAgICAgIHRoaXMuX21heWJlRW1pdFZhbHVlKGludm9rZShjb21iaW5lKHRoaXMuX3RlbXBsYXRlLCBbZS52YWx1ZV0sIHtpbmRleDogLTF9KSkpXG4gICAgICBicmVha1xuICAgIGNhc2UgXCJlcnJvclwiOlxuICAgICAgdGhpcy5fZW1pdEVycm9yKGUudmFsdWUpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLl9oYW5kbGVyID0gbnVsbFxuICAgICAgdGhpcy5fZW1pdEVuZCgpXG4gICAgICBicmVha1xuICB9XG59XG5cbkNvbWJpbmVPbmUucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qge19oYW5kbGVyfSA9IHRoaXNcbiAgdGhpcy5faGFuZGxlciA9IG51bGxcbiAgZm9yRWFjaCh0aGlzLl90ZW1wbGF0ZSwgb2JzZXJ2YWJsZSA9PiBvYnNlcnZhYmxlLm9mZkFueShfaGFuZGxlcikpXG59XG5cbi8vXG5cbmZ1bmN0aW9uIENvbWJpbmVPbmVXaXRoKG9ic2VydmFibGUsIGZuKSB7XG4gIENvbWJpbmUuY2FsbCh0aGlzKVxuICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZVxuICB0aGlzLl9mbiA9IGZuXG4gIHRoaXMuX2hhbmRsZXIgPSBudWxsXG59XG5cbkNvbWJpbmVPbmVXaXRoLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ29tYmluZS5wcm90b3R5cGUpXG5cbkNvbWJpbmVPbmVXaXRoLnByb3RvdHlwZS5fb25BY3RpdmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCBoYW5kbGVyID0gZSA9PiB0aGlzLl9oYW5kbGVBbnkoZSlcbiAgdGhpcy5faGFuZGxlciA9IGhhbmRsZXJcbiAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShoYW5kbGVyKVxufVxuXG5Db21iaW5lT25lV2l0aC5wcm90b3R5cGUuX2hhbmRsZUFueSA9IGZ1bmN0aW9uIChlKSB7XG4gIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgY2FzZSBcInZhbHVlXCI6XG4gICAgICB0aGlzLl9tYXliZUVtaXRWYWx1ZSh0aGlzLl9mbihlLnZhbHVlKSlcbiAgICAgIGJyZWFrXG4gICAgY2FzZSBcImVycm9yXCI6XG4gICAgICB0aGlzLl9lbWl0RXJyb3IoZS52YWx1ZSlcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gICAgICB0aGlzLl9lbWl0RW5kKClcbiAgICAgIGJyZWFrXG4gIH1cbn1cblxuQ29tYmluZU9uZVdpdGgucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qge19oYW5kbGVyLCBfb2JzZXJ2YWJsZX0gPSB0aGlzXG4gIHRoaXMuX2hhbmRsZXIgPSBudWxsXG4gIF9vYnNlcnZhYmxlLm9mZkFueShfaGFuZGxlcilcbn1cblxuLy9cblxuZXhwb3J0IGNvbnN0IGxpZnQxU2hhbGxvdyA9IGZuID0+IHggPT5cbiAgeCBpbnN0YW5jZW9mIE9ic2VydmFibGUgPyBuZXcgQ29tYmluZU9uZVdpdGgoeCwgZm4pIDogZm4oeClcblxuZXhwb3J0IGNvbnN0IGxpZnQxID0gZm4gPT4geCA9PiB7XG4gIGlmICh4IGluc3RhbmNlb2YgT2JzZXJ2YWJsZSlcbiAgICByZXR1cm4gbmV3IENvbWJpbmVPbmVXaXRoKHgsIGZuKVxuICBjb25zdCBuID0gY291bnRUZW1wbGF0ZSh4KVxuICBpZiAoMCA9PT0gbilcbiAgICByZXR1cm4gZm4oeClcbiAgaWYgKDEgPT09IG4pXG4gICAgcmV0dXJuIG5ldyBDb21iaW5lT25lKFt4LCBmbl0pXG4gIHJldHVybiBuZXcgQ29tYmluZU1hbnkoW3gsIGZuXSwgbilcbn1cblxuZXhwb3J0IGNvbnN0IGxpZnQgPSBmbiA9PiBhcml0eU4oZm4ubGVuZ3RoLCAoLi4ueHMpID0+IHtcbiAgaWYgKDEgPT09IHhzLmxlbmd0aClcbiAgICByZXR1cm4gbGlmdDEoZm4pKHhzWzBdKVxuICBjb25zdCBuID0gY291bnRBcnJheSh4cylcbiAgaWYgKDAgPT09IG4pXG4gICAgcmV0dXJuIGZuKC4uLnhzKVxuICBpZiAoMSA9PT0gbilcbiAgICBuZXcgQ29tYmluZU9uZShbLi4ueHMsIGZuXSlcbiAgcmV0dXJuIG5ldyBDb21iaW5lTWFueShbLi4ueHMsIGZuXSwgbilcbn0pXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICguLi50ZW1wbGF0ZSkge1xuICBjb25zdCBuID0gY291bnRBcnJheSh0ZW1wbGF0ZSlcbiAgc3dpdGNoIChuKSB7XG4gICAgY2FzZSAwOiByZXR1cm4gaW52b2tlKHRlbXBsYXRlKVxuICAgIGNhc2UgMTogcmV0dXJuICh0ZW1wbGF0ZS5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVbMF0gaW5zdGFuY2VvZiBPYnNlcnZhYmxlICYmXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlWzFdIGluc3RhbmNlb2YgRnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgPyBuZXcgQ29tYmluZU9uZVdpdGgodGVtcGxhdGVbMF0sIHRlbXBsYXRlWzFdKVxuICAgICAgICAgICAgICAgICAgICA6IG5ldyBDb21iaW5lT25lKHRlbXBsYXRlKSlcbiAgICBkZWZhdWx0OiByZXR1cm4gbmV3IENvbWJpbmVNYW55KHRlbXBsYXRlLCBuKVxuICB9XG59XG4iXX0=
