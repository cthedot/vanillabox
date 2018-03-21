# Vanillabox
A VanillaJS Lightbox.

    document.addEventListener("DOMContentLoaded", function() {

      // initialize single box
      var box = vanillabox(
        document.getElementById('singleitem')
      )

      // or multiple at once

      var boxes = vanillabox(
        document.querySelectorAll('.box')
      )
    })
