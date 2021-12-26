/* This script makes tabs for <div class="code-tabs"> <div data-name="First"> </div> </div>.
Example code for .md file:

<div class="code-tabs">
  <div data-name="First">

  It's a test It's a test It's a test
  It's a test
  It's a test

  It's a test

```bash
Test 1!
Test 1!
Test 1!
```
  </div>

  <div data-name="Second">
    ```bash
    Test 2!
    Test 2!
    Test 2!
    Test 2!
    Test 2!
    Test 2!
    Test 2!
    Test 2!Test 2!
    Test 2!
    Test 2!
    ```
  </div>
</div>
 */


function openCodeTab(id, event) {
  const tabObj = $('#' + id);
  const anchorObj = $('#' + id + '-anchor');

  // hide all tabs
  const divs = tabObj.siblings('[data-name]:not([data-name=""])');
  divs.hide();

  // show only selected tab
  tabObj.show();

  // un-activate all <a>
  const anchors = anchorObj.siblings();
  anchors.removeClass('active');

  // make anchor active
  anchorObj.addClass('active');

  if (event) {
    event.preventDefault();
    event.stopPropagation();
    //window.location.hash = id;
  }
}

$(function() {
  $('.code-tabs').each(function (o1, codeTab) {

    // make buttons with buttons
    var buttons = '<div class="close-tabs buttons">';
    $(codeTab).children('div').each(function (o2, tab) {
      const name = $(tab).data('name');
      const id = 'code-tab-' + o1 + '-' + o2;
      $(tab).attr('id', id);
      buttons += '<a ' +
            'id="'+ id +'-anchor" ' +
            'onclick="openCodeTab(\'' + id + '\', event)" ' +
            'href="#' + id + '-anchor">' +
            name +
          '</a>';
    });
    buttons += '</div>';
    $(codeTab).prepend(buttons);

    openCodeTab('code-tab-' + o1 + '-0', null);
  });
});
