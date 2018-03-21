# Vanillabox
A VanillaJS Lightbox.

Uses I18N features like

- focus stays in lightbox
- aria-hidden is used to show/hide elements

Use mouse, keyboard or touch to navigate.

Tested in Firefox, Chrome, Edge 16, IE11.

Demo http://cthedot.de/vanillabox/

## Usage

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

## API

    var box = vanillabox(
      document.getElementById('singleitem')
    )

    box.open()
    box.prev()
    box.next()
    box.close()