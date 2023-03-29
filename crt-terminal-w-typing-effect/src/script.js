;(function() {

  'use strict';

  var element, string, length;

  element = document.querySelector('.screen');
  string  = element.innerText;
  length  = string.length;

  function timer(delay, repetitions) {
    var n, i;
    
    n = 0;
    i = window.setInterval(function () {
      element.innerText = string.substring(0, n);
      if (n++ === repetitions) {
        window.clearInterval(i);
      }
    }, delay);
  }

  timer(100, length);

})();