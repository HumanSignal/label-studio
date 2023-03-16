(function() {
  const feedbackForm = document.querySelector("#helpful-form");

  const yesNoButtons = feedbackForm.querySelectorAll("[type='radio']");
  const moreDetails = feedbackForm.querySelector("#helpful-more");
  const cancelButton = feedbackForm.querySelector("#helpful-form-cancel-button");
  const confirmation = feedbackForm.querySelector("#helpful-more-confirmation");

  const closeForm = () => {
    yesNoButtons.forEach(button => button.checked = false)
    moreDetails.style.display = "none"
  }
  
  const openForm = () => {
    moreDetails.style.display = "block"
  }

  const submitForm = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const data = {
      feedback: formData.get('feedback'),
      helpful: formData.get('helpful'),
      email: formData.get('email'),
      pageURL: window.location.href.split('#')[0],
      pageTitle: document.title,
      submittedOn: new Date().toLocaleDateString('en-CA')
    }


    fetch('https://label-studio-docs-new-theme.netlify.app/.netlify/functions/gather-feedback', { method: 'POST', body: JSON.stringify(data) }).then(response => {
      if(response.status === 200) {
        console.log("success");
        moreDetails.style.display = "none"
        confirmation.style.display = "block"
      }
    })
  }


  yesNoButtons.forEach(button => button.addEventListener("change", openForm));

  cancelButton.addEventListener("click", closeForm);
  feedbackForm.addEventListener("submit", submitForm)

})();

