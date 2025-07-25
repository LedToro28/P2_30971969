// patch-util.js
if (typeof require('util').isArray === 'function') {
  Object.defineProperty(require('util'), 'isArray', {
    value: Array.isArray,
    writable: false
  });
}