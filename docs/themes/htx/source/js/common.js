(function () {
  initHashLevelRedirects()
  initMobileMenu()
  initVideoModal()
  initNewNavLinks()
  if (PAGE_TYPE) {
    initVersionSelect()
    initApiSpecLinks()
    initSubHeaders()
    initLocationHashFuzzyMatching()
  }

  // Most redirects should be specified in Hexo's
  // _config.yml. However, it can't handle hash-level
  // redirects, such as:
  //
  // /foo#hello -> /bar#hello
  //
  // For these cases where a section on one page has
  // moved to a perhaps differently-named section on
  // another page, we need this.
  function initHashLevelRedirects() {
    checkForHashRedirect(/list\.html$/, {
      key: '/v2/guide/list.html#Maintaining-State'
    })
    checkForHashRedirect(/components\.html$/, {
      'What-are-Components': '/v2/guide/components.html',
      'Using-Components': '/v2/guide/components-registration.html',
      'Global-Registration':
        '/v2/guide/components-registration.html#Global-Registration',
      'Local-Registration':
        '/v2/guide/components-registration.html#Local-Registration',
      'Composing-Components':
        '/v2/guide/components.html#Organizing-Components',
      Props:
        '/v2/guide/components.html#Passing-Data-to-Child-Components-with-Props',
      'Passing-Data-with-Props':
        '/v2/guide/components.html#Passing-Data-to-Child-Components-with-Props',
      'camelCase-vs-kebab-case':
        '/v2/guide/components-props.html#Prop-Casing-camelCase-vs-kebab-case',
      'Dynamic-Props':
        '/v2/guide/components-props.html#Static-and-Dynamic-Props',
      'Literal-vs-Dynamic':
        '/v2/guide/components-props.html#Static-and-Dynamic-Props',
      'One-Way-Data-Flow':
        '/v2/guide/components-props.html#One-Way-Data-Flow',
      'Prop-Validation': '/v2/guide/components-props.html#Prop-Validation',
      'Non-Prop-Attributes':
        '/v2/guide/components-props.html#Non-Prop-Attributes',
      'Replacing-Merging-with-Existing-Attributes':
        '/v2/guide/components-props.html#Replacing-Merging-with-Existing-Attributes',
      'Custom-Events':
        '/v2/guide/components.html#Listening-to-Child-Components-Events',
      'Using-v-on-with-Custom-Events':
        '/v2/guide/components.html#Listening-to-Child-Components-Events',
      'Binding-Native-Events-to-Components':
        '/v2/guide/components-custom-events.html#Binding-Native-Events-to-Components',
      'sync-Modifier':
        '/v2/guide/components-custom-events.html#sync-Modifier',
      'Form-Input-Components-using-Custom-Events':
        '/v2/guide/components-custom-events.html#Binding-Native-Events-to-Components',
      'Customizing-Component-v-model':
        '/v2/guide/components-custom-events.html#Customizing-Component-v-model',
      'Non-Parent-Child-Communication': '/v2/guide/state-management.html',
      'Compilation-Scope':
        '/v2/guide/components-slots.html#Compilation-Scope',
      'Single-Slot': '/v2/guide/components-slots.html#Slot-Content',
      'Named-Slots': '/v2/guide/components-slots.html#Named-Slots',
      'Scoped-Slots': '/v2/guide/components-slots.html#Scoped-Slots',
      'Dynamic-Components': '/v2/guide/components.html#Dynamic-Components',
      'keep-alive':
        '/v2/guide/components-dynamic-async.html#keep-alive-with-Dynamic-Components',
      Misc: '/v2/guide/components-edge-cases.html',
      'Authoring-Reusable-Components':
        '/v2/guide/components.html#Organizing-Components',
      'Child-Component-Refs':
        '/v2/guide/components-edge-cases.html#Accessing-Child-Component-Instances-amp-Child-Elements',
      'Async-Components':
        '/v2/guide/components-dynamic-async.html#Async-Components',
      'Advanced-Async-Components':
        '/v2/guide/components-dynamic-async.html#Handling-Loading-State',
      'Component-Naming-Conventions':
        '/v2/guide/components-registration.html#Component-Names',
      'Recursive-Components':
        '/v2/guide/components-edge-cases.html#Recursive-Components',
      'Circular-References-Between-Components':
        '/v2/guide/components-edge-cases.html#Circular-References-Between-Components',
      'Inline-Templates':
        '/v2/guide/components-edge-cases.html#Inline-Templates',
      'X-Templates': '/v2/guide/components-edge-cases.html#X-Templates',
      'Cheap-Static-Components-with-v-once':
        '/v2/guide/components-edge-cases.html#Cheap-Static-Components-with-v-once'
    })
    function checkForHashRedirect(pageRegex, redirects) {
      // Abort if the current page doesn't match the page regex
      if (!pageRegex.test(window.location.pathname)) return

      var redirectPath = redirects[window.location.hash.slice(1)]
      if (redirectPath) {
        window.location.href = window.location.origin + redirectPath
      }
    }
  }

  function initApiSpecLinks () {
    var apiContent = document.querySelector('.content.api')
    if (apiContent) {
      var apiTitles = [].slice.call(apiContent.querySelectorAll('h3'))
      apiTitles.forEach(function (titleNode) {
        var methodMatch = titleNode.textContent.match(/^([^(]+)\(/)
        if (methodMatch) {
          var idWithoutArguments = slugize(methodMatch[1])
          titleNode.setAttribute('id', idWithoutArguments)
          titleNode.querySelector('a').setAttribute('href', '#' + idWithoutArguments)
        }

        var ulNode = titleNode.parentNode.nextSibling
        if (ulNode.tagName !== 'UL') {
          ulNode = ulNode.nextSibling
          if (!ulNode) return
        }
        if (ulNode.tagName === 'UL') {
          var specNode = document.createElement('li')
          var specLink = createSourceSearchPath(titleNode.textContent)
          specNode.innerHTML = '<a href="' + specLink + '" target="_blank">Source</a>'
          ulNode.appendChild(specNode)
        }
      })
    }

    function createSourceSearchPath (query) {
      query = query
        .replace(/\([^\)]*?\)/g, '')
        .replace(/(Vue\.)(\w+)/g, '$1$2" OR "$2')
        .replace(/vm\./g, 'Vue.prototype.')
      return 'https://github.com/search?utf8=%E2%9C%93&q=repo%3Avuejs%2Fvue+extension%3Ajs+' + encodeURIComponent('"' + query + '"') + '&type=Code'
    }
  }

  function parseRawHash (hash) {
    // Remove leading hash
    if (hash.charAt(0) === '#') {
      hash = hash.substr(1)
    }

    // Escape characters
    try {
      hash = decodeURIComponent(hash)
    } catch (e) {}
    return CSS.escape(hash)
  }

  function initLocationHashFuzzyMatching () {
    var rawHash = window.location.hash
    if (!rawHash) return
    var hash = parseRawHash(rawHash)
    var hashTarget = document.getElementById(hash)
    if (!hashTarget) {
      var normalizedHash = normalizeHash(hash)
      var edgeCases = {
        'vue-set-target-key-value': 'vue-set'
      }
      if (edgeCases.hasOwnProperty(normalizedHash)) {
        normalizedHash = edgeCases[normalizedHash];
      }
      var possibleHashes = [].slice.call(document.querySelectorAll('[id]'))
        .map(function (el) { return el.id })
      possibleHashes.sort(function (hashA, hashB) {
        var distanceA = levenshteinDistance(normalizedHash, normalizeHash(hashA))
        var distanceB = levenshteinDistance(normalizedHash, normalizeHash(hashB))
        if (distanceA < distanceB) return -1
        if (distanceA > distanceB) return 1
        return 0
      })
      window.location.hash = '#' + possibleHashes[0]
    }

    function normalizeHash (rawHash) {
      return rawHash
        .toLowerCase()
        .replace(/\-(?:deprecated|removed|replaced|changed|obsolete)$/, '')
    }

    function levenshteinDistance (a, b) {
      var m = []
      if (!(a && b)) return (b || a).length
      for (var i = 0; i <= b.length; m[i] = [i++]) {}
      for (var j = 0; j <= a.length; m[0][j] = j++) {}
      for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
          m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
            ? m[i - 1][j - 1]
            : m[i][j] = Math.min(
              m[i - 1][j - 1] + 1,
              Math.min(m[i][j - 1] + 1, m[i - 1][j] + 1))
        }
      }
      return m[b.length][a.length]
    }
  }

  /**
   * Initializes a list of links to mark as "updated" by adding a red dot next to them
   */

  function initNewNavLinks() {
    var linkExpirePeriod = 60 * 24 * 3600 * 1000 // 2 months
    var links = [
      {
        title: 'Learn',
        updatedOn: new Date("Fri Mar 1 2019")
      },
      {
        title: 'Examples',
        updatedOn: new Date("Fri Mar 1 2019")
      }
    ]
    var today = new Date().getTime()
    var updatedLinks = links
      .filter(function (link) {
        return link.updatedOn.getTime() + linkExpirePeriod > today
      })
      .map(function (link) {
        return link.title
      })

    var navLinks = document.querySelectorAll('#nav a.nav-link')
    var newLinks = []
    navLinks.forEach(function (link) {
      if (updatedLinks.indexOf(link.textContent) !== -1) {
        newLinks.push(link)
      }
    })
    newLinks.forEach(function (link) {
      var classes = link.classList
      var linkKey = `visisted-${link.textContent}`
      if (localStorage.getItem(linkKey) || classes.contains('current')) {
        classes.remove('updated-link')
        localStorage.setItem(linkKey, 'true')
      } else {
        classes.add('new')
      }
    })
  }

  /**
   * Mobile burger menu button and gesture for toggling sidebar
   */

  function initMobileMenu () {
    var mobileBar = document.getElementById('mobile-bar')
    var sidebar = document.querySelector('.sidebar')
    var menuButton = mobileBar.querySelector('.menu-button')

    menuButton.addEventListener('click', function () {
      sidebar.classList.toggle('open')
    })

    document.body.addEventListener('click', function (e) {
      if (e.target !== menuButton && !sidebar.contains(e.target)) {
        sidebar.classList.remove('open')
      }
    })

    // Toggle sidebar on swipe
    var start = {}, end = {}

    document.body.addEventListener('touchstart', function (e) {
      start.x = e.changedTouches[0].clientX
      start.y = e.changedTouches[0].clientY
    })

    document.body.addEventListener('touchend', function (e) {
      end.y = e.changedTouches[0].clientY
      end.x = e.changedTouches[0].clientX

      var xDiff = end.x - start.x
      var yDiff = end.y - start.y

      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0 && start.x <= 80) sidebar.classList.add('open')
        else sidebar.classList.remove('open')
      }
    })
  }

  /**
  * Modal Video Player
  */
  function initVideoModal () {
    var modalButton = document.getElementById('modal-player')
    var videoModal = document.getElementById('video-modal')

    if (!modalButton || !videoModal) {
      return
    }

    var iframe = document.querySelector('iframe')
    var player = new Vimeo.Player(iframe)
    var overlay = document.createElement('div')
        overlay.className = 'overlay'
    var isOpen = false

    modalButton.addEventListener('click', function(event) {
      event.stopPropagation()
      videoModal.classList.toggle('open')
      document.body.classList.toggle('stop-scroll')
      document.body.appendChild(overlay)
      player.play()
      isOpen = true
    })

    document.body.addEventListener('click', function(e) {
      if (isOpen && e.target !== modalButton && !videoModal.contains(e.target)) {
        videoModal.classList.remove('open')
        document.body.classList.remove('stop-scroll')
        document.body.removeChild(overlay)
        player.unload()
        isOpen = false
      }
    })
  }

  /**
   * Doc version select
   */

  function initVersionSelect () {
    // version select
    var versionSelect = document.querySelector('.version-select')
    versionSelect && versionSelect.addEventListener('change', function (e) {
      var version = e.target.value
      var section = window.location.pathname.match(/\/v\d\/(\w+?)\//)[1]
      if (version === 'SELF') return
      window.location.assign(
        'https://' +
        version +
        (version && '.') +
        'vuejs.org/' + section + '/'
      )
    })
  }

  /**
   * Sub headers in sidebar
   */

  function initSubHeaders () {
    var each = [].forEach
    var main = document.getElementById('main')
    var header = document.getElementById('header')
    var sidebar = document.querySelector('.sidebar')
    var content = document.querySelector('.content')

    // build sidebar
    var currentPageAnchor = sidebar.querySelector('.sidebar-link.current')
    var contentClasses = document.querySelector('.content').classList
    var isAPIOrStyleGuide = (
      contentClasses.contains('api') ||
      contentClasses.contains('style-guide')
    )
    if (currentPageAnchor || isAPIOrStyleGuide) {
      var allHeaders = []
      var sectionContainer
      if (isAPIOrStyleGuide) {
        sectionContainer = document.querySelector('.menu-root')
      } else {
        sectionContainer = document.createElement('ul')
        sectionContainer.className = 'menu-sub'
        currentPageAnchor.parentNode.appendChild(sectionContainer)
      }
      var headers = content.querySelectorAll('h2')
      if (headers.length) {
        each.call(headers, function (h) {
          sectionContainer.appendChild(makeLink(h))
          var h3s = collectH3s(h)
          allHeaders.push(h)
          allHeaders.push.apply(allHeaders, h3s)
          if (h3s.length) {
            sectionContainer.appendChild(makeSubLinks(h3s, isAPIOrStyleGuide))
          }
        })
      } else {
        headers = content.querySelectorAll('h3')
        each.call(headers, function (h) {
          sectionContainer.appendChild(makeLink(h))
          allHeaders.push(h)
        })
      }

      var animating = false
      sectionContainer.addEventListener('click', function (e) {

        // Not prevent hashchange for smooth-scroll
        // e.preventDefault()

        if (e.target.classList.contains('section-link')) {
          sidebar.classList.remove('open')
          setActive(e.target)
          animating = true
          setTimeout(function () {
            animating = false
          }, 400)
        }
      }, true)

      // make links clickable
      allHeaders
        .filter(function(el) {
          if (!el.querySelector('a')) {
            return false
          }
          var demos = [].slice.call(document.querySelectorAll('demo'))
          return !demos.some(function(demoEl) {
            return demoEl.contains(el)
          })
        })
        .forEach(makeHeaderClickable)

      new SmoothScroll('a[href*="#"]', {
        speed: 400,
        speedAsDuration: true,
        offset: function (anchor, toggle) {
          let dataTypeAttr = anchor.attributes['data-type']
          if(dataTypeAttr && dataTypeAttr.nodeValue === 'theme-product-title') {
            return 300
          }
          return 0
        }
      })
    }

    var hoveredOverSidebar = false
    sidebar.addEventListener('mouseover', function () {
      hoveredOverSidebar = true
    })
    sidebar.addEventListener('mouseleave', function () {
      hoveredOverSidebar = false
    })

    // listen for scroll event to do positioning & highlights
    window.addEventListener('scroll', updateSidebar)
    window.addEventListener('resize', updateSidebar)

    function updateSidebar () {
      var doc = document.documentElement
      var top = doc && doc.scrollTop || document.body.scrollTop
      if (animating || !allHeaders) return
      var last
      for (var i = 0; i < allHeaders.length; i++) {
        var link = allHeaders[i]
        if (link.offsetTop > top) {
          if (!last) last = link
          break
        } else {
          last = link
        }
      }
      if (last)
        setActive(last.id, !hoveredOverSidebar)
    }

    function makeLink (h) {
      var link = document.createElement('li')
      window.arst = h
      var text = [].slice.call(h.childNodes).map(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.nodeValue
        } else if (['CODE', 'SPAN'].indexOf(node.tagName) !== -1) {
          return node.textContent
        } else {
          return ''
        }
      }).join('').replace(/\(.*\)$/, '')
      link.innerHTML =
        '<a class="section-link" data-scroll href="#' + h.id + '">' +
          htmlEscape(text) +
        '</a>'
      return link
    }

    function htmlEscape (text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }

    function collectH3s (h) {
      var h3s = []
      var next = h.nextSibling
      while (next && next.tagName !== 'H2') {
        if (next.tagName === 'H3') {
          h3s.push(next)
        }
        next = next.nextSibling
      }
      return h3s
    }

    function makeSubLinks (h3s, small) {
      var container = document.createElement('ul')
      if (small) {
        container.className = 'menu-sub'
      }
      h3s.forEach(function (h) {
        container.appendChild(makeLink(h))
      })
      return container
    }

    function setActive (id, shouldScrollIntoView) {
      var previousActive = sidebar.querySelector('.section-link.active')
      var currentActive = typeof id === 'string'
        ? sidebar.querySelector('.section-link[href="#' + id + '"]')
        : id
      if (currentActive !== previousActive) {
        if (previousActive) previousActive.classList.remove('active')
        currentActive.classList.add('active')
        if (shouldScrollIntoView) {
          var currentPageOffset = currentPageAnchor
            ? currentPageAnchor.offsetTop - 8
            : 0
          var currentActiveOffset = currentActive.offsetTop + currentActive.parentNode.clientHeight
          var sidebarHeight = sidebar.clientHeight
          var currentActiveIsInView = (
            currentActive.offsetTop >= sidebar.scrollTop &&
            currentActiveOffset <= sidebar.scrollTop + sidebarHeight
          )
          var linkNotFurtherThanSidebarHeight = currentActiveOffset - currentPageOffset < sidebarHeight
          var newScrollTop = currentActiveIsInView
            ? sidebar.scrollTop
            : linkNotFurtherThanSidebarHeight
              ? currentPageOffset
              : currentActiveOffset - sidebarHeight
          sidebar.scrollTop = newScrollTop
        }
      }
    }

    function makeHeaderClickable (header) {
      var link = header.querySelector('a')
      link.setAttribute('data-scroll', '')

      // transform DOM structure from
      // `<h2><a></a>Header</a>` to <h2><a>Header</a></h2>`
      // to make the header clickable
      var nodes = Array.prototype.slice.call(header.childNodes)
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i]
        if (node !== link) {
          link.appendChild(node)
        }
      }
    }
  }

  // Stolen from: https://github.com/hexojs/hexo-util/blob/master/lib/escape_regexp.js
  function escapeRegExp(str) {
    if (typeof str !== 'string') throw new TypeError('str must be a string!');

    // http://stackoverflow.com/a/6969486
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  // Stolen from: https://github.com/hexojs/hexo-util/blob/master/lib/slugize.js
  function slugize(str, options) {
    if (typeof str !== 'string') throw new TypeError('str must be a string!')
    options = options || {}

    var rControl = /[\u0000-\u001f]/g
    var rSpecial = /[\s~`!@#\$%\^&\*\(\)\-_\+=\[\]\{\}\|\\;:"'<>,\.\?\/]+/g
    var separator = options.separator || '-'
    var escapedSep = escapeRegExp(separator)

    var result = str
      // Remove control characters
      .replace(rControl, '')
      // Replace special characters
      .replace(rSpecial, separator)
      // Remove continuous separators
      .replace(new RegExp(escapedSep + '{2,}', 'g'), separator)
      // Remove prefixing and trailing separators
      .replace(new RegExp('^' + escapedSep + '+|' + escapedSep + '+$', 'g'), '')

    switch (options.transform) {
      case 1:
        return result.toLowerCase()
      case 2:
        return result.toUpperCase()
      default:
        return result
    }
  }
})()
