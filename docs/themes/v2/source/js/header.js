(function() {
  const pageHeader = document.querySelector(".page-header");
  const pageSidebar = document.querySelector(".page-sidebar");
  const navToggleButtons = pageHeader.querySelectorAll("button");
  const sideBarToggleButtons = pageSidebar && pageSidebar.querySelectorAll("button");

  const toggleMenu = (e) => {
    const button = e.currentTarget;
    const menu = button.nextElementSibling;
    const menuStyles = getComputedStyle(menu);

    menu.style.setProperty('display', menuStyles.display=== "flex" ? "none" : "flex");
    button.classList.toggle("active");
  }

  navToggleButtons && navToggleButtons.forEach(button => button.addEventListener("click", toggleMenu));
  sideBarToggleButtons && sideBarToggleButtons.forEach(button => button.addEventListener("click", toggleMenu));

  const githubstarsContainer  = document.querySelector(".github-stars-count");

  fetch("https://api.github.com/repos/heartexlabs/label-studio")
  .then((response) => response.json()
  .then((data) => {
    const stars = data.stargazers_count?.toLocaleString('en-US');
    if(stars) githubstarsContainer.textContent = stars;
  }))
  .catch((err) => {
    console.log(err)
  });

  window.addEventListener('load', (event) => {
    window.docsearch({
      container: '#docsearch-input',
      inputSelector: '#docsearch-input',
      appId: 'HELLEDAKPT',
      apiKey: '1d0410ef855a968fbc40669df1c4a73e',
      indexName: 'labelstud', // it does not change
    });
  
    const searchInput = document.querySelector("#docsearch-input");
    const handleFocusSearch = (e) => {
      if (document.activeElement.localName === 'body' && e.code !== "Space" && e.code !== "MetaLeft" && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        searchInput.focus();
      }
    }
  
    window.addEventListener("keydown", handleFocusSearch);
  });

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
})();

