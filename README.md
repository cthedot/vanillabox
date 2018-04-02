# Vanillabox
A VanillaJS image lightbox.

The HTML is based on links (or a single link) to large images. A group of links is grouped into a slideshow. Each item uses the link optional title attribute value as the title and an optional figcaption as additional description (info). You can overwrite how to get these values, default settings are:

    {
      linkSelector: "a",
      getTitle: function($link) {
        return $link.getAttribute("title");
      },
      useInfo: true,
        getInfo: function($link) {
          var $el = $link.querySelector("figcaption");
          return $el ? $el.innerHTML : "";
      },
      openCallback: function() {},
      closeCallback: function() {}
    }

Uses I18N features like

- focus stays in lightbox
- aria-hidden is used to show/hide elements

Use mouse, keyboard or touch to navigate.

Tested in Firefox, Chrome, Edge 16, IE11.
IE has limited support for larger than window images for which the slide has to be scrolled which seems a reasonable fallback. If image fits in viewport IE works fully anyway.

Demo http://cthedot.de/vanillabox/

## Usage
    HTML
    <a href="link-to-large-image.jpg" class="box" title="optional title">
      <figure>
        <img src="thumbnail.jpg" alt="1">
        <figcaption>optional description</figcaption>
      </figure>
    </a>

    JS
    document.addEventListener("DOMContentLoaded", function() {
      // initialize single link or container
      var box = vanillabox(
        document.getElementById('box')
      )
      // or multiple containers/links at once
      var boxes = vanillabox(
        document.querySelectorAll('.box'), {
          // optional options
        }
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