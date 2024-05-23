// Set the default state for sections on page load
const is_collapsed = true;

// Inject styles programmatically
const style = document.createElement("style");
style.textContent = `
.collapsible-content {
  display: ${is_collapsed ? "none" : "block"};
}
.collapsible-header {
  cursor: pointer;
  position: relative;
}
.toc button {
  margin-top: 1.5em;
  border-radius: 5px;
  background: none;
  border: 1px solid #aaa;
  outline: none;
  box-shadow: none;
  cursor: pointer;
  padding: 3px 10px;
}
.toc button:hover {
  color: var(--color-yellow-120);
}
.onprem-highlight {
  display: block!important;
  font-weight: 400;
  margin: 1em 0 0 0;
  font-size: 1rem;
}
`;

document.head.appendChild(style);

function onDOMReady() {
  const headers = document.querySelectorAll(".content-markdown h2");
  const toggleButtons = document.querySelectorAll(".release-note-toggle");

  // Process each h2 header
  headers.forEach((header) => {
    const expandedByDefault = header.classList.contains("expanded-by-default");
    const initialState = expandedByDefault
      ? "expanded"
      : is_collapsed
      ? "collapsed"
      : "expanded";

    header.classList.add("collapsible-header", initialState);

    let content = header.nextElementSibling;
    let nextHeader = getNextHeaderOrSibling(header);

    // Set initial state for content elements
    while (content && content !== nextHeader) {
      content.classList.add("collapsible-content");
      content.style.display = initialState === "expanded" ? "block" : "none";
      content = content.nextElementSibling;
    }

    // Attach click event listener to toggle content display
    header.addEventListener("click", () => {
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        toggleCollapse(header, sibling);
        sibling = sibling.nextElementSibling;
      }
    });
  });

  toggleButtons.forEach((button) =>
    button.addEventListener("click", (e) => {
      let header = e.target.parentElement.querySelector("h2");
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        toggleCollapse(header, sibling);
        sibling = sibling.nextElementSibling;
      }
    })
  );

  // Process hash links
  if (location.hash) {
    const header = document.querySelector(location.hash);
    if (header.tagName === "H2") {
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        openCollapse(header, sibling);
        sibling = sibling.nextElementSibling;
      }
    } else {
      let previousHeader = getPreviousSibling(header, "h2");
      if (previousHeader) {
        let sibling = previousHeader.nextElementSibling;
        let nextSibling = getNextHeaderOrSibling(previousHeader);
        while (sibling && sibling !== nextSibling) {
          openCollapse(previousHeader, sibling);
          sibling = sibling.nextElementSibling;
        }
      }
    }
  }

  window.addEventListener("hashchange", () => {
    const header = document.querySelector(location.hash);
    if (header.tagName === "H2") {
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        openCollapse(header, sibling);
        sibling = sibling.nextElementSibling;
      }
    }
  });

  // Create and configure Collapse/Expand button
  const collapseExpandBtn = document.createElement("button");
  collapseExpandBtn.textContent = is_collapsed ? "Expand All" : "Collapse All";
  const toc = document.querySelector(".content-grid .toc");
  toc?.appendChild(collapseExpandBtn);
  let allExpanded = !is_collapsed;
  collapseExpandBtn.addEventListener("click", () => {
    if (allExpanded) {
      collapseExpandBtn.textContent = "Expand All";
    } else {
      collapseExpandBtn.textContent = "Collapse All";
    }
    allExpanded = !allExpanded;

    // Toggle content display based on button state
    headers.forEach((header) => {
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        if (allExpanded) {
          sibling.style.display = "block";
          header.classList.remove("collapsed");
          header.classList.add("expanded");
        } else {
          sibling.style.display = "none";
          header.classList.remove("expanded");
          header.classList.add("collapsed");
        }
        sibling = sibling.nextElementSibling;
      }
    });
  });

  expandSpecificSectionByDefault();
} // onDOMReady

function openCollapse(header, content) {
  content.style.display = "block";
  header.classList.remove("collapsed");
  header.classList.add("expanded");
}

// Toggle content display and header state
function toggleCollapse(header, content) {
  if (content.style.display === "none") {
    content.style.display = "block";
    header.classList.remove("collapsed");
    header.classList.add("expanded");
  } else {
    content.style.display = "none";
    header.classList.remove("expanded");
    header.classList.add("collapsed");
  }
}

// Get the next h2 header or sibling element
function getNextHeaderOrSibling(element) {
  while (
    element.nextElementSibling &&
    element.nextElementSibling.tagName !== "H2"
  ) {
    element = element.nextElementSibling;
  }
  return element.nextElementSibling;
}

function getPreviousSibling(elem, selector) {
  // Get the next sibling element
  var sibling = elem.previousElementSibling;

  // If there's no selector, return the first sibling
  if (!selector) return sibling;

  // If the sibling matches our selector, use it
  // If not, jump to the next sibling and continue the loop
  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.previousElementSibling;
  }
}

// Expand the second section (with the first release)
function expandSpecificSectionByDefault() {
  // Select the first h2 element and add the "expanded-by-default" class
  const header = document.querySelector(".content-markdown h2:nth-of-type(2)");
  if (header) {
    if (header.tagName === "H2") {
      let sibling = header.nextElementSibling;
      let nextSibling = getNextHeaderOrSibling(header);
      while (sibling && sibling !== nextSibling) {
        openCollapse(header, sibling);
        sibling = sibling.nextElementSibling;
      }
    }
  }
}

// Initialize the script
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onDOMReady);
} else {
  onDOMReady();
}
