# 🔒 Security Policy

## 🛡️ Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

We take the security of VIGILX seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@vigilx.com** (replace with actual email)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- Confirmation of receipt within 48 hours
- An assessment of the vulnerability within 7 days
- A plan for addressing the vulnerability within 14 days
- Credit for responsible disclosure (if desired)

## 🔐 Security Best Practices for Users

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique values for `TWILIO_AUTH_TOKEN`
- Rotate credentials regularly

### API Security

- The backend uses rate limiting (10 requests/minute for SMS)
- All inputs are validated and sanitized
- CORS is configured to accept requests only from the frontend URL

### Production Deployment

- Use HTTPS for all connections
- Keep dependencies updated
- Enable logging and monitoring
- Use environment-specific configurations

## 📜 Security Changelog

| Date | Description |
|------|-------------|
| 2026-01-30 | Initial security policy created |

---

<div align="center">

*Security is everyone's responsibility.* 🔒

</div>
