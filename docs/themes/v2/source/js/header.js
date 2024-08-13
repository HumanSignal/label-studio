(function() {
  const pageHeader = document.querySelector(".page-header");
  const pageSidebar = document.querySelector(".page-sidebar");
  const navToggleButtons = pageHeader.querySelectorAll("button");
  const sideBarToggleButtons = pageSidebar && pageSidebar.querySelectorAll("button");
  const hamburgerButton = pageHeader.querySelector(".hamburger-button");

  const toggleMenu = (e) => {
    const button = e.currentTarget;
    const menu = button.nextElementSibling;
    const menuStyles = getComputedStyle(menu);
    const arrow = button.querySelector("svg");
    const arrowStyles = getComputedStyle(arrow);

    arrow.style.setProperty('transform', arrowStyles.transform === "none" ? "matrix(-1, 0, 0, -1, 0, 0)" : "none");
    menu.style.setProperty('display', menuStyles.display === "flex" ? "none" : "flex");
  }

  navToggleButtons && navToggleButtons.forEach(button => button.addEventListener("click", toggleMenu));
  sideBarToggleButtons && sideBarToggleButtons.forEach(button => button.addEventListener("click", toggleMenu));

  const githubstarsContainer  = document.querySelector(".github-stars-count");

  if(githubstarsContainer) {
    fetch("https://api.github.com/repos/heartexlabs/label-studio")
    .then((response) => response.json()
    .then((data) => {
      let stars = "";
      if(data.stargazers_count) stars = data.stargazers_count.toLocaleString('en-US')
      if(stars) githubstarsContainer.textContent = stars;
    }))
    .catch((err) => {
      console.log(err)
    });
  }

  window.addEventListener('load', (event) => {
    const searchInput = document.querySelector("#docsearch-input");

    const siteVersion = searchInput.dataset.siteVersion;

    const appId = siteVersion == "enterprise" ? 'M7RXTHKYPM' : "HELLEDAKPT";
    const apiKey = siteVersion == "enterprise" ? '8ed23cbc92e0806140603fb62236efee' : '1d0410ef855a968fbc40669df1c4a73e'
    const indexName = siteVersion == "enterprise" ? 'ghaction' : 'labelstud'
    
    if(searchInput) {

      window.docsearch({
        container: '#docsearch-input',
        inputSelector: '#docsearch-input',
        appId,
        apiKey,
        indexName,
        algoliaOptions: { hitsPerPage: 10 },
      });
    
      const handleFocusSearch = (e) => {
        if (document.activeElement.localName === 'body' && e.code !== "Space" && e.code !== "MetaLeft" && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          searchInput.focus();
        }

        if(document.activeElement.localName === 'body' && e.code === "KeyK" && (e.metaKey || e.ctrlKey)) {
          searchInput.focus();
        }
      }
    
      window.addEventListener("keydown", handleFocusSearch);
    }
  });

  hamburgerButton.addEventListener("click", () => {
    const nav = hamburgerButton.nextElementSibling;
    const navStyle = getComputedStyle(nav);

    hamburgerButton.classList.toggle("active");

    nav.style.setProperty('display', navStyle.display=== "flex" ? "none" : "flex");

  })

  if (window.matchMedia( "(hover: none)" ).matches) {
    const toggleQuickNav = (e) => {
      if (e.target.tagName.toLowerCase() !== 'a') {
        const component = e.currentTarget;
        const menu = component.querySelector("ul");
        const menuStyles = getComputedStyle(menu);

        menu.style.setProperty('display', menuStyles.display=== "flex" ? "none" : "flex");
      }
    }
  
    const toggleQuicNavButton = document.querySelector(".page-header-content-switcher");
    toggleQuicNavButton.addEventListener("click", toggleQuickNav)
 }

  pageSidebar.addEventListener('scroll', function() {
    localStorage.setItem('labelstudio_scrollPosition', this.scrollTop);
  });
})();
