(function() {
  const pageHeader = document.querySelector(".page-header");
  const mobileHeaderButtons = pageHeader.querySelectorAll(".page-header button");

  const toggleMenu = (e) => {
    const button = e.currentTarget;
    const menu = button.nextElementSibling;
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    button.classList.toggle("active");
  }

  mobileHeaderButtons.forEach(button => button.addEventListener("click", toggleMenu));

})();

