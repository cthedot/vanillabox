/*
 * a simple lightbox, with keyboard, mouse and touch interaction
 *
 * usage:
 *    call ``vanillabox($element, settings)`` after document ready
 *
 *    $element: One or more DOM elements of <a> containing
 *    links to big images each containing a thumbnail image itself
 */
;(function() {
  'use strict'

  // Polyfills for e.g. IE
  if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, 'assign', {
      value: function assign(target, varArgs) {
        // .length of function is 2
        if (target == null) {
          // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object')
        }
        var to = Object(target)

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index]

          if (nextSource != null) {
            // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey]
              }
            }
          }
        }
        return to
      },
      writable: true,
      configurable: true
    })
  }
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function(callback, thisArg) {
      thisArg = thisArg || window
      for (var i = 0; i < this.length; i++) {
        callback.call(thisArg, this[i], i, this)
      }
    }
  }

  // touch events
  function initSwipe($el, handler) {
    var POINTER_EVENTS = window.PointerEvent ? true : false
    var start = {}
    var end = {}
    var tracking = false
    var thresholdTime = 500
    var thresholdDistance = 100

    function startHandler(e) {
      tracking = true
      /* Hack - e.timeStamp is whack in Fx/Android */
      start.t = Date.now()
      start.x = POINTER_EVENTS ? e.clientX : e.touches[0].clientX
      start.y = POINTER_EVENTS ? e.clientY : e.touches[0].clientY
    }
    function moveHandler(e) {
      if (tracking) {
        e.preventDefault()
        end.x = POINTER_EVENTS ? e.clientX : e.touches[0].clientX
        end.y = POINTER_EVENTS ? e.clientY : e.touches[0].clientY
      }
    }
    function endEvent(e) {
      if (tracking) {
        tracking = false
        var now = Date.now()
        var deltaTime = now - start.t
        var deltaX = end.x - start.x
        var deltaY = end.y - start.y
        // if not too slow work out what the movement was
        if (deltaTime < thresholdTime) {
          if (
            deltaX > thresholdDistance &&
            Math.abs(deltaY) < thresholdDistance
          ) {
            handler('left')
          } else if (
            -deltaX > thresholdDistance &&
            Math.abs(deltaY) < thresholdDistance
          ) {
            handler('right')
          } else if (
            deltaY > thresholdDistance &&
            Math.abs(deltaX) < thresholdDistance
          ) {
            handler('up')
          } else if (
            -deltaY > thresholdDistance &&
            Math.abs(deltaX) < thresholdDistance
          ) {
            handler('down')
          }
        }
      }
    }
    if (POINTER_EVENTS) {
      $el.addEventListener('pointerdown', startHandler, false)
      $el.addEventListener('pointermove', moveHandler, false)
      $el.addEventListener('pointerup', endEvent, false)
      $el.addEventListener('pointerleave', endEvent, false)
      $el.addEventListener('pointercancel', endEvent, false)
    } else if (window.TouchEvent) {
      $el.addEventListener('touchstart', startHandler, false)
      $el.addEventListener('touchmove', moveHandler, false)
      $el.addEventListener('touchend', endEvent, false)
    }
  }

  // vanillabox
  var FOCUSSABLES =
    'a[href], area[href], input:not([disabled]),' +
    'select:not([disabled]), textarea:not([disabled]),' +
    'button:not([disabled]), iframe, object, embed, *[tabindex],' +
    '*[contenteditable]'
  var firstFocussable
  var lastFocussable
  var settings
  var prefix = 'vanillabox'
  var alternate = true
  var state = {
    srcs: [],
    titles: [],
    infos: [],
    cached: [],
    isOpen: false,
    current: 0,
    isHTML: false
  }
  var $vanillabox
  var $title
  var $status
  var $info
  var $closer
  var $prev
  var $next
  var $items = []
  var $focusBefore

  function setup() {
    // once only
    $vanillabox = document.createElement('div')
    $vanillabox.setAttribute('aria-hidden', 'true')
    $vanillabox.classList.add(prefix)
    $vanillabox.innerHTML = [
      '<div class="prefix-item"></div>',
      '<div class="prefix-item"></div>',
      '<button class="prefix-closer prefix-button" type="button">&times;</button>',
      '<span class="prefix-title"></span>',
      '<article class="prefix-info"></article>',
      '<span class="prefix-status"></span>',
      '<button class="prefix-prev prefix-button" type="button"></button>',
      '<button class="prefix-next prefix-button" type="button"></button>'
    ]
      .join('')
      .replace(/prefix\-/g, prefix + '-')

    $vanillabox
      .querySelectorAll('.' + prefix + '-item')
      .forEach(function($item) {
        $items.push($item)
        $item.addEventListener(
          'click',
          function(e) {
            if (!settings.nextOnClick) {
              return
            }
            if (state.isHTML) {
              if (e.target === $item) {
                close(e)
              }
            } else if (e.target === $item || state.srcs.length === 1) {
              close(e)
            } else {
              next()
            }
          },
          false
        )
      })

    $title = $vanillabox.querySelector('.' + prefix + '-title')
    $status = $vanillabox.querySelector('.' + prefix + '-status')
    $info = $vanillabox.querySelector('.' + prefix + '-info')
    $closer = $vanillabox.querySelector('.' + prefix + '-closer')
    $closer.addEventListener('click', close, false)
    $prev = $vanillabox.querySelector('.' + prefix + '-prev')
    $prev.addEventListener('click', prev, false)
    $next = $vanillabox.querySelector('.' + prefix + '-next')
    $next.addEventListener('click', next, false)

    document.querySelector('body').appendChild($vanillabox)

    if (settings.useSwipe) {
      initSwipe($vanillabox, function(direction) {
        if (direction === 'left') {
          prev()
        } else if (direction === 'right') {
          next()
        } else if (!state.isHTML) {
          close()
        }
      })
    }
    setup = false
  }

  function keyHandler(e) {
    if (state.isOpen) {
      switch (e.keyCode) {
        case 9: // TAB
          if (e.target === lastFocussable && !e.shiftKey) {
            e.preventDefault()
            firstFocussable.focus()
          } else if (e.target === firstFocussable && e.shiftKey) {
            e.preventDefault()
            lastFocussable.focus()
          }
          break
        case 27: // ESC
          close()
          break
        case 32: // spacebar
          if (!state.isHTML) next()
          break
        case 39: // CL
          if (!state.isHTML) next()
          break
        case 37: // CR
          if (!state.isHTML) prev()
          break
      }
    }
  }

  function toggle($out, $cur) {
    if ($out) {
      $out.classList.add(prefix + '-out')
      $out.classList.remove(prefix + '-current')
    }
    if ($cur) {
      $cur.classList.add(prefix + '-direct')
      $cur.classList.remove(prefix + '-out')
      $cur.classList.remove(prefix + '-current')
      // do it now:
      getComputedStyle($cur).opacity
      $cur.classList.remove(prefix + '-direct')
      $cur.classList.add(prefix + '-current')
    }
  }

  function show(initial) {
    if (!initial && state.srcs.length === 1) {
      // if 1 only directly close after open
      close()
      return
    }
    var src = state.srcs[state.current]
    var isHTML = (state.isHTML = src && src.indexOf('#') === 0)
    var title = state.titles[state.current]
    var info = state.infos[state.current]
    var $out = $items[alternate ? 1 : 0]
    var $cur = $items[alternate ? 0 : 1]
    var setSrc = function() {
      $cur.innerHTML = '<img alt="" src="' + src + '">'
      finish()
    }
    var finish = function() {
      toggle(false, $cur)

      var $focussables = $vanillabox.querySelectorAll(FOCUSSABLES)

      firstFocussable = $focussables[0]
      lastFocussable = $focussables[$focussables.length - 1]

      $vanillabox.classList.remove(prefix + '-loading')
      settings.itemCallback($cur, title, info)
    }

    alternate = !alternate
    $vanillabox.classList.add(prefix + '-loading')

    toggle($out, false)

    if (isHTML) {
      $cur.innerHTML =
        '<div class="' +
        prefix +
        '-html">' +
        document.getElementById(src.substr(1)).innerHTML +
        '</div>'
      finish()
    } else {
      $cur.innerHTML = ''

      if (state.cached.indexOf(src) > -1) {
        setSrc()
      } else {
        var tmp = new Image()

        tmp.addEventListener(
          'load',
          function() {
            state.cached.push(src)
            setSrc()
            tmp = null
          },
          false
        )
        tmp.addEventListener(
          'error',
          function(e) {
            setSrc()
            tmp = null
          },
          false
        )
        tmp.src = src
      }
    }
    $title.innerHTML = title
    $status.hidden = state.srcs.length === 1
    $status.innerHTML = [state.current + 1, state.srcs.length].join(' / ')
    if (info) {
      $info.innerHTML = info
      $info.classList.add(prefix + '-info-visible')
    } else {
      $info.classList.remove(prefix + '-info-visible')
    }
  }

  function updatePrevNext(nextCurrent, singleitem) {
    if (singleitem) {
      $prev.setAttribute('disabled', true)
      $next.setAttribute('disabled', true)
    } else if (settings.rotate) {
      $prev.removeAttribute('disabled')
      $next.removeAttribute('disabled')
    } else {
      $prev[nextCurrent === 0 ? 'setAttribute' : 'removeAttribute'](
        'disabled',
        nextCurrent === 0 ? true : undefined
      )
      $next[
        nextCurrent === state.srcs.length - 1
          ? 'setAttribute'
          : 'removeAttribute'
      ]('disabled', nextCurrent === state.srcs.length - 1 ? true : undefined)
    }
  }

  function open(nextCurrent) {
    var singleitem = state.srcs.length === 1

    $focusBefore = document.activeElement
    $vanillabox.classList[singleitem ? 'add' : 'remove'](prefix + '-singleitem')
    updatePrevNext(nextCurrent || 0, singleitem)

    if (singleitem) {
      $closer.focus()
    } else {
      // focus on item to prevent focus on button on touch devices
      var $focus = $items[alternate ? 1 : 0].querySelector('*')
      $focus && $focus.focus()
    }

    if (!state.isOpen) {
      $items.forEach(function($item) {
        $item.innerHTML = ''
      })
      $vanillabox.removeAttribute('aria-hidden')

      document
        .querySelectorAll('body>*:not(.vanillabox)')
        .forEach(function($el, i) {
          var original = $el.getAttribute('aria-hidden')

          if (original) {
            $el.setAttribute('data-vanillabox', original)
          }
          $el.setAttribute('aria-hidden', 'true')
        })

      document.addEventListener('keydown', keyHandler, false)
      state.isOpen = true
      settings.openCallback()
    } else {
      return true
    }
  }

  function prev() {
    var current = state.current

    if (current === 0) {
      close()
    }
    state.current = current > 0 ? current - 1 : state.srcs.length - 1
    updatePrevNext(state.current)
    show()
  }
  function next() {
    var current = state.current

    if (current >= state.srcs.length - 1) {
      close()
    }
    state.current = current >= state.srcs.length - 1 ? 0 : current + 1
    updatePrevNext(state.current)
    show()
  }

  function close() {
    document.removeEventListener('keydown', keyHandler)

    // close by setting aria hidden
    document
      .querySelectorAll('body>*:not(.vanillabox)')
      .forEach(function($el, i) {
        var original = $el.getAttribute('data-vanillabox')

        if (original) {
          $el.setAttribute('aria-hidden', original)
          $el.removeAttribute('data-vanillabox')
        } else {
          $el.removeAttribute('aria-hidden')
        }
      })
    $vanillabox.setAttribute('aria-hidden', 'true')
    $focusBefore && $focusBefore.focus()
    state.isOpen = false
    settings.closeCallback()
  }

  function clean() {
    this._events.forEach(
      function(event, i) {
        event.$el.removeEventListener('click', event.handler)
      }.bind(this)
    )
  }

  function vanillabox($containers, options) {
    if (!($containers instanceof NodeList || $containers instanceof Array)) {
      $containers = [$containers]
    }
    settings = Object.assign(
      {
        linkSelector: 'a',
        nextOnClick: true,
        useSwipe: true,
        rotate: true,
        useInfo: true,
        getInfo: function($link) {
          var $el = $link.querySelector('figcaption')
          return $el ? $el.innerHTML : ''
        },
        getTitle: function($link) {
          return $link.getAttribute('title')
        },
        checkImage: function($link) {
          var src = $link.href.toLowerCase()

          return (
            src.indexOf('.gif') != -1 ||
            src.indexOf('.jpg') != -1 ||
            src.indexOf('.png') != -1 ||
            src.indexOf('.svg') != -1
          )
        },
        openCallback: function() {},
        itemCallback: function($item, title, info) {},
        closeCallback: function() {}
      },
      options
    )

    var boxes = []

    // once only
    setup && setup()

    $containers.forEach(function($container) {
      var srcs = []
      var titles = []
      var infos = []
      var counter = 0
      var start = function(index) {
        state.srcs = srcs
        state.titles = titles
        state.infos = infos

        var alreadyOpen = open(index)

        if (alreadyOpen && state.current === index) {
          close()
          return
        }
        state.current = index || 0
        show(true)
      }
      var box = {
        _events: [],
        open: start,
        next: next,
        prev: prev,
        close: close,
        clean: clean
      }
      boxes.push(box)

      if ($container.tagName === 'A') {
        $container = $container.parentElement
      }

      $container
        .querySelectorAll(settings.linkSelector)
        .forEach(function($link) {
          var src = $link.href
          var srclower = src.toLowerCase()
          var srcAnchor = $link.hash && $link.hash.length > 1
          var title = settings.getTitle($link) || ''
          var $info = settings.useInfo ? settings.getInfo($link) : ''
          var handler

          if (settings.checkImage($link, srclower) || srcAnchor) {
            srcs.push(srcAnchor ? $link.hash : src)
            titles.push(title)
            infos.push($info)

            // only images
            handler = (function(index) {
              return function(e) {
                start(index)
                e.preventDefault()
              }
            })(counter)
            $link.addEventListener('click', handler, false)
            box._events.push({
              $el: $link,
              handler: handler
            })
            counter += 1
          }
        })
    })
    return boxes.length === 1 ? boxes[0] : boxes
  }
  vanillabox.VERSION = 4.2

  window.vanillabox = vanillabox
})()
