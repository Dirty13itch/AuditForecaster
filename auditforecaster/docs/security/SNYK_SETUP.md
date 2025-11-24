# Snyk Security Setup Guide

This guide details how to configure Snyk for automated vulnerability scanning in the AuditForecaster CI/CD pipeline.

## 1. Why Snyk?
Snyk scans our dependencies (`node_modules`) and code for known security vulnerabilities. It is integrated into our GitHub Actions workflow (`.github/workflows/security.yml`) but requires an API token to function.

## 2. Prerequisites
- A GitHub account with admin access to this repository.
- A free account on [Snyk.io](https://snyk.io/).

## 3. Step-by-Step Configuration

### Step A: Get Your Snyk API Token
1.  **Log in** to [Snyk.io](https://app.snyk.io/login).
2.  Click on your **Avatar/Profile** icon in the bottom left corner.
3.  Select **Account Settings**.
4.  Click on **General** in the sidebar (if not already selected).
5.  Find the **API Token** section.
6.  Click to **show** or **copy** your personal API token.
    *   *Note: It usually starts with a UUID like `12345678-1234-1234-1234-1234567890ab`.*

### Step B: Add Token to GitHub Secrets
1.  Navigate to your repository on **GitHub**.
2.  Click on the **Settings** tab (top right).
3.  In the left sidebar, scroll down to **Secrets and variables**.
4.  Click on **Actions**.
5.  Click the green button **New repository secret**.
6.  **Name**: `SNYK_TOKEN` (Must be exact).
7.  **Secret**: Paste the API token you copied from Snyk.
8.  Click **Add secret**.

### Step C: Verify Configuration
1.  Go to the **Actions** tab in your GitHub repository.
2.  Select the **Security Scan** workflow on the left.
3.  Click **Run workflow** (blue button) -> **Run workflow**.
4.  Wait for the job to complete.
    *   **Success:** The "Snyk Security Scan" step passes (green check).
    *   **Failure:** Check the logs. If it says "Auth Failed", verify the token was pasted correctly.

## 4. Troubleshooting
- **"Missing SNYK_TOKEN"**: The secret is not named correctly. Ensure it is `SNYK_TOKEN` (all caps).
- **"Invalid Token"**: Re-copy the token from Snyk.io.
- **"Project limit reached"**: Free Snyk accounts have limits. You may need to adjust the scan frequency in `.github/workflows/security.yml` if you hit limits (currently set to run on push/PR).

## 5. Next Steps
Once configured, Snyk will automatically:
- Block Pull Requests that introduce high-severity vulnerabilities.
- Alert you to new vulnerabilities in existing dependencies.
