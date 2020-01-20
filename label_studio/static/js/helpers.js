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
