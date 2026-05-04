describe('Hugging Face token settings', () => {
  it('shows HF token settings in account page', () => {
    cy.visit('/user/login/');
    cy.get('#email').type('verify.hf.ui@biowork.app');
    cy.get('#password').type('VerifyHF123!');
    cy.get('form#login-form').submit();

    cy.visit('/user/account#huggingface-token');
    cy.contains('Hugging Face', { timeout: 15000 }).should('exist').click();
    cy.get('#huggingface-token', { timeout: 15000 }).should('exist').scrollIntoView();
    cy.get('input[name=\"huggingface-token\"]').should('exist');
    cy.contains('button', 'Save').should('exist');
    cy.screenshot('hf-token-settings-account', { capture: 'fullPage' });
  });
});
