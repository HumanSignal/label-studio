$(document).ready(function(){

  document.querySelectorAll('.date__type .switcher__inner ul li a').forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      let allElements = Array.from(document.querySelectorAll('.date__type .switcher__inner ul li'))
    for (let element of allElements) {
      element.classList.remove('active__switcher');
    }
    let allElementsBlock = Array.from(document.querySelectorAll('.content__date .elem__date'))
    for (let element of allElementsBlock) {
      element.style.display= "none";
    }
    item.parentElement.classList.add("active__switcher");
    document.querySelector(".date__type .content__date .elem__date." + item.getAttribute("data-block")).style.display ="block";
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
      element.style.display= "none";
    }
    item.parentElement.classList.add("active__switcher");
    document.querySelector(".main__block .content__wrapper>.content__elem." + item.getAttribute("data-block")).style.display ="block";
    });
  })

  let last_known_scroll_position = 0;
  let ticking = false;
  function doSomething(scroll_pos) {
    if (window.innerWidth > 991) {
      if (window.scrollY > 70) {
        document.querySelector(".head__main").classList.add("active__head");
      } else {
        document.querySelector(".head__main").classList.remove("active__head");
      }
    }  
  }
  document.addEventListener('scroll', function(e) {
    last_known_scroll_position = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(function() {
        doSomething(last_known_scroll_position);
        ticking = false;
      });

      ticking = true;
    }
  });

  const slider = document.querySelector('.content__label');
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
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 3; //scroll-fast
    slider.scrollLeft = scrollLeft - walk;
  });
  const slider2 = document.querySelector(".community__wrapper");
  slider2.addEventListener('mousedown', (e) => {
    isDown = true;
    slider2.classList.add('active');
    startX = e.pageX - slider2.offsetLeft;
    scrollLeft = slider2.scrollLeft;
  });
  slider2.addEventListener('mouseleave', () => {
    isDown = false;
    slider2.classList.remove('active');
  });
  slider2.addEventListener('mouseup', () => {
    isDown = false;
    slider2.classList.remove('active');
  });
  slider2.addEventListener('mousemove', (e) => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider2.offsetLeft;
    const walk = (x - startX) * 3; //scroll-fast
    slider2.scrollLeft = scrollLeft - walk;
  });


  const slider3 = document.querySelector(".content__video");
  slider3.addEventListener('mousedown', (e) => {
    isDown = true;
    slider3.classList.add('active');
    startX = e.pageX - slider3.offsetLeft;
    scrollLeft = slider3.scrollLeft;
  });
  slider3.addEventListener('mouseleave', () => {
    isDown = false;
    slider3.classList.remove('active');
  });
  slider3.addEventListener('mouseup', () => {
    isDown = false;
    slider3.classList.remove('active');
  });
  slider3.addEventListener('mousemove', (e) => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider3.offsetLeft;
    const walk = (x - startX) * 3; //scroll-fast
    slider3.scrollLeft = scrollLeft - walk;
  });
});
