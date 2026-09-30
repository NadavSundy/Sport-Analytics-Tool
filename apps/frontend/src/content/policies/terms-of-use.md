# Stat’sTheGame Terms of Use

**Effective date:** 29 September 2026  
**Last updated:** 29 September 2026

## 1. About Stat’sTheGame

Stat’sTheGame is a student-built T20 cricket analytics platform developed as part of a third-year Computer Science Software Design Project at the University of the Witwatersrand, Johannesburg.

The service is operated by the **Stat’sTheGame Student Project Team**. It is not a commercial service of the University of the Witwatersrand, and the University does not operate the application or control its stored data.

**Contact:** statsthegame@gmail.com  
**Correspondence address:** Private Bag 3, Wits, 2050, South Africa

The Wits postal address is used only as a correspondence address for the student project.

These Terms govern use of the Stat’sTheGame web application, public API, account features, submission workflows, public exports and dataset releases.

## 2. Acceptance of these Terms

By using Stat’sTheGame, you agree to comply with these Terms.

If you do not agree with these Terms, you may stop using the service. Public cricket information may remain accessible without an account, subject to these Terms and any applicable third-party rights.

## 3. Age and accounts

Public areas of Stat’sTheGame may be viewed without an account.

You must be **18 years of age or older** to:

- sign in or use an authenticated Stat’sTheGame account;
- request or receive submitter access;
- act as an administrator;
- submit or correct data through authenticated workflows; or
- obtain or manage an API credential linked to an account.

We may disable an authenticated account if we reasonably believe that the user does not satisfy this requirement.

## 4. Authentication and account security

Stat’sTheGame uses Google OAuth through Supabase Auth.

You are responsible for protecting access to your Google account, Stat’sTheGame session, API credentials and any device from which you use the service.

You must not:

- share access tokens, refresh tokens or API keys publicly;
- use another person’s account or credentials without permission;
- attempt to obtain another user’s credentials;
- misrepresent your identity or authority when requesting elevated access; or
- bypass authentication or authorisation controls.

If you believe an account or API credential has been compromised, contact **statsthegame@gmail.com** promptly.

## 5. Account roles and permissions

Stat’sTheGame uses different application roles and scoped permissions. Authentication proves identity but does not automatically grant submission or administrative privileges.

Submitter and administrator permissions are granted and revoked by the application’s authorised administrative workflow. Ordinary submitters may be limited to particular competitions.

You must use only the permissions actually granted to your account.

We may reject, revoke, suspend or change elevated permissions where reasonably necessary for security, project integrity, misuse prevention or administration of the service.

## 6. Acceptable use

You may use Stat’sTheGame for lawful purposes, including viewing cricket information, performing analysis, using permitted API functionality and downloading public datasets.

You must not:

- use the service unlawfully or to facilitate unlawful activity;
- attempt to gain unauthorised access to accounts, data, infrastructure or administrative functions;
- bypass rate limits, quotas, role checks or competition-scope restrictions;
- interfere with or deliberately degrade the availability, security or performance of the service;
- send malware, malicious files or intentionally malformed payloads designed to exploit the service;
- probe or exploit vulnerabilities beyond the responsible security-testing rules in section 12;
- scrape or automate access in a way that intentionally circumvents documented API controls;
- impersonate Stat’sTheGame, the University of the Witwatersrand, a cricket authority, another user or another organisation;
- use the service to publish credentials, private keys, access tokens or unlawfully obtained personal information; or
- use Stat’sTheGame branding in a way that falsely suggests endorsement, partnership or official status.

## 7. Submitter responsibilities

If you are permitted to submit cricket data, you are responsible for the information and files you submit.

You must ensure that:

- you are authorised to provide the submitted material;
- the submission relates to the permitted competition scope;
- you do not knowingly submit false, fabricated or misleading event data;
- uploaded files do not contain malware or unrelated personal information;
- you do not upload passwords, API keys, access tokens, private keys or other secrets; and
- your submission complies with applicable third-party licences and rights.

Submissions may be validated, staged, rejected, reviewed, corrected or published according to the platform’s workflows.

Published cricket information is designed to remain traceable to its source events and submission history. Accepted corrections do not silently erase the historical provenance of an earlier accepted version.

By submitting material to Stat’sTheGame, you grant the Stat’sTheGame Student Project Team a non-exclusive, worldwide, royalty-free licence to store, copy, validate, transform, process, derive statistics from, publish and preserve that material to the extent reasonably necessary to operate the platform, maintain provenance and provide its public API and datasets. You may grant this licence only for material for which you have the necessary rights.

This licence does not override third-party licence conditions attached to source material.

## 8. API use

Stat’sTheGame provides a versioned HTTP API for public data and may issue API credentials for functionality subject to consumer controls.

When using the API:

- keep issued API keys confidential;
- use documented authentication methods;
- comply with rate limits and daily or other quotas;
- do not rotate, distribute or multiply credentials for the purpose of avoiding quotas;
- do not deliberately make requests designed to exhaust platform resources;
- use stable documented identifiers and endpoints rather than relying on undocumented implementation details; and
- follow published versioning and deprecation information.

API keys remain under the control of Stat’sTheGame and may be rotated, suspended or revoked where reasonably necessary for security, abuse prevention, quota enforcement or project administration.

The API is provided without a service-level guarantee. Endpoints, limits and functionality may change as the student project develops. Where practical, breaking changes to versioned API functionality will be managed through the project’s documented versioning and deprecation process.

## 9. Public data and dataset licence

Subject to the limitations below, Stat’sTheGame permits broad reuse of public datasets and public API outputs.

To the extent that the Stat’sTheGame Student Project Team owns or has authority to license the relevant material, you are granted a **worldwide, non-exclusive, royalty-free permission** to:

- access and use public Stat’sTheGame data;
- analyse and transform it;
- combine it with other datasets;
- copy and reproduce it;
- create derived works from it; and
- redistribute it, including for commercial purposes.

This permission is subject to the following conditions:

1. **Attribution.** Public reuse must give reasonable attribution to **Stat’sTheGame** and, where the data or output is derived from a third-party source, must preserve or provide the attribution required by that source.
2. **Third-party rights.** This permission applies only to rights that the Stat’sTheGame Student Project Team is entitled to grant. It does not replace, expand or cancel the rights, licence conditions, database rights, copyright, trade marks or other rights of third parties.
3. **Licence notices.** Where a dataset release identifies an upstream source or licence, you must preserve the applicable notice when redistributing the affected data.
4. **No false endorsement.** You must not state or imply that Stat’sTheGame, Wits, Cricsheet, a cricket board, league, team or other third party endorses your product or analysis unless you have separate permission to do so.
5. **No credential redistribution.** This data permission does not permit redistribution of API keys, access tokens or other credentials.

Stat’sTheGame currently uses **Cricsheet** as an important historical cricket-data source. Information originating from Cricsheet remains subject to Cricsheet’s applicable terms and attribution requirements. Nothing in these Terms grants broader rights over third-party data than the relevant third party permits.

When a dataset release includes a manifest, source notice, checksum, schema or licence/attribution information, you should retain that information with redistributed copies so that provenance remains clear.

## 10. Intellectual property and branding

These Terms distinguish public data reuse from other project material.

Except where a separate licence expressly says otherwise:

- the Stat’sTheGame name, logo, brand assets and original written content are not licensed for unrestricted commercial reuse;
- you may refer to Stat’sTheGame by name for attribution, commentary, research or identification;
- you may not use the branding in a way that creates a false impression of sponsorship or endorsement; and
- source code is governed by any licence notice that accompanies the relevant repository or file, not by the public-data permission in section 9.

Names and marks belonging to cricket teams, competitions, governing bodies, data providers and other organisations remain the property of their respective owners.

## 11. Accuracy, completeness and availability

Stat’sTheGame is an academic software project and an analytics platform, not an official cricket governing body, league database or scorekeeper.

The project aims to derive statistics reproducibly from event data and to preserve source provenance, but:

- source data may contain omissions, errors or later corrections;
- competition coverage may be incomplete;
- derived statistics may contain software or modelling errors;
- the service may be temporarily unavailable;
- APIs, datasets and interfaces may change during project development; and
- information should be independently verified where accuracy is important.

Stat’sTheGame is provided for information, education, analysis and software-project purposes. It should not be treated as professional, financial or wagering advice.

## 12. Security and responsible vulnerability disclosure

We welcome good-faith reports of security vulnerabilities.

Send security reports privately to **statsthegame@gmail.com**. Include enough information for the team to reproduce and assess the issue, but do not send live credentials or personal information unless strictly necessary.

Do **not** publish exploitable details, credentials or vulnerable production information before the team has had a reasonable opportunity to investigate.

Good-faith security testing must be limited to activity that does not harm other users or the service. You must not:

- access, modify, copy or delete data belonging to another user;
- perform denial-of-service or load testing against the public service without prior permission;
- use social engineering, phishing or physical intrusion;
- deploy malware or establish persistence;
- exfiltrate data;
- intentionally destroy or corrupt information; or
- continue testing after you have confirmed a vulnerability if further testing would materially increase risk.

If you encounter personal information or secrets unexpectedly during testing, stop accessing that information and report the issue privately.

## 13. Suspension and termination

We may suspend or restrict access to authenticated functionality, elevated roles or API credentials where reasonably necessary because of:

- a breach of these Terms;
- suspected credential compromise;
- security concerns;
- misuse of API resources;
- unauthorised submissions;
- attempts to circumvent access controls;
- legal requirements; or
- the need to protect users, infrastructure or the integrity of published data.

Where appropriate, a user may contact **statsthegame@gmail.com** to ask about a restriction.

Users may stop using Stat’sTheGame at any time. Account-deletion rights and retained provenance are explained in the Privacy Notice.

## 14. Third-party services and links

Stat’sTheGame relies on or links to third-party services, including authentication, hosting, cloud infrastructure and cricket-data sources.

Those third parties operate under their own terms and policies. Stat’sTheGame is not responsible for the independent operation, content or availability of a third-party service.

## 15. Disclaimer

To the maximum extent permitted by applicable law, Stat’sTheGame is provided **“as is” and “as available.”**

The Stat’sTheGame Student Project Team does not guarantee that the service will always be available, error-free, complete, uninterrupted or suitable for a particular purpose.

Nothing in these Terms excludes or limits any right or liability that cannot lawfully be excluded or limited under South African law.

## 16. Changes to the service or Terms

Because Stat’sTheGame is an actively developed student project, functionality may be added, changed or removed.

We may update these Terms when the service, its API, its data practices or applicable requirements change. The current version will display its effective or last-updated date.

Continued use after revised Terms take effect constitutes acceptance of the revised Terms to the extent permitted by law.

## 17. Governing law

These Terms are governed by the laws of the **Republic of South Africa**.

Subject to any mandatory legal rights or procedures that apply, disputes relating to these Terms or the service are subject to the jurisdiction of courts having jurisdiction in Johannesburg, Gauteng.

## 18. Contact

**Stat’sTheGame Student Project Team**  
**Email:** statsthegame@gmail.com  
**Correspondence address:** Private Bag 3, Wits, 2050, South Africa

For privacy matters, refer to the Stat’sTheGame Privacy Notice.

---

## Data-source reference

Cricsheet: https://cricsheet.org/

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
