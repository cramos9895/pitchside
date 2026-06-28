---
name: resend-email-safety
description: Use this skill when creating, styling, sending, or debugging transactional emails using Resend.
---

# Resend Email Safety Protocol

Ensure email delivery is robust, visually consistent across clients, and secure.

## 1. Visually Consistent Styling
- Use tables and inline CSS styling for maximum client compatibility. Avoid relying on complex CSS sheets or Tailwind inside templates unless compiled to flat HTML.
- Always include fallback text / plain text alternatives for every email sent.

## 2. API Error Handling
- Never assume email sends will succeed. Wrap calls to `resend.emails.send` in error catch blocks and log failures to a diagnostic channel or table.
- Use environment variables for the Resend API Key (`RESEND_API_KEY`) and verify its presence before calling the SDK.

## 3. Sandboxing & Local Debugging
- Ensure all test scripts/configurations (like `test_resend_standalone.ts` or `debug_email.ts`) do not accidentally send emails to production users. Use test/staging address lists.
