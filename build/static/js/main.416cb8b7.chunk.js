(window.webpackJsonp = window.webpackJsonp || []).push([
  [0],
  {
    115: function(e, t, n) {
      e.exports = {
        block: "Relations_block__3Oopf",
        section: "Relations_section__2WXtQ",
        section__blocks: "Relations_section__blocks__3JVyw",
        delete: "Relations_delete__2Eyc8",
      };
    },
    149: function(e, t, n) {
      e.exports = { container: "Panel_container__Qb4xi", block: "Panel_block__3mBJh" };
    },
    202: function(e, t, n) {
      e.exports = { main: "Hint_main__ZDhzi" };
    },
    208: function(e, t, n) {
      e.exports = {
        pushable: "App_pushable__2_dds",
        "hide-dd-icon": "App_hide-dd-icon__QwL78",
        "drag-handle": "App_drag-handle__3_W4W",
        noselect: "App_noselect__2aaVW",
        "common-container": "App_common-container__qkml1",
        "functional-buttons": "App_functional-buttons__1KMBb",
        "editor-side-column": "App_editor-side-column__2Tmm3",
        editor: "App_editor__l2dha",
        menu: "App_menu__1BSd3",
        content: "App_content__1ym7D",
      };
    },
    270: function(e, t, n) {
      e.exports = { buttons: "Completions_buttons__1Egvo" };
    },
    294: function(e, t, n) {
      e.exports = { item: "Entities_item__3oFPp" };
    },
    295: function(e, t, n) {
      e.exports = { card: "SideColumn_card__2KVRh" };
    },
    301: function(e, t, n) {
      e.exports = { progress: "Waveform_progress__1GLjz", wave: "Waveform_wave__yPehs" };
    },
    304: function(e, t, n) {
      e.exports = { block: "TextHighlight_block__z4O-f" };
    },
    305: function(e, t, n) {
      e.exports = { state: "TextRegion_state__wi_ws" };
    },
    306: function(e, t, n) {
      e.exports = {
        pushable: "Segment_pushable__2gVkh",
        "hide-dd-icon": "Segment_hide-dd-icon__1KuoO",
        "drag-handle": "Segment_drag-handle__2sVHi",
        noselect: "Segment_noselect__qWi_T",
        "common-container": "Segment_common-container__EQ4YQ",
        "functional-buttons": "Segment_functional-buttons__1u8fS",
        "editor-side-column": "Segment_editor-side-column__2M4Dc",
        block: "Segment_block__3-nF9",
      };
    },
    321: function(e, t, n) {
      e.exports = n(548);
    },
    328: function(e, t, n) {},
    548: function(e, t, n) {
      "use strict";
      n.r(t);
      var a = {};
      n.r(a),
        n.d(a, "isString", function() {
          return A;
        }),
        n.d(a, "isStringEmpty", function() {
          return D;
        }),
        n.d(a, "isStringJSON", function() {
          return L;
        }),
        n.d(a, "getUrl", function() {
          return z;
        }),
        n.d(a, "toTimeString", function() {
          return P;
        });
      var o = {};
      n.r(o),
        n.d(o, "hexToRGBA", function() {
          return B;
        }),
        n.d(o, "colorToRGBA", function() {
          return V;
        }),
        n.d(o, "convertToRGBA", function() {
          return W;
        }),
        n.d(o, "stringToColor", function() {
          return F;
        });
      var r = {};
      n.r(r),
        n.d(r, "msToHMS", function() {
          return U;
        }),
        n.d(r, "prettyDate", function() {
          return G;
        });
      var i = n(0),
        l = n.n(i),
        s = n(13),
        c = n.n(s),
        u = n(7),
        d = (n(325), n(328), n(26)),
        m = n(27),
        p = n(29),
        g = n(28),
        f = n(30),
        h = n(188),
        b = n.n(h),
        v = n(1),
        y = n(566),
        k = n(558),
        S = new ((function() {
          function e() {
            Object(d.a)(this, e), (this.tags = []), (this.models = {}), (this.views = {}), (this.views_models = {});
          }
          return (
            Object(m.a)(e, [
              {
                key: "addTag",
                value: function(e, t, n) {
                  this.tags.push(e), (this.models[e] = t), (this.views[e] = n), (this.views_models[t.name] = n);
                },
              },
              {
                key: "modelsArr",
                value: function() {
                  return Object.values(this.models);
                },
              },
              {
                key: "getViewByModel",
                value: function(e) {
                  var t = this.views_models[e];
                  if (!t) throw new Error("No view for model: " + e);
                  return t;
                },
              },
              {
                key: "getViewByTag",
                value: function(e) {
                  return this.views[e];
                },
              },
              {
                key: "getModelByTag",
                value: function(e) {
                  var t = this.models[e];
                  if (!t) {
                    var n = Object.keys(this.models);
                    throw new Error("No model registered for tag: " + e + "\nAvailable models:\n\t" + n.join("\n\t"));
                  }
                  return t;
                },
              },
            ]),
            e
          );
        })())(),
        w = function(e, t, n, a) {
          return window.fetch(e, { method: t, headers: n, credentials: "include", body: a }).then(function(e) {
            return 200 !== (t = e).status || 201 !== t.status ? t : t.json();
            var t;
          });
        },
        _ = {
          fetcher: function(e) {
            return w(e, "GET", { Accept: "application/json" });
          },
          poster: function(e, t) {
            return w(e, "POST", { Accept: "application/json", "Content-Type": "application/json" }, t);
          },
          remover: function(e, t) {
            return w(e, "DELETE", { "Content-Type": "application/json" }, t);
          },
          patch: function(e, t) {
            return w(e, "PATCH", { Accept: "application/json", "Content-Type": "application/json" }, t);
          },
        },
        O = n(45),
        x = n(269),
        E = n.n(x);
      function N() {
        return E()(10);
      }
      function j(e) {
        var t = Object(v.h)(e);
        return Object(v.i)(e).create(Object(O.a)({}, t, { id: N() }));
      }
      function C(e) {
        var t = Object(v.h)(e);
        return Object(v.i)(e).create(Object(O.a)({}, t, { id: N() }));
      }
      function T(e) {
        var t = S.getViewByModel(Object(v.i)(e).name);
        if (!t) throw new Error("No view for model:" + Object(v.i)(e).name);
        return l.a.createElement(t, { key: N(), item: e });
      }
      var R = {
          cloneReactTree: function(e, t) {
            var n = null;
            return (n = function(e) {
              var a = [];
              return (
                l.a.Children.forEach(e, function(e) {
                  var o;
                  if (e.props) {
                    var r = {};
                    "function" === typeof t ? (r = t(e)) : "object" === typeof t && (r = t),
                      (o = l.a.cloneElement(e, r, n(e.props.children)));
                  } else o = e;
                  a.push(o);
                }),
                a
              );
            })(e);
          },
          renderItem: T,
          renderChildren: function(e) {
            return e && e.children && e.children.length
              ? e.children.map(function(e) {
                  return T(e);
                })
              : null;
          },
          treeToModel: function(e) {
            function t(e) {
              var t = (function(e) {
                var t = {};
                if (!e) return t;
                var n = !0,
                  a = !1,
                  o = void 0;
                try {
                  for (var r, i = e[Symbol.iterator](); !(n = (r = i.next()).done); n = !0) {
                    var l = r.value;
                    t[l.name] = l.value;
                  }
                } catch (s) {
                  (a = !0), (o = s);
                } finally {
                  try {
                    n || null == i.return || i.return();
                  } finally {
                    if (a) throw o;
                  }
                }
                return t;
              })(e.attrs);
              return (t.id = N()), (t.type = e.nodeName), "img" === t.type && (t.type = "image"), t;
            }
            var n = (function(e) {
                for (var t = e.split("/>"), n = "", a = 0; a < t.length - 1; a++) {
                  var o = t[a].split("<");
                  n += t[a] + "></" + o[o.length - 1].split(" ")[0] + ">";
                }
                return n + t[t.length - 1];
              })(e.replace(/(\r\n|\n|\r)/gm, "")),
              a = b.a.parseFragment(n),
              o = t(a.childNodes[0]);
            return (
              (o.children = (function e(n) {
                if (!n) return null;
                var a = [],
                  o = !0,
                  r = !1,
                  i = void 0;
                try {
                  for (var l, s = n.childNodes[Symbol.iterator](); !(o = (l = s.next()).done); o = !0) {
                    var c = l.value;
                    if ("#text" !== c.nodeName) {
                      var u = t(c),
                        d = e(c);
                      d && ("string" === typeof d ? (u.value = d) : (u.children = d)), a.push(u);
                    }
                  }
                } catch (m) {
                  (r = !0), (i = m);
                } finally {
                  try {
                    o || null == s.return || s.return();
                  } finally {
                    if (r) throw i;
                  }
                }
                return 0 === a.length ? null : a;
              })(a.childNodes[0])),
              o
            );
          },
          findInterface: function(e, t) {
            var n;
            return (n = function(t) {
              if (Object(v.i)(t).name === e) return t;
              if (t.children) {
                var a = !0,
                  o = !1,
                  r = void 0;
                try {
                  for (var i, l = t.children[Symbol.iterator](); !(a = (i = l.next()).done); a = !0) {
                    var s = i.value,
                      c = n(s);
                    if (c) return c;
                  }
                } catch (u) {
                  (o = !0), (r = u);
                } finally {
                  try {
                    a || null == l.return || l.return();
                  } finally {
                    if (o) throw r;
                  }
                }
              }
            })(t);
          },
          findParentOfType: function(e, t) {
            var n = !0,
              a = !1,
              o = void 0;
            try {
              for (var r, i = t[Symbol.iterator](); !(n = (r = i.next()).done); n = !0) {
                var l = r.value;
                try {
                  var s = Object(v.f)(e, l);
                  if (s) return s;
                } catch (c) {}
              }
            } catch (c) {
              (a = !0), (o = c);
            } finally {
              try {
                n || null == i.return || i.return();
              } finally {
                if (a) throw o;
              }
            }
            return null;
          },
          filterChildrenOfType: function(e, t) {
            var n,
              a = [];
            return (
              (n = function(e) {
                var o = !0,
                  r = !1,
                  i = void 0;
                try {
                  for (var l, s = t[Symbol.iterator](); !(o = (l = s.next()).done); o = !0) {
                    var c = l.value;
                    Object(v.i)(e).name === c && a.push(e);
                  }
                } catch (h) {
                  (r = !0), (i = h);
                } finally {
                  try {
                    o || null == s.return || s.return();
                  } finally {
                    if (r) throw i;
                  }
                }
                if (e.children) {
                  var u = !0,
                    d = !1,
                    m = void 0;
                  try {
                    for (var p, g = e.children[Symbol.iterator](); !(u = (p = g.next()).done); u = !0) {
                      var f = p.value;
                      n(f);
                    }
                  } catch (h) {
                    (d = !0), (m = h);
                  } finally {
                    try {
                      u || null == g.return || g.return();
                    } finally {
                      if (d) throw m;
                    }
                  }
                }
              })(e),
              a
            );
          },
          cssConverter: function(e) {
            var t,
              n,
              a,
              o,
              r = {},
              i = e.split(";");
            for (n = 0; n < i.length; n++)
              (t = i[n].indexOf(":")),
                (a = i[n].substring(0, t)),
                (o = i[n].substring(t + 1)),
                (a = a.replace(/ /g, "")).length < 1 ||
                  (" " === o[0] && (o = o.substring(1)),
                  " " === o[o.length - 1] && (o = o.substring(0, o.length - 1)),
                  (r[
                    a.replace(/(-.)/g, function(e) {
                      return e[1].toUpperCase();
                    })
                  ] = o));
            return r;
          },
        },
        M = n(563),
        I = n(198),
        H = n(559),
        A = function(e) {
          return "string" === typeof e || e instanceof String;
        },
        D = function(e) {
          return !!A(e) && 0 === e.length;
        },
        L = function(e) {
          if (A(e)) {
            try {
              JSON.parse(e);
            } catch (t) {
              return !1;
            }
            return !0;
          }
          return !1;
        };
      function z(e, t) {
        var n = t.slice(e),
          a = /^(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g.exec(n);
        return a && a.length ? a[1] : "";
      }
      function P(e) {
        if ("number" === typeof e) return new Date(e).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
      }
      var J = {
        aliceblue: "#f0f8ff",
        antiquewhite: "#faebd7",
        aqua: "#00ffff",
        aquamarine: "#7fffd4",
        azure: "#f0ffff",
        beige: "#f5f5dc",
        bisque: "#ffe4c4",
        black: "#000000",
        blanchedalmond: "#ffebcd",
        blue: "#0000ff",
        blueviolet: "#8a2be2",
        brown: "#a52a2a",
        burlywood: "#deb887",
        cadetblue: "#5f9ea0",
        chartreuse: "#7fff00",
        chocolate: "#d2691e",
        coral: "#ff7f50",
        cornflowerblue: "#6495ed",
        cornsilk: "#fff8dc",
        crimson: "#dc143c",
        cyan: "#00ffff",
        darkblue: "#00008b",
        darkcyan: "#008b8b",
        darkgoldenrod: "#b8860b",
        darkgray: "#a9a9a9",
        darkgreen: "#006400",
        darkkhaki: "#bdb76b",
        darkmagenta: "#8b008b",
        darkolivegreen: "#556b2f",
        darkorange: "#ff8c00",
        darkorchid: "#9932cc",
        darkred: "#8b0000",
        darksalmon: "#e9967a",
        darkseagreen: "#8fbc8f",
        darkslateblue: "#483d8b",
        darkslategray: "#2f4f4f",
        darkturquoise: "#00ced1",
        darkviolet: "#9400d3",
        deeppink: "#ff1493",
        deepskyblue: "#00bfff",
        dimgray: "#696969",
        dodgerblue: "#1e90ff",
        firebrick: "#b22222",
        floralwhite: "#fffaf0",
        forestgreen: "#228b22",
        fuchsia: "#ff00ff",
        gainsboro: "#dcdcdc",
        ghostwhite: "#f8f8ff",
        gold: "#ffd700",
        goldenrod: "#daa520",
        gray: "#808080",
        green: "#008000",
        greenyellow: "#adff2f",
        honeydew: "#f0fff0",
        hotpink: "#ff69b4",
        indianred: "#cd5c5c",
        indigo: "#4b0082",
        ivory: "#fffff0",
        khaki: "#f0e68c",
        lavender: "#e6e6fa",
        lavenderblush: "#fff0f5",
        lawngreen: "#7cfc00",
        lemonchiffon: "#fffacd",
        lightblue: "#add8e6",
        lightcoral: "#f08080",
        lightcyan: "#e0ffff",
        lightgoldenrodyellow: "#fafad2",
        lightgrey: "#d3d3d3",
        lightgreen: "#90ee90",
        lightpink: "#ffb6c1",
        lightsalmon: "#ffa07a",
        lightseagreen: "#20b2aa",
        lightskyblue: "#87cefa",
        lightslategray: "#778899",
        lightsteelblue: "#b0c4de",
        lightyellow: "#ffffe0",
        lime: "#00ff00",
        limegreen: "#32cd32",
        linen: "#faf0e6",
        magenta: "#ff00ff",
        maroon: "#800000",
        mediumaquamarine: "#66cdaa",
        mediumblue: "#0000cd",
        mediumorchid: "#ba55d3",
        mediumpurple: "#9370d8",
        mediumseagreen: "#3cb371",
        mediumslateblue: "#7b68ee",
        mediumspringgreen: "#00fa9a",
        mediumturquoise: "#48d1cc",
        mediumvioletred: "#c71585",
        midnightblue: "#191970",
        mintcream: "#f5fffa",
        mistyrose: "#ffe4e1",
        moccasin: "#ffe4b5",
        navajowhite: "#ffdead",
        navy: "#000080",
        oldlace: "#fdf5e6",
        olive: "#808000",
        olivedrab: "#6b8e23",
        orange: "#ffa500",
        orangered: "#ff4500",
        orchid: "#da70d6",
        palegoldenrod: "#eee8aa",
        palegreen: "#98fb98",
        paleturquoise: "#afeeee",
        palevioletred: "#d87093",
        papayawhip: "#ffefd5",
        peachpuff: "#ffdab9",
        peru: "#cd853f",
        pink: "#ffc0cb",
        plum: "#dda0dd",
        powderblue: "#b0e0e6",
        purple: "#800080",
        rebeccapurple: "#663399",
        red: "#ff0000",
        rosybrown: "#bc8f8f",
        royalblue: "#4169e1",
        saddlebrown: "#8b4513",
        salmon: "#fa8072",
        sandybrown: "#f4a460",
        seagreen: "#2e8b57",
        seashell: "#fff5ee",
        sienna: "#a0522d",
        silver: "#c0c0c0",
        skyblue: "#87ceeb",
        slateblue: "#6a5acd",
        slategray: "#708090",
        snow: "#fffafa",
        springgreen: "#00ff7f",
        steelblue: "#4682b4",
        tan: "#d2b48c",
        teal: "#008080",
        thistle: "#d8bfd8",
        tomato: "#ff6347",
        turquoise: "#40e0d0",
        violet: "#ee82ee",
        wheat: "#f5deb3",
        white: "#ffffff",
        whitesmoke: "#f5f5f5",
        yellow: "#ffff00",
        yellowgreen: "#9acd32",
      };
      function B(e, t) {
        var n = 0,
          a = 0,
          o = 0,
          r = 0.3;
        return (
          t && "number" === typeof parseInt(t) && (r = t),
          e && 4 === e.length
            ? ((n = "0x" + e[1] + e[1]), (a = "0x" + e[2] + e[2]), (o = "0x" + e[3] + e[3]))
            : e && 7 === e.length && ((n = "0x" + e[1] + e[2]), (a = "0x" + e[3] + e[4]), (o = "0x" + e[5] + e[6])),
          "rgba("
            .concat(+n, ", ")
            .concat(+a, ", ")
            .concat(+o, ", ")
            .concat(r, ")")
        );
      }
      function V(e, t) {
        return "string" === typeof e && void 0 !== typeof J[e.toLowerCase()] ? B(J[e.toLowerCase()], t) : e;
      }
      function W(e, t) {
        return "#" === e.charAt(0) ? B(e, t) : V(e, t);
      }
      function F(e) {
        for (var t = 0, n = 0; n < e.length; n++) t = e.charCodeAt(n) + ((t << 5) - t);
        for (var a = "#", o = 0; o < 3; o++) {
          a += ("00" + ((t >> (8 * o)) & 255).toString(16)).substr(-2);
        }
        return a;
      }
      function U(e) {
        var t = e / 1e3,
          n = parseInt(t / 3600);
        return (t %= 3600), n + ":" + parseInt(t / 60) + ":" + (t = Math.floor(t));
      }
      function G(e) {
        if (
          "string" === typeof e ||
          /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(e)
        ) {
          var t = new Date((e || "").replace(/-/g, "/").replace(/[TZ]/g, " ")),
            n = (new Date().getTime() - t.getTime()) / 1e3,
            a = Math.floor(n / 86400);
          if (!(isNaN(a) || a < 0))
            return (
              (0 === a &&
                ((n < 60 ? "just now" : n < 120 && "1 minute ago") ||
                  (n < 3600 && Math.floor(n / 60) + " minutes ago") ||
                  (n < 7200 && "1 hour ago") ||
                  (n < 86400 && Math.floor(n / 3600) + " hours ago"))) ||
              (1 === a && "Yesterday") ||
              (a < 7 && a + " days ago") ||
              (a < 31 && Math.ceil(a / 7) + " weeks ago") ||
              a + " days ago"
            );
        }
      }
      var Y = n(137);
      var Z = {
          Checkers: a,
          Colors: o,
          UDate: r,
          guidGenerator: N,
          debounce: function(e, t, n) {
            var a;
            return function() {
              var o = this,
                r = arguments,
                i = n && !a;
              clearTimeout(a),
                (a = setTimeout(function() {
                  (a = null), n || e.apply(o, r);
                }, t)),
                i && e.apply(o, r);
            };
          },
          styleToProp: function(e) {
            return e
              ? e
                  .split(";")
                  .filter(function(e) {
                    return e.split(":")[0] && e.split(":")[1];
                  })
                  .map(function(e) {
                    return [
                      e
                        .split(":")[0]
                        .trim()
                        .replace(/-./g, function(e) {
                          return e.substr(1).toUpperCase();
                        }),
                      e
                        .split(":")
                        .slice(1)
                        .join(":")
                        .trim(),
                    ];
                  })
                  .reduce(function(e, t) {
                    return Object(O.a)({}, e, Object(Y.a)({}, t[0], t[1]));
                  }, {})
              : null;
          },
        },
        K = n(270),
        X = n.n(K),
        $ = Object(u.c)(function(e) {
          var t = e.item,
            n = e.store;
          return l.a.createElement(
            M.a.Item,
            {
              style: { backgroundColor: t.selected ? "#f8f8f9" : "white", padding: "1em" },
              onClick: function(e) {
                !t.selected && n.completionStore.selectCompletion(t.id);
              },
            },
            l.a.createElement(
              M.a.Content,
              null,
              l.a.createElement(M.a.Header, { as: "a" }, "ID ", t.pk || t.id),
              l.a.createElement("p", null),
              l.a.createElement(
                M.a.Description,
                { as: "a" },
                "Created",
                l.a.createElement(
                  "i",
                  null,
                  t.createdAgo ? " ".concat(t.createdAgo, " ago") : " ".concat(Z.UDate.prettyDate(t.createdDate)),
                ),
                t.createdBy ? " by ".concat(t.createdBy) : null,
              ),
              t.selected &&
                l.a.createElement(
                  "div",
                  { className: X.a.buttons },
                  l.a.createElement(
                    I.a,
                    {
                      type: "danger",
                      onClick: function(e) {
                        e.preventDefault(), t.store.deleteCompletion(t);
                      },
                    },
                    "Delete",
                  ),
                  t.honeypot
                    ? l.a.createElement(
                        I.a,
                        {
                          type: "primary",
                          onClick: function(e) {
                            e.preventDefault(), t.removeHoneypot();
                          },
                        },
                        "Honeypot",
                      )
                    : l.a.createElement(
                        I.a,
                        {
                          type: "primary",
                          ghost: !0,
                          onClick: function(e) {
                            e.preventDefault(), t.setHoneypot();
                          },
                        },
                        "Honeypot",
                      ),
                ),
            ),
          );
        }),
        q = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  var e = this.props.store;
                  return l.a.createElement(
                    H.a,
                    { title: "Completions", bodyStyle: { padding: 0 } },
                    l.a.createElement(
                      M.a,
                      { divided: !0, relaxed: !0 },
                      e.completionStore.savedCompletions.map(function(t) {
                        return l.a.createElement($, { key: t.id, item: t, store: e });
                      }),
                    ),
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        Q = Object(u.c)(q),
        ee = n(202),
        te = n.n(ee),
        ne = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  var e,
                    t = "".concat(te.a.main);
                  return (
                    this.props.style && (e = this.props.style),
                    this.props.className && (t = "".concat(te.a.main, " ").concat(this.props.className)),
                    l.a.createElement(
                      "sup",
                      { "data-copy": this.props.copy, className: t, style: e },
                      this.props.children,
                    )
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        ae = n(86),
        oe = n.n(ae),
        re = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t,
              n,
              a,
              o = e.store;
            return (
              o.task && (t = l.a.createElement("h4", { className: oe.a.task }, "Task ID: ", o.task.id)),
              o.settings.enableHotkeys &&
                o.settings.enableTooltips &&
                ((n = l.a.createElement(ne, null, " [ Ctrl+Enter ]")),
                (a = l.a.createElement(ne, null, " [ Ctrl+Space ]"))),
              l.a.createElement(
                "div",
                { className: oe.a.block },
                l.a.createElement(
                  "div",
                  { className: oe.a.wrapper },
                  l.a.createElement(
                    "div",
                    { className: oe.a.container },
                    o.hasInterface("submit:skip") &&
                      l.a.createElement(I.a, { type: "ghost", onClick: o.skipTask, className: oe.a.skip }, "Skip ", a),
                    l.a.createElement(
                      I.a,
                      { type: "primary", icon: "check", onClick: o.sendTask, className: oe.a.submit },
                      "Submit ",
                      n,
                    ),
                  ),
                  t,
                ),
              )
            );
          }),
        ),
        ie = n(149),
        le = n.n(ie),
        se = Object(u.c)(function(e) {
          var t = e.store,
            n = t.completionStore.selected.history;
          return l.a.createElement(
            "div",
            { className: le.a.container },
            l.a.createElement(
              "div",
              { className: le.a.block },
              l.a.createElement(
                I.a,
                {
                  type: "ghost",
                  icon: "undo",
                  onClick: function(e) {
                    n && n.canUndo && n.undo(), e.preventDefault();
                  },
                },
                "Undo",
                t.settings.enableHotkeys && t.settings.enableTooltips && l.a.createElement(ne, null, "[ Ctrl+z ]"),
              ),
              l.a.createElement(
                I.a,
                {
                  type: "ghost",
                  icon: "redo",
                  onClick: function(e) {
                    n && n.canRedo && n.redo(), e.preventDefault();
                  },
                },
                "Redo",
              ),
              l.a.createElement(
                I.a,
                {
                  type: "ghost",
                  icon: "rest",
                  onClick: function(e) {
                    n && n.reset();
                  },
                },
                "Reset",
              ),
              t.setPrelabeling &&
                l.a.createElement(
                  I.a,
                  {
                    style: { display: "none" },
                    onClick: function(e) {
                      t.resetPrelabeling();
                    },
                  },
                  " ",
                  "Reset Prelabeling",
                ),
            ),
            l.a.createElement(
              "div",
              { className: le.a.block },
              t.showingDescription &&
                l.a.createElement(
                  I.a,
                  {
                    type: "primary",
                    onClick: function(e) {
                      t.closeDescription();
                    },
                  },
                  "Hide Instructions",
                ),
              !t.showingDescription &&
                l.a.createElement(
                  I.a,
                  {
                    type: "primary",
                    onClick: function(e) {
                      t.openDescription();
                    },
                  },
                  "Show Instructions",
                ),
              l.a.createElement(I.a, {
                type: "dashed",
                icon: "setting",
                onClick: function(e) {
                  return t.toggleSettings(), e.preventDefault(), !1;
                },
              }),
            ),
          );
        }),
        ce = n(562),
        ue = n(569),
        de = Object(u.c)(function(e) {
          var t = e.store;
          return l.a.createElement(
            ce.a,
            { visible: t.showingSettings, title: "Hotkeys", footer: "", onCancel: t.toggleSettings },
            l.a.createElement(
              ue.a,
              {
                value: "Enable labeling hotkeys",
                defaultChecked: t.settings.enableHotkeys,
                onChange: function() {
                  t.settings.toggleHotkeys();
                },
              },
              "Enable labeling hotkeys",
            ),
            l.a.createElement("br", null),
            l.a.createElement(
              ue.a,
              {
                value: "Show tooltips",
                defaultChecked: t.settings.enableTooltips,
                onChange: function() {
                  t.settings.toggleTooltips();
                },
              },
              "Show tooltips",
            ),
          );
        }),
        me = n(570),
        pe = n(568),
        ge = n(560),
        fe = (function(e) {
          function t() {
            var e, n;
            Object(d.a)(this, t);
            for (var a = arguments.length, o = new Array(a), r = 0; r < a; r++) o[r] = arguments[r];
            return (
              ((n = Object(p.a)(this, (e = Object(g.a)(t)).call.apply(e, [this].concat(o)))).state = { res: null }), n
            );
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  var e = this,
                    t = this,
                    n = this.props.store,
                    a = n.completionStore.selected;
                  return l.a.createElement(
                    "div",
                    null,
                    l.a.createElement("br", null),
                    l.a.createElement(me.a, null, "Debug"),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(t) {
                          e.setState({ res: JSON.stringify(n.completionStore.selected.toJSON()) });
                        },
                      },
                      "Serialize whole tree",
                    ),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(t) {
                          e.setState({ res: JSON.stringify(n.completionStore.selected.serializeCompletion()) });
                        },
                      },
                      "Seriealize results tree",
                    ),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(e) {
                          t.state.res && a.deserializeCompletion(JSON.parse(t.state.res));
                        },
                      },
                      "Load Serialized Results",
                    ),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(e) {
                          var a = n.completionStore.addInitialCompletion();
                          n.completionStore.selectCompletion(a.id),
                            t.state.res && a.deserializeCompletion(JSON.parse(t.state.res));
                        },
                      },
                      "Load As New Completion",
                    ),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(t) {
                          e.setState({ res: n.task.data });
                        },
                      },
                      "Task data",
                    ),
                    l.a.createElement(
                      pe.a,
                      {
                        basic: !0,
                        onClick: function(e) {
                          var a = JSON.parse(t.state.res),
                            o = { id: a.id, project: 2, data: JSON.stringify(a) };
                          n.resetState(),
                            n.addTask(o),
                            n.addGeneratedCompletion(o),
                            n.markLoading(!1),
                            n.completionStore.selected &&
                              n.completionStore.selected.traverseTree(function(e) {
                                return e.updateValue && e.updateValue(t);
                              });
                        },
                      },
                      "Simulate Loading Task",
                    ),
                    l.a.createElement("br", null),
                    l.a.createElement("br", null),
                    l.a.createElement(
                      ge.a,
                      null,
                      l.a.createElement(ge.a.TextArea, {
                        value: this.state.res,
                        className: "is-search",
                        onChange: function(t) {
                          e.setState({ res: t.target.value });
                        },
                      }),
                    ),
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        he = (Object(u.c)(fe), n(32)),
        be = Object(u.c)(function(e) {
          var t = e.node,
            n = function(e) {
              return (
                e.preventDefault(),
                Object(v.g)(t).completionStore.selected.regionStore.unselectAll(),
                t.selectRegion(),
                !1
              );
            },
            a = { color: "black", textDecorationLine: "underline", textDecorationStyle: "dotted" };
          if ("TextRegionModel" === Object(v.i)(t).name)
            return l.a.createElement(
              "div",
              null,
              l.a.createElement(he.a, { type: "font-colors" }),
              "Text \xa0",
              l.a.createElement("span", { style: { color: "#5a5a5a" } }, t.text),
            );
          if ("AudioRegionModel" === Object(v.i)(t).name)
            return l.a.createElement(
              "p",
              null,
              l.a.createElement(
                "a",
                { href: "", onClick: n, style: a },
                l.a.createElement("i", { className: "microphone icon" }),
                "Audio \xa0",
                t.start.toFixed(2),
                " - ",
                t.end.toFixed(2),
              ),
            );
          if ("TextAreaRegionModel" === Object(v.i)(t).name)
            return l.a.createElement(
              "p",
              null,
              l.a.createElement(
                "a",
                { href: "", onClick: n, style: a },
                l.a.createElement("i", { className: "i cursor icon" }),
                "Input \xa0",
                l.a.createElement("span", { style: { color: "#5a5a5a" } }, t._value),
              ),
            );
          if ("RectRegionModel" === Object(v.i)(t).name) {
            var o = t.width * t.scaleX,
              r = t.height * t.scaleY;
            return l.a.createElement(
              "p",
              null,
              l.a.createElement(
                "a",
                { href: "", onClick: n, style: a },
                l.a.createElement("i", { className: "expand icon" }),
                "Rectangle \xa0",
                o.toFixed(2),
                " x ",
                r.toFixed(2),
              ),
            );
          }
          return "PolygonRegionModel" === Object(v.i)(t).name
            ? l.a.createElement(
                "p",
                null,
                l.a.createElement(
                  "a",
                  { href: "", onClick: n, style: a },
                  l.a.createElement("i", { className: "i object ungroup outline icon" }),
                  "Polygon",
                ),
              )
            : void 0;
        }),
        ve = function(e) {
          var t = e.node;
          return "TextRegionModel" == Object(v.i)(t).name
            ? l.a.createElement(i.Fragment, null, l.a.createElement(he.a, { type: "font-colors" }), " Text")
            : "RectRegionModel" == Object(v.i)(t).name
            ? l.a.createElement(i.Fragment, null, l.a.createElement("i", { className: "expand icon" }), "Rectangle")
            : "AudioRegionModel" == Object(v.i)(t).name
            ? l.a.createElement(i.Fragment, null, l.a.createElement("i", { className: "microphone icon" }), "Audio")
            : "TextAreaRegionModel" == Object(v.i)(t).name
            ? l.a.createElement(i.Fragment, null, l.a.createElement("i", { className: "i cursor icon" }), "Input")
            : "PolygonRegionModel" == Object(v.i)(t).name
            ? l.a.createElement(
                i.Fragment,
                null,
                l.a.createElement("i", { className: "i object ungroup outline icon" }),
                "Polygon",
              )
            : void 0;
        },
        ye = n(115),
        ke = n.n(ye),
        Se = function(e) {
          var t = e.store,
            n = e.rl;
          return Object(v.j)(function() {
            return n.node1;
          }) &&
            Object(v.j)(function() {
              return n.node2;
            })
            ? l.a.createElement(
                "div",
                { className: ke.a.block },
                l.a.createElement(
                  "div",
                  {
                    className: ke.a.section,
                    onMouseOver: function() {
                      n.toggleHighlight();
                    },
                    onMouseOut: function() {
                      n.toggleHighlight();
                    },
                  },
                  l.a.createElement(
                    "div",
                    { className: ke.a.section__blocks },
                    l.a.createElement("div", null, l.a.createElement(ve, { node: n.node1 })),
                    l.a.createElement(he.a, { type: "arrow-right" }),
                    l.a.createElement("div", null, l.a.createElement(ve, { node: n.node2 })),
                  ),
                ),
                l.a.createElement(
                  "a",
                  {
                    href: "#",
                    className: ke.a.delete,
                    onClick: function() {
                      return t.deleteRelation(n), !1;
                    },
                  },
                  l.a.createElement(he.a, { type: "delete" }),
                ),
              )
            : null;
        },
        we = Object(u.c)(function(e) {
          var t = e.store.completionStore.selected,
            n = t.relationStore.relations;
          return l.a.createElement(
            i.Fragment,
            null,
            l.a.createElement("h4", null, "Relations (", n.length, ")"),
            !n.length && l.a.createElement("p", null, "No Relations added yet"),
            t.relationStore.relations.map(function(e) {
              return l.a.createElement(Se, { store: t.relationStore, rl: e });
            }),
          );
        }),
        _e = n(294),
        Oe = n.n(_e),
        xe = Object(u.c)(function(e) {
          var t = e.store,
            n = e.regionStore.regions;
          return l.a.createElement(
            "div",
            null,
            l.a.createElement("h4", null, "Entities (", n.length, ")"),
            n.length > 0 &&
              l.a.createElement(
                I.a,
                {
                  type: "link",
                  style: { paddingLeft: 0 },
                  onClick: function(e) {
                    t.completionStore.selected.deleteAllRegions(), e.preventDefault();
                  },
                },
                "Remove all",
                n.length > 0 &&
                  t.settings.enableHotkeys &&
                  t.settings.enableTooltips &&
                  l.a.createElement(ne, null, "[ Ctrl+bksp ]"),
              ),
            !n.length && l.a.createElement("p", null, "No Entitied added yet"),
            l.a.createElement(
              "ul",
              null,
              n.map(function(e) {
                return l.a.createElement(
                  "li",
                  {
                    key: e.id,
                    className: Oe.a.item,
                    onMouseOver: function() {
                      e.toggleHightlight();
                    },
                    onMouseOut: function() {
                      e.toggleHightlight();
                    },
                  },
                  l.a.createElement(be, { node: e }),
                );
              }),
            ),
          );
        }),
        Ee = n(571),
        Ne = n(74),
        je = n.n(Ne),
        Ce = function(e) {
          var t = e.node,
            n = function(e) {
              return "LabelsModel" === Object(v.i)(e).name ||
                "RectangleLabelsModel" === Object(v.i)(e).name ||
                "PolygonLabelsModel" === Object(v.i)(e).name
                ? ((t = e),
                  l.a.createElement(
                    "div",
                    { key: t.id, className: je.a.labels },
                    "Labels:",
                    t.getSelectedNames().map(function(e) {
                      var n = t.getSelectedColor() ? t.getSelectedColor() : "#000000";
                      return l.a.createElement(Ee.a, { key: t.id, color: n, className: je.a.tag }, e);
                    }),
                  ))
                : "RatingModel" === Object(v.i)(e).name
                ? l.a.createElement("p", null, "Rating: ", e.getSelectedString())
                : null;
              var t;
            };
          return l.a.createElement(
            i.Fragment,
            null,
            t.states.map(function(e) {
              return n(e);
            }),
          );
        },
        Te = Object(u.c)(function(e) {
          var t = e.store,
            n = e.completion,
            a = n.highlightedNode;
          return l.a.createElement(
            i.Fragment,
            null,
            l.a.createElement("p", null, l.a.createElement(ve, { node: a }), " (id: ", a.id, ")"),
            a.normalization &&
              l.a.createElement(
                "p",
                null,
                "Normalization: ",
                a.normalization,
                l.a.createElement(he.a, {
                  name: "delete",
                  style: { cursor: "pointer" },
                  onClick: function() {
                    a.deleteNormalization();
                  },
                }),
              ),
            a.states && l.a.createElement(Ce, { node: a }),
            l.a.createElement(
              "div",
              { className: je.a.block },
              l.a.createElement(
                I.a,
                {
                  className: je.a.button,
                  onClick: function() {
                    n.startRelationMode(a);
                  },
                },
                l.a.createElement(he.a, { type: "link" }),
                "Relation",
              ),
              l.a.createElement(
                I.a,
                {
                  className: je.a.button,
                  onClick: function() {
                    n.setNormalizationMode(!0);
                  },
                },
                l.a.createElement(he.a, { type: "plus" }),
                "Normalization",
              ),
              l.a.createElement(
                I.a,
                {
                  className: je.a.button,
                  type: "dashed",
                  onClick: function() {
                    n.highlightedNode.unselectRegion();
                  },
                },
                l.a.createElement(he.a, { type: "fullscreen-exit" }),
                "Unselect",
              ),
              l.a.createElement(
                I.a,
                {
                  type: "danger",
                  className: je.a.button,
                  onClick: function() {
                    n.highlightedNode.deleteRegion();
                  },
                },
                l.a.createElement(he.a, { type: "delete" }),
                "Delete",
                t.settings.enableHotkeys && t.settings.enableTooltips && l.a.createElement(ne, null, "[ Bksp ]"),
              ),
            ),
            n.normalizationMode &&
              l.a.createElement(
                "div",
                null,
                l.a.createElement(
                  ge.a,
                  {
                    style: { marginTop: "0.5em" },
                    onSubmit: function(e) {
                      e.target.value;
                      return a.setNormalization(a.normInput), n.setNormalizationMode(!1), e.preventDefault(), !1;
                    },
                  },
                  l.a.createElement(ge.a.Input, {
                    onChange: function(e) {
                      var t = e.target.value;
                      a.setNormInput(t);
                    },
                    placeholder: "Add Normalization",
                  }),
                ),
              ),
          );
        }),
        Re = n(295),
        Me = n.n(Re),
        Ie = Object(u.c)(function(e) {
          var t = e.store,
            n = t.completionStore.selected,
            a = n.highlightedNode;
          return l.a.createElement(
            H.a,
            { title: "Entity", className: Me.a.card },
            a && l.a.createElement(Te, { store: t, completion: n }),
            !n.highlightedNode && l.a.createElement("p", null, "Nothing selected"),
            l.a.createElement(xe, { store: t, regionStore: n.regionStore }),
            l.a.createElement(we, { store: t, item: n }),
          );
        });
      function He(e) {
        return v.m.union({
          dispatcher: function(t) {
            if (
              e.find(function(e) {
                return t.type === e;
              })
            )
              return S.getModelByTag(t.type);
            throw Error("Not expecting tag: " + t.type);
          },
        });
      }
      var Ae = {
          unionArray: function(e) {
            return v.m.maybeNull(v.m.array(He(e)));
          },
          allModelsTypes: function() {
            var e = [
                {
                  dispatcher: function(e) {
                    if (
                      S.tags.find(function(t) {
                        return e.type === t;
                      })
                    )
                      return S.getModelByTag(e.type);
                    throw Error("Not expecting tag: " + e.type);
                  },
                },
                S.modelsArr(),
              ],
              t = [].concat.apply([], e);
            return v.m.union.apply(null, t);
          },
          oneOf: He,
          isType: function(e, t) {
            var n = Object(v.i)(e),
              a = !0,
              o = !1,
              r = void 0;
            try {
              for (var i, l = t[Symbol.iterator](); !(a = (i = l.next()).done); a = !0) if (n === i.value) return !0;
            } catch (s) {
              (o = !0), (r = s);
            } finally {
              try {
                a || null == l.return || l.return();
              } finally {
                if (o) throw r;
              }
            }
            return !1;
          },
          getParentOfTypeString: function(e, t) {
            var n = Object(v.e)(e);
            Array.isArray(t) || (t = [t]);
            for (
              var a = function() {
                var e = Object(v.i)(n).name;
                if (
                  t.find(function(t) {
                    return t === e;
                  })
                )
                  return { v: n };
                n = Object(v.e)(n);
              };
              n;

            ) {
              var o = a();
              if ("object" === typeof o) return o.v;
            }
            return null;
          },
        },
        De = v.m.model({
          display: v.m.optional(v.m.string, "block"),
          backgroundcolor: v.m.optional(v.m.string, ""),
          margin: v.m.optional(v.m.string, ""),
        }),
        Le = v.m.model({
          id: v.m.identifier,
          type: "view",
          style: v.m.maybeNull(v.m.string),
          children: Ae.unionArray([
            "view",
            "header",
            "labels",
            "textarea",
            "choices",
            "rating",
            "ranker",
            "rectangle",
            "polygon",
            "rectanglelabels",
            "polygonlabels",
            "text",
            "audio",
            "image",
            "hypertext",
            "audioplus",
            "list",
            "dialog",
          ]),
        }),
        ze = v.m.compose(
          "ViewModel",
          De,
          Le,
        ),
        Pe = Object(u.c)(function(e) {
          var t = e.item,
            n = {};
          return (
            "inline" === t.display && (n = { display: "inline-block", marginRight: "15px" }),
            t.style && (n = R.cssConverter(t.style)),
            l.a.createElement("div", { style: n }, R.renderChildren(t))
          );
        });
      S.addTag("view", ze, Pe);
      var Je = n(564);
      function Be(e, t) {
        return "$" === e.charAt(0)
          ? (function e(t, n, a) {
              return "string" === typeof n
                ? e(t, n.split("."), a)
                : 1 === n.length && void 0 !== a
                ? (t[n[0]] = a)
                : 0 === n.length
                ? t
                : e(t[n[0]], n.slice(1), a);
            })(t, e.substring(1))
          : e;
      }
      function Ve(e, t) {
        t || (t = {});
        for (
          var n,
            a,
            o = /[$](.+)/g,
            r = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g,
            i = "with(obj) { var r=[];\n",
            l = 0,
            s = function e(t, n) {
              return (
                (i += n
                  ? t.match(r)
                    ? t + "\n"
                    : "r.push(" + t + ");\n"
                  : "" !== t
                  ? 'r.push("' + t.replace(/"/g, '\\"') + '");\n'
                  : ""),
                e
              );
            };
          (a = o.exec(e));

        )
          s(e.slice(l, a.index))(a[1], !0), (l = a.index + a[0].length);
        if (!e) return "";
        s(e.substr(l, e.length - l)), (i = (i + 'return r.join(""); }').replace(/[\r\t\n]/g, " "));
        try {
          n = new Function("obj", i).apply(t, [t]);
        } catch (c) {
          console.error("'" + c.message + "'", " in \n\nCode:\n", i, "\n");
        }
        return n;
      }
      var We = v.m.model().actions(function(e) {
          return {
            updateValue: function(t) {
              e._value = Ve(e.value, t.task.dataObj) || "";
            },
          };
        }),
        Fe = v.m.model({
          type: "table",
          size: v.m.optional(v.m.string, "h4"),
          value: v.m.maybeNull(v.m.string),
          _value: v.m.optional(v.m.string, ""),
        }),
        Ue = v.m.compose(
          "TableModel",
          Fe,
          We,
        ),
        Ge = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = e.item._value;
            return (
              n || (t.task && (n = t.task.dataObj)),
              l.a.createElement(
                "div",
                { style: { marginTop: "1em" } },
                l.a.createElement(
                  Je.a,
                  { basic: "very", celled: !0, collapsing: !0 },
                  l.a.createElement(
                    Je.a.Body,
                    null,
                    Object.keys(n).map(function(e) {
                      var t = n[e];
                      return (
                        "object" === typeof t && (t = JSON.stringify(t)),
                        l.a.createElement(
                          Je.a.Row,
                          null,
                          l.a.createElement(
                            Je.a.Cell,
                            null,
                            l.a.createElement(me.a, { as: "h4" }, l.a.createElement(me.a.Subheader, null, e)),
                          ),
                          l.a.createElement(Je.a.Cell, null, t),
                        )
                      );
                    }),
                  ),
                ),
              )
            );
          }),
        );
      S.addTag("table", Ue, Ge);
      var Ye = n(561),
        Ze = v.m.model({
          type: "header",
          size: v.m.optional(v.m.number, 4),
          value: v.m.optional(v.m.string, ""),
          underline: v.m.optional(v.m.boolean, !1),
        }),
        Ke = v.m.compose(
          "HeaderModel",
          Ze,
          We,
        ),
        Xe = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(
            Ye.a.Title,
            { underline: t.underline, level: t.size, style: { margin: "10px 0" } },
            t.value,
          );
        });
      S.addTag("header", Ke, Xe);
      var $e = v.m.model({ value: v.m.maybeNull(v.m.string), name: v.m.maybeNull(v.m.string) });
      var qe = v.m
          .model({ id: v.m.identifier, type: "HyperText" })
          .views(function(e) {
            return {
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return (function(e) {
              return {
                fromStateJSON: function(t) {
                  t.value.choices && e.completion.names.get(t.from_name).fromStateJSON(t),
                    t.value.text && e.completion.names.get(t.from_name).fromStateJSON(t);
                },
              };
            })(e);
          }),
        Qe = v.m.compose(
          "HyperTextModel",
          $e,
          qe,
        ),
        et = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = e.item;
            return t.task
              ? l.a.createElement("div", { dangerouslySetInnerHTML: { __html: Ve(n.value, t.task.dataObj) } })
              : null;
          }),
        );
      S.addTag("hypertext", Qe, et);
      var tt = n(396),
        nt = n(557),
        at = n(87),
        ot = n.n(at),
        rt = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  var e,
                    t,
                    n,
                    a = "".concat(ot.a.block);
                  return (
                    this.props.hint && (e = l.a.createElement(Ee.a, { color: "blue" }, this.props.hint)),
                    this.props.bg && (t = this.props.bg),
                    this.props.selected &&
                      ((a = "".concat(a, " ").concat(ot.a.block_selected)),
                      (e = l.a.createElement(
                        "div",
                        null,
                        l.a.createElement(Ee.a, { color: "magenta" }, "Selected Message"),
                      )),
                      this.props.hint &&
                        (e = l.a.createElement(
                          "div",
                          { className: ot.a.tag },
                          l.a.createElement(Ee.a, { color: "magenta" }, this.props.hint),
                        ))),
                    this.props.date && (n = l.a.createElement("span", { className: ot.a.date }, this.props.date)),
                    l.a.createElement(
                      "div",
                      { className: a, style: { background: t, width: "max-content", maxWidth: "100%" } },
                      l.a.createElement("span", { className: ot.a.name }, this.props.name, ":\xa0"),
                      l.a.createElement("p", { className: ot.a.text }, this.props.text),
                      n,
                      e,
                    )
                  );
                },
              },
            ]),
            t
          );
        })(l.a.Component),
        it = v.m.model({
          name: v.m.string,
          text: v.m.string,
          selected: v.m.optional(v.m.boolean, !1),
          date: v.m.optional(v.m.string, ""),
          hint: v.m.optional(v.m.string, ""),
        }),
        lt = v.m.model({ value: v.m.maybeNull(v.m.string), name: v.m.maybeNull(v.m.string) });
      var st = v.m
          .model({ id: v.m.optional(v.m.identifier, N), type: "Dialog", data: v.m.map(it) })
          .views(function(e) {
            return {
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return (function(e) {
              return {
                fromStateJSON: function(t) {
                  t.value.choices && e.completion.names.get(t.from_name).fromStateJSON(t),
                    t.value.text && e.completion.names.get(t.from_name).fromStateJSON(t);
                },
              };
            })(e);
          }),
        ct = v.m.compose(
          "DialogModel",
          lt,
          st,
        ),
        ut = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = e.item;
            if (!t.task || !t.task.dataObj) return l.a.createElement(tt.a, null);
            var a = [],
              o = n.value;
            return (
              "$" === o.charAt(0) && (o = o.substr(1)),
              t.task.dataObj[o].forEach(function(e, t) {
                var n;
                e.name && (n = W(F(e.name), 0.1)),
                  a.push(
                    l.a.createElement(rt, {
                      key: t,
                      name: e.name,
                      hint: e.hint,
                      text: e.text,
                      selected: e.selected,
                      date: e.date,
                      id: e.id,
                      bg: n,
                    }),
                  );
              }),
              l.a.createElement(
                "div",
                null,
                l.a.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexFlow: "column",
                      maxHeight: "500px",
                      overflowY: "scroll",
                      paddingRight: "10px",
                      marginTop: "10px",
                    },
                  },
                  a,
                ),
                l.a.createElement(nt.a, { dashed: !0 }),
              )
            );
          }),
        );
      S.addTag("dialog", ct, ut);
      var dt = v.m.model({ name: v.m.maybeNull(v.m.string), value: v.m.maybeNull(v.m.string) }),
        mt = v.m
          .model({ id: v.m.optional(v.m.identifier, N), type: "audio", _value: v.m.optional(v.m.string, "") })
          .views(function(e) {
            return {
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return {
              fromStateJSON: function(t, n) {
                t.value.choices && e.completion.names.get(t.from_name).fromStateJSON(t),
                  t.value.text && e.completion.names.get(t.from_name).fromStateJSON(t);
              },
            };
          }),
        pt = v.m.compose(
          "AudioModel",
          dt,
          mt,
          We,
        ),
        gt = Object(u.c)(function(e) {
          e.store;
          var t = e.item;
          return t._value
            ? l.a.createElement(
                "div",
                null,
                l.a.createElement(
                  "audio",
                  { controls: !0 },
                  l.a.createElement("source", { src: t._value, type: "audio/mpeg" }),
                  "Your browser does not support the audio element.",
                ),
              )
            : null;
        }),
        ft = Object(u.b)("store")(Object(u.c)(gt));
      S.addTag("audio", pt, ft);
      var ht = n(297),
        bt = n.n(ht),
        vt = n(298),
        yt = n.n(vt),
        kt = n(299),
        St = n.n(kt),
        wt = n(300),
        _t = n.n(wt),
        Ot = n(301),
        xt = n.n(Ot);
      function Et(e, t) {
        e = Number(e);
        var n = Math.floor(e / 60);
        e %= 60;
        var a = Math.round(e).toString();
        return (
          t >= 250 ? (a = e.toFixed(2)) : t >= 25 && (a = e.toFixed(1)),
          n > 0 ? (e < 10 && (a = "0" + a), "".concat(n, ":").concat(a)) : a
        );
      }
      function Nt(e) {
        return e >= 2500
          ? 0.01
          : e >= 1e3
          ? 0.025
          : e >= 250
          ? 0.1
          : e >= 100
          ? 0.25
          : e >= 25
          ? 1
          : 5 * e >= 25
          ? 5
          : 15 * e >= 25
          ? 15
          : 60 * Math.ceil(0.5 / e);
      }
      function jt(e) {
        return e >= 2500
          ? 10
          : e >= 1e3
          ? 4
          : e >= 250
          ? 10
          : e >= 100
          ? 4
          : e >= 25
          ? 1
          : 5 * e >= 25
          ? 5
          : 15 * e >= 25
          ? 15
          : 60 * Math.ceil(0.5 / e);
      }
      function Ct(e) {
        return Math.floor(10 / Nt(e));
      }
      var Tt = (function(e) {
          function t(e) {
            var n;
            return (
              Object(d.a)(this, t),
              ((n = Object(p.a)(this, Object(g.a)(t).call(this, e))).state = {
                playing: !1,
                pos: 0,
                colors: { waveColor: "#97A0AF", progressColor: "#36B37E" },
              }),
              n
            );
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "componentDidMount",
                value: function() {
                  var e = this;
                  (this.$el = c.a.findDOMNode(this)),
                    (this.$waveform = this.$el.querySelector("#wave")),
                    (this.regions = yt.a.create({ dragSelection: { slop: 5 } })),
                    (this.wavesurfer = bt.a.create({
                      container: this.$waveform,
                      backend: "MediaElement",
                      waveColor: this.state.colors.waveColor,
                      progressColor: this.state.colors.progressColor,
                      plugins: [
                        this.regions,
                        St.a.create({
                          container: "#timeline",
                          formatTimeCallback: Et,
                          timeInterval: Nt,
                          primaryLabelInterval: jt,
                          secondaryLabelInterval: Ct,
                          primaryColor: "blue",
                          secondaryColor: "red",
                          primaryFontColor: "blue",
                          secondaryFontColor: "red",
                        }),
                        _t.a.create({ wrapper: this.$waveform, showTime: !0, opacity: 1 }),
                      ],
                    })),
                    this.wavesurfer.load(this.props.src);
                  var t = this;
                  this.wavesurfer.on("region-mouseenter", function(e) {
                    e._region.onMouseOver();
                  }),
                    this.wavesurfer.on("region-mouseleave", function(e) {
                      e._region.onMouseLeave();
                    }),
                    this.wavesurfer.on("region-created", function(e) {
                      var n = t.props.addRegion(e);
                      (e._region = n),
                        e.on("click", function() {
                          return n.onClick(t.wavesurfer);
                        }),
                        e.on("update-end", function() {
                          return n.onUpdateEnd(t.wavesurfer);
                        }),
                        e.on("dblclick", function(t) {
                          window.setTimeout(function() {
                            e.play();
                          }, 0);
                        }),
                        e.on("out", function() {});
                    });
                  var n = document.querySelector("#slider");
                  n &&
                    (n.oninput = function() {
                      t.wavesurfer.zoom(Number(this.value));
                    }),
                    this.wavesurfer.on("ready", function() {
                      t.props.onCreate(e.wavesurfer);
                    }),
                    this.wavesurfer.on("pause", t.props.handlePlay),
                    this.wavesurfer.on("play", t.props.handlePlay),
                    this.props.onLoad(this.wavesurfer);
                },
              },
              {
                key: "render",
                value: function() {
                  return l.a.createElement(
                    "div",
                    null,
                    l.a.createElement("div", { id: "wave", className: xt.a.wave }),
                    l.a.createElement("div", { id: "timeline" }),
                  );
                },
              },
            ]),
            t
          );
        })(l.a.Component),
        Rt = v.m
          .model({ selected: v.m.optional(v.m.boolean, !1), highlighted: v.m.optional(v.m.boolean, !1) })
          .actions(function(e) {
            return {
              selectRegion: function() {
                (e.selected = !0), e.completion.setHighlightedNode(e);
              },
              unselectRegion: function() {
                var t = e.completion;
                t.relationMode && t.stopRelationMode(), (e.selected = !1), e.completion.setHighlightedNode(null);
              },
              onClickRegion: function() {
                var t = e.completion;
                t.relationMode
                  ? (t.addRelation(e), t.stopRelationMode(), t.regionStore.unselectAll())
                  : e.selected
                  ? e.unselectRegion()
                  : (t.regionStore.unselectAll(), e.selectRegion());
              },
              deleteRegion: function() {
                e.unselectRegion(),
                  e.completion.relationStore.deleteNodeRelation(e),
                  e.completion.regionStore.deleteRegion(e),
                  e.completion.deleteRegion(e);
              },
              setHighlight: function(t) {
                e.highlighted = t;
              },
              toggleHightlight: function() {
                e.setHighlight(!e.highlighted);
              },
            };
          }),
        Mt = v.m
          .model({ normInput: v.m.maybeNull(v.m.string), normalization: v.m.maybeNull(v.m.string) })
          .actions(function(e) {
            return {
              setNormalization: function(t) {
                e.normalization = t;
              },
              deleteNormalization: function() {
                e.setNormalization("");
              },
              setNormInput: function(t) {
                e.normInput = t;
              },
            };
          }),
        It = v.m.model({
          value: v.m.maybeNull(v.m.string),
          selected: v.m.optional(v.m.boolean, !1),
          alias: v.m.maybeNull(v.m.string),
          hotkey: v.m.maybeNull(v.m.string),
          showalias: v.m.optional(v.m.string, "false"),
          aliasstyle: v.m.optional(v.m.string, "opacity: 0.6"),
          size: v.m.optional(v.m.string, "medium"),
          background: v.m.optional(v.m.string, "#36B37E"),
          selectedcolor: v.m.optional(v.m.string, "white"),
        }),
        Ht = v.m
          .model({ id: v.m.optional(v.m.identifier, N), type: "label", _value: v.m.optional(v.m.string, "") })
          .actions(function(e) {
            return {
              toggleSelected: function() {
                var t = e.selected,
                  n = Ae.getParentOfTypeString(e, ["LabelsModel", "RectangleLabelsModel", "PolygonLabelsModel"]);
                n.shouldBeUnselected && n.unselectAll(),
                  (n.shouldBeUnselected && !0 === t) || (e.selected = !e.selected);
              },
              markSelected: function(t) {
                e.selected = t;
              },
              onHotKey: function() {
                return e.toggleSelected();
              },
            };
          }),
        At = v.m.compose(
          "LabelModel",
          It,
          Ht,
          We,
        ),
        Dt = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.item,
              n = e.store,
              a = {
                backgroundColor: t.selected ? t.background : "#e8e8e8",
                color: t.selected ? t.selectedcolor : "#333333",
                cursor: "pointer",
                margin: "5px",
              };
            return l.a.createElement(
              Ee.a,
              {
                onClick: function(e) {
                  return t.toggleSelected(), !1;
                },
                style: a,
                size: t.size,
              },
              t._value,
              "true" === t.showalias &&
                t.alias &&
                l.a.createElement("span", { style: Z.styleToProp(t.aliasstyle) }, "\xa0", t.alias),
              n.settings.enableTooltips &&
                n.settings.enableHotkeys &&
                t.hotkey &&
                l.a.createElement(ne, null, "[", t.hotkey, "]"),
            );
          }),
        );
      S.addTag("label", At, Dt);
      var Lt = v.m
          .model()
          .views(function(e) {
            return {
              get selectedLabels() {
                return e.children.filter(function(e) {
                  return !0 === e.selected;
                });
              },
              get isSelected() {
                return e.selectedLabels.length > 0;
              },
            };
          })
          .actions(function(e) {
            return {
              findLabel: function(t) {
                return e.children.find(function(e) {
                  return e.alias === t || e.value === t;
                });
              },
              unselectAll: function() {
                e.children.map(function(e) {
                  return e.markSelected(!1);
                });
              },
              getSelectedNames: function() {
                return e.selectedLabels.map(function(e) {
                  return e.alias ? e.alias : e.value;
                });
              },
              getSelectedString: function(t) {
                return (t = t || " "), e.getSelectedNames().join(t);
              },
            };
          }),
        zt = v.m.model({
          name: v.m.maybeNull(v.m.string),
          toname: v.m.maybeNull(v.m.string),
          choice: v.m.optional(v.m.enumeration(["single", "multiple"]), "single"),
          selectionstyle: v.m.maybeNull(v.m.optional(v.m.string, "basic", "border", "bottom")),
        }),
        Pt = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "labels",
            children: Ae.unionArray(["labels", "label", "choice"]),
          })
          .views(function(e) {
            return {
              get shouldBeUnselected() {
                return "single" === e.choice;
              },
            };
          })
          .actions(function(e) {
            return {
              getSelectedColor: function() {
                var t = e.children.find(function(e) {
                  return !0 === e.selected;
                });
                return t && t.background;
              },
              toStateJSON: function() {
                var t = e.getSelectedNames();
                if (t && t.length)
                  return { id: e.pid, from_name: e.name, to_name: e.name, type: e.type, value: { labels: t } };
              },
              fromStateJSON: function(t, n) {
                if ((e.unselectAll(), !t.value.labels)) throw new Error("No labels param");
                t.id && (e.pid = t.id),
                  t.value.labels.forEach(function(n) {
                    var a = e.findLabel(n);
                    if (!a) throw new Error("No label " + t.value.label);
                    a.markSelected(!0);
                  });
              },
            };
          }),
        Jt = v.m.compose(
          "LabelsModel",
          zt,
          Pt,
          Lt,
        ),
        Bt = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(
            "div",
            {
              style: {
                marginTop: "1em",
                marginBottom: "1em",
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                flexFlow: "wrap",
              },
            },
            R.renderChildren(t),
          );
        });
      S.addTag("labels", Jt, Bt);
      var Vt = n(572),
        Wt = v.m.model({
          name: v.m.maybeNull(v.m.string),
          toname: v.m.maybeNull(v.m.string),
          maxrating: v.m.optional(v.m.string, "5"),
          icon: v.m.optional(v.m.string, "star"),
          size: v.m.optional(v.m.string, "large"),
          hotkey: v.m.maybeNull(v.m.string),
        }),
        Ft = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "rating",
            rating: v.m.maybeNull(v.m.number),
          })
          .views(function(e) {
            return {
              get isSelected() {
                return e.rating > 0;
              },
            };
          })
          .actions(function(e) {
            return {
              getSelectedString: function() {
                return e.rating + " star";
              },
              getSelectedNames: function() {
                return e.rating;
              },
              unselectAll: function() {
                e.rating = 0;
              },
              handleRate: function(t, n) {
                var a = n.rating;
                n.maxrating;
                e.rating = a;
              },
              increaseValue: function() {
                e.rating >= e.maxrating ? (e.rating = 0) : e.rating > 0 ? (e.rating = e.rating + 1) : (e.rating = 1);
              },
              onHotKey: function() {
                return e.increaseValue();
              },
              toStateJSON: function() {
                if (e.rating) {
                  var t = e.toname || e.name;
                  return { id: e.pid, from_name: e.name, to_name: t, type: e.type, value: { rating: e.rating } };
                }
              },
              fromStateJSON: function(t, n) {
                t.id && (e.pid = t.id), (e.rating = t.value.rating);
              },
            };
          }),
        Ut = v.m.compose(
          "RatingModel",
          Wt,
          Ft,
        ),
        Gt = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.item,
              n = e.store;
            return l.a.createElement(
              "div",
              null,
              l.a.createElement(Vt.a, {
                icon: "star",
                size: t.size,
                defaultRating: 0,
                rating: t.rating,
                maxRating: t.maxrating,
                onRate: t.handleRate,
                clearable: !0,
              }),
              n.settings.enableTooltips &&
                n.settings.enableHotkeys &&
                t.hotkey &&
                l.a.createElement("sup", { style: { fontSize: "9px" } }, "[", t.hotkey, "]"),
            );
          }),
        );
      S.addTag("rating", Ut, Gt);
      var Yt = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            start: v.m.number,
            end: v.m.number,
            states: v.m.maybeNull(v.m.array(v.m.union(Jt, Ut))),
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.f)(e, $t);
              },
              get regionbg() {
                return e.parent.regionbg;
              },
              get selectedregionbg() {
                return e.parent.selectedregionbg;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return {
              toStateJSON: function() {
                var t = e.parent,
                  n = function(n) {
                    var a = {
                      id: e.pid,
                      from_name: n.name,
                      to_name: t.name,
                      source: t.value,
                      type: "region",
                      value: { start: e.start, end: e.end },
                    };
                    return e.normalization && (a.normalization = e.normalization), a;
                  };
                return e.states && e.states.length
                  ? e.states.map(function(e) {
                      var t = n(e);
                      return (t.value[e.type] = e.getSelectedNames()), (t.type = e.type), t;
                    })
                  : n(t);
              },
              unselectRegion: function() {
                (e.selected = !1), e._ws_region.update({ color: e.regionbg }), e.completion.setHighlightedNode(null);
              },
              selectRegion: function() {
                (e.selected = !0),
                  e.completion.setHighlightedNode(e),
                  e._ws_region.update({ color: e.selectedregionbg });
              },
              setHighlight: function(t) {
                (e.highlighted = t), (e._ws_region.element.style.border = t ? "2px solid red" : "none");
              },
              beforeDestroy: function() {
                e._ws_region && e._ws_region.remove();
              },
              onClick: function(t) {
                e.completion.relationMode ||
                  (Object.values(t.regions.list).forEach(function(t) {
                    t.update({ color: e.regionbg });
                  }),
                  e._ws_region.update({ color: e.selectedregionbg })),
                  e.onClickRegion();
              },
              onMouseOver: function() {
                e.completion.relationMode && (e.setHighlight(!0), (e._ws_region.element.style.cursor = "crosshair"));
              },
              onMouseLeave: function() {
                e.completion.relationMode && (e.setHighlight(!1), (e._ws_region.element.style.cursor = "move"));
              },
              onUpdateEnd: function(t) {
                (e.start = e._ws_region.start), (e.end = e._ws_region.end);
              },
            };
          }),
        Zt = v.m.compose(
          "AudioRegionModel",
          Rt,
          Mt,
          Yt,
        ),
        Kt = v.m.model({
          name: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
          haszoom: v.m.optional(v.m.string, "true"),
          regionbg: v.m.optional(v.m.string, "rgba(0,0,0, 0.1)"),
          selectedregionbg: v.m.optional(v.m.string, "rgba(255,0,0,0.5)"),
          _value: v.m.optional(v.m.string, ""),
        }),
        Xt = v.m
          .model({
            id: v.m.identifier,
            type: "audio",
            playing: v.m.optional(v.m.boolean, !1),
            regions: v.m.array(Zt),
            rangeValue: v.m.optional(v.m.string, "20"),
          })
          .views(function(e) {
            return {
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              states: function() {
                return e.completion.toNames.get(e.name);
              },
              activeStates: function() {
                var t = e.states();
                return t
                  ? t.filter(function(e) {
                      return e.isSelected;
                    })
                  : null;
              },
            };
          })
          .actions(function(e) {
            return {
              toStateJSON: function() {
                return e.regions.map(function(e) {
                  return e.toStateJSON();
                });
              },
              findRegion: function(t, n) {
                return e.regions.find(function(e) {
                  return e.start === t && e.end === n;
                });
              },
              fromStateJSON: function(t, n) {
                e.findRegion(t.value.start, t.value.end),
                  C(n),
                  e._ws.addRegion({ start: t.value.start, end: t.value.end });
              },
              setRangeValue: function(t) {
                e.rangeValue = t;
              },
              addRegion: function(t) {
                var n = e.findRegion(t.start, t.end);
                if (e.findRegion(t.start, t.end)) return (n._ws_region = t), n;
                var a = e.activeStates(),
                  o = a
                    ? a.map(function(e) {
                        return j(e);
                      })
                    : null,
                  r = Zt.create({
                    id: N(),
                    start: t.start,
                    end: t.end,
                    regionbg: e.regionbg,
                    selectedregionbg: e.selectedregionbg,
                    states: o,
                  });
                return (
                  (r._ws_region = t),
                  e.regions.push(r),
                  e.completion.addRegion(r),
                  a &&
                    a.forEach(function(e) {
                      return e.unselectAll();
                    }),
                  r
                );
              },
              handlePlay: function() {
                e.playing = !e.playing;
              },
              onLoad: function(t) {
                (e._ws = t),
                  e.regions.forEach(function(t) {
                    e._ws.addRegion({ start: t.start, end: t.end });
                  });
              },
              wsCreated: function(t) {
                e._ws = t;
              },
            };
          }),
        $t = v.m.compose(
          "AudioPlusModel",
          Kt,
          Xt,
          We,
        ),
        qt = Object(u.c)(function(e) {
          e.store;
          var t = e.item;
          return l.a.createElement(
            "div",
            null,
            l.a.createElement(Tt, {
              src: t._value,
              selectRegion: t.selectRegion,
              handlePlay: t.handlePlay,
              onCreate: t.wsCreated,
              addRegion: t.addRegion,
              onLoad: t.onLoad,
            }),
            l.a.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", marginTop: "1em" } },
              l.a.createElement(
                I.a,
                {
                  type: "primary",
                  onClick: function(e) {
                    t._ws.playPause();
                  },
                },
                t.playing &&
                  l.a.createElement(i.Fragment, null, l.a.createElement(he.a, { type: "pause-circle" }), " Pause"),
                !t.playing &&
                  l.a.createElement(i.Fragment, null, l.a.createElement(he.a, { type: "play-circle" }), " Play"),
              ),
              "true" === t.haszoom &&
                l.a.createElement("input", {
                  type: "range",
                  min: "20",
                  max: "200",
                  id: "slider",
                  value: t.rangeValue,
                  onChange: function(e) {
                    t.setRangeValue(e.target.value);
                  },
                }),
            ),
          );
        }),
        Qt = Object(u.b)("store")(Object(u.c)(qt));
      S.addTag("audioplus", $t, Qt);
      var en = n(53),
        tn =
          (n(112),
          v.m.model({
            name: v.m.maybeNull(v.m.string),
            toname: v.m.maybeNull(v.m.string),
            opacity: v.m.optional(v.m.string, "0.6"),
            fillcolor: v.m.maybeNull(v.m.string),
            strokewidth: v.m.optional(v.m.string, "1"),
            strokecolor: v.m.optional(v.m.string, "#f48a42"),
            canrotate: v.m.optional(v.m.string, "true"),
          })),
        nn = v.m
          .model({ id: v.m.identifier, type: "rectangle" })
          .views(function(e) {
            return {
              get hasStates() {
                var t = e.states();
                return t && t.length > 0;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return { fromStateJSON: function(e) {} };
          }),
        an = v.m.compose(
          "RectangleModel",
          tn,
          nn,
        );
      S.addTag("rectangle", an, function() {
        return null;
      });
      var on = v.m.model({ name: v.m.maybeNull(v.m.string), toname: v.m.maybeNull(v.m.string) }),
        rn = v.m
          .model("RectangleLabelsModel", {
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "rectanglelabels",
            children: Ae.unionArray(["labels", "label", "choice"]),
          })
          .actions(function(e) {
            return {
              fromStateJSON: function(t, n) {
                if ((e.unselectAll(), !t.value.rectanglelabels)) throw new Error("No labels param");
                t.id && (e.pid = t.id),
                  t.value.rectanglelabels.forEach(function(n) {
                    var a = e.findLabel(n);
                    if (!a) throw new Error("No label " + t.value.label);
                    a.markSelected(!0);
                  });
              },
            };
          }),
        ln = v.m.compose(
          Jt,
          an,
          on,
          rn,
          Lt,
        ),
        sn = v.m.compose(
          "RectangleLabelsModel",
          ln,
        ),
        cn = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(Bt, { item: t });
        });
      S.addTag("rectanglelabels", sn, cn);
      var un = v.m
          .model({
            id: v.m.identifier,
            pid: v.m.optional(v.m.string, N),
            type: "rectangleregion",
            x: v.m.number,
            y: v.m.number,
            width: v.m.number,
            height: v.m.number,
            scaleX: v.m.optional(v.m.number, 1),
            scaleY: v.m.optional(v.m.number, 1),
            rotation: v.m.optional(v.m.number, 0),
            opacity: v.m.number,
            strokewidth: v.m.number,
            fillcolor: v.m.maybeNull(v.m.string),
            strokecolor: v.m.string,
            states: v.m.maybeNull(v.m.array(v.m.union(Jt, Ut, sn))),
            wp: v.m.maybeNull(v.m.number),
            hp: v.m.maybeNull(v.m.number),
            sw: v.m.maybeNull(v.m.number),
            sh: v.m.maybeNull(v.m.number),
            coordstype: v.m.optional(v.m.enumeration(["px", "perc"]), "px"),
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.f)(e, Tn);
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return {
              unselectRegion: function() {
                (e.selected = !1), e.parent.setSelected(void 0), e.completion.setHighlightedNode(null);
              },
              coordsInside: function(t, n) {
                var a = e.x,
                  o = e.y,
                  r = e.width * (e.scaleX || 1),
                  i = e.height * (e.scaleY || 1);
                return t > a && t < a + r && n > o && n < o + i;
              },
              selectRegion: function() {
                (e.selected = !0), e.completion.setHighlightedNode(e), e.parent.setSelected(e.id);
              },
              setPosition: function(t, n, a, o, r) {
                (e.x = t), (e.y = n), (e.width = a), (e.height = o), (e.rotation = r);
              },
              setScale: function(t, n) {
                (e.scaleX = t), (e.scaleY = n);
              },
              addState: function(t) {
                e.states.push(t);
              },
              setFill: function(t) {
                e.fill = t;
              },
              updateImageSize: function(t, n, a, o) {
                (e.wp = t),
                  (e.hp = n),
                  (e.sw = a),
                  (e.sh = o),
                  "perc" == e.coordstype &&
                    ((e.x = (a * e.x) / 100),
                    (e.y = (o * e.y) / 100),
                    (e.width = (a * e.width) / 100),
                    (e.height = (o * e.height) / 100),
                    (e.coordstype = "px"));
              },
              toStateJSON: function() {
                var t = e.parent,
                  n = t.states()[0],
                  a = function(a) {
                    var o = {
                      id: e.id,
                      from_name: n.name,
                      to_name: t.name,
                      source: t.value,
                      type: "rectangle",
                      value: {
                        x: (100 * e.x) / e.parent.stageWidth,
                        y: (100 * e.y) / e.parent.stageHeight,
                        width: (e.width * (e.scaleX || 1) * 100) / e.parent.stageWidth,
                        height: (e.height * (e.scaleY || 1) * 100) / e.parent.stageHeight,
                        rotation: e.rotation,
                      },
                    };
                    return e.normalization && (o.normalization = e.normalization), o;
                  };
                return e.states && e.states.length
                  ? e.states.map(function(e) {
                      var t = a();
                      return (t.value[e.type] = e.getSelectedNames()), (t.type = e.type), t;
                    })
                  : a();
              },
            };
          }),
        dn = v.m.compose(
          "RectRegionModel",
          Rt,
          Mt,
          un,
        ),
        mn = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = e.item,
              a =
                (n.name,
                n.wwidth,
                n.wheight,
                n.onChangedPosition,
                n.wp || (n.parent.stageWidth, n.parent.naturalWidth),
                n.hp || (n.parent.stageHeight, n.parent.naturalHeight),
                n.x),
              o = n.y,
              r = n.width,
              s = n.height,
              c = {};
            return (
              (c.opacity = n.opacity),
              n.fillcolor && (c.fill = n.fillcolor),
              (c.stroke = n.strokecolor),
              (c.strokeWidth = n.strokewidth),
              (c.strokeScaleEnabled = !1),
              (c.shadowBlur = 0),
              n.highlighted && (c.stroke = "#ff0000"),
              l.a.createElement(
                i.Fragment,
                null,
                l.a.createElement(
                  en.Rect,
                  Object.assign(
                    {
                      x: a,
                      y: o,
                      width: r,
                      height: s,
                      scaleX: n.scaleX,
                      scaleY: n.scaleY,
                      name: n.id,
                      onTransformEnd: function(e) {
                        var t = e.target;
                        n.wp || (n.parent.stageWidth, n.parent.naturalWidth),
                          n.hp || (n.parent.stageHeight, n.parent.naturalHeight),
                          n.setPosition(
                            t.getAttr("x"),
                            t.getAttr("y"),
                            t.getAttr("width"),
                            t.getAttr("height"),
                            t.getAttr("rotation"),
                          ),
                          n.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));
                      },
                      onDragEnd: function(e) {
                        var t = e.target;
                        n.wp || (n.parent.stageWidth, n.parent.naturalWidth),
                          n.hp || (n.parent.stageHeight, n.parent.naturalHeight),
                          n.setPosition(
                            t.getAttr("x"),
                            t.getAttr("y"),
                            t.getAttr("width"),
                            t.getAttr("height"),
                            t.getAttr("rotation"),
                          ),
                          n.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));
                      },
                      dragBoundFunc: function(e) {
                        var t = e.x,
                          n = e.y;
                        return t < 0 && (t = 0), n < 0 && (n = 0), { x: t, y: n };
                      },
                      onMouseOver: function(e) {
                        var a = n.parent._stageRef;
                        t.completionStore.selected.relationMode
                          ? (n.setHighlight(!0), (a.container().style.cursor = "crosshair"))
                          : (a.container().style.cursor = "pointer");
                      },
                      onMouseOut: function(e) {
                        (n.parent._stageRef.container().style.cursor = "default"),
                          t.completionStore.selected.relationMode && n.setHighlight(!1);
                      },
                      onClick: function(e) {
                        var a = n.parent._stageRef;
                        t.completionStore.selected.relationMode && (a.container().style.cursor = "default"),
                          n.setHighlight(!1),
                          n.onClickRegion();
                      },
                    },
                    c,
                    { draggable: !0 },
                  ),
                ),
              )
            );
          }),
        );
      S.addTag("rectangleregion", dn, mn);
      n(308);
      var pn = n(303),
        gn = v.m
          .model({
            init_x: v.m.optional(v.m.number, 0),
            init_y: v.m.optional(v.m.number, 0),
            x: v.m.number,
            y: v.m.number,
            style: v.m.string,
            size: v.m.string,
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.e)(e, 2);
              },
            };
          })
          .actions(function(e) {
            return {
              afterCreate: function() {
                (e.init_x = e.x), (e.init_y = e.y);
              },
              movePoint: function(t, n) {
                (e.x = e.init_x + t), (e.y = e.init_y + n);
              },
              _movePoint: function(t, n) {
                (e.init_x = t), (e.init_y = n), (e.x = t), (e.y = n);
              },
              handleMouseOverStartPoint: function(t) {
                if (
                  ((e.parent.parent._stageRef.container().style.cursor = "crosshair"),
                  !(e.parent.closed || e.parent.points.length < 3))
                ) {
                  var n = t.target;
                  n.setX(n.x() - n.width() / 2), n.setY(n.y() - n.height() / 2);
                  var a = { small: 3, medium: 2, large: 2 }[e.size];
                  n.scale({ x: a, y: a }), e.parent.setMouseOverStartPoint(!0);
                }
              },
              handleMouseOutStartPoint: function(t) {
                var n = t.target;
                (e.parent.parent._stageRef.container().style.cursor = "default"),
                  n.setX(n.x() + n.width() / 2),
                  n.setY(n.y() + n.height() / 2),
                  n.scale({ x: 1, y: 1 }),
                  e.parent.setMouseOverStartPoint(!1);
              },
            };
          }),
        fn = Object(u.c)(function(e) {
          var t = e.item,
            n = e.index,
            a = { small: 1, medium: 2, large: 3 },
            o = { small: 4, medium: 8, large: 12 }[t.size],
            r =
              0 === n
                ? {
                    hitStrokeWidth: 12,
                    onMouseOver: t.handleMouseOverStartPoint,
                    onMouseOut: t.handleMouseOutStartPoint,
                  }
                : null,
            i =
              (t.parent.mouseOverStartPoint,
              {
                onDragStart: function(e) {},
                onDragMove: function(e) {
                  t._movePoint(e.target.attrs.x, e.target.attrs.y);
                },
                onDragEnd: function(e) {},
                onMouseOver: function(e) {
                  t.parent.parent._stageRef.container().style.cursor = "crosshair";
                },
                onMouseOut: function(e) {
                  t.parent.parent._stageRef.container().style.cursor = "default";
                },
              });
          return "circle" == t.style
            ? l.a.createElement(
                en.Circle,
                Object.assign(
                  {
                    key: n,
                    x: t.x - o / 2,
                    y: t.y - o / 2,
                    radius: o,
                    fill: "white",
                    stroke: "black",
                    strokeWidth: a[t.size],
                  },
                  i,
                  r,
                  { draggable: !0 },
                ),
              )
            : l.a.createElement(
                en.Rect,
                Object.assign(
                  {
                    key: n,
                    x: t.x - o / 2,
                    y: t.y - o / 2,
                    width: o,
                    height: o,
                    fill: "white",
                    stroke: "black",
                    strokeWidth: a[t.size],
                    dragOnTop: !1,
                  },
                  i,
                  r,
                  { draggable: !0 },
                ),
              );
        }),
        hn = v.m.model({
          name: v.m.maybeNull(v.m.string),
          toname: v.m.maybeNull(v.m.string),
          opacity: v.m.optional(v.m.string, "0.6"),
          fillcolor: v.m.maybeNull(v.m.string),
          strokewidth: v.m.optional(v.m.string, "1"),
          strokecolor: v.m.optional(v.m.string, "#f48a42"),
          pointsize: v.m.optional(v.m.string, "medium"),
          pointstyle: v.m.optional(v.m.string, "rectangle"),
        }),
        bn = v.m
          .model({ id: v.m.identifier, type: "polygon", _value: v.m.optional(v.m.string, "") })
          .views(function(e) {
            return {
              get hasStates() {
                var t = e.states();
                return t && t.length > 0;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              states: function() {
                return e.completion.toNames.get(e.name);
              },
              activeStates: function() {
                var t = e.states();
                return t
                  ? t.filter(function(e) {
                      return !0 === e.isSelected;
                    })
                  : null;
              },
            };
          })
          .actions(function(e) {
            return {};
          }),
        vn = v.m.compose(
          "PolygonModel",
          hn,
          bn,
        ),
        yn = Object(u.b)("store")(
          Object(u.c)(function(e) {
            e.store, e.item;
            return null;
          }),
        );
      S.addTag("polygon", vn, yn);
      var kn = v.m.model({ name: v.m.maybeNull(v.m.string), toname: v.m.maybeNull(v.m.string) }),
        Sn = v.m
          .model("PolygonLabelsModel", {
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "polygonlabels",
            children: Ae.unionArray(["labels", "label", "choice"]),
          })
          .actions(function(e) {
            return {
              fromStateJSON: function(t, n) {
                if ((e.unselectAll(), !t.value.polygonlabels)) throw new Error("No labels param");
                t.id && (e.pid = t.id),
                  t.value.polygonlabels.forEach(function(n) {
                    var a = e.findLabel(n);
                    if (!a) throw new Error("No label " + t.value.label);
                    a.markSelected(!0);
                  });
              },
            };
          }),
        wn = v.m.compose(
          Jt,
          vn,
          kn,
          Sn,
          Lt,
        ),
        _n = v.m.compose(
          "PolygonLabelsModel",
          wn,
        ),
        On = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(Bt, { item: t });
        });
      S.addTag("polygonlabels", _n, On);
      var xn = v.m
          .model({
            id: v.m.identifier,
            pid: v.m.optional(v.m.string, N),
            type: "polygonregion",
            opacity: v.m.number,
            fillcolor: v.m.maybeNull(v.m.string),
            strokewidth: v.m.number,
            strokecolor: v.m.string,
            pointsize: v.m.string,
            pointstyle: v.m.string,
            closed: v.m.optional(v.m.boolean, !1),
            points: v.m.array(gn, []),
            states: v.m.maybeNull(v.m.array(v.m.union(Jt, Ut, _n))),
            mouseOverStartPoint: v.m.optional(v.m.boolean, !1),
            fromName: v.m.maybeNull(v.m.string),
            wp: v.m.maybeNull(v.m.number),
            hp: v.m.maybeNull(v.m.number),
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.f)(e, Tn);
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              get isCW() {},
              linePoints: function() {
                return (function e(t) {
                  return t.reduce(function(t, n) {
                    return t.concat(Array.isArray(n) ? e(n) : n);
                  }, []);
                })(
                  e.points.map(function(e) {
                    return [e.x, e.y];
                  }),
                );
              },
            };
          })
          .actions(function(e) {
            return {
              setMouseOverStartPoint: function(t) {
                e.mouseOverStartPoint = t;
              },
              findPolyOutline: function() {
                var t = e.points,
                  n = t.reduce(function(e, t) {
                    return e.x < t.x ? e : t;
                  }),
                  a = t.reduce(function(e, t) {
                    return e.x > t.x ? e : t;
                  }),
                  o = t.reduce(function(e, t) {
                    return e.y < t.y ? e : t;
                  }),
                  r = t.reduce(function(e, t) {
                    return e.y > t.y ? e : t;
                  });
                return { x: n.x, y: o.y, width: a.x - n.x, height: r.y - o.y };
              },
              coordsInside: function(t, n) {
                for (var a = !1, o = e.points, r = 0, i = o.length - 1; r < o.length; i = r++) {
                  var l = o[r][0],
                    s = o[r][1],
                    c = o[i][0],
                    u = o[i][1];
                  s > n != u > n && t < ((c - l) * (n - s)) / (u - s) + l && (Object(pn.a)("inside"), (a = !a));
                }
                return a;
              },
              addPoint: function(t, n) {
                e.closed || (e.mouseOverStartPoint ? e.closePoly() : e._addPoint(t, n));
              },
              insertPoint: function(t, n, a) {
                var o = { x: n, y: a, size: e.pointsize, style: e.pointstyle };
                e.points.splice(t, 0, o);
              },
              _addPoint: function(t, n) {
                e.points.push({ x: t, y: n, size: e.pointsize, style: e.pointstyle });
              },
              closePoly: function() {
                (e.closed = !0), e.selectRegion();
              },
              canClose: function(t, n) {
                if (e.points.length < 2) return !1;
                var a = e.points[0],
                  o = t,
                  r = n;
                return (a.x - o) * (a.x - o) + (a.y - r) * (r - r) < 50;
              },
              unselectRegion: function() {
                (e.selected = !1), e.parent.setSelected(void 0), e.completion.setHighlightedNode(null);
              },
              selectRegion: function() {
                (e.selected = !0), e.completion.setHighlightedNode(e), e.parent.setSelected(e.id);
              },
              setPosition: function(t, n, a, o, r) {
                (e.x = t), (e.y = n), (e.width = a), (e.height = o), (e.rotation = r);
              },
              setScale: function(t, n) {
                (e.scaleX = t), (e.scaleY = n);
              },
              addState: function(t) {
                e.states.push(t);
              },
              setFill: function(t) {
                e.fill = t;
              },
              updateImageSize: function(t, n) {
                (e.wp = t), (e.hp = n);
              },
              toStateJSON: function() {
                var t = e.parent,
                  n = t.naturalWidth,
                  a = t.naturalHeight,
                  o = t.stageWidth,
                  r = t.stageHeight,
                  i = (100 * o) / n,
                  l = (100 * r) / a,
                  s = e.points.map(function(e) {
                    return [(100 * ((100 * e.x) / i)) / n, (100 * ((100 * e.y) / l)) / a];
                  }),
                  c = e.parent,
                  u = function(t) {
                    var n = {
                      id: e.id,
                      from_name: t.name,
                      to_name: c.name,
                      source: c.value,
                      type: "polygon",
                      value: { points: s },
                    };
                    return e.normalization && (n.normalization = e.normalization), n;
                  };
                return e.states && e.states.length
                  ? e.states.map(function(e) {
                      var t = u(e);
                      return (t.value[e.type] = e.getSelectedNames()), (t.type = e.type), t;
                    })
                  : u(c);
              },
            };
          }),
        En = v.m.compose(
          "PolygonRegionModel",
          Rt,
          Mt,
          xn,
        );
      var Nn = Object(u.b)("store")(
        Object(u.c)(function(e) {
          var t = e.store,
            n = e.item,
            a =
              (n.name,
              n.wwidth,
              n.wheight,
              n.onChangedPosition,
              n.wp || (n.parent.stageWidth, n.parent.naturalWidth),
              n.hp || (n.parent.stageHeight, n.parent.naturalHeight),
              n.x,
              n.y,
              n.width,
              n.height,
              {});
          return (
            (a.opacity = n.opacity),
            n.fillcolor && (a.fill = n.fillcolor),
            (a.stroke = n.strokecolor),
            (a.strokeWidth = n.strokewidth),
            n.highlighted && (a.stroke = "red"),
            l.a.createElement(
              i.Fragment,
              null,
              n.mouseOverStartPoint,
              l.a.createElement(
                en.Line,
                Object.assign(
                  {
                    points: n.linePoints(),
                    fill: n.fill,
                    opacity: n.opacity,
                    closed: n.closed,
                    redraw: n.update,
                    stroke: n.stroke,
                    strokeWidth: parseInt(n.strokewidth),
                    onDragStart: function(e) {
                      n.completion.setDragMode(!0);
                    },
                    dragBoundFunc: function(e) {
                      var t = e.x,
                        a = e.y,
                        o = n.parent.stageWidth - this.getAttr("width"),
                        r = n.parent.stageHeight - this.getAttr("height");
                      return (
                        t > o && (t = o),
                        a > r && (a = r),
                        n.points.forEach(function(e) {
                          e.movePoint(t, a);
                        }),
                        { x: 0, y: 0 }
                      );
                    },
                    onDragEnd: function(e) {
                      n.completion.setDragMode(!1),
                        n.closed || n.closePoly(),
                        n.parent.setActivePolygon(null),
                        n.points.forEach(function(e) {
                          e.afterCreate();
                        });
                    },
                    onMouseOver: function(e) {
                      var a = n.parent._stageRef;
                      t.completionStore.selected.relationMode
                        ? (n.setHighlight(!0), (a.container().style.cursor = "crosshair"))
                        : (a.container().style.cursor = "pointer");
                    },
                    onMouseOut: function(e) {
                      (n.parent._stageRef.container().style.cursor = "default"),
                        t.completionStore.selected.relationMode && n.setHighlight(!1);
                    },
                    onClick: function(e) {
                      if (((e.cancelBubble = !0), n.closed)) {
                        var a = n.parent._stageRef;
                        t.completionStore.selected.relationMode && (a.container().style.cursor = "default"),
                          n.setHighlight(!1),
                          n.onClickRegion();
                      }
                    },
                  },
                  a,
                  { draggable: !0 },
                ),
              ),
              !n.closed &&
                n.points.map(function(e, t) {
                  return l.a.createElement(fn, { item: e, index: t });
                }),
              n.closed &&
                n.selected &&
                n.points.map(function(e, t) {
                  return l.a.createElement(fn, { item: e, index: t });
                }),
            )
          );
        }),
      );
      S.addTag("polygonregion", En, Nn);
      var jn = v.m.model({
          name: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
          resize: v.m.maybeNull(v.m.string),
          width: v.m.optional(v.m.string, "100%"),
          maxwidth: v.m.optional(v.m.string, "750px"),
        }),
        Cn = v.m
          .model({
            id: v.m.identifier,
            type: "image",
            _value: v.m.optional(v.m.string, ""),
            stageWidth: v.m.optional(v.m.integer, 1),
            stageHeight: v.m.optional(v.m.integer, 1),
            naturalWidth: v.m.optional(v.m.integer, 1),
            naturalHeight: v.m.optional(v.m.integer, 1),
            selectedShape: v.m.safeReference(v.m.union(dn, En)),
            activePolygon: v.m.maybeNull(v.m.safeReference(En)),
            shapes: v.m.array(v.m.union(dn, En), []),
          })
          .views(function(e) {
            return {
              get hasStates() {
                var t = e.states();
                return t && t.length > 0;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              states: function() {
                return e.completion.toNames.get(e.name);
              },
              controlButton: function() {
                return e.completion.toNames.get(e.name)[0];
              },
              controlButtonType: function() {
                var t = e.controlButton();
                return Object(v.i)(t).name;
              },
            };
          })
          .actions(function(e) {
            return {
              setActivePolygon: function(t) {
                e.activePolygon = t;
              },
              updateIE: function(t) {
                var n = t.target,
                  a = n.width,
                  o = n.height,
                  r = n.naturalWidth,
                  i = n.naturalHeight;
                e.hasStates &&
                  ((e.naturalWidth = r),
                  (e.naturalHeight = i),
                  (e.stageWidth = a),
                  (e.stageHeight = o),
                  e.shapes.forEach(function(e) {
                    return e.updateImageSize(a / r, o / i, a, o);
                  }));
              },
              _setStageRef: function(t) {
                e._stageRef = t;
              },
              _deleteSelectedShape: function() {
                e.selectedShape && Object(v.b)(e.selectedShape);
              },
              setSelected: function(t) {
                e.selectedShape = t;
              },
              _addShape: function(t) {
                e.shapes.push(t), e.completion.addRegion(t), e.setSelected(t.id), t.selectRegion();
              },
              onImageClick: function(t) {
                if ("RectangleModel" === e.controlButtonType()) e._addRect(t);
                else if ("PolygonModel" === e.controlButtonType()) e._addPoly(t);
                else if ("PolygonLabelsModel" === e.controlButtonType())
                  if (e.activePolygon && !e.activePolygon.closed) e._addPoly(t);
                  else {
                    var n = e.completion.toNames.get(e.name),
                      a = n
                        ? n.filter(function(e) {
                            return 1 == e.isSelected;
                          })
                        : null,
                      o = a
                        ? a.map(function(e) {
                            return j(e);
                          })
                        : null;
                    if (0 === o.length) return;
                    e._addPoly(t, o),
                      a &&
                        a.forEach(function(e) {
                          return e.unselectAll();
                        });
                  }
                else if ("RectangleLabelsModel" === e.controlButtonType()) {
                  var r = e.completion.toNames.get(e.name),
                    i = r
                      ? r.filter(function(e) {
                          return !0 === e.isSelected;
                        })
                      : null,
                    l = i
                      ? i.map(function(e) {
                          return j(e);
                        })
                      : null;
                  if (0 === l.length) return;
                  e._addRect(t, l),
                    i &&
                      i.forEach(function(e) {
                        return e.unselectAll();
                      });
                }
              },
              _addRect: function(t, n) {
                var a = e.controlButton().rectstrokecolor;
                n && n.length && (a = n[0].getSelectedColor());
                e.stageWidth, e.naturalWidth, e.stageHeight, e.naturalHeight;
                var o = t.evt.offsetX,
                  r = t.evt.offsetY;
                e.__addRect(Math.floor(o - 50), Math.floor(r - 50), 100, 100, a, n);
              },
              __addRect: function(t, n, a, o, r, i, l) {
                var s = e.controlButton(),
                  c = dn.create({
                    id: N(),
                    x: t,
                    y: n,
                    width: a,
                    height: o,
                    opacity: parseFloat(s.opacity),
                    fillcolor: s.fillcolor,
                    strokewidth: parseInt(s.strokewidth),
                    strokecolor: r,
                    states: i,
                    coordstype: l,
                  });
                e._addShape(c);
              },
              _addPoly: function(t, n) {
                var a,
                  o = 10;
                if (e.activePolygon && e.activePolygon.closed) e.setActivePolygon(null);
                else if (!1 === e.completion.dragMode) {
                  if (e.activePolygon) a = e.activePolygon;
                  else {
                    var r = e.controlButton();
                    (a = En.create({
                      id: N(),
                      x: t.evt.offsetX - 5,
                      y: t.evt.offsetY - 5,
                      width: o,
                      height: o,
                      opacity: parseFloat(r.opacity),
                      fillcolor: r.fillcolor,
                      strokewidth: parseInt(r.strokewidth),
                      strokecolor: r.strokecolor,
                      pointsize: r.pointsize,
                      pointstyle: r.pointstyle,
                      states: n,
                    })),
                      e.setActivePolygon(a),
                      e.shapes.push(a),
                      e.completion.addRegion(a);
                  }
                  a.addPoint(t.evt.offsetX - 5, t.evt.offsetY - 5), (e._stageRef.container().style.cursor = "default");
                }
              },
              toStateJSON: function() {
                return e.shapes.map(function(e) {
                  return e.toStateJSON();
                });
              },
              fromStateJSON: function(t, n) {
                var a;
                if (
                  (["choices", "shape", "rectanglelabels"].forEach(function(e) {
                    if (!e in t.value) throw new Error("Not valid param");
                  }),
                  t.value.choices && e.completion.names.get(t.from_name).fromStateJSON(t),
                  t.value.rectanglelabels)
                ) {
                  var o = C(n);
                  o.fromStateJSON(t),
                    e.__addRect(t.value.x, t.value.y, t.value.width, t.value.height, o.getSelectedColor(), [o], "perc");
                }
                t.value.shape && (t.from_name !== t.to_name && ((a = C(n).fromStateJSON(t)), e.shapes.push(a)));
              },
            };
          }),
        Tn = v.m.compose(
          "ImageModel",
          jn,
          Cn,
          We,
        ),
        Rn = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "componentDidMount",
                value: function() {
                  this.checkNode();
                },
              },
              {
                key: "componentDidUpdate",
                value: function() {
                  this.checkNode();
                },
              },
              {
                key: "checkNode",
                value: function() {
                  var e = this.transformer.getStage(),
                    t = this.props.selectedShapeName;
                  if (!t) return this.transformer.detach(), void this.transformer.getLayer().batchDraw();
                  var n = e.findOne("." + t.id);
                  n !== this.transformer.node() &&
                    (n ? this.transformer.attachTo(n) : this.transformer.detach(),
                    this.transformer.getLayer().batchDraw());
                },
              },
              {
                key: "render",
                value: function() {
                  var e = this;
                  return l.a.createElement(en.Transformer, {
                    resizeEnabled: !0,
                    rotateEnabled: this.props.rotateEnabled,
                    anchorSize: 8,
                    ref: function(t) {
                      e.transformer = t;
                    },
                  });
                },
              },
            ]),
            t
          );
        })(l.a.Component),
        Mn = (function(e) {
          function t() {
            var e, n;
            Object(d.a)(this, t);
            for (var a = arguments.length, o = new Array(a), r = 0; r < a; r++) o[r] = arguments[r];
            return (
              ((n = Object(p.a)(this, (e = Object(g.a)(t)).call.apply(e, [this].concat(o)))).handleDblClick = function(
                e,
              ) {}),
              (n.handleOnClick = function(e) {
                return n.props.item.onImageClick(e);
              }),
              (n.handleStageMouseDown = function(e) {
                if (e.target !== e.target.getStage()) e.target.getParent().className;
              }),
              n
            );
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  var e = this.props,
                    t = e.item;
                  if (!e.store.task) return null;
                  var n = {},
                    a = { width: t.width, maxWidth: t.maxwidth };
                  if ((t.resize && (a.transform = "scale(" + t.resize + ", " + t.resize + ")"), t.hasStates)) {
                    n.position = "absolute";
                    var o = "true" === t.controlButton().canrotate;
                    return l.a.createElement(
                      "div",
                      { style: { marginBottom: "1em", marginTop: "1em" } },
                      l.a.createElement(
                        "div",
                        { style: n },
                        l.a.createElement("img", { style: a, src: t._value, onLoad: t.updateIE }),
                      ),
                      l.a.createElement(
                        en.Stage,
                        {
                          ref: function(e) {
                            t._setStageRef(e);
                          },
                          width: t.stageWidth,
                          height: t.stageHeight,
                          onDblClick: this.handleDblClick,
                          onClick: this.handleOnClick,
                          onMouseDown: this.handleStageMouseDown,
                        },
                        l.a.createElement(
                          en.Layer,
                          null,
                          t.shapes.map(function(e) {
                            return R.renderItem(e);
                          }),
                          l.a.createElement(Rn, { rotateEnabled: o, selectedShapeName: this.props.item.selectedShape }),
                        ),
                      ),
                    );
                  }
                  return (
                    (n.marginTop = "1em"),
                    l.a.createElement(
                      "div",
                      { style: n },
                      l.a.createElement("img", { style: a, src: t._value, onLoad: t.updateIE }),
                    )
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        In = Object(u.b)("store")(Object(u.c)(Mn));
      S.addTag("image", Tn, In);
      var Hn = n(151),
        An = n(207),
        Dn = n.n(An),
        Ln = function e(t, n, a) {
          var o = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {};
          Object(d.a)(this, e), (this.start = t), (this.end = n), (this.text = a), (this.data = o);
        },
        zn = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  return l.a.createElement(
                    "span",
                    {
                      "data-position": this.props.position,
                      overlap: this.props.overlap,
                      key: this.props.keyNode ? this.props.keyNode : null,
                      style: this.props.style,
                    },
                    this.props.children,
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        Pn = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t,
              n = e.store,
              a = e.range,
              o = e.id,
              r = e.highlightStyle,
              i = e.style,
              s = e.charIndex,
              c = e.children,
              u = e.overlap,
              d = function() {
                return ""
                  .concat(o, "-")
                  .concat(a.start, "-")
                  .concat(s);
              },
              m = function(e) {
                return e ? d() : "".concat(o, "-").concat(s);
              },
              p = l.a.createElement(
                "span",
                {
                  "data-position": s,
                  key: m(a),
                  style: (function(e) {
                    return e ? r : i;
                  })(a),
                },
                c,
              );
            u &&
              u.length &&
              (a.states &&
                a.states.map(function(e) {
                  t = Z.Colors.convertToRGBA(e.getSelectedColor(), 0.3);
                }),
              n.completionStore.selected.regionStore.regions.map(function(e) {
                e.selected &&
                  u.map(function(n) {
                    n === e.id && (t = "#ff4d4f");
                  }),
                  e.highlighted && u.includes(e.id) && (t = "#ff4d4f");
              }),
              (p = u.reduceRight(function(e, n) {
                return l.a.createElement(
                  zn,
                  { style: { background: t, padding: "2px 0" }, position: s, overlap: n, keyNode: m(a) },
                  e,
                );
              }, c)));
            return p;
          }),
        ),
        Jn = function(e) {
          var t = { wordWrap: "break-word" };
          return l.a.createElement(
            Pn,
            {
              id: e.id,
              highlightStyle: Object.assign({}, t, e.highlightStyle),
              charIndex: e.charIndex,
              range: e.range,
              overlap: e.overlap,
              style: t,
            },
            l.a.createElement(
              "a",
              { "data-position": e.charIndex + e.url.length, href: e.url, target: "blank" },
              e.url,
            ),
          );
        },
        Bn = function(e) {
          return l.a.createElement(
            Pn,
            { id: e.id, highlightStyle: e.highlightStyle, charIndex: e.charIndex, range: e.range, overlap: e.overlap },
            "".concat(e.text[e.charIndex]).concat(e.text[e.charIndex + 1]),
          );
        },
        Vn = n(304),
        Wn = n.n(Vn),
        Fn = (function(e) {
          function t() {
            var e;
            return Object(d.a)(this, t), ((e = Object(p.a)(this, Object(g.a)(t).call(this))).dismissMouseUp = 0), e;
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "getRange",
                value: function(e) {
                  if (this.props.ranges && this.props.ranges.length)
                    return this.props.ranges.find(function(t) {
                      return e >= t.start && e <= t.end;
                    });
                },
              },
              {
                key: "onMouseOverHighlightedWord",
                value: function(e, t) {
                  t && this.props.onMouseOverHighlightedWord && this.props.onMouseOverHighlightedWord(e);
                },
              },
              {
                key: "getLetterNode",
                value: function(e, t) {
                  var n,
                    a = this.props.text[e];
                  a && a.charCodeAt() && (n = 10 === a.charCodeAt(0));
                  var o = [];
                  return (
                    this.props.ranges &&
                      this.props.ranges.map(function(t) {
                        return e >= t.start && e <= t.end ? (o = [].concat(Object(Hn.a)(o), [t.id])) : o;
                      }),
                    l.a.createElement(
                      Pn,
                      {
                        id: this.props.id,
                        overlap: o,
                        range: t,
                        charIndex: e,
                        key: "".concat(this.props.id, "-").concat(e),
                        highlightStyle: this.props.highlightStyle,
                      },
                      n ? l.a.createElement("br", null) : a,
                    )
                  );
                },
              },
              {
                key: "getEmojiNode",
                value: function(e, t) {
                  var n = [];
                  return (
                    this.props.ranges &&
                      this.props.ranges.map(function(t) {
                        return e >= t.start && e <= t.end ? (n = [].concat(Object(Hn.a)(n), [t.id])) : n;
                      }),
                    l.a.createElement(Bn, {
                      text: this.props.text,
                      id: this.props.id,
                      overlap: n,
                      range: t,
                      key: "".concat(this.props.id, "-emoji-").concat(e),
                      charIndex: e,
                      highlightStyle: this.props.highlightStyle,
                    })
                  );
                },
              },
              {
                key: "getUrlNode",
                value: function(e, t, n) {
                  var a = [];
                  return (
                    this.props.ranges &&
                      this.props.ranges.map(function(t) {
                        return e >= t.start && e <= t.end ? (a = [].concat(Object(Hn.a)(a), [t.id])) : a;
                      }),
                    l.a.createElement(Jn, {
                      url: n,
                      id: this.props.id,
                      overlap: a,
                      range: t,
                      key: "".concat(this.props.id, "-url-").concat(e),
                      charIndex: e,
                      highlightStyle: this.props.highlightStyle,
                    })
                  );
                },
              },
              {
                key: "mouseEvent",
                value: function() {
                  if (!this.props.enabled) return !1;
                  var e = "";
                  if (window.getSelection) {
                    if ("None" === window.getSelection().type) return;
                    var t = window
                        .getSelection()
                        .getRangeAt(0)
                        .cloneRange()
                        .cloneContents(),
                      n = document.createElement("div");
                    n.appendChild(t);
                    var a = n.getElementsByTagName("sup");
                    if (a.length > 0) {
                      for (var o = 0; o < a.length; o++) a[o].innerText = "";
                      e = n.innerText;
                    } else e = n.innerText;
                  } else
                    document.selection &&
                      "Control" !== document.selection.type &&
                      (e = document.selection.createRange().text);
                  if (!e || !e.length) return !1;
                  var r = window.getSelection().getRangeAt(0);
                  if (!r.startContainer.parentNode.dataset.hint && !r.endContainer.parentNode.dataset.hint) {
                    var i = parseInt(r.startContainer.parentNode.dataset.position),
                      l = parseInt(r.endContainer.parentNode.dataset.position),
                      s = new Ln(i < l ? i : l, i < l ? l : i, e, Object(O.a)({}, this.props, { ranges: void 0 }));
                    this.props.onTextHighlighted(s);
                  }
                },
              },
              {
                key: "onMouseUp",
                value: function(e) {
                  this.mouseEvent.bind(this)();
                },
              },
              { key: "onMouseDown", value: function(e) {} },
              { key: "onMouseEnter", value: function(e) {} },
              { key: "onDoubleClick", value: function(e) {} },
              {
                key: "rangeRenderer",
                value: function(e, t, n, a) {
                  return this.props.rangeRenderer ? this.props.rangeRenderer(e, t, n, a) : e;
                },
              },
              {
                key: "getNode",
                value: function(e, t, n, a, o) {
                  return a.length ? this.getUrlNode(e, t, a) : o ? this.getEmojiNode(e, t) : this.getLetterNode(e, t);
                },
              },
              {
                key: "getRanges",
                value: function() {
                  for (var e, t = [], n = 0; n < this.props.text.length; n++) {
                    var a = this.getRange(n),
                      o = Z.Checkers.getUrl(n, this.props.text),
                      r = Dn()().test(this.props.text[n] + this.props.text[n + 1]),
                      i = this.getNode(n, a, this.props.text, o, r);
                    if ((o.length ? (n += o.length - 1) : r && n++, a)) {
                      e = a;
                      for (var l = [i], s = n + 1; s < parseInt(a.end) + 1; s++) {
                        Dn()().test("".concat(this.props.text[s]).concat(this.props.text[s + 1]))
                          ? (l.push(this.getEmojiNode(s, a)), s++)
                          : l.push(this.getLetterNode(s, a)),
                          (n = s);
                      }
                      t.push(this.rangeRenderer(l, a, n, this.onMouseOverHighlightedWord.bind(this)));
                    } else t.push(i);
                  }
                  return e && this.onMouseOverHighlightedWord(e, !0), t;
                },
              },
              {
                key: "render",
                value: function() {
                  var e = this.getRanges();
                  return l.a.createElement(
                    "div",
                    {
                      className: Wn.a.block,
                      style: this.props.style,
                      onMouseUp: this.onMouseUp.bind(this),
                      onMouseDown: this.onMouseDown.bind(this),
                      onMouseEnter: this.onMouseEnter.bind(this),
                      onDoubleClick: this.onDoubleClick.bind(this),
                    },
                    e,
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        Un = Object(u.c)(Fn),
        Gn = n(305),
        Yn = n.n(Gn),
        Zn = v.m
          .model("TextRegionModel", {
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "textrange",
            start: v.m.integer,
            end: v.m.integer,
            text: v.m.string,
            states: v.m.maybeNull(v.m.array(v.m.union(Jt, Ut))),
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.f)(e, ea);
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          })
          .actions(function(e) {
            return {
              highlightStates: function() {},
              toStateJSON: function() {
                var t = e.parent,
                  n = function(n) {
                    var a = {
                      id: e.pid,
                      from_name: n.name,
                      to_name: t.name,
                      source: t.value,
                      type: "region",
                      value: { start: e.start, end: e.end, text: e.text },
                    };
                    return e.normalization && (a.normalization = e.normalization), a;
                  };
                return e.states && e.states.length
                  ? e.states.map(function(e) {
                      var t = n(e);
                      return (t.value[e.type] = e.getSelectedNames()), (t.type = e.type), t;
                    })
                  : n(t);
              },
            };
          }),
        Kn = v.m.compose(
          "TextRegionModel",
          Rt,
          Mt,
          Zn,
        ),
        Xn = function(e) {
          var t = e.state,
            n = t.getSelectedString(),
            a = { background: Z.Colors.convertToRGBA(t.getSelectedColor(), 0.3) };
          return (
            e.style && (a = Object(O.a)({}, a, { outline: e.style.outline })),
            l.a.createElement(
              ne,
              { className: Yn.a.state, style: a },
              l.a.createElement("span", { "data-hint": !0 }, "\xa0[", n, "]"),
            )
          );
        },
        $n = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = (e.item, e.letterGroup),
              a = e.range,
              o = (e.textCharIndex, e.onMouseOverHighlightedWord, "rgba(0, 0, 255, 0.1)");
            a.states &&
              (o = a.states.map(function(e) {
                return e.getSelectedColor();
              })),
              0 !== o.length && (o = Z.Colors.convertToRGBA(o[0], 0.3));
            var r = {
                padding: "2px 0px",
                position: "relative",
                borderRadius: "2px",
                cursor: t.completionStore.selected.relationMode ? "crosshair" : "pointer",
              },
              i = [];
            return (
              (a.states && a.states.length) > 0 &&
                a.states.map(function(e) {
                  i.push(
                    l.a.createElement(Xn, {
                      key: a.id,
                      state: e,
                      bg: o,
                      hover: !!t.completionStore.selected.relationMode,
                      selected: a.selected,
                      style: a.highlighted ? { outline: "2px solid red" } : null,
                    }),
                  );
                }),
              i.length || (r = Object(O.a)({}, r, { background: "rgba(0, 0, 255, 0.1)" })),
              l.a.createElement(
                "span",
                {
                  style: r,
                  onClick: a.onClickRegion,
                  onMouseOver: function() {
                    t.completionStore.selected.relationMode && a.setHighlight(!0);
                  },
                  onMouseOut: function() {
                    t.completionStore.selected.relationMode && a.setHighlight(!1);
                  },
                },
                n,
                i,
              )
            );
          }),
        );
      S.addTag("textrange", Kn, $n);
      var qn = v.m.model("TextModel", {
          name: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
          selelectwithoutlabel: v.m.optional(v.m.string, "false"),
          hidden: v.m.optional(v.m.enumeration(["true", "false"]), "false"),
          adjustselection: v.m.optional(v.m.string, "true"),
          selectionenabled: v.m.optional(v.m.string, "true"),
        }),
        Qn = v.m
          .model("TextModel", {
            id: v.m.optional(v.m.identifier, N),
            type: "text",
            regions: v.m.array(Kn),
            _value: v.m.optional(v.m.string, ""),
          })
          .views(function(e) {
            return {
              get hasStates() {
                var t = e.states();
                return t && t.length > 0;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              states: function() {
                return e.completion.toNames.get(e.name);
              },
              activeStates: function() {
                var t = e.states();
                return t
                  ? t.filter(function(e) {
                      return (
                        e.isSelected && ("LabelsModel" === Object(v.i)(e).name || "RatingModel" === Object(v.i)(e).name)
                      );
                    })
                  : null;
              },
            };
          })
          .actions(function(e) {
            return {
              remove: function() {},
              findRegion: function(t, n) {
                return e.regions.find(function(e) {
                  return e.start === t && e.end === n;
                });
              },
              updateValue: function(t) {
                e._value = Ve(e.value, t.task.dataObj);
              },
              _addRegion: function(t) {
                var n = Kn.create(t);
                return e.regions.push(n), e.completion.addRegion(n), n;
              },
              addRegion: function(t) {
                var n = e.activeStates(),
                  a = n
                    ? n.map(function(e) {
                        return j(e);
                      })
                    : null;
                if ("false" === e.selelectwithoutlabel && !a.length) return null;
                var o = e._addRegion({ start: t.start, end: t.end, text: t.text, states: a });
                return (
                  n &&
                    n.forEach(function(e) {
                      return e.unselectAll();
                    }),
                  o
                );
              },
              toStateJSON: function() {
                return e.regions.map(function(e) {
                  return e.toStateJSON();
                });
              },
              fromStateJSON: function(t, n) {
                var a,
                  o = {
                    pid: t.id,
                    start: t.value.start,
                    end: t.value.end,
                    text: t.value.text,
                    normalization: t.normalization,
                  };
                if ("choices" !== n.type) {
                  if (t.from_name === t.to_name) a = e._addRegion(o);
                  else {
                    var r = e.findRegion(t.value.start, t.value.end),
                      i = C(n);
                    i.fromStateJSON(t), r ? r.states.push(i) : ((o.states = [i]), (a = e._addRegion(o)));
                  }
                  return a;
                }
                e.completion.names.get(t.from_name).fromStateJSON(t);
              },
            };
          }),
        ea = v.m.compose(
          "TextModel",
          qn,
          Qn,
        ),
        ta = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "renderRegion",
                value: function(e, t, n, a) {
                  return l.a.createElement($n, {
                    key: t.id,
                    store: this.props.store,
                    item: this.props.item,
                    letterGroup: e,
                    range: t,
                    selected: t.selected,
                    textCharIndex: n,
                    onMouseOverHighlightedWord: a,
                  });
                },
              },
              {
                key: "render",
                value: function() {
                  var e = this.props.item,
                    t = {};
                  return (
                    "true" === e.hidden && (t.display = "none"),
                    l.a.createElement(
                      "div",
                      { style: t },
                      l.a.createElement(Un, {
                        id: e.id,
                        key: e.id,
                        text: e._value,
                        enabled: "true" === e.selectionenabled,
                        ranges: e.regions,
                        adjustSelection: e.adjustselection,
                        rangeRenderer: this.renderRegion.bind(this),
                        onTextHighlighted: function(t) {
                          e.addRegion(t);
                        },
                      }),
                    )
                  );
                },
              },
            ]),
            t
          );
        })(i.Component),
        na = Object(u.b)("store")(Object(u.c)(ta));
      S.addTag("text", ea, na);
      var aa = n(556),
        oa = n(567),
        ra =
          (l.a.Component,
          v.m.model({
            selected: v.m.optional(v.m.boolean, !1),
            alias: v.m.maybeNull(v.m.string),
            value: v.m.maybeNull(v.m.string),
            hotkey: v.m.maybeNull(v.m.string),
            style: v.m.maybeNull(v.m.string),
          })),
        ia = v.m
          .model({ type: "choice", _value: v.m.optional(v.m.string, "") })
          .views(function(e) {
            return {
              get isCheckbox() {
                var t = Object(v.f)(e, da).choice;
                return "multiple" === t || "single" === t;
              },
              get name() {
                return Object(v.f)(e, da).name;
              },
            };
          })
          .actions(function(e) {
            return {
              toggleSelected: function() {
                var t = Object(v.f)(e, da);
                t.shouldBeUnselected && t.unselectAll(), e.markSelected(!e.selected);
              },
              markSelected: function(t) {
                e.selected = t;
              },
              onHotKey: function() {
                return e.toggleSelected();
              },
            };
          }),
        la = v.m.compose(
          "ChoiceModel",
          ra,
          ia,
          We,
        ),
        sa = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.item,
              n = e.store,
              a = {};
            if ((t.style && (a = R.cssConverter(t.style)), t.isCheckbox)) {
              var o = Object.assign({ marginRight: "1em", display: "flex", alignItems: "center" }, a);
              return l.a.createElement(
                "div",
                { style: o },
                l.a.createElement(aa.a, {
                  name: t._value,
                  label: t._value,
                  onChange: function(e) {
                    t.toggleSelected();
                  },
                  checked: t.selected,
                }),
                n.settings.enableTooltips &&
                  n.settings.enableHotkeys &&
                  t.hotkey &&
                  l.a.createElement(ne, null, "[", t.hotkey, "]"),
              );
            }
            var r = l.a.createElement(
              "label",
              null,
              t._value,
              n.settings.enableTooltips &&
                n.settings.enableHotkeys &&
                t.hotkey &&
                l.a.createElement(ne, null, "[", t.hotkey, "]"),
            );
            return l.a.createElement(
              "div",
              { style: a },
              l.a.createElement(ge.a.Radio, {
                label: r,
                value: t._value,
                style: { display: "inline-block" },
                checked: t.selected,
                onChange: function(e) {
                  t.toggleSelected();
                },
              }),
            );
          }),
        );
      S.addTag("choice", la, sa);
      var ca = v.m.model({
          name: v.m.string,
          toname: v.m.maybeNull(v.m.string),
          showinline: v.m.optional(v.m.string, "false"),
          choice: v.m.optional(v.m.enumeration(["single", "single-radio", "multiple"]), "single"),
        }),
        ua = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "choices",
            children: Ae.unionArray(["choice"]),
          })
          .views(function(e) {
            return {
              get shouldBeUnselected() {
                return "single" === e.choice || "single-radio" === e.choice;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              states: function() {
                return e.completion.toNames.get(e.name);
              },
            };
          })
          .actions(function(e) {
            return {
              toStateJSON: function() {
                var t = e.getSelectedNames();
                if (t && t.length) {
                  var n = e.toname || e.name;
                  return { id: e.pid, from_name: e.name, to_name: n, type: e.type, value: { choices: t } };
                }
              },
              fromStateJSON: function(t, n) {
                if ((e.unselectAll(), !t.value.choices)) throw new Error("No labels param");
                t.id && (e.pid = t.id),
                  t.value.choices.forEach(function(t) {
                    var n = e.findLabel(t);
                    if (!n) throw new Error("No label " + t);
                    n.markSelected(!0);
                  });
              },
            };
          }),
        da = v.m.compose(
          "ChoicesModel",
          ca,
          ua,
          Lt,
        ),
        ma = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(
            "div",
            { style: { marginTop: "1em" } },
            l.a.createElement(
              ge.a,
              null,
              "true" === t.showinline
                ? l.a.createElement(ge.a.Group, { inline: !0 }, R.renderChildren(t))
                : l.a.createElement(ge.a.Group, { grouped: !0 }, R.renderChildren(t)),
            ),
          );
        });
      S.addTag("choices", da, ma);
      var pa = n(565),
        ga = v.m
          .model("TextAreaRegionModel", {
            id: v.m.optional(v.m.identifier, N),
            pid: v.m.optional(v.m.string, N),
            type: "textarearegion",
            _value: v.m.string,
          })
          .views(function(e) {
            return {
              get parent() {
                return Object(v.f)(e, ya);
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
            };
          }),
        fa = v.m.compose(
          "TextAreaRegionModel",
          Rt,
          Mt,
          ga,
        ),
        ha = Object(u.b)("store")(
          Object(u.c)(function(e) {
            var t = e.store,
              n = e.item,
              a = { cursor: t.completionStore.selected.relationMode ? "crosshair" : "pointer" };
            return (
              n.selected
                ? (a = Object(O.a)({}, a, { border: "1px solid red" }))
                : n.highlighted && (a = Object(O.a)({}, a, { border: "2px solid red" })),
              l.a.createElement(
                pa.a,
                {
                  className: "warning",
                  style: a,
                  onClick: n.onClickRegion,
                  onMouseOver: function() {
                    t.completionStore.selected.relationMode && n.setHighlight(!0);
                  },
                  onMouseOut: function() {
                    t.completionStore.selected.relationMode && n.setHighlight(!1);
                  },
                },
                l.a.createElement("p", null, n._value),
              )
            );
          }),
        );
      S.addTag("textarearegion", fa, ha);
      var ba = v.m.model({
          allowSubmit: v.m.optional(v.m.string, "true"),
          label: v.m.optional(v.m.string, ""),
          name: v.m.maybeNull(v.m.string),
          toname: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
          placeholder: v.m.maybeNull(v.m.string),
          maxsubmissions: v.m.maybeNull(v.m.string),
        }),
        va = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            type: "textarea",
            regions: v.m.array(fa),
            _value: v.m.optional(v.m.string, ""),
          })
          .views(function(e) {
            return {
              get submissionsNum() {
                return e.regions.length;
              },
              get completion() {
                return Object(v.g)(e).completionStore.selected;
              },
              get showSubmit() {
                if (e.maxsubmissions) {
                  var t = parseInt(e.maxsubmissions);
                  return e.submissionsNum < t;
                }
                return !0;
              },
            };
          })
          .actions(function(e) {
            return {
              setValue: function(t) {
                e._value = t;
              },
              addText: function(t, n) {
                var a = fa.create({ pid: n, _value: t });
                return e.regions.push(a), e.completion.addRegion(a), a;
              },
              beforeSend: function() {
                e._value && e._value.length && e.addText(e._value);
              },
              deleteText: function(e) {
                Object(v.b)(e);
              },
              toStateJSON: function() {
                var t = e.toname || e.name;
                return [
                  e.regions.map(function(n) {
                    return { id: n.pid, from_name: e.name, to_name: t, type: e.type, value: { text: n._value } };
                  }),
                ];
              },
              fromStateJSON: function(t, n) {
                return e.addText(t.value.text, t.id);
              },
            };
          }),
        ya = v.m.compose(
          "TextAreaModel",
          ba,
          va,
          We,
        ),
        ka = Object(u.c)(function(e) {
          var t = e.item;
          return l.a.createElement(
            "div",
            null,
            t.regions.length > 0 &&
              l.a.createElement(
                "div",
                { style: { marginTop: "1em", marginBottom: "1em" } },
                t.regions.map(function(e) {
                  return l.a.createElement(ha, { item: e });
                }),
              ),
            t.showSubmit &&
              l.a.createElement(
                ge.a,
                {
                  onSubmit: function(e) {
                    return "true" === t.allowSubmit && (t.addText(t._value), t.setValue("")), e.preventDefault(), !1;
                  },
                },
                l.a.createElement(ge.a.Input, {
                  value: t._value,
                  className: "is-search",
                  label: t.label,
                  placeholder: t.placeholder,
                  onChange: function(e) {
                    var n = e.target.value;
                    t.setValue(n);
                  },
                }),
              ),
          );
        });
      S.addTag("textarea", ya, ka);
      var Sa = n(72),
        wa = n(102),
        _a = n.n(wa),
        Oa = v.m
          .model({
            backgroundColor: v.m.optional(v.m.string, "transparent"),
            value: v.m.maybeNull(v.m.string),
            _value: v.m.maybeNull(v.m.string),
            selected: v.m.optional(v.m.boolean, !1),
            idx: v.m.number,
          })
          .views(function(e) {
            return {};
          })
          .actions(function(e) {
            return {
              setBG: function(t) {
                e.backgroundColor = t;
              },
              setIdx: function(t) {
                e.idx = t;
              },
              setSelected: function(t) {
                e.selected = t;
              },
            };
          }),
        xa = v.m.model({
          axis: v.m.optional(v.m.string, "y"),
          lockaxis: v.m.maybeNull(v.m.string),
          elementvalue: v.m.maybeNull(v.m.string),
          elementtag: v.m.optional(v.m.string, "Text"),
          sortedhighlightcolor: v.m.maybeNull(v.m.string),
          name: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
        }),
        Ea = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            type: "list",
            update: v.m.optional(v.m.number, 1),
            regions: v.m.array(Oa),
          })
          .views(function(e) {
            return {};
          })
          .actions(function(e) {
            return {
              setUpdate: function() {
                e.update = e.update + 1;
              },
              addRegion: function(t, n) {
                var a = Oa.create({ value: e.elementvalue, idx: n, _value: Be(e.elementvalue, t[n]) });
                e.regions.push(a);
              },
              updateValue: function(t) {
                var n = Be(e.value, t.task.dataObj);
                (e.regions = []),
                  n.forEach(function(t, a) {
                    return e.addRegion(n, a);
                  }),
                  n.forEach(function(e, t) {
                    e._orig_idx = t;
                  }),
                  (e._value = n),
                  e.setUpdate();
              },
              moveItems: function(t) {
                var n = t.oldIndex,
                  a = t.newIndex;
                n !== a &&
                  (e.sortedhighlightcolor && e.regions[n].setBG(e.sortedhighlightcolor),
                  e.regions[n].setSelected(!0),
                  e._value && (e._value = _a()(e._value, n, a)),
                  (e.regions = _a()(e.regions, n, a)),
                  e.setUpdate());
              },
              toStateJSON: function() {
                var t = {};
                e._value.forEach(function(n, a) {
                  t[e.regions[a].idx] = 1 / (1 + a);
                });
                for (
                  var n = Object.keys(t)
                      .sort(function(e, t) {
                        return e - t;
                      })
                      .map(function(e) {
                        return t[e];
                      }),
                    a = [],
                    o = 0;
                  o < Object.keys(t).length;
                  o++
                )
                  a[e.regions[o].idx] = e.regions[o].selected ? 1 : 0;
                return { from_name: e.name, to_name: e.name, value: { weights: n, selected: a } };
              },
              fromStateJSON: function(t, n) {
                var a = [],
                  o = [],
                  r = {};
                t.value.weights.forEach(function(e, t) {
                  r[e] ? r[e].push(t) : (r[e] = [t]);
                }),
                  Object.keys(r)
                    .sort(function(e, t) {
                      return t - e;
                    })
                    .forEach(function(t) {
                      r[t].forEach(function(t) {
                        o.push(e.regions[t]), a.push(e._value[t]);
                      });
                    }),
                  o.forEach(function(e, t) {
                    return e.setIdx(t);
                  }),
                  (e._value = a),
                  (e.regions = o),
                  e.setUpdate();
              },
            };
          }),
        Na = v.m.compose(
          "ListModel",
          xa,
          Ea,
        ),
        ja = Object(Sa.sortableHandle)(function() {
          return l.a.createElement("div", { className: "drag-handle" });
        });
      function Ca() {
        try {
          return "undefined" !== typeof window.orientation || -1 !== navigator.userAgent.indexOf("IEMobile");
        } catch (e) {
          return !1;
        }
      }
      var Ta = Object(Sa.SortableElement)(function(e) {
          var t,
            n = e.item,
            a = e.value;
          Ca && (t = "noselect");
          var o = {
            text: function(e) {
              return l.a.createElement("span", { className: t }, e._value);
            },
            image: function(e) {
              return l.a.createElement("img", { src: e._value, alt: "image" });
            },
            audio: function(e) {
              return l.a.createElement("audio", { src: e._value });
            },
          };
          return l.a.createElement(
            "div",
            {
              style: {
                padding: "1em",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                background: a.selected ? n.sortedhighlightcolor : "transparent",
              },
              className: t,
              onClick: function(e) {
                return (
                  a.selected ? (a.setSelected(!1), n.setUpdate()) : (a.setSelected(!0), n.setUpdate()),
                  e.preventDefault(),
                  !1
                );
              },
            },
            l.a.createElement(ja, null),
            o[n.elementtag.toLowerCase()](a),
          );
        }),
        Ra = Object(Sa.SortableContainer)(function(e) {
          var t = e.item,
            n = e.items;
          return l.a.createElement(
            M.a,
            { celled: !0 },
            n.map(function(e, n) {
              return l.a.createElement(Ta, {
                key: "item-".concat(n),
                index: n,
                value: e,
                color: e.backgroundColor,
                item: t,
                onClick: function(e) {},
              });
            }),
          );
        }),
        Ma = Object(u.c)(function(e) {
          e.store;
          var t = e.item,
            n = {};
          return (
            Ca() ? (n.pressDelay = 100) : (n.distance = 7),
            l.a.createElement(
              "div",
              null,
              l.a.createElement(
                Ra,
                Object.assign({ update: t.update, item: t, items: t.regions, onSortEnd: t.moveItems }, n),
              ),
            )
          );
        }),
        Ia = Object(u.b)("store")(Object(u.c)(Ma));
      S.addTag("list", Na, Ia);
      var Ha = v.m
          .model({
            backgroundColor: v.m.optional(v.m.string, "transparent"),
            value: v.m.maybeNull(v.m.string),
            _value: v.m.maybeNull(v.m.string),
            selected: v.m.optional(v.m.boolean, !1),
            idx: v.m.number,
          })
          .views(function(e) {
            return {};
          })
          .actions(function(e) {
            return {
              setBG: function(t) {
                e.backgroundColor = t;
              },
              setIdx: function(t) {
                e.idx = t;
              },
              setSelected: function(t) {
                e.selected = t;
              },
            };
          }),
        Aa = v.m.model({
          axis: v.m.optional(v.m.string, "y"),
          lockaxis: v.m.maybeNull(v.m.string),
          elementtag: v.m.optional(v.m.string, "Text"),
          ranked: v.m.optional(v.m.string, "true"),
          sortable: v.m.optional(v.m.string, "true"),
          sortedhighlightcolor: v.m.maybeNull(v.m.string),
          name: v.m.maybeNull(v.m.string),
          value: v.m.maybeNull(v.m.string),
        }),
        Da = v.m
          .model({
            id: v.m.optional(v.m.identifier, N),
            type: "ranker",
            update: v.m.optional(v.m.number, 1),
            regions: v.m.array(Ha),
          })
          .views(function(e) {
            return {};
          })
          .actions(function(e) {
            return {
              setUpdate: function() {
                e.update = e.update + 1;
              },
              _addRegion: function(t, n) {
                var a = Ha.create({ value: t, idx: n, _value: t });
                e.regions.push(a);
              },
              moveItems: function(t) {
                var n = t.oldIndex,
                  a = t.newIndex;
                n != a &&
                  (e.sortedhighlightcolor && e.regions[n].setBG(e.sortedhighlightcolor),
                  e.regions[n].setSelected(!0),
                  e._value && (e._value = _a()(e._value, n, a)),
                  (e.regions = _a()(e.regions, n, a)),
                  e.setUpdate());
              },
              toStateJSON: function() {
                return {
                  from_name: e.name,
                  to_name: e.name,
                  value: {
                    items: e.regions.map(function(e) {
                      return e.value;
                    }),
                    selected: e.regions.map(function(e) {
                      return e.selected;
                    }),
                  },
                };
              },
              fromStateJSON: function(t, n) {
                t.value.items.forEach(function(t, n) {
                  e._addRegion(t, n);
                }),
                  e.setUpdate();
              },
            };
          }),
        La = v.m.compose(
          "RankerModel",
          Aa,
          Da,
        ),
        za = Object(Sa.sortableHandle)(function() {
          return l.a.createElement("div", { className: "drag-handle" });
        });
      function Pa() {
        try {
          return "undefined" !== typeof window.orientation || -1 !== navigator.userAgent.indexOf("IEMobile");
        } catch (e) {
          return !1;
        }
      }
      var Ja = Object(Sa.SortableElement)(function(e) {
          var t,
            n = e.item,
            a = e.value;
          Pa && (t = "noselect");
          var o = {
            text: function(e) {
              return l.a.createElement("span", { className: t }, e._value);
            },
            image: function(e) {
              return l.a.createElement("img", { src: e._value });
            },
            audio: function(e) {
              return l.a.createElement("audio", { src: e._value });
            },
          };
          return l.a.createElement(
            "div",
            {
              style: {
                padding: "1em",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                background: a.selected ? n.sortedhighlightcolor : "transparent",
              },
              className: t,
              onClick: function(e) {
                return (
                  a.selected ? (a.setSelected(!1), n.setUpdate()) : (a.setSelected(!0), n.setUpdate()),
                  e.preventDefault(),
                  !1
                );
              },
            },
            l.a.createElement(za, null),
            o[n.elementtag.toLowerCase()](a),
          );
        }),
        Ba = Object(Sa.SortableContainer)(function(e) {
          var t = e.item,
            n = e.items;
          return l.a.createElement(
            M.a,
            { celled: !0 },
            n.map(function(e, n) {
              return l.a.createElement(Ja, {
                key: "item-".concat(n),
                index: n,
                value: e,
                color: e.backgroundColor,
                item: t,
                onClick: function(e) {},
              });
            }),
          );
        }),
        Va = Object(u.c)(function(e) {
          e.store;
          var t = e.item,
            n = {};
          return (
            Pa() ? (n.pressDelay = 100) : (n.distance = 7),
            l.a.createElement(
              "div",
              null,
              l.a.createElement(
                Ba,
                Object.assign({ update: t.update, item: t, items: t.regions, onSortEnd: t.moveItems }, n),
              ),
            )
          );
        }),
        Wa = Object(u.b)("store")(Object(u.c)(Va));
      S.addTag("ranker", La, Wa);
      var Fa = n(306),
        Ua = n.n(Fa),
        Ga = (function(e) {
          function t() {
            return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
          }
          return (
            Object(f.a)(t, e),
            Object(m.a)(t, [
              {
                key: "render",
                value: function() {
                  return l.a.createElement("div", { className: Ua.a.block }, this.props.children);
                },
              },
            ]),
            t
          );
        })(l.a.Component),
        Ya = n(208),
        Za = n.n(Ya),
        Ka = Object(u.b)("store")(
          Object(u.c)(
            (function(e) {
              function t() {
                return Object(d.a)(this, t), Object(p.a)(this, Object(g.a)(t).apply(this, arguments));
              }
              return (
                Object(f.a)(t, e),
                Object(m.a)(t, [
                  {
                    key: "renderSuccess",
                    value: function() {
                      this.props.store;
                      return l.a.createElement(y.a, { status: "success", title: "Done!" });
                    },
                  },
                  {
                    key: "renderNoCompletion",
                    value: function() {
                      this.props.store;
                      return l.a.createElement(y.a, { status: "success", title: "No more completions" });
                    },
                  },
                  {
                    key: "renderNothingToLabel",
                    value: function() {
                      this.props.store;
                      return l.a.createElement(y.a, {
                        status: "success",
                        title: "No more data available for labeling",
                      });
                    },
                  },
                  {
                    key: "renderLoader",
                    value: function() {
                      return l.a.createElement(y.a, { icon: l.a.createElement(k.a, { size: "large" }) });
                    },
                  },
                  {
                    key: "render",
                    value: function() {
                      var e = this.props.store;
                      if (e.isLoading) return this.renderLoader();
                      if (e.noTask) return this.renderNothingToLabel();
                      if (e.labeledSuccess) return this.renderSuccess();
                      if (!e.completionStore.currentCompletion) return this.renderNoCompletion();
                      var t = e.completionStore.currentCompletion.root;
                      return l.a.createElement(
                        "div",
                        { className: Za.a.editor },
                        l.a.createElement(de, { store: e }),
                        l.a.createElement(
                          u.a,
                          { store: e },
                          l.a.createElement(
                            "div",
                            null,
                            e.hasInterface("panel") && l.a.createElement(se, { store: e }),
                            e.showingDescription &&
                              l.a.createElement(
                                Ga,
                                null,
                                l.a.createElement("div", { dangerouslySetInnerHTML: { __html: e.description } }),
                              ),
                            l.a.createElement(
                              "div",
                              { className: "common-container" },
                              l.a.createElement(
                                Ga,
                                null,
                                R.renderItem(t),
                                e.hasInterface("submit") && l.a.createElement(re, null),
                              ),
                              l.a.createElement(
                                "div",
                                { className: Za.a.menu },
                                e.hasInterface("completions") && l.a.createElement(Q, { store: e }),
                                e.hasInterface("side-column") && l.a.createElement(Ie, { store: e }),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  },
                ]),
                t
              );
            })(i.Component),
          ),
        );
      Boolean(
        "localhost" === window.location.hostname ||
          "[::1]" === window.location.hostname ||
          window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/),
      );
      var Xa = n(49),
        $a = n.n(Xa),
        qa = v.m
          .model("Task", { id: v.m.identifierNumber, data: v.m.maybeNull(v.m.string), project: v.m.number })
          .views(function(e) {
            return {
              get app() {
                return Object(v.e)(e);
              },
              get dataObj() {
                return Z.Checkers.isStringJSON(e.data) ? JSON.parse(e.data) : null;
              },
            };
          }),
        Qa =
          (n(10),
          v.m
            .model("TimeTraveller", {
              history: v.m.array(v.m.frozen()),
              undoIdx: -1,
              targetPath: "",
              createdIdx: 1,
              isFrozen: v.m.optional(v.m.boolean, !1),
              frozenIdx: -1,
            })
            .views(function(e) {
              return {
                get canUndo() {
                  return e.undoIdx > 1;
                },
                get canRedo() {
                  return e.undoIdx < e.history.length - 1;
                },
              };
            })
            .actions(function(e) {
              var t,
                n,
                a = !1;
              return {
                freeze: function() {
                  (e.isFrozen = !0), (a = !0), (e.frozenIdx = e.undoIdx);
                },
                addUndoState: function(t) {
                  a
                    ? (a = !1)
                    : (e.history.splice(e.undoIdx + 1), e.history.push(t), (e.undoIdx = e.history.length - 1));
                },
                afterCreate: function() {
                  var a = this;
                  if (!(t = e.targetPath ? Object(v.l)(e, e.targetPath) : Object(v.d)(e).targetStore))
                    throw new Error(
                      "Failed to find target store for TimeTraveller. Please provide `targetPath`  property, or a `targetStore` in the environment",
                    );
                  (n = Object(v.k)(t, function(e) {
                    return a.addUndoState(e);
                  })),
                    0 === e.history.length && this.addUndoState(Object(v.h)(t)),
                    (e.createdIdx = e.undoIdx);
                },
                beforeDestroy: function() {
                  n();
                },
                undo: function() {
                  (e.isFrozen && e.frozenIdx <= e.undoIdx) ||
                    (e.undoIdx--, (a = !0), Object(v.a)(t, e.history[e.undoIdx]));
                },
                redo: function() {
                  e.undoIdx++, (a = !0), Object(v.a)(t, e.history[e.undoIdx]);
                },
                set: function(n) {
                  (e.undoIdx = n), (a = !0), Object(v.a)(t, e.history[e.undoIdx]);
                },
                reset: function() {
                  (e.undoIdx = e.createdIdx), (a = !0), Object(v.a)(t, e.history[e.undoIdx]);
                },
              };
            })),
        eo = n(150),
        to = n.n(eo),
        no = {};
      var ao = {
          addKey: function(e, t) {
            no[e] || ((no[e] = !0), to()(e, "main", t));
          },
          unbindAll: function() {
            for (var e = 0, t = Object.keys(no); e < t.length; e++) {
              var n = t[e];
              to.a.unbind(n);
            }
            no = {};
          },
          makeComb: function() {
            for (var e = "1234567890qwertasdfgzxcvbyuiophjklnm".split(""), t = 0; t <= e.length; t++) {
              var n = void 0;
              if (((n = e[t]), !no.hasOwnProperty(n))) return n;
            }
            return null;
          },
          setScope: function(e) {
            to.a.setScope(e);
          },
        },
        oo = v.m
          .model("Relation", {
            node1: v.m.reference(v.m.union(Kn, dn, Zt, fa, En)),
            node2: v.m.reference(v.m.union(Kn, dn, Zt, fa, En)),
          })
          .actions(function(e) {
            return {
              toggleHighlight: function() {
                e.node1 == e.node2
                  ? e.node1.toggleHightlight()
                  : (e.node1.toggleHightlight(), e.node2.toggleHightlight());
              },
            };
          }),
        ro = v.m.model("RelationStore", { relations: v.m.array(oo) }).actions(function(e) {
          return {
            findRelations: function(t, n) {
              return n
                ? e.relations.filter(function(e) {
                    return e.node1.id == t.id && e.node2.id == n.id;
                  })
                : e.relations.filter(function(e) {
                    return e.node1.id == t.id || e.node2.id == t.id;
                  });
            },
            nodesRelated: function(t, n) {
              return e.findRelations(t, n).length > 0;
            },
            addRelation: function(t, n) {
              if (!e.nodesRelated(t, n)) {
                var a = oo.create({ node1: t, node2: n });
                return e.relations.push(a), a;
              }
            },
            deleteRelation: function(e) {
              Object(v.b)(e);
            },
            deleteNodeRelation: function(t) {
              var n = e.findRelations(t);
              n.length && n.forEach(e.deleteRelation);
            },
            serializeCompletion: function() {
              return e.relations.map(function(e) {
                return { from_id: e.node1.pid, to_id: e.node2.pid, type: "relation" };
              });
            },
            deserializeRelation: function(t, n) {
              e.addRelation(t, n);
            },
          };
        }),
        io = v.m
          .model("RegionStore", { regions: v.m.array(v.m.safeReference(v.m.union(Kn, dn, En, Zt, fa))) })
          .actions(function(e) {
            return {
              addRegion: function(t) {
                e.regions.push(t);
              },
              findRegion: function(t) {
                return e.regions.find(function(e) {
                  return e.pid === t;
                });
              },
              deleteRegion: function(t) {
                for (var n = e.regions, a = 0; a < n.length; a++) n[a] === t && n.splice(a, 1);
              },
              unselectAll: function() {
                e.regions.forEach(function(e) {
                  return e.unselectRegion();
                }),
                  Object(v.e)(e).setHighlightedNode(null);
              },
              unhighlightAll: function() {
                e.regions.forEach(function(e) {
                  return e.setHighlight(!1);
                });
              },
            };
          }),
        lo = v.m
          .model("Completion", {
            id: v.m.identifier,
            pk: v.m.optional(v.m.integer, 1),
            selected: v.m.optional(v.m.boolean, !1),
            createdDate: v.m.optional(v.m.string, new Date().toISOString()),
            createdAgo: v.m.maybeNull(v.m.string),
            createdBy: v.m.optional(v.m.string, "Admin"),
            honeypot: v.m.optional(v.m.boolean, !1),
            root: Ae.allModelsTypes(),
            names: v.m.map(v.m.reference(Ae.allModelsTypes())),
            toNames: v.m.map(v.m.array(v.m.reference(Ae.allModelsTypes()))),
            history: v.m.optional(Qa, { targetPath: "../root" }),
            dragMode: v.m.optional(v.m.boolean, !1),
            relationMode: v.m.optional(v.m.boolean, !1),
            relationStore: v.m.optional(ro, { relations: [] }),
            normalizationMode: v.m.optional(v.m.boolean, !1),
            regionStore: v.m.optional(io, { regions: [] }),
            highlightedNode: v.m.maybeNull(
              v.m.union(
                v.m.safeReference(Kn),
                v.m.safeReference(dn),
                v.m.safeReference(Zt),
                v.m.safeReference(fa),
                v.m.safeReference(En),
                v.m.safeReference(an),
              ),
            ),
          })
          .views(function(e) {
            return {
              get store() {
                return Object(v.e)(e, 2);
              },
            };
          })
          .actions(function(e) {
            return {
              reinitHistory: function() {
                e.history = { targetPath: "../root" };
              },
              _updateServerState: function(t) {
                var n = "/api/tasks/" + Object(v.e)(e, 3).task.id + "/completions/" + e.pk + "/";
                Object(v.d)(e).patch(n, JSON.stringify(t));
              },
              setHoneypot: function() {
                (e.honeypot = !0), e._updateServerState({ honeypot: e.honeypot });
              },
              setDragMode: function(t) {
                e.dragMode = t;
              },
              setNormalizationMode: function(t) {
                e.normalizationMode = t;
              },
              setHighlightedNode: function(t) {
                e.highlightedNode = t;
              },
              startRelationMode: function(t) {
                (e._relationObj = t), (e.relationMode = !0);
              },
              stopRelationMode: function() {
                (e._relationObj = null), (e.relationMode = !1), e.regionStore.unhighlightAll();
              },
              deleteAllRegions: function() {
                e.regionStore.regions.forEach(function(e) {
                  return e.deleteRegion();
                });
              },
              addRegion: function(t) {
                e.regionStore.unselectAll(),
                  e.regionStore.addRegion(t),
                  e.relationMode && (e.addRelation(t), e.stopRelationMode());
              },
              addRelation: function(t) {
                e.relationStore.addRelation(e._relationObj, t);
              },
              removeHoneypot: function() {
                (e.honeypot = !1), e._updateServerState({ honeypot: e.honeypot });
              },
              traverseTree: function(t) {
                var n;
                (n = function(e) {
                  t(e),
                    e.children &&
                      e.children.forEach(function(e) {
                        return n(e);
                      });
                })(e.root);
              },
              beforeSend: function() {
                e.traverseTree(function(e) {
                  e && e.beforeSend && e.beforeSend();
                }),
                  e.stopRelationMode(),
                  e.regionStore.unselectAll();
              },
              deleteRegion: function(e) {
                Object(v.b)(e);
              },
              afterCreate: function() {
                e.traverseTree(function(t) {
                  if ((t && t.name && t.id && e.names.set(t.name, t.id), t && t.toname && t.id)) {
                    var n = e.toNames.get(t.toname);
                    n ? n.push(t.id) : e.toNames.set(t.toname, [t.id]);
                  }
                }),
                  ao.unbindAll(),
                  e.traverseTree(function(e) {
                    e && e.onHotKey && e.hotkey && ao.addKey(e.hotkey, e.onHotKey);
                  }),
                  e.traverseTree(function(e) {
                    if (e && e.onHotKey && !e.hotkey) {
                      var t = ao.makeComb();
                      if (!t) return;
                      (e.hotkey = t), ao.addKey(e.hotkey, e.onHotKey);
                    }
                  }),
                  ao.setScope("main");
              },
              serializeCompletion: function() {
                var t = [];
                e.traverseTree(function(e) {
                  if (e.toStateJSON) {
                    var n = e.toStateJSON();
                    n && t.push(n);
                  }
                });
                var n = e.relationStore.serializeCompletion();
                t.push(n);
                return (function e(t) {
                  return t.reduce(function(t, n) {
                    return t.concat(Array.isArray(n) ? e(n) : n);
                  }, []);
                })(t);
              },
              deserializeCompletion: function(t) {
                t.forEach(function(t) {
                  "relation" !== t.type
                    ? t.to_name.split(",").forEach(function(n) {
                        var a = e.names.get(n);
                        if (!a) throw new Error("No model found for " + t.to_name);
                        var o = e.names.get(t.from_name);
                        if (!o) throw new Error("No model found for " + t.from_name);
                        a.fromStateJSON(t, o);
                      })
                    : e.relationStore.deserializeRelation(
                        e.regionStore.findRegion(t.from_id),
                        e.regionStore.findRegion(t.to_id),
                      );
                });
              },
            };
          }),
        so = v.m
          .model("CompletionStore", { completions: v.m.array(lo), selected: v.m.maybeNull(v.m.reference(lo)) })
          .views(function(e) {
            return {
              get currentCompletion() {
                return (
                  e.selected &&
                  e.completions.find(function(t) {
                    return t.id === e.selected.id;
                  })
                );
              },
              get store() {
                return Object(v.e)(e);
              },
              get savedCompletions() {
                return e.completions.filter(function(e) {
                  return !e.was_generated;
                });
              },
            };
          })
          .actions(function(e) {
            var t = Object(v.c)(
              $a.a.mark(function t(n) {
                return $a.a.wrap(
                  function(t) {
                    for (;;)
                      switch ((t.prev = t.next)) {
                        case 0:
                          return (
                            (t.prev = 0),
                            (t.next = 3),
                            Object(v.d)(e).remove("/api/tasks/" + e.store.task.id + "/completions/" + n + "/")
                          );
                        case 3:
                          t.sent, (t.next = 9);
                          break;
                        case 6:
                          (t.prev = 6), (t.t0 = t.catch(0)), console.error("Failed to skip task ", t.t0);
                        case 9:
                        case "end":
                          return t.stop();
                      }
                  },
                  t,
                  null,
                  [[0, 6]],
                );
              }),
            );
            function n(t) {
              Object(v.b)(t), (e.selected = null), e.completions.length > 0 && e.selectCompletion(e.completions[0].id);
            }
            return {
              selectCompletion: function(t) {
                e.completions.map(function(e) {
                  return (e.selected = !1);
                });
                var n = e.completions.find(function(e) {
                  return e.id === t;
                });
                (n.selected = !0), (e.selected = n);
              },
              addCompletion: function(t, n) {
                var a = lo.create(t);
                return (
                  e.store.task &&
                    "initial" == n &&
                    a.traverseTree(function(t) {
                      return t.updateValue && t.updateValue(e.store);
                    }),
                  e.completions.push(a),
                  a
                );
              },
              deleteCompletion: function(e) {
                t(e.pk), n(e);
              },
              destroyCompletion: n,
              addInitialCompletion: function() {
                var t = R.treeToModel(e.store.config),
                  n = S.getModelByTag(t.type).create(t),
                  a = { id: N(), root: n };
                if (e.store.expert) {
                  var o = e.store.expert;
                  a.createdBy = o.firstName + " " + o.lastName;
                } else a.createdBy = "Admin";
                return e.addCompletion(a, "initial");
              },
              addSavedCompletion: function(t) {
                var n = R.treeToModel(e.store.config),
                  a = S.getModelByTag(n.type).create(n),
                  o = {
                    pk: t.id,
                    id: N(),
                    createdAgo: t.created_ago,
                    createdBy: t.created_username,
                    honeypot: t.honeypot,
                    root: a,
                  };
                return e.addCompletion(o, "list");
              },
            };
          }),
        co = v.m.model("UserStore", { pk: v.m.integer, firstName: v.m.string, lastName: v.m.string }),
        uo = v.m
          .model("SettingsModel", {
            enableHotkeys: v.m.optional(v.m.boolean, !0),
            enablePanelHotkeys: v.m.optional(v.m.boolean, !0),
            enableTooltips: v.m.optional(v.m.boolean, !0),
          })
          .actions(function(e) {
            return {
              toggleHotkeys: function() {
                (e.enableHotkeys = !e.enableHotkeys), e.enableHotkeys ? ao.setScope("main") : ao.setScope("none");
              },
              togglePanelHotkeys: function() {
                e.enablePanelHotkeys = !e.enablePanelHotkeys;
              },
              toggleTooltips: function() {
                e.enableTooltips = !e.enableTooltips;
              },
            };
          }),
        mo = v.m
          .model("AppStore", {
            config: v.m.string,
            task: v.m.maybeNull(qa),
            taskID: v.m.maybeNull(v.m.number),
            interfaces: v.m.array(v.m.string),
            completionStore: v.m.optional(so, { completions: [] }),
            projectID: v.m.integer,
            expert: co,
            debug: v.m.optional(v.m.boolean, !0),
            settings: v.m.optional(uo, {}),
            showingSettings: v.m.optional(v.m.boolean, !1),
            showingDescription: v.m.optional(v.m.boolean, !1),
            description: v.m.maybeNull(v.m.string),
            isLoading: v.m.optional(v.m.boolean, !1),
            noTask: v.m.optional(v.m.boolean, !1),
            labeledSuccess: v.m.optional(v.m.boolean, !1),
          })
          .views(function(e) {
            return {
              get fetch() {
                return Object(v.d)(e).fetch;
              },
              get alert() {
                return Object(v.d)(e).alert;
              },
              get post() {
                return Object(v.d)(e).post;
              },
            };
          })
          .actions(function(e) {
            var t = Object(v.c)(
              $a.a.mark(function t() {
                var n, a;
                return $a.a.wrap(function(t) {
                  for (;;)
                    switch ((t.prev = t.next)) {
                      case 0:
                        return (n = "/api/projects/" + e.projectID + "/expert_instruction"), (t.next = 3), e.fetch(n);
                      case 3:
                        200 === (a = t.sent).status
                          ? a.text().then(function(t) {
                              e.setDescription(t);
                            })
                          : e.setDescription("No instructions for this task"),
                          (e.showingDescription = !0);
                      case 6:
                      case "end":
                        return t.stop();
                    }
                }, t);
              }),
            );
            function n(t) {
              return e.interfaces.find(function(e) {
                return t === e;
              });
            }
            function a() {
              return e.taskID ? o("/api/tasks/" + e.taskID + "/") : o("/api/projects/" + e.projectID + "/next");
            }
            var o = Object(v.c)(
                $a.a.mark(function t(n) {
                  var a;
                  return $a.a.wrap(
                    function(t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            return (t.prev = 0), (t.next = 3), e.fetch(n);
                          case 3:
                            if (!((a = t.sent) instanceof Response && 404 === a.status)) {
                              t.next = 8;
                              break;
                            }
                            return e.markLoading(!1), (e.noTask = !0), t.abrupt("return");
                          case 8:
                            a.json().then(function(t) {
                              if (
                                ((t.data = JSON.stringify(t.data)),
                                e.addTask(t),
                                e.markLoading(!1),
                                e.hasInterface("completions") && t.completions)
                              ) {
                                e.completionStore.destroyCompletion(e.completionStore.selected);
                                for (var n = 0; n < t.completions.length; n++) {
                                  var a = t.completions[n];
                                  if (!0 !== a.was_cancelled) {
                                    var o = e.completionStore.addSavedCompletion(a);
                                    o.traverseTree(function(t) {
                                      return t.updateValue && t.updateValue(e);
                                    }),
                                      e.completionStore.selectCompletion(o.id),
                                      o.deserializeCompletion(JSON.parse(a.result)),
                                      o.reinitHistory();
                                  }
                                }
                              } else
                                e.completionStore.selected &&
                                  e.completionStore.selected.traverseTree(function(t) {
                                    return t.updateValue && t.updateValue(e);
                                  }),
                                  e.addGeneratedCompletion(t);
                            }),
                              (t.next = 14);
                            break;
                          case 11:
                            (t.prev = 11), (t.t0 = t.catch(0)), console.error("Failed to load next task ", t.t0);
                          case 14:
                          case "end":
                            return t.stop();
                        }
                    },
                    t,
                    null,
                    [[0, 11]],
                  );
                }),
              ),
              r = Object(v.c)(
                $a.a.mark(function t() {
                  return $a.a.wrap(
                    function(t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            return (
                              e.markLoading(!0),
                              (t.prev = 1),
                              (t.next = 4),
                              e.post(
                                "/api/tasks/" + e.task.id + "/cancel/",
                                JSON.stringify({ data: JSON.stringify({ error: "cancelled" }) }),
                              )
                            );
                          case 4:
                            return t.sent, e.resetState(), t.abrupt("return", a());
                          case 9:
                            (t.prev = 9), (t.t0 = t.catch(1)), console.error("Failed to skip task ", t.t0);
                          case 12:
                          case "end":
                            return t.stop();
                        }
                    },
                    t,
                    null,
                    [[1, 9]],
                  );
                }),
              ),
              i = Object(v.c)(
                $a.a.mark(function t() {
                  var o, r, i, l;
                  return $a.a.wrap(
                    function(t) {
                      for (;;)
                        switch ((t.prev = t.next)) {
                          case 0:
                            if (
                              ((o = e.completionStore.selected).beforeSend(),
                              (r = o.serializeCompletion()),
                              !e.hasInterface("submit:check-empty") || 0 !== r.length)
                            ) {
                              t.next = 6;
                              break;
                            }
                            return alert("You need to label at least something!"), t.abrupt("return");
                          case 6:
                            return (
                              e.markLoading(!0),
                              (t.prev = 7),
                              (i = Object(v.h)(o)),
                              (l = JSON.stringify({ state: JSON.stringify(i), result: JSON.stringify(r) })),
                              (t.next = 12),
                              e.post("/api/tasks/" + e.task.id + "/completions/", l)
                            );
                          case 12:
                            if (!n("submit:load")) {
                              t.next = 17;
                              break;
                            }
                            return e.resetState(), t.abrupt("return", a());
                          case 17:
                            e.markLoading(!1), (e.labeledSuccess = !0);
                          case 19:
                            delete i.history, (t.next = 25);
                            break;
                          case 22:
                            (t.prev = 22), (t.t0 = t.catch(7)), console.error("Failed to send task ", t.t0);
                          case 25:
                          case "end":
                            return t.stop();
                        }
                    },
                    t,
                    null,
                    [[7, 22]],
                  );
                }),
              );
            return {
              afterCreate: function() {
                e.task || e.loadTask(),
                  ao.addKey("ctrl+enter", e.sendTask),
                  e.hasInterface("submit:skip") && ao.addKey("ctrl+space", e.skipTask),
                  ao.addKey("ctrl+backspace", function() {
                    e.completionStore.selected.deleteAllRegions();
                  }),
                  ao.addKey("ctrl+z", function() {
                    var t = e.completionStore.selected.history;
                    t && t.canUndo && t.undo();
                  }),
                  ao.addKey("escape", function() {
                    var t = e.completionStore.selected;
                    t && t.relationMode && t.stopRelationMode();
                  }),
                  ao.addKey("backspace", function() {
                    var t = e.completionStore.selected;
                    t && t.highlightedNode && t.highlightedNode.deleteRegion();
                  });
              },
              loadTask: a,
              addTask: function(t) {
                e.task = qa.create(t);
              },
              hasInterface: n,
              skipTask: r,
              sendTask: i,
              markLoading: function(t) {
                e.isLoading = t;
              },
              resetState: function() {
                e.completionStore = so.create({ completions: [] });
                var t = e.completionStore.addInitialCompletion();
                e.completionStore.selectCompletion(t.id);
              },
              openDescription: t,
              closeDescription: function() {
                e.showingDescription = !1;
              },
              setDescription: function(t) {
                e.description = t;
              },
              toggleSettings: function() {
                e.showingSettings = !e.showingSettings;
              },
              initializeStore: function(t) {
                var n = t.completions,
                  a = [],
                  o = e.completionStore;
                if (n && n.length)
                  for (var r = 0; r < n.length; r++) {
                    var i = n[r];
                    !0 !== i.was_cancelled && i.was_generated && a.push(i);
                  }
                if (0 === o.completions.length) {
                  var l = e.completionStore.addInitialCompletion();
                  if ((e.completionStore.selectCompletion(l.id), a.length > 0)) {
                    var s = a[0].result;
                    "string" === typeof a[0].result && (s = JSON.parse(a[0].result)),
                      l.deserializeCompletion(s),
                      l.reinitHistory();
                  }
                }
              },
              addGeneratedCompletion: function(t) {
                if ("completion_result" in t && !e.hasInterface("predictions:hide")) {
                  var n = e.completionStore.selected;
                  n.deserializeCompletion(t.completion_result), n.reinitHistory();
                }
              },
            };
          });
      var po = {
        default: {
          config: '<View><Text name="txt-1" value="$text"></Text></View>',
          data: {
            text:
              "mobx-state-tree is a state container that combines the simplicity and ease of mutable data with the traceability of immutable data and the reactiveness and performance of observable data.\n      Simply put, mobx-state-tree tries to combine the best features of both immutability (transactionality, traceability and composition) and mutability (discoverability, co-location and encapsulation) based approaches to state management; everything to provide the best developer experience possible. Unlike MobX itself, mobx-state-tree is very opinionated about how data should be structured and updated. This makes it possible to solve many common problems out of the box.\n      Central in MST (mobx-state-tree) is the concept of a living tree. The tree consists of mutable, but strictly protected objects enriched with runtime type information. In other words, each tree has a shape (type information) and state (data). From this living tree, immutable, structurally shared, snapshots are automatically generated.",
          },
          task: {
            id: 402324,
            completions: [],
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
          },
        },
        gptc: {
          config:
            '<View>\n        <Text name="mytext" value="$text"></Text>\n        <Choices name="mytext_class" toName="mytext" choice="single">\n          <Choice value="important" alias="Important document"></Choice>\n          <Choice value="other" alias="Other"></Choice>\n        </Choices>\n      </View>',
          data: {
            text:
              "mobx-state-tree is a state container that combines the simplicity and ease of mutable data with the traceability of immutable data and the reactiveness and performance of observable data.\n      Simply put, mobx-state-tree tries to combine the best features of both immutability (transactionality, traceability and composition) and mutability (discoverability, co-location and encapsulation) based approaches to state management; everything to provide the best developer experience possible. Unlike MobX itself, mobx-state-tree is very opinionated about how data should be structured and updated. This makes it possible to solve many common problems out of the box.\n      Central in MST (mobx-state-tree) is the concept of a living tree. The tree consists of mutable, but strictly protected objects enriched with runtime type information. In other words, each tree has a shape (type information) and state (data). From this living tree, immutable, structurally shared, snapshots are automatically generated.",
          },
          task: {
            id: 402324,
            completions: [],
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
          },
        },
        ner: {
          config:
            '<View>\n    <Labels name="ner" toName="text">\n      <Label value="Person"></Label>\n      <Label value="Organization"></Label>\n      <Label value="Fact"></Label>\n      <Label value="Money"></Label>\n      <Label value="Date"></Label>\n      <Label value="Time"></Label>\n      <Label value="Ordinal"></Label>\n      <Label value="Percent"></Label>\n      <Label value="Product"></Label>\n      <Label value="Language"></Label>\n      <Label value="Location"></Label>\n    </Labels>\n    <Text name="text" value="$text"></Text>\n  </View>',
          data: {
            text:
              "mobx-state-tree is a state container that combines the simplicity and ease. Apple's and \ud83d\ude0bApp Store are still broken http://t.co/gIrx8G4pcC http://t.co/fwTXH2aSvC",
            texta: "To have faith is to trust yourself to the water",
          },
          task: {
            id: 402324,
            completions: [
              {
                id: 137601,
                model_version: "2019-04-10 10:52:20.591839",
                result: [
                  {
                    id: "RuJ2GrJyG8",
                    from_name: "ner",
                    to_name: "text",
                    source: "$text",
                    type: "labels",
                    value: { start: 8, end: 12, text: "faith", labels: ["Fact"] },
                  },
                ],
                score: 1,
                created_at: "2019-04-10T10:53:28.822843Z",
                updated_at: "2019-04-10T10:53:28.822851Z",
                task: 71937,
                was_generated: !0,
              },
            ],
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
          },
        },
        bbox: {
          config:
            '<View>\n        <RectangleLabels name="tag" toName="image">\n          <Label value="Cat"></Label>\n          <Label value="Dog" background="blue"></Label>\n        </RectangleLabels>\n        <Image name="image" value="$image_url"></Image>\n      </View>\n    ',
          task: {
            id: 402324,
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
            completions: [],
          },
          data: { image_url: "https://go.heartex.net/static/samples/kittens.jpg" },
        },
        image: {
          config:
            '<View> <Image name="image" value="$image_url"/> <Choices name="cats_or_dogs" toName="image">   <Choice value="Cat"></Choice>   <Choice value="Dog"></Choice> </Choices></View>',
          data: { image_url: "http://s3.amazonaws.com/heartex-private/cats_n_dogs/training_set/dogs/dog.887.jpg" },
          task: {
            id: 402324,
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            exposed: !0,
            project: 139,
            completions: [
              {
                completed_by: null,
                created_ago: "2 months",
                created_at: "2019-05-14T05:02:41.289000Z",
                created_username: "",
                honeypot: !0,
                id: 1430,
                result: '[{"type":"choices","value":{"choices":["Dog"]},"to_name":"image","from_name":"cats_or_dogs"}]',
                state: "{}",
                task: 163260,
                updated_at: "2019-05-14T05:02:41.289000Z",
                was_cancelled: !1,
                was_generated: !0,
              },
            ],
          },
        },
        cda: {
          config:
            '<View>\n    <HyperText name="dialog" value="$dialogs"></HyperText>\n    <Header value="Rate last answer:"></Header>\n    <Choices name="chc-1" choice="single-radio" toName="dialog">\n      <Choice value="Bad answer"></Choice>\n      <Choice value="Neutral answer"></Choice>\n      <Choice value="Good answer"></Choice>\n    </Choices>\n    <Header value="Your answer:"></Header>\n    <TextArea name="answer"></TextArea>\n  </View>',
          task: {},
          data: {},
        },
        dialog: {
          config:
            '<View>\n        <Header value="Select choice:"></Header>\n        <Dialog value="$dialoga" name="dial"></Dialog>\n        <Choices showInline="true" name="mytext_class" toName="dial">\n          <Choice value="important"></Choice>\n          <Choice value="other"></Choice>\n        </Choices>\n      </View>',
          task: {
            id: 402324,
            completions: [
              {
                completed_by: 55,
                created_ago: "16 hours, 57 minutes",
                created_at: "2019-07-19T17:48:15.465239Z",
                created_username: "",
                honeypot: !1,
                id: 8440,
                result:
                  '[{"type":"choices","value":{"choices":["important"]},"to_name":"dial","from_name":"mytext_class"}]',
                task: 761928,
                updated_at: "2019-07-19T17:48:15.465264Z",
                was_cancelled: !1,
                was_generated: !0,
              },
            ],
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
          },
          data: {
            dialoga: [
              { name: "Jules Winnfield", text: "Okay, so, tell me about the hash bars", id: 100 },
              { name: "Vasya", text: "So what you want to know?", date: "1 August, 2019" },
              {
                name: "Jules Winnfield",
                text: "Well, hash is legal there, right?",
                selected: !0,
                date: "1 August, 2019",
              },
              {
                name: "Vinc\u0443",
                text:
                  "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
              },
              { name: "Jules Winnfield", text: "Those are hash bars?" },
              {
                name: "Vincent Vega",
                text:
                  "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
              },
              {
                name: "Vincent Vega",
                text:
                  "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
              },
              { name: "Jules Winnfield", text: "Those are hash bars?" },
              {
                name: "Vincent Vega",
                text:
                  "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
              },
              {
                name: "Vincent Vega",
                text:
                  "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
              },
              { name: "Jules Winnfield", text: "Those are hash bars?" },
              {
                name: "Vincent Vega",
                text:
                  "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
              },
            ],
          },
        },
        audio: {
          config:
            '<View>\n        <Header value="Select label:"></Header>\n        <Labels name="label" toName="audio">\n          <Label value="Politics" background="red"></Label>\n          <Label value="Business" background="blue"></Label>\n          <Label value="Education"></Label>\n        </Labels>\n        <Header value="Select audio region:"></Header>\n        <AudioPlus name="audio" value="$url"></AudioPlus>\n      </View>',
          task: {
            id: 402324,
            completions: [
              {
                completed_by: 55,
                created_ago: "16 hours, 57 minutes",
                created_at: "2019-07-19T17:48:15.465239Z",
                created_username: "",
                honeypot: !1,
                id: 8440,
                result:
                  '[{"id":"XPxpLMifV7","from_name":"label","to_name":"audio","source":"$url","type":"labels","value":{"start":0.7047114876227649,"end":2.369030107327593,"labels":["Politics"]}},{"id":"6ycG2nV3mp","from_name":"label","to_name":"audio","source":"$url","type":"labels","value":{"start":2.6014349596287176,"end":5.982550714074112,"labels":["Business"]}}]',
                task: 761928,
                updated_at: "2019-07-19T17:48:15.465264Z",
                was_cancelled: !1,
              },
            ],
            meta: {},
            accuracy: 0,
            created_at: "2019-06-14T15:15:47.982764Z",
            updated_at: "2019-06-14T15:15:47.982771Z",
            is_labeled: !1,
            exposed: !0,
            project: 139,
          },
          data: { url: "https://s3-us-west-1.amazonaws.com/heartex-public/cello.mp3" },
        },
      };
      function go() {
        return (function(e) {
          var t = po[e].task;
          return (
            (window.T = t),
            (t = Object(O.a)({}, t, { data: JSON.stringify(po[e].data) })),
            {
              projectID: 1,
              isLoading: !1,
              config: po[e].config,
              task: t,
              taskID: 1,
              expert: { pk: 1, lastName: "Jones", firstName: "Oliver" },
              debug: -1 !== window.location.search.indexOf("debug=true"),
              interfaces: window.editorInterfaces
                ? window.editorInterfaces
                : ["basic", "completions", "submit", "panel", "side-column"],
            }
          );
        })("ner");
      }
      var fo = {
        getState: function() {
          return { completions: go().task.completions ? go().task.completions : null };
        },
        getData: go,
        rootElement: function() {
          var e = document.createElement("div"),
            t = document.getElementById("root");
          return (
            (t.innerHTML = ""),
            t.appendChild(e),
            (t.style.marginTop = "10px"),
            (t.style.marginBottom = "10px"),
            (t.style.marginLeft = "10px"),
            (t.style.marginRight = "10px"),
            e
          );
        },
      };
      fo = {
        getData: function() {
          window.taskData && (window.taskData.data = JSON.stringify(window.taskData.data));
          var e = {
            projectID: window.projectID,
            isLoading: !1,
            config: window.editorAppConfig,
            taskID: window.taskID,
            expert: window.expertData,
            debug: window.debugEditor,
            interfaces: window.editorInterfaces ? window.editorInterfaces : ["basic", "completions"],
          };
          return (
            window.preRender && (e.task = window.taskData),
            window.explore
              ? (e.interfaces = window.editorInterfaces ? window.editorInterfaces : ["basic", "completions"])
              : (e.interfaces = window.editorInterfaces
                  ? window.editorInterfaces
                  : ["basic", "submit", "submit:skip", "submit:submit"]),
            e
          );
        },
        getState: function() {
          return { completions: window.taskData && window.taskData.completions ? window.taskData.completions : null };
        },
        rootElement: function() {
          var e = document.createElement("div"),
            t = document.getElementById("root");
          return (t.innerHTML = ""), t.appendChild(e), e;
        },
      };
      var ho = mo.create(fo.getData(), {
        fetch: _.fetcher,
        patch: _.patch,
        post: _.poster,
        remove: _.remover,
        alert: function(e) {
          return console.log(e);
        },
      });
      ho.initializeStore(fo.getState()),
        (window.Htx = ho),
        c.a.render(l.a.createElement(u.a, { store: ho }, l.a.createElement(Ka, null)), fo.rootElement()),
        "serviceWorker" in navigator &&
          navigator.serviceWorker.ready.then(function(e) {
            e.unregister();
          });
    },
    74: function(e, t, n) {
      e.exports = {
        block: "Entity_block__3ckIB",
        button: "Entity_button__W4DcF",
        labels: "Entity_labels__1Ldoe",
        tag: "Entity_tag__3VRfN",
      };
    },
    86: function(e, t, n) {
      e.exports = {
        skip: "Controls_skip__1Km2f",
        task: "Controls_task__3a2SA",
        container: "Controls_container__2OOQz",
        block: "Controls_block__3VbK-",
        wrapper: "Controls_wrapper__3Yptx",
      };
    },
    87: function(e, t, n) {
      e.exports = {
        block: "Dialog_block__3oOBf",
        block_selected: "Dialog_block_selected__2Do_t",
        name: "Dialog_name__1MoM3",
        tag: "Dialog_tag__3NOpX",
        date: "Dialog_date__28pt2",
      };
    },
  },
  [[321, 2, 1]],
]);
//# sourceMappingURL=main.416cb8b7.chunk.js.map
