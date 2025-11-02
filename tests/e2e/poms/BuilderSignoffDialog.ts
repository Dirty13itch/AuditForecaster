/**
 * Builder Signoff Dialog Page Object Model
 * 
 * ⚠️ WARNING: THIS DIALOG IS NOT IMPLEMENTED IN THE ACTUAL UI ⚠️
 * 
 * The actual UI (TaxCreditProject.tsx) does NOT have:
 *   - button-builder-signoff
 *   - dialog-builder-signoff
 *   - Any attestation checkboxes
 *   - Any signature input fields
 * 
 * All selectors in this file (dialog-builder-signoff, checkbox-attestation-*, 
 * input-signature-*, etc.) DO NOT EXIST in the actual UI implementation.
 * 
 * This POM is kept for backward compatibility but should not be used in tests.
 * Tests should be updated to skip builder signoff steps or implement the actual
 * signoff functionality first.
 */

import { type Page, type Locator } from '@playwright/test';

export class BuilderSignoffDialog {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================================
  // ELEMENTS
  // ============================================================================

  get dialog(): Locator {
    return this.page.getByTestId('dialog-builder-signoff');
  }

  get dialogTitle(): Locator {
    return this.page.getByTestId('text-dialog-title');
  }

  get closeButton(): Locator {
    return this.page.getByTestId('button-close-dialog');
  }

  // Attestation checkboxes
  get attestationIRSCompliance(): Locator {
    return this.page.getByTestId('checkbox-attestation-irs');
  }

  get attestationDocumentAccuracy(): Locator {
    return this.page.getByTestId('checkbox-attestation-accuracy');
  }

  get attestationEnergyRequirements(): Locator {
    return this.page.getByTestId('checkbox-attestation-energy');
  }

  get attestationTestingComplete(): Locator {
    return this.page.getByTestId('checkbox-attestation-testing');
  }

  // Signature fields
  get signatureNameInput(): Locator {
    return this.page.getByTestId('input-signature-name');
  }

  get signatureTitleInput(): Locator {
    return this.page.getByTestId('input-signature-title');
  }

  get signatureDateInput(): Locator {
    return this.page.getByTestId('input-signature-date');
  }

  // Signature canvas (if applicable)
  get signatureCanvas(): Locator {
    return this.page.getByTestId('canvas-signature');
  }

  get clearSignatureButton(): Locator {
    return this.page.getByTestId('button-clear-signature');
  }

  // Action buttons
  get submitButton(): Locator {
    return this.page.getByTestId('button-submit-signoff');
  }

  get cancelButton(): Locator {
    return this.page.getByTestId('button-cancel');
  }

  // Success/Error states
  get successMessage(): Locator {
    return this.page.getByTestId('text-signoff-success');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('text-signoff-error');
  }

  // Validation messages
  get validationError(): Locator {
    return this.page.getByTestId('text-validation-error');
  }

  // Loading indicator
  get submittingIndicator(): Locator {
    return this.page.getByTestId('indicator-submitting');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Wait for dialog to be visible
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check all attestation checkboxes
   */
  async checkAllAttestations() {
    await this.attestationIRSCompliance.check();
    await this.attestationDocumentAccuracy.check();
    await this.attestationEnergyRequirements.check();
    await this.attestationTestingComplete.check();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check specific attestation
   */
  async checkAttestation(attestationType: 'irs' | 'accuracy' | 'energy' | 'testing') {
    switch (attestationType) {
      case 'irs':
        await this.attestationIRSCompliance.check();
        break;
      case 'accuracy':
        await this.attestationDocumentAccuracy.check();
        break;
      case 'energy':
        await this.attestationEnergyRequirements.check();
        break;
      case 'testing':
        await this.attestationTestingComplete.check();
        break;
    }
    await this.page.waitForTimeout(200);
  }

  /**
   * Fill signature information
   */
  async fillSignature(name: string, title: string) {
    await this.signatureNameInput.fill(name);
    await this.signatureTitleInput.fill(title);

    // Auto-fill current date if date input exists
    const dateInputVisible = await this.signatureDateInput.isVisible().catch(() => false);
    if (dateInputVisible) {
      const today = new Date().toISOString().split('T')[0];
      await this.signatureDateInput.fill(today);
    }
  }

  /**
   * Clear signature canvas
   */
  async clearSignature() {
    const clearButtonVisible = await this.clearSignatureButton.isVisible().catch(() => false);
    if (clearButtonVisible) {
      await this.clearSignatureButton.click();
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Submit sign-off and wait for response
   */
  async submitSignoff() {
    // Wait for the sign-off API response
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/api/tax-credit') && resp.url().includes('/sign') && resp.status() === 200,
      { timeout: 30000 }
    ).catch(() => null); // Handle case where endpoint might be different

    await this.submitButton.click();

    // Wait for submission to complete
    await responsePromise;
    await this.page.waitForTimeout(1000); // Wait for UI to update
  }

  /**
   * Complete full sign-off workflow
   */
  async completeSignoff(name: string, title: string) {
    await this.waitForDialog();
    await this.checkAllAttestations();
    await this.fillSignature(name, title);
    await this.submitSignoff();
  }

  /**
   * Cancel sign-off and close dialog
   */
  async cancel() {
    await this.cancelButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Close dialog
   */
  async close() {
    await this.closeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if submission is in progress
   */
  async isSubmitting(): Promise<boolean> {
    return await this.submittingIndicator.isVisible().catch(() => false);
  }

  /**
   * Check if sign-off was successful
   */
  async isSignoffSuccessful(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  /**
   * Check if sign-off failed
   */
  async hasSignoffError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Check if there are validation errors
   */
  async hasValidationError(): Promise<boolean> {
    return await this.validationError.isVisible().catch(() => false);
  }

  /**
   * Verify all attestations are checked
   */
  async areAllAttestationsChecked(): Promise<boolean> {
    const irsChecked = await this.attestationIRSCompliance.isChecked();
    const accuracyChecked = await this.attestationDocumentAccuracy.isChecked();
    const energyChecked = await this.attestationEnergyRequirements.isChecked();
    const testingChecked = await this.attestationTestingComplete.isChecked();

    return irsChecked && accuracyChecked && energyChecked && testingChecked;
  }

  /**
   * Verify dialog is open
   */
  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Verify dialog is closed
   */
  async isClosed(): Promise<boolean> {
    return !(await this.dialog.isVisible());
  }
}
