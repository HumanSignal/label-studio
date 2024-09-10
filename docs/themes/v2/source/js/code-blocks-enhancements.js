var iframeTimer = null;

  function editor_iframe(res, modal, full, id) {
    // generate new iframe
    var iframeTemplate = `<iframe onclick="event.stopPropagation()" id="render-editor-${id}" class="api-render-editor" style="display: none"></iframe>`;

    modal.insertAdjacentHTML("beforeend", iframeTemplate)

    const iframe = document.querySelector(`#render-editor-${id}`);
    const spinner = modal.querySelector(".render-editor-loader");

    if (full) {
      iframe.style.width = window.innerWidth * 0.9 + "px"
    }

    iframe.addEventListener("load", function() {
      if(spinner) spinner.style.display = "none";
      iframe.style.display = "block";

      clearTimeout(iframeTimer);

      iframeTimer = setInterval(function () {
        if (iframe.contentWindow) {
          const height = iframe.contentWindow.document.querySelector("#label-studio div[class^='App_editor'], #label-studio div[class*='App_editor']").offsetHeight;

          iframe.style.height = height + 'px';

        }
      }, 200);

    })

    // load new data into iframe
    iframe.setAttribute('srcdoc', res);
  }
  
function show_render_editor(config) {
  var id = "id" + Math.random().toString(16).slice(2);
  const body = document.querySelector("body");
  const modalTemplate = `
  <div id="preview-wrapper-${id}" class="api-preview-wrapper" onclick="this.remove()">
    <div class="render-editor-loader"><img width="50px" src="/images/design/loading.gif"></div>
  </div>
  `
  body.insertAdjacentHTML("beforeend", modalTemplate)

  const modal = document.querySelector(`#preview-wrapper-${id}`);

  insert_render_editor(config, modal, true, id);
}

function insert_render_editor(config, modal, full, id) {
  let url = "https://app.heartex.ai/demo/render-editor?playground=1&open_preview=1";
  if (full) {
    url += '&full_editor=t';
  }

  // The API expects formData - not JSON
  const formData = new FormData();
  formData.append("config", config);
  formData.append("edit_count", 0)

  fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  .then((response) => response.text())
  .then((data) => {
    editor_iframe(data, modal, full, id)
  })
  .catch((error) => {
    console.log(error);
    console.log("=> Can't load preview, demo server error");
  });
}


(function() {

  const codeBlocks = document.querySelectorAll('code[class*="hljs"]');

  const handleCopy = (event) => {

    event.preventDefault();

    const CheckIcon = event.currentTarget.querySelector(".code-block-copy-check-icon");
    const CopyIcon = event.currentTarget.querySelector(".code-block-copy-copy-icon");

    const text = event.currentTarget.nextElementSibling.textContent;

    navigator.clipboard.writeText(text).then(() => {
      CopyIcon.style.display = "none"
      CheckIcon.style.display = "block";
      
      // Hide after 3 seconds
      setTimeout(() => {
        CopyIcon.style.display = "block"
        CheckIcon.style.display = "none";
      }, 3000)
    });
  }
  
  const addCopyCodeButton = (codeBlock, language) => {
    var pre = codeBlock.parentElement;
    var htmlTemplate = `
      <button class="code-block-copy-button" arial-label="Copy ${language} code">
        ${language}
        <svg viewBox="0 0 24 24" width="24" height="24" class="code-block-copy-copy-icon"><path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"></path></svg>
        <svg viewBox="0 0 24 24" width="24" height="24" class="code-block-copy-check-icon"><path fill="currentColor" d="m9 20.42-6.21-6.21 2.83-2.83L9 14.77l9.88-9.89 2.83 2.83L9 20.42z"></path></svg>
      </button>`;

    pre.insertAdjacentHTML("afterBegin", htmlTemplate);

    const button = pre.querySelector(".code-block-copy-button");
    button.addEventListener("click", handleCopy);
  }

  const addPlaygroundButtons = (codeBlock) => {
    var pre = codeBlock.parentElement;
    const code = codeBlock.textContent;
    const htmlTemplate = `
    <div class="playground-buttons">
      <button class="code-block-open-preview">Open Preview</button>
      <a href="/playground?config=${encodeURIComponent(code)}" target="_blank" rel="noreferrer noopener">Launch in Playground</a>
    </div>
    `
    pre.insertAdjacentHTML("beforeend", htmlTemplate);

    const openPreviewButton = pre.querySelector(".code-block-open-preview");
    openPreviewButton.addEventListener("click", () => show_render_editor(code))

    const inlinePlayground = document.querySelector("#main-preview");

    if(inlinePlayground) insert_render_editor(code, inlinePlayground);
  }

  const enhanceCodeBlocks = (codeBlock) => {
    const language = codeBlock.classList[1];

    if(language === "html") addPlaygroundButtons(codeBlock);

    addCopyCodeButton(codeBlock, language);
  }

  codeBlocks.forEach(block => enhanceCodeBlocks(block));

})();
