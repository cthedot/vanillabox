# Vanillabox
A VanillaJS lightbox for images and other content.

The HTML is based on links (or a single link) to (large) images or content with an anchor id. Links with a common container are grouped into a slideshow. Each item uses the links optional title attribute value as the title and an optional figcaption as additional description (info).

```html
<!-- two images grouped with next/prev navigation -->
<ul class="box">
  <li>
    <a href="image1.jpg" title="Title 1">
      <figure>
        <img src="image1thumb.jpg" alt="1">
        <figcaption>Description 1</figcaption>
      </figure>
    </a>
  </li>
  <li>
    <a href="image2.jpg" title="Title 2">
      <figure>
        <img src="image2thumb.jpg" alt="2">
        <figcaption>Description 2</figcaption>
      </figure>
    </a>
  </li>
</ul>

<!-- lightbox with content from anchor -->
<a href="#anchor" title="Title" class="box">Lightbox with content</a>

<!-- the content: Style .boxcontent as needed -->
<div hidden id="anchor">
  <div class="boxcontent">
    <h3>Content of anchorlink</h3>
    <p>Some content with
      <a href="http://github.com">link</a> too</p>
      or a
      <video src="video.mp4"></video>
  </div>
</div>
```

```javascript
// init multiple items at once
var boxes = vanillabox(document.querySelectorAll('.box'))

// or a single item
var box = vanillabox(document.getElementById('box'))

// control the lightbox
box.open()
box.prev()
box.next()
box.close()
// remove event handlers if e.g. new init on same element
box.clean()
```


### Settings
Optional settings to overwrite, the default settings are:

```javascript
{
  linkSelector: "a",
  checkImage: function($link) {
    var src = $link.href.toLowerCase();

    return src.indexOf(".gif") != -1 ||
      src.indexOf(".jpg") != -1 ||
      src.indexOf(".png") != -1 ||
      src.indexOf(".svg") != -1
  },
  getTitle: function($link) {
    return $link.getAttribute("title");
  },
  useInfo: true,
  getInfo: function($link) {
    var $el = $link.querySelector("figcaption");
    return $el ? $el.innerHTML : "";
  },
  openCallback: function() {},
  nextOnClick: true,
  useSwipe: true,
  itemCallback: function($item, title, info) {},
  closeCallback: function() {}
}
```

Uses I18N features like

- focus stays in lightbox
- aria-hidden is used to show/hide elements

Use mouse, keyboard or touch to navigate.

Tested in Firefox, Chrome, Edge, IE11, Safari.
IE has limited support for larger than window images for which the slide has to be scrolled which seems a reasonable fallback. If image fits in viewport IE works fully anyway.

## Demo
http://cthedot.de/vanillabox/
