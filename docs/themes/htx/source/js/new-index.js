$(document).ready(function () {

  document.querySelectorAll('.date__type .switcher__inner ul li a').forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      let allElements = Array.from(document.querySelectorAll('.date__type .switcher__inner ul li'))
      for (let element of allElements) {
        element.classList.remove('active__switcher');
      }
      let allElementsBlock = Array.from(document.querySelectorAll('.content__date .elem__date'))
      for (let element of allElementsBlock) {
        element.style.display = "none";
      }
      item.parentElement.classList.add("active__switcher");
      document.querySelector(".date__type .content__date .elem__date." + item.getAttribute("data-block")).style.display = "block";
    });
  })


  document.querySelectorAll('.main__block .switcher__inner ul li a').forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      let allElements = Array.from(document.querySelectorAll('.main__block .switcher__inner ul li'))
      for (let element of allElements) {
        element.classList.remove('active__switcher');
      }
      let allElementsBlock = Array.from(document.querySelectorAll('.main__block .content__wrapper>.content__elem '))
      for (let element of allElementsBlock) {
        element.style.display = "none";
      }
      item.parentElement.classList.add("active__switcher");
      document.querySelector(".main__block .content__wrapper>.content__elem." + item.getAttribute("data-block")).style.display = "block";
    });
  })


  function activateSlider(slider) {
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.classList.add('active');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.classList.remove('active');
    });
    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.classList.remove('active');
    });
    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 3; //scroll-fast
      slider.scrollLeft = scrollLeft - walk;
    });
  }

  activateSlider(document.querySelector('.content__label'));
  activateSlider(document.querySelector(".community__wrapper"));
  activateSlider(document.querySelector(".content__video"));

  // footer fade and main content shrink effect 
  document.documentElement.className = "js-enabled";

  const footer = document.querySelector("#page-footer");
  const sentinalEl = document.querySelector("#footer-anim-el");
  const main = document.querySelector(".main__container");


  const handler = (entries) => {
    if (!entries[0].isIntersecting) {
      footer.style.opacity = "0.2";
      main.classList.remove("footerActive")
    } else {
      footer.style.opacity = 1;
      main.classList.add("footerActive")
    }
  }

  const observer = new window.IntersectionObserver(handler)
  if(window.matchMedia("(min-width: 75rem)").matches) observer.observe(sentinalEl)

});
