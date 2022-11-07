(function() {
  const feedbackForm = document.querySelector("#helpful-form");

  const yesNoButtons = feedbackForm.querySelectorAll("[type='radio']");
  const moreDetails = feedbackForm.querySelector("#helpful-more");
  const cancelButton = feedbackForm.querySelector("#helpful-form-cancel-button");

  const closeForm = () => {
    yesNoButtons.forEach(button => button.checked = false)
    moreDetails.style.display = "none"
  }
  
  const openForm = () => {
    moreDetails.style.display = "block"
  }


  yesNoButtons.forEach(button => button.addEventListener("change", openForm));

  cancelButton.addEventListener("click", closeForm);

})();

