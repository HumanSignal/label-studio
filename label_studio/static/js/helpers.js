// replace all
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function IsJsonString(str) {
    if (typeof str !== "string") return false;

    try {
        var json = JSON.parse(str);
        return typeof json === "object";
    } catch (e) {
        return false;
    }
}

// Extract message from response to print it
function message_from_response(result) {
    console.log('message_from_response', result);

    // result is dict
    if (result.hasOwnProperty("detail") && result.detail) return result.detail;

    // result is object from XHR, check responseText first, it is always presented
    if (!result.responseText) return "Critical error on server";
    // grab responseJSON detail
    else if (result.responseJSON && result.responseJSON.hasOwnProperty("detail")) {
        return result.responseJSON["detail"];
    }
    // something strange inside of responseJSON
    else if (result.hasOwnProperty('responseJSON')) {
        return JSON.stringify(result.responseJSON);
    }
    else if (result.responseText) {
        return result.responseText;
    }
    else {
        return 'Critical error on the server side';
    }
}

// Take closest form (or form by id) and submit it,
// optional: prevent page refresh if done passed as function
function smart_submit(done, form_id) {
    // use form id or take closest form to the event target
    var f = typeof form_id === "string" ? $(form_id) : $(event.target).closest("form");
    console.log("smart_submit found form to use", f);

    if (typeof f === "undefined") {
        console.log("smart_submit event target", event.target);
        alert("Closest form not found for smart_submit");
    }

    var params = {
        url: $(f).attr("action"),
        type: $(f).attr("method"),
        data: $(f).serialize(),

        error: function (result, textStatus, errorThrown) {
            console.log("smart_submit ajax error", result);

            // call done function if it's defined and ignore all the rest
            if (typeof done === "function") {
                done(result);
            }
            // default error handle
            else {
                if (typeof result.responseText !== "undefined") {
                    alert("Error: " + message_from_response(result));
                } else {
                    alert("Request error: " + errorThrown);
                }
                window.location.reload();
            }
        },

        success: function (data, textStatus, result) {
            // call done function if it's defined and ignore all the rest
            if (typeof done === "function") {
                done(result);
            }
            // default success handle
            else {
                window.location.reload();
            }
        },
    };

    console.log("smart_submit ajax params", params);
    $.ajax(params);
    event.preventDefault();
    return false;
}

// get request arg param
function getUrlArg(name, def, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return def;
    if (!results[2]) return def;
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// set request arg param
function setUrlArg(key, value, url) {
    if (!url) url = window.location.href;
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
        hash;

    if (re.test(url)) {
        if (typeof value !== 'undefined' && value !== null)
            return url.replace(re, '$1' + key + "=" + value + '$2$3');
        else {
            hash = url.split('#');
            url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
            if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                url += '#' + hash[1];
            return url;
        }
    } else {
        if (typeof value !== 'undefined' && value !== null) {
            var separator = url.indexOf('?') !== -1 ? '&' : '?';
            hash = url.split('#');
            url = hash[0] + separator + key + '=' + value;
            if (typeof hash[1] !== 'undefined' && hash[1] !== null)
                url += '#' + hash[1];
            return url;
        } else
            return url;
    }
}

// set request arg param
function popUrlArg(key, url) {
    if (!url) url = window.location.href;
    var deleteRegex = new RegExp(key + '(=|&|$)');

    var split_url = url.split('?');
    var params = split_url.slice(1).join('').split('&');
    var search = [];
    for (var i = 0; i < params.length; i++) {
        if (deleteRegex.test(params[i]) === false && params[i]) {
            search.push(params[i]);
        }
    }

    return split_url[0] + (search.length ? '?' + search.join('&') : '') + location.hash;
}

function togglePageArg(name) {
    var url = window.location.href;
    var result = popUrlArg(name);
    if (result === url) {
        window.location = setUrlArg(name, 'true', url)
    } else {
        window.location = result;
    }
}

// update arguments and reload page
function refreshPageArg(key, value) {
    window.location = setUrlArg(key, value);
}

// update arguments without page reload
function refreshHistoryArg(key, value) {
    window.history.pushState({key: value}, '', setUrlArg(key, value));
}

// map form to dict of key & values
function getFormData($form) {
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function (n, i) {
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}

// set nested dict fields by path with dots
function setValue(obj, path, value) {
    var root = obj;
    var parts = path.split('.');
    while (parts.length > 1 && obj.hasOwnProperty(parts[0])) {
        obj = obj[parts.shift()]
    }
    // fully replace
    if (Array.isArray(value)) {
        root.$set(obj, parts[0], value)
    }
    // assign only existing fields
    else {
        value = Object.assign(obj[parts[0]], value);
        root.$set(obj, parts[0], value);
    }
}

function capitalizeFirstLetter(string) {
    return string[0].toUpperCase() + string.slice(1);
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// string includes polyfill support for old browsers
if (!String.prototype.includes) {
    String.prototype.includes = function() {
        'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}

// copy to clipboard
var copyToClipboard = function (str) {
  var el = document.createElement('textarea');  // Create a <textarea> element
  el.value = str;                                 // Set its value to the string that you want copied
  el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
  el.style.position = 'absolute';
  el.style.left = '-9999px';                      // Move outside the screen to make it invisible
  document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
  var selected =
    document.getSelection().rangeCount > 0        // Check if there is any content selected previously
      ? document.getSelection().getRangeAt(0)     // Store selection if found
      : false;                                    // Mark as false to know no selection existed before
  el.select();                                    // Select the <textarea> content
  document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el);                  // Remove the <textarea> element
  if (selected) {                                 // If a selection existed before copying
    document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
    document.getSelection().addRange(selected);   // Restore the original selection
  }
};

var width_mapping = {
    0: "hidden",
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen"
};

// Detect resize of any element
function ResizeSensor(element, callback) {
  var zIndex = parseInt(getComputedStyle(element));
  if (isNaN(zIndex)) {
    zIndex = 0;
  }
  ;
  zIndex--;

  var expand = document.createElement('div');
  expand.style.position = "absolute";
  expand.style.left = "0px";
  expand.style.top = "0px";
  expand.style.right = "0px";
  expand.style.bottom = "0px";
  expand.style.overflow = "hidden";
  expand.style.zIndex = zIndex;
  expand.style.visibility = "hidden";

  var expandChild = document.createElement('div');
  expandChild.style.position = "absolute";
  expandChild.style.left = "0px";
  expandChild.style.top = "0px";
  expandChild.style.width = "10000000px";
  expandChild.style.height = "10000000px";
  expand.appendChild(expandChild);

  var shrink = document.createElement('div');
  shrink.style.position = "absolute";
  shrink.style.left = "0px";
  shrink.style.top = "0px";
  shrink.style.right = "0px";
  shrink.style.bottom = "0px";
  shrink.style.overflow = "hidden";
  shrink.style.zIndex = zIndex;
  shrink.style.visibility = "hidden";

  var shrinkChild = document.createElement('div');
  shrinkChild.style.position = "absolute";
  shrinkChild.style.left = "0px";
  shrinkChild.style.top = "0px";
  shrinkChild.style.width = "200%";
  shrinkChild.style.height = "200%";
  shrink.appendChild(shrinkChild);

  element.appendChild(expand);
  element.appendChild(shrink);

  function setScroll() {
    expand.scrollLeft = 10000000;
    expand.scrollTop = 10000000;

    shrink.scrollLeft = 10000000;
    shrink.scrollTop = 10000000;
  }
  setScroll();

  var size = element.getBoundingClientRect();

  var currentWidth = size.width;
  var currentHeight = size.height;

  var onScroll = function () {
    var size = element.getBoundingClientRect();

    var newWidth = size.width;
    var newHeight = size.height;

    if (newWidth != currentWidth || newHeight != currentHeight) {
      currentWidth = newWidth;
      currentHeight = newHeight;

      callback();
    }

    setScroll();
  };

  expand.addEventListener('scroll', onScroll);
  shrink.addEventListener('scroll', onScroll);
}

function capitalize (string) {
  return [].map.call(string, function(char, i) {
    i ? char : char.toUpperCase()
  }).join('')
}