// Common
function url_exists(url) {
  /*var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;*/
  var result = false;
  $.ajax({
    url: url,
    type: 'HEAD',
    async: false,
    success: function () {
      result = true;
    }
  });
  return result;
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
  const deleteRegex = new RegExp(key + '(=|&|$)');

  const split_url = url.split('?');
  const params = split_url.slice(1).join('').split('&');
  let search = [];
  for (let i = 0; i < params.length; i++) {
    if (deleteRegex.test(params[i]) === false && params[i]) {
      search.push(params[i]);
    }
  }

  return split_url[0] + (search.length ? '?' + search.join('&') : '') + location.hash;
}

function togglePageArg(name) {
  let url = window.location.href;
  let result = popUrlArg(name);
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

// load js module
function require_file(path) {
  var r = null;
  $.ajax({
    url: path,
    success: function (d) {
      r = d;
    },
    async: false
  });
  return r;
}

// replace all
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

// CSRF
function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

// Apply CSRF token
function applyCsrf() {
  var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
  $.ajaxSetup({
    beforeSend: function (xhr, settings) {
      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });
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

// submit file
function submit_files(url, method, onSuccess) {
  const fd = new FormData;
  const obj = event.target;
  for (let i = 0; i < obj.files.length; i++) {
      const f = obj.files[i];
      fd.append(f.name, f);
  }

  $.ajax({
      url: url,
      type: method,
      dataType: "JSON",
      data: fd,
      processData: false,
      contentType: false,
      success: function (data, status)
      {
        if (onSuccess instanceof Function) {
          onSuccess(data, status)
        } else {
          window.location.reload();
        }
      },
      error: function (xhr, response, err)
      {
        const msg = message_from_response(xhr);
        alert('Error: ' + msg);
        console.log(xhr, response, err);
        window.location.reload();
      }
  });
}

// Take closest form (or form by id) and submit it,
// optional: prevent page refresh if done passed as function
function smart_submit(done, form_id) {
  // use form id or take closest form to the event target
  var f = typeof form_id === 'string' ? $(form_id) : $(event.target).closest('form');
  console.log('smart_submit found form to use', f);

  if (typeof f === 'undefined') {
    console.log('smart_submit event target', event.target);
    alert("Closest form not found for smart_submit")
  }
  console.log('YYYYYYY' +  $(f).serialize());
  var params = {
    url: $(f).attr('action'),
    type: $(f).attr('method'),
    data: $(f).serialize(),

    error: function (result, textStatus, errorThrown) {
      console.log('smart_submit ajax error', result);

      // call done function if it's defined and ignore all the rest
      if (typeof done === "function") {
        done(result)
      }
      // default error handle
      else {
        if (typeof result.responseText !== 'undefined') {
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
        done(result)
      }
      // default success handle
      else {
        window.location.reload();
      }
    }
  };

  console.log('smart_submit ajax params', params);
  $.ajax(params);
  event.preventDefault();
  return false;
}

/* --- Plots --- */
function hslToRgb($h, $s, $l) {
  var r, g, b;

  if ($s === 0) {
    $r = $g = $b = $l;
  } else {
    if ($l < 0.5) {
      $q = $l * (1 + $s);
    } else {
      $q = $l + $s - $l * $s;
    }
    $p = 2 * $l - $q;
    $r = hue2rgb($p, $q, $h + 1 / 3);
    $g = hue2rgb($p, $q, $h);
    $b = hue2rgb($p, $q, $h - 1 / 3);
  }

  return [Math.floor($r * 255), Math.floor($g * 255), Math.floor($b * 255)];
}

function hue2rgb($p, $q, $t) {
  if ($t < 0) {
    $t++;
  }
  if ($t > 1) {
    $t--;
  }
  if ($t < 1 / 6) {
    return $p + ($q - $p) * 6 * $t;
  }
  if ($t < 1 / 2) {
    return $q;
  }
  if ($t < 2 / 3) {
    return $p + ($q - $p) * (2 / 3 - $t) * 6;
  }
  return $p;
}

function numberToColorHsl($i, $min, $max) {
  $ratio = $i;

  if ($min > 0 || $max < 1) {
    if ($i < $min) {
      $ratio = 0;
    } else if ($i > $max) {
      $ratio = 1;
    } else {
      $range = $max - $min;
      $ratio = ($i - $min) / $range;
    }
  }
  $hue = $ratio * 1.2 / 3.60;
  $rgb = hslToRgb($hue, 1, .5);
  return 'rgb(' + $rgb[0] + ',' + $rgb[1] + ',' + $rgb[2] + ')';
}

function collab_matrix_build(elem_id) {

  var $tbody = $('#table-body');
  var $thead = $('#table-head');

  $('.measure').each(function () {
    var $m = $(this);
    var x = $m.data('x');
    var y = $m.data('y') + 1;
    var $tr = $($tbody.find('tr')[x]);
    var $td = $($tr.find('td')[y]);

    var $htr = $($thead.find('th')[y]);

    $m.on('mouseover', function () {
      $td.css("background", "#f1f1f1");
      $tr.find('td').first().css("font-weight", "bold !important");
      $htr.css("font-weight", "bold!important");
      console.log($td, $tr, $htr);
    });

    $m.on('mouseleave', function () {
      $td.css("background", "transparent");
      $tr.find('td').first().css("font-weight", "normal");
      $htr.css("font-weight", "normal");
    });

    $m.mouseleave();
  });

  var heatmap = $(elem_id).find("[data-heatmap]");

  heatmap.map(function (ind, cur) {
    var value = cur.dataset.heatmap;
    var heatmapCell = $(cur.children);
    if (value !== 'nan') {
      heatmapCell.css('background', numberToColorHsl(value));
      heatmapCell.html((Number.parseFloat(value) * 100).toFixed(2) + '%')
    } else {
      heatmapCell.attr('data-tooltip', "There are no intersections among annotators' jobs");
      heatmapCell.html('<i class="icon ban"></i>');
    }
    cur = heatmapCell;
  })
}

function message_from_response(result) {
  console.log(result);

  // result is dict
  if (result.hasOwnProperty('detail') && result.detail)
    return result.detail;

  // result is object from XHR, check responseText first, it is always presented
  if (!result.responseText)
    return 'Critical error on server';

  // grab responseJSON detail
  else if (result.responseJSON && result.responseJSON.hasOwnProperty('detail'))
    return result.responseJSON['detail'];

  // something strange inside of responseJSON
  else if (result.responseJSON)
    return JSON.stringify(result.responseJSON);

  else
    return JSON.stringify(result)
}

// Detect resize of any element
function ResizeSensor(element, callback) {
  let zIndex = parseInt(getComputedStyle(element));
  if (isNaN(zIndex)) {
    zIndex = 0;
  }
  ;
  zIndex--;

  let expand = document.createElement('div');
  expand.style.position = "absolute";
  expand.style.left = "0px";
  expand.style.top = "0px";
  expand.style.right = "0px";
  expand.style.bottom = "0px";
  expand.style.overflow = "hidden";
  expand.style.zIndex = zIndex;
  expand.style.visibility = "hidden";

  let expandChild = document.createElement('div');
  expandChild.style.position = "absolute";
  expandChild.style.left = "0px";
  expandChild.style.top = "0px";
  expandChild.style.width = "10000000px";
  expandChild.style.height = "10000000px";
  expand.appendChild(expandChild);

  let shrink = document.createElement('div');
  shrink.style.position = "absolute";
  shrink.style.left = "0px";
  shrink.style.top = "0px";
  shrink.style.right = "0px";
  shrink.style.bottom = "0px";
  shrink.style.overflow = "hidden";
  shrink.style.zIndex = zIndex;
  shrink.style.visibility = "hidden";

  let shrinkChild = document.createElement('div');
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

  let size = element.getBoundingClientRect();

  let currentWidth = size.width;
  let currentHeight = size.height;

  let onScroll = function () {
    let size = element.getBoundingClientRect();

    let newWidth = size.width;
    let newHeight = size.height;

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

function IsJsonString(str) {
  if (typeof str !== 'string')
    return false;

  try {
    let json = JSON.parse(str);
    return typeof json === 'object';
  } catch (e) {
    return false;
  }
}

// smart form submit with page arguments saving
function form_submit() {
  let url = window.location.href;
  let form = $(event.target).closest('form');
  let data = $(form).serializeArray();
  data.forEach((item) => {
    url = setUrlArg(item.name, item.value, url);
  });
  window.location = url;
}

(function($){
    $.fn.serializeObject = function () {
	"use strict";

	var result = {};
	var extend = function (i, element) {
	    var node = result[element.name];

	    // If node with same name exists already, need to convert it to an array as it
	    // is a multi-value field (i.e., checkboxes)

	    if ('undefined' !== typeof node && node !== null) {
		if ($.isArray(node)) {
		    node.push(element.value);
		} else {
		    result[element.name] = [node, element.value];
		}
	    } else {
		result[element.name] = element.value;
	    }
	};

	$.each(this.serializeArray(), extend);
	return result;
    };
})(jQuery);
