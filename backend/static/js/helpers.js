// replace all
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

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