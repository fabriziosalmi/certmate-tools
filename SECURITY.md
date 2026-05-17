# Security policy

Thank you for taking the time to look at the security of **certmate-tools**.
The project is a static, client-side toolbox — no server-side code processes
user data — but we still take any finding seriously.

## Reporting a vulnerability

**Do not file a public GitHub issue for a security bug.** Use either of the
following private channels:

1. **GitHub Security Advisories** (preferred): open a private advisory at
   <https://github.com/fabriziosalmi/certmate-tools/security/advisories/new>.
   This route is end-to-end private and lets us coordinate a fix and CVE
   assignment if appropriate.
2. **Email**: <fabrizio.salmi@gmail.com> with the subject prefix
   `[certmate-tools security]`. PGP key on request.

Please include, when possible:

- A clear description of the issue and its impact.
- Steps to reproduce — minimal page, URL, payload.
- Affected version / commit SHA.
- Your contact handle so we can credit you in the advisory (optional).

## What we consider in scope

- Cross-site scripting / DOM injection in any tool page.
- Logic bugs that cause the tool to send certificate, key or token material
  off the user's browser (we promise the opposite).
- Cryptographic mis-implementation (incorrect RFC behavior, weak
  randomness, broken signature checks).
- Supply-chain risks on declared dependencies.

## Out of scope

- Findings against third-party tools listed in the curated directory — please
  contact those projects directly.
- Pure SEO / typo / copywriting issues — open a regular issue or PR.
- Issues affecting unsupported browsers (we target the last two stable
  versions of Chrome, Firefox, Safari and Edge).

## Disclosure timeline

We aim for:

- **48 hours**: acknowledgement of your report.
- **7 days**: initial triage and severity assessment.
- **30 days**: fix released, or a documented mitigation plan if longer.

We coordinate disclosure with the reporter and credit you in the release
notes and security advisory unless you ask to stay anonymous.

## Supported versions

Only the latest `main`-branch deployment of <https://tools.certmate.org> is
supported. Older static builds are not maintained.
