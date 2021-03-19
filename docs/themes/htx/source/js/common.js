(function() {
  var sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    initMobileMenu();
    initVideoModal();
    initNewNavLinks();
    initSubHeaders();
  }

  initLocationHashFuzzyMatching();
  initPreviewButtons();

  function parseRawHash(hash) {
    // Remove leading hash
    if (hash.charAt(0) === "#") {
      hash = hash.substr(1);
    }

    // Escape characters
    try {
      hash = decodeURIComponent(hash);
    } catch (e) {}
    return CSS.escape(hash);
  }

  function initLocationHashFuzzyMatching() {
    var rawHash = window.location.hash;
    if (!rawHash) return;
    var hash = parseRawHash(rawHash);
    var hashTarget = document.getElementById(hash);
    if (!hashTarget) {
      var normalizedHash = normalizeHash(hash);
      var edgeCases = {
        "vue-set-target-key-value": "vue-set",
      };
      if (edgeCases.hasOwnProperty(normalizedHash)) {
        normalizedHash = edgeCases[normalizedHash];
      }
      var possibleHashes = [].slice.call(document.querySelectorAll("[id]")).map(function(el) {
        return el.id;
      });
      possibleHashes.sort(function(hashA, hashB) {
        var distanceA = levenshteinDistance(normalizedHash, normalizeHash(hashA));
        var distanceB = levenshteinDistance(normalizedHash, normalizeHash(hashB));
        if (distanceA < distanceB) return -1;
        if (distanceA > distanceB) return 1;
        return 0;
      });
      window.location.hash = "#" + possibleHashes[0];
    }

    function normalizeHash(rawHash) {
      return rawHash.toLowerCase().replace(/\-(?:deprecated|removed|replaced|changed|obsolete)$/, "");
    }

    function levenshteinDistance(a, b) {
      var m = [];
      if (!(a && b)) return (b || a).length;
      for (var i = 0; i <= b.length; m[i] = [i++]) {}
      for (var j = 0; j <= a.length; m[0][j] = j++) {}
      for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
          m[i][j] =
            b.charAt(i - 1) === a.charAt(j - 1)
              ? m[i - 1][j - 1]
              : (m[i][j] = Math.min(m[i - 1][j - 1] + 1, Math.min(m[i][j - 1] + 1, m[i - 1][j] + 1)));
        }
      }
      return m[b.length][a.length];
    }
  }

  /**
   * Initializes a list of links to mark as "updated" by adding a red dot next to them
   */

  function initNewNavLinks() {
    var linkExpirePeriod = 60 * 24 * 3600 * 1000; // 2 months
    var links = [
      {
        title: "Learn",
        updatedOn: new Date("Fri Mar 1 2019"),
      },
      {
        title: "Examples",
        updatedOn: new Date("Fri Mar 1 2019"),
      },
    ];
    var today = new Date().getTime();
    var updatedLinks = links
      .filter(function(link) {
        return link.updatedOn.getTime() + linkExpirePeriod > today;
      })
      .map(function(link) {
        return link.title;
      });

    var navLinks = document.querySelectorAll("#nav a.nav-link");
    var newLinks = [];
    navLinks.forEach(function(link) {
      if (updatedLinks.indexOf(link.textContent) !== -1) {
        newLinks.push(link);
      }
    });
    newLinks.forEach(function(link) {
      var classes = link.classList;
      var linkKey = `visisted-${link.textContent}`;
      if (localStorage.getItem(linkKey) || classes.contains("current")) {
        classes.remove("updated-link");
        localStorage.setItem(linkKey, "true");
      } else {
        classes.add("new");
      }
    });
  }

  /**
   * Mobile burger menu button and gesture for toggling sidebar
   */

  function initMobileMenu() {
    var mobileBar = document.getElementById("mobile-bar");
    var sidebar = document.querySelector(".sidebar");
    var menuButton = mobileBar.querySelector(".menu-button");

    menuButton.addEventListener("click", function() {
      sidebar.classList.toggle("open");
    });

    document.body.addEventListener("click", function(e) {
      if (e.target !== menuButton && !sidebar.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });

    // Toggle sidebar on swipe
    var start = {},
      end = {};

    document.body.addEventListener("touchstart", function(e) {
      start.x = e.changedTouches[0].clientX;
      start.y = e.changedTouches[0].clientY;
    });

    document.body.addEventListener("touchend", function(e) {
      end.y = e.changedTouches[0].clientY;
      end.x = e.changedTouches[0].clientX;

      var xDiff = end.x - start.x;
      var yDiff = end.y - start.y;

      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0 && start.x <= 80) sidebar.classList.add("open");
        else sidebar.classList.remove("open");
      }
    });
  }

  /**
   * Modal Video Player
   */
  function initVideoModal() {
    var modalButton = document.getElementById("modal-player");
    var videoModal = document.getElementById("video-modal");

    if (!modalButton || !videoModal) {
      return;
    }

    var iframe = document.querySelector("iframe");
    var player = new Vimeo.Player(iframe);
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    var isOpen = false;

    modalButton.addEventListener("click", function(event) {
      event.stopPropagation();
      videoModal.classList.toggle("open");
      document.body.classList.toggle("stop-scroll");
      document.body.appendChild(overlay);
      player.play();
      isOpen = true;
    });

    document.body.addEventListener("click", function(e) {
      if (isOpen && e.target !== modalButton && !videoModal.contains(e.target)) {
        videoModal.classList.remove("open");
        document.body.classList.remove("stop-scroll");
        document.body.removeChild(overlay);
        player.unload();
        isOpen = false;
      }
    });
  }

  /**
   * Preview
   */
  function initPreviewButtons() {
    var code = document.querySelectorAll(".html").forEach(code => {

      var preview = createButton("Open Preview", "lnk");
      preview.onclick = function(ev) {
        ev.preventDefault();
        show_render_editor(code.textContent);

        return false;
      };

      var pg = createButton("Launch in Playground", "lnk");
      pg.onclick = function(ev) {
        ev.preventDefault();

        // [TODO] check why newline can't be loaded by Hexo
        var config = code.textContent.replace(/(\r\n|\n|\r)/gm, "<br>");
        var url = "/playground/?config=" + encodeURI(config);
        newwindow = window.open(url, "Playground");
        if (window.focus) {
          newwindow.focus();
        }

        return false;
      };

      var div = document.createElement("div");
      div.style = "text-align: right";
      div.appendChild(preview);
      div.appendChild(pg);

      code.parentNode.insertAdjacentElement("afterend", div);
    })
  }

  function createButton(title, clsName) {
    var a = document.createElement("a");
    a.appendChild(document.createTextNode(title));
    a.title = title;
    a.className = clsName;
    a.href = "";

    return a;
  }

  var iframeTimer = null;

  function editor_iframe(res, modal) {
    // generate new iframe
    var iframe = $('<iframe onclick="event.stopPropagation()" id="render-editor"></iframe>');
    iframe.css('width', $(window).width() * 0.9);
    iframe.hide();
    modal.append(iframe);

    iframe.on('load', function () {
      $('#render-editor-loader').hide();
      iframe.show();
      var obj = document.getElementById('render-editor');

      // wait until all images and resources from iframe loading
      clearTimeout(iframeTimer);
      iframeTimer = setInterval(function () {
        if (obj.contentWindow) {
          obj.style.height = (obj.contentWindow.document.body.scrollHeight) + 'px';
        }
      }, 100);
    });

    // load new data into iframe
    iframe.attr('srcdoc', res);
  }

  function show_render_editor(config) {
    // add dimmer modal
    var modal = $('<div onclick="$(this).remove()" id="preview-wrapper">' +
      '<div id="render-editor-loader"><img width="50px" src="/images/loading.gif"></div></div>');
    $('body').append(modal);
    $('#render-editor-loader').css('width', $(window).width() * 0.9);

    $.ajax({
      url: "https://app.heartex.ai/demo/render-editor?full_editor=t&playground=1&open_preview=1",
      method: 'POST',
      xhrFields: {withCredentials: true},
      data: {
        config: config,
        edit_count: 0
      },
      success: function(res) { editor_iframe(res, modal) },
      error: function () {
        alert("Can't load preview, demo server error");
      }
    })
  }

  /**
   * Sub headers in sidebar
   */

  function initSubHeaders() {
    var each = [].forEach;
    var main = document.getElementById("main");
    var header = document.getElementById("header");
    var sidebar = document.querySelector(".sidebar");
    var content = document.querySelector(".content");

    // build sidebar
    var currentPageAnchor = sidebar.querySelector(".sidebar-link.current");
    var contentClasses = document.querySelector(".content").classList;
    var isAPIOrStyleGuide = contentClasses.contains("api") || contentClasses.contains("style-guide");
    if (currentPageAnchor || isAPIOrStyleGuide) {
      var allHeaders = [];
      var sectionContainer;
      if (isAPIOrStyleGuide) {
        sectionContainer = document.querySelector(".menu-root");
      } else {
        sectionContainer = document.createElement("ul");
        sectionContainer.className = "menu-sub";
        currentPageAnchor.parentNode.appendChild(sectionContainer);
      }
      var headers = content.querySelectorAll("h2");
      if (headers.length) {
        each.call(headers, function(h) {
          if (h.classList.contains('no-menu')) {
             return "";
          }
          sectionContainer.appendChild(makeLink(h));
          var h3s = collectH3s(h);
          allHeaders.push(h);
          allHeaders.push.apply(allHeaders, h3s);
          if (h3s.length) {
            sectionContainer.appendChild(makeSubLinks(h3s, isAPIOrStyleGuide));
          }
        });
      } else {
        headers = content.querySelectorAll("h3");
        each.call(headers, function(h) {
          sectionContainer.appendChild(makeLink(h));
          allHeaders.push(h);
        });
      }

      var animating = false;
      sectionContainer.addEventListener(
        "click",
        function(e) {
          // Not prevent hashchange for smooth-scroll
          // e.preventDefault()

          if (e.target.classList.contains("section-link")) {
            sidebar.classList.remove("open");
            setActive(e.target);
            animating = true;
            setTimeout(function() {
              animating = false;
            }, 400);
          }
        },
        true,
      );

      // make links clickable
      allHeaders
        .filter(function(el) {
          if (!el.querySelector("a")) {
            return false;
          }
          var demos = [].slice.call(document.querySelectorAll("demo"));
          return !demos.some(function(demoEl) {
            return demoEl.contains(el);
          });
        })
        .forEach(makeHeaderClickable);

      new SmoothScroll('a[href*="#"]', {
        speed: 400,
        speedAsDuration: true,
        offset: function(anchor, toggle) {
          let dataTypeAttr = anchor.attributes["data-type"];
          if (dataTypeAttr && dataTypeAttr.nodeValue === "theme-product-title") {
            return 300;
          }
          return 0;
        },
      });
    }

    var hoveredOverSidebar = false;
    sidebar.addEventListener("mouseover", function() {
      hoveredOverSidebar = true;
    });
    sidebar.addEventListener("mouseleave", function() {
      hoveredOverSidebar = false;
    });

    // listen for scroll event to do positioning & highlights
    window.addEventListener("scroll", updateSidebar);
    window.addEventListener("resize", updateSidebar);

    function updateSidebar() {
      var doc = document.documentElement;
      var top = (doc && doc.scrollTop) || document.body.scrollTop;
      if (animating || !allHeaders) return;
      var last;
      for (var i = 0; i < allHeaders.length; i++) {
        var link = allHeaders[i];
        if (link.offsetTop > top) {
          if (!last) last = link;
          break;
        } else {
          last = link;
        }
      }
      if (last) setActive(last.id, !hoveredOverSidebar);
    }

    function removeLabelStudioMention(text) {
      return text
        .replace(/into Label Studio$/g, '')
        .replace(/in Label Studio$/g, '')
        .replace(/with Label Studio$/g, '')
        .replace(/by Label Studio$/g, '')
        .replace(/for Label Studio$/g, '')
        .replace(/from Label Studio$/g, '')
        .replace(/Label Studio$/g, '')
    };

    function makeLink(h) {
      var link = document.createElement("li");
      window.arst = h;

      var text = [].slice
        .call(h.childNodes)
        .map(function(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue;
          } else if (["CODE", "SPAN"].indexOf(node.tagName) !== -1) {
            return node.textContent;
          } else {
            return "";
          }
        })
        .join("")
        .replace(/\(.*\)$/, "");
      link.innerHTML = '<a class="section-link" data-scroll href="#' + h.id + '">' + removeLabelStudioMention(htmlEscape(text)) + "</a>";
      return link;
    }

    function htmlEscape(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function collectH3s(h) {
      var h3s = [];
      var next = h.nextSibling;
      while (next && next.tagName !== "H2") {
        if (next.tagName === "H3") {
          h3s.push(next);
        }
        next = next.nextSibling;
      }
      return h3s;
    }

    function makeSubLinks(h3s, small) {
      var container = document.createElement("ul");
      if (small) {
        container.className = "menu-sub";
      }
      h3s.forEach(function(h) {
        container.appendChild(makeLink(h));
      });
      return container;
    }

    function setActive(id, shouldScrollIntoView) {
      var previousActive = sidebar.querySelector(".section-link.active");
      var currentActive = typeof id === "string" ? sidebar.querySelector('.section-link[href="#' + id + '"]') : id;
      if (currentActive !== previousActive) {
        if (previousActive) previousActive.classList.remove("active");
        currentActive.classList.add("active");
        if (shouldScrollIntoView) {
          var currentPageOffset = currentPageAnchor ? currentPageAnchor.offsetTop - 8 : 0;
          var currentActiveOffset = currentActive.offsetTop + currentActive.parentNode.clientHeight;
          var sidebarHeight = sidebar.clientHeight;
          var currentActiveIsInView =
            currentActive.offsetTop >= sidebar.scrollTop && currentActiveOffset <= sidebar.scrollTop + sidebarHeight;
          var linkNotFurtherThanSidebarHeight = currentActiveOffset - currentPageOffset < sidebarHeight;
          var newScrollTop = currentActiveIsInView
            ? sidebar.scrollTop
            : linkNotFurtherThanSidebarHeight
            ? currentPageOffset
            : currentActiveOffset - sidebarHeight;
          sidebar.scrollTop = newScrollTop;
        }
      }
    }

    function makeHeaderClickable(header) {
      var link = header.querySelector("a");
      link.setAttribute("data-scroll", "");

      // transform DOM structure from
      // `<h2><a></a>Header</a>` to <h2><a>Header</a></h2>`
      // to make the header clickable
      var nodes = Array.prototype.slice.call(header.childNodes);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node !== link) {
          link.appendChild(node);
        }
      }
    }
  }

  // Stolen from: https://github.com/hexojs/hexo-util/blob/master/lib/escape_regexp.js
  function escapeRegExp(str) {
    if (typeof str !== "string") throw new TypeError("str must be a string!");

    // http://stackoverflow.com/a/6969486
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  // Stolen from: https://github.com/hexojs/hexo-util/blob/master/lib/slugize.js
  function slugize(str, options) {
    if (typeof str !== "string") throw new TypeError("str must be a string!");
    options = options || {};

    var rControl = /[\u0000-\u001f]/g;
    var rSpecial = /[\s~`!@#\$%\^&\*\(\)\-_\+=\[\]\{\}\|\\;:"'<>,\.\?\/]+/g;
    var separator = options.separator || "-";
    var escapedSep = escapeRegExp(separator);

    var result = str
      // Remove control characters
      .replace(rControl, "")
      // Replace special characters
      .replace(rSpecial, separator)
      // Remove continuous separators
      .replace(new RegExp(escapedSep + "{2,}", "g"), separator)
      // Remove prefixing and trailing separators
      .replace(new RegExp("^" + escapedSep + "+|" + escapedSep + "+$", "g"), "");

    switch (options.transform) {
      case 1:
        return result.toLowerCase();
      case 2:
        return result.toUpperCase();
      default:
        return result;
    }
  }
})();
