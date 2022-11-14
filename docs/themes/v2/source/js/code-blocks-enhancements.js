var iframeTimer = null;

  function editor_iframe(res, modal, full) {
    // generate new iframe
    var iframeTemplate = `<iframe onclick="event.stopPropagation()" id="render-editor" style="display: none"></iframe>`;

    /* if (full) {
      iframe.css('width', $(window).width() * 0.9);
    } */


    modal.insertAdjacentHTML("afterbegin", iframeTemplate)

    const iframe = document.querySelector("#render-editor");
    const spinner = document.querySelector("#render-editor-loader");

    iframe.addEventListener("load", function() {
      spinner.style.display === "none";
      iframe.style.display === "block";

      var obj = document.getElementById('render-editor');
      clearTimeout(iframeTimer);

      iframeTimer = setInterval(function () {
        if (obj.contentWindow) {
          // fix editor height
          obj.style.height = (obj.contentWindow.document.body.scrollHeight) + 'px';

          // fix editor width
          let app_editor = obj.contentDocument.body.querySelector('div[class*="App_editor"]').style;
          //app_editor.setProperty('min-width', '100%', 'important');
          obj.contentDocument.body.querySelector('div[class*="Segment_block"]').style.margin='0';
        }
      }, 200);
    })

    // load new data into iframe
    iframe.setAttribute('srcdoc', res);
  }
  
function show_render_editor(config) {
  const body = document.querySelector("body");
  const modal = `
  <div id="preview-wrapper">
    <div id="render-editor-loader"><img width="50px" src="/images/loading.gif"></div>
  </div>
  `
  body.insertAdjacentHTML("beforeend", modal)

  insert_render_editor(config, modal, true);
}

function insert_render_editor(config, modal, full) {
  let url = "https://app.heartex.ai/demo/render-editor?playground=1&open_preview=1";
  if (full) {
    url += '&full_editor=t';
  }

  fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      config: config,
      edit_count: 0
    }),
  })
  .then((response) => {
    editor_iframe(response, modal, full)
  })
  .catch(() => {
    console.log("=> Can't load preview, demo server error");
  });
}


(function() {

  const codeBlocks = document.querySelectorAll('code[class*="hljs"]');

  const handleCopy = (event) => {

    event.preventDefault();

    const CheckIcon = event.currentTarget.querySelector(".code-block-copy-check-icon");
    const CopyIcon = event.currentTarget.querySelector(".code-block-copy-copy-icon");

    const text = event.target.nextElementSibling.textContent;

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
      <a href="/playground?config=${encodeURI(code)}" target="_blank" rel="noreferrer noopener">Launch in Playground</a>
    </div>
    `
    pre.insertAdjacentHTML("beforeend", htmlTemplate);

    const openPreviewButton = pre.querySelector(".code-block-open-preview");
    openPreviewButton.addEventListener("click", () => show_render_editor(code))
  }

  const enhanceCodeBlocks = (codeBlock) => {
    const language = codeBlock.classList[1];

    if(language === "html") addPlaygroundButtons(codeBlock);

    addCopyCodeButton(codeBlock, language);
  }

  codeBlocks.forEach(block => enhanceCodeBlocks(block));

})();

