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
  const tabObj = document.querySelector(`${'#' + id}`);
  const anchorObj = document.querySelector(`${'#' + id + '-anchor'}`);

  // hide all tabs
  const divs = tabObj.parentNode.querySelectorAll("[data-name]")
  divs.forEach(div => div.style.display = 'none')

  // show only selected tab
  tabObj.style.display = 'block';

  // un-activate all <a>
  const anchors = [...anchorObj.parentNode.children].filter((child) => child !== anchorObj);
  anchors.forEach(anchor => anchor.classList.remove('active'))

  // make anchor active
  anchorObj.classList.add('active');

  if (event) {
    event.preventDefault();
    event.stopPropagation();
    //window.location.hash = id;
  }
}

(function() {

  const tabs = document.querySelectorAll('.code-tabs');

  tabs.forEach(function (codeTab, o1) {

    var buttons = '<div class="close-tabs buttons">';
    const panels = codeTab.querySelectorAll("[data-name]");
    panels.forEach(function (tab, o2) {
      const name = tab.dataset.name;
      const id = 'code-tab-' + o1 + '-' + o2;

      tab.setAttribute("id", id);

      buttons += '<a ' +
              'id="'+ id +'-anchor" ' +
              'class="Heading XXSmall"' +
              'onclick="openCodeTab(\'' + id + '\', event)" ' +
              'href="#' + id + '-anchor">' +
              name +
            '</a>';
    })

    buttons += '</div>';

    codeTab.insertAdjacentHTML("afterBegin", buttons);

    openCodeTab('code-tab-' + o1 + '-0', null);
  })


})();

