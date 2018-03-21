; (function () {
  'use strict';

  document.addEventListener("DOMContentLoaded", function() {
    var $extrabox = document.getElementById('extrabox')

    window.boxes = vanillabox(document.querySelectorAll('.box'))
  })
}())