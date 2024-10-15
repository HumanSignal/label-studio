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
