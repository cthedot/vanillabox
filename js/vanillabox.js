/*
 * a simple lightbox, with keyboard, mouse and touch interaction
 *
 * usage:
 *    call ``vanillabox($element)`` after document ready
 *
 *    $element: One or more DOM elements of <a> containing
 *    links to big images each containing a thumbnail image itself
 */
(function() {
  "use strict";

  // Polyfill for e.g. IE
  if (typeof Object.assign != "function") {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) {
        // .length of function is 2
        "use strict";
        if (target == null) {
          // TypeError if undefined or null
          throw new TypeError("Cannot convert undefined or null to object");
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];

          if (nextSource != null) {
            // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true
    });
  }

  function initSwipe($e, handler) {
    var POINTER_EVENTS = window.PointerEvent ? true : false;
    var start = {};
    var end = {};
    var tracking = false;
    var thresholdTime = 500;
    var thresholdDistance = 100;

    function startHandler(e) {
      tracking = true;
      /* Hack - e.timeStamp is whack in Fx/Android */
      start.t = new Date().getTime();
      start.x = POINTER_EVENTS ? e.clientX : e.touches[0].clientX;
      start.y = POINTER_EVENTS ? e.clientY : e.touches[0].clientY;
    }

    function moveHandler(e) {
      if (tracking) {
        e.preventDefault();
        end.x = POINTER_EVENTS ? e.clientX : e.touches[0].clientX;
        end.y = POINTER_EVENTS ? e.clientY : e.touches[0].clientY;
      }
    }

    function endEvent(e) {
      if (tracking) {
        tracking = false;
        var now = new Date().getTime();
        var deltaTime = now - start.t;
        var deltaX = end.x - start.x;
        var deltaY = end.y - start.y;
        // if not too slow work out what the movement was
        if (deltaTime < thresholdTime) {
          if (
            deltaX > thresholdDistance &&
            Math.abs(deltaY) < thresholdDistance
          ) {
            handler("left");
          } else if (
            -deltaX > thresholdDistance &&
            Math.abs(deltaY) < thresholdDistance
          ) {
            handler("right");
          } else if (
            deltaY > thresholdDistance &&
            Math.abs(deltaX) < thresholdDistance
          ) {
            handler("up");
          } else if (
            -deltaY > thresholdDistance &&
            Math.abs(deltaX) < thresholdDistance
          ) {
            handler("down");
          }
        }
      }
    }
    if (POINTER_EVENTS) {
      $e.addEventListener("pointerdown", startHandler, false);
      $e.addEventListener("pointermove", moveHandler, false);
      $e.addEventListener("pointerup", endEvent, false);
      $e.addEventListener("pointerleave", endEvent, false);
      $e.addEventListener("pointercancel", endEvent, false);
    } else if (window.TouchEvent) {
      $e.addEventListener("touchstart", startHandler, false);
      $e.addEventListener("touchmove", moveHandler, false);
      $e.addEventListener("touchend", endEvent, false);
    }
  }

  // vanillabox
  var FOCUSSABLES =
    "a[href], area[href], input:not([disabled])," +
    "select:not([disabled]), textarea:not([disabled])," +
    "button:not([disabled]), iframe, object, embed, *[tabindex]," +
    "*[contenteditable]";

  var firstFocussable;
  var lastFocussable;

  var settings;
  var prefix = "vanillabox";
  var alternate = true;
  var maxSize = {
    width: 0,
    height: 0
  };
  var state = {
    srcs: [],
    titles: [],
    infos: [],
    cached: [],
    isOpen: false,
    current: 0
  };
  var $body;
  var $closer;
  var $prev;
  var $next;
  var $vanillabox;
  var $title;
  var $status;
  var $info;
  var $items = [];
  var $focusBefore;

  function recalculate() {
    maxSize.height = window.innerHeight;
  }

  function setup() {
    // once only
    $body = document.getElementsByTagName("body")[0];

    $vanillabox = document.createElement("div");
    $vanillabox.setAttribute("aria-hidden", "true");
    $vanillabox.classList.add(prefix);
    $vanillabox.innerHTML = [
      '<div class="prefix-item"><img alt=""></div>',
      '<div class="prefix-item"><img alt=""></div>',
      '<button class="prefix-closer prefix-button" type="button">&times;</button>',
      '<span class="prefix-title"></span>',
      '<article class="prefix-info"></article>',
      '<span class="prefix-status"></span>',
      '<button class="prefix-prev prefix-button" type="button"></button>',
      '<button class="prefix-next prefix-button" type="button"></button>'
    ]
      .join("")
      .replace(/prefix\-/g, prefix + "-");

    $title = $vanillabox.querySelector("." + prefix + "-title");
    $status = $vanillabox.querySelector("." + prefix + "-status");
    $info = $vanillabox.querySelector("." + prefix + "-info");

    $closer = $vanillabox.querySelector("." + prefix + "-closer");
    $closer.addEventListener("click", close, false);

    $prev = $vanillabox.querySelector("." + prefix + "-prev");
    $prev.addEventListener("click", prev, false);

    $next = $vanillabox.querySelector("." + prefix + "-next");
    $next.addEventListener("click", next, false);

    [].forEach.call(
      $vanillabox.querySelectorAll("." + prefix + "-item"),
      function($item) {
        $item.addEventListener("click", close, false);
        $items.push($item);
      }
    );
    [].forEach.call($vanillabox.querySelectorAll("img"), function($item) {
      $item.addEventListener(
        "click",
        function(e) {
          e.stopPropagation();
          next();
        },
        false
      );
    });

    $body.appendChild($vanillabox);

    // EVENTS resize and touch
    window.addEventListener("resize", function(e) {
      requestAnimationFrame(recalculate);
    });
    recalculate();

    initSwipe($vanillabox, function(direction) {
      if (direction === "left") {
        prev();
      }
      else if (direction === "right") {
        next();
      }
      else {
        close()
      }
    });

    // once only
    setup = false;
  }

  function keyHandler(e) {
    if (state.isOpen) {
      switch (e.keyCode) {
        case 9: // TAB
          if (e.target === lastFocussable && !e.shiftKey) {
            e.preventDefault();
            firstFocussable.focus();
          } else if (e.target === firstFocussable && e.shiftKey) {
            e.preventDefault();
            lastFocussable.focus();
          }
          break;
        case 27: // ESC
          close();
          break;
        case 13: // enter
        case 32: // spacebar
        case 39: // cl
          next();
          break;
        case 37: // cr
          prev();
          break;
      }
    }
  }

  function toggle($out, $cur) {
    if ($out) {
      $out.classList.add(prefix + "-out");
      $out.classList.remove(prefix + "-current");
    }
    if ($cur) {
      $cur.classList.add(prefix + "-direct");
      $cur.classList.remove(prefix + "-out");
      $cur.classList.remove(prefix + "-current");
      getComputedStyle($cur).opacity; // DO IT!
      $cur.classList.remove(prefix + "-direct");
      $cur.classList.add(prefix + "-current");
    }
  }

  function prev() {
    state.current =
      state.current > 0 ? state.current - 1 : state.srcs.length - 1;
    show();
  }

  function next() {
    state.current =
      state.current >= state.srcs.length - 1 ? 0 : state.current + 1;
    show();
  }

  function show(initial) {
    if (!initial && state.srcs.length == 1) {
      // if 1 only simple close after open
      close();
      return;
    }
    var $out = $items[alternate ? 1 : 0];
    alternate = !alternate;
    var $cur = $items[alternate ? 1 : 0];

    var title = state.titles[state.current];
    var info = state.infos[state.current];
    var src = state.srcs[state.current];
    var $img = $cur.querySelector("img");
    var setSrc = function(curOnly) {
      $img.style.maxHeight = maxSize.height;
      $img.src = src;
      $vanillabox.classList.toggle(prefix + "-alternate");
      toggle(curOnly ? false : $out, $cur);
    };
    if (state.cached.indexOf(src) == -1) {
      var tmp = new Image();

      tmp.addEventListener(
        "load",
        function() {
          state.cached.push(src);
          setSrc(true);
          tmp = null;
        },
        false
      );
      tmp.addEventListener(
        "error",
        function(e) {
          setSrc(true);
          tmp = null;
        },
        false
      );
      tmp.src = src;
      toggle($out, false);
    } else {
      setSrc();
    }

    $title.innerHTML = title;
    $status.innerHTML = [state.current + 1, state.srcs.length].join(" / ");
    if (info) {
      $info.innerHTML = info;
      $info.classList.add(prefix + "-info-visible");
    } else {
      $info.classList.remove(prefix + "-info-visible");
    }
  }

  function close() {
    document.removeEventListener("keydown", keyHandler);

    // close by settings aria hidden
    [].forEach.call(
      document.querySelectorAll("body>*:not(.vanillabox)"),
      function($el, i) {
        var original = $el.getAttribute("data-vanillabox");

        if (original) {
          $el.setAttribute("aria-hidden", original);
          $el.removeAttribute("data-vanillabox");
        } else {
          $el.removeAttribute("aria-hidden");
        }
      }
    );
    $vanillabox.setAttribute("aria-hidden", "true");
    $focusBefore && $focusBefore.focus();
    state.isOpen = false;
    settings.closeCallback();
  }

  function open() {
    var singleitem = state.srcs.length === 1;
    var focussables = $vanillabox.querySelectorAll(FOCUSSABLES);

    firstFocussable = focussables[0];
    lastFocussable = focussables[focussables.length - 1];
    $focusBefore = document.activeElement;
    $vanillabox.classList[singleitem ? "add" : "remove"](
      prefix + "-singleitem"
    );

    if (singleitem) {
      $closer.focus();
      $next.setAttribute("disabled", true);
      $prev.setAttribute("disabled", true);
    } else {
      $next.removeAttribute("disabled");
      $prev.removeAttribute("disabled");
      $next.focus();
    }

    if (!state.isOpen) {
      $items[0].querySelector("img").src = "";
      $items[1].querySelector("img").src = "";

      $vanillabox.removeAttribute("aria-hidden");

      [].forEach.call(
        document.querySelectorAll("body>*:not(.vanillabox)"),
        function($el, i) {
          var original = $el.getAttribute("aria-hidden");

          if (original) {
            $el.setAttribute("data-vanillabox", original);
          }
          $el.setAttribute("aria-hidden", "true");
        }
      );

      document.addEventListener("keydown", keyHandler, false);
      state.isOpen = true;
      settings.openCallback();
    }
  }

  function vanillabox($containers, options) {
    if ($containers.tagName === "A") {
      $containers = $containers.parentElement;
    }
    if (!($containers instanceof NodeList || $containers instanceof Array)) {
      $containers = [$containers];
    }
    settings = Object.assign(
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
      },
      options
    );

    var boxes = [];

    // once only
    setup && setup();

    [].forEach.call($containers, function($container, i) {
      var srcs = [];
      var titles = [];
      var infos = [];
      var start = function(j) {
        state.srcs = srcs;
        state.titles = titles;
        state.infos = infos;
        state.current = j || 0;
        open();
        show(true);
      };
      boxes.push({
        open: start,
        next: next,
        prev: prev,
        close: close
      });
      [].forEach.call(
        $container.querySelectorAll(settings.linkSelector),
        function($link, j) {
          var src = $link.href;
          var srclower = src.toLowerCase();
          var title = settings.getTitle($link);
          var $info = settings.useInfo ? settings.getInfo($link) : "";

          if (
            srclower.indexOf(".gif") != -1 ||
            srclower.indexOf(".jpg") != -1 ||
            srclower.indexOf(".png") != -1 ||
            srclower.indexOf(".svg") != -1
          ) {
            srcs.push(src);
            titles.push(title);
            infos.push($info);

            $link.addEventListener("click", function(e) {
              start(j);
              e.preventDefault();
            });
          }
        }
      );
    });
    return boxes.length === 1 ? boxes[0] : boxes;
  }
  vanillabox.VERSION = 1.0;

  window.vanillabox = vanillabox;
})();
