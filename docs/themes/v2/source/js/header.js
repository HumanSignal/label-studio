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
})();

