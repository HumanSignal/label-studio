// replace all
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};

function IsJsonString(str) {
  if (typeof str !== "string") return false;

  try {
    let json = JSON.parse(str);
    return typeof json === "object";
  } catch (e) {
    return false;
  }
}

// Extract message from response to print it
function message_from_response(result) {
  console.log(result);

  // result is dict
  if (result.hasOwnProperty("detail") && result.detail) return result.detail;

  // result is object from XHR, check responseText first, it is always presented
  if (!result.responseText) return "Critical error on server";
  // grab responseJSON detail
  else if (result.responseJSON && result.responseJSON.hasOwnProperty("detail")) {
    return result.responseJSON["detail"];
  }
  // something strange inside of responseJSON
  else if (result.hasOwnProperty('responseJSON'))
    return JSON.stringify(result.responseJSON);
  else {
    return 'Critical error on the server side'
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

    error: function(result, textStatus, errorThrown) {
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

    success: function(data, textStatus, result) {
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

// update arguments without page reload
function refreshHistoryArg(key, value) {
  window.history.pushState({key: value}, '', setUrlArg(key, value));
}

// map form to dict of key & values
function getFormData($form){
    var unindexed_array = $form.serializeArray();
    var indexed_array = {};

    $.map(unindexed_array, function(n, i){
        indexed_array[n['name']] = n['value'];
    });

    return indexed_array;
}