# Stat’sTheGame Privacy Notice

**Effective date:** 29 September 2026
**Last updated:** 29 September 2026

## 1. Who we are

Stat’sTheGame is a student-built T20 cricket analytics platform developed as part of a third-year Computer Science Software Design Project at the University of the Witwatersrand, Johannesburg.

The service is operated by the **Stat’sTheGame Student Project Team**. The student team determines the purposes and means by which personal information processed through Stat’sTheGame is collected, used, stored, retained and deleted. The University of the Witwatersrand does not operate Stat’sTheGame and does not control the application’s stored data.

For purposes of the Protection of Personal Information Act 4 of 2013 (“POPIA”), the Stat’sTheGame Student Project Team acts as the responsible party for the personal information described in this notice.

**Privacy contact:** statsthegame@gmail.com
**Correspondence address:** Private Bag 3, Wits, 2050, South Africa

The Wits postal address above is used only as a correspondence address for this student project. Its use does not make the University of the Witwatersrand the operator or responsible party for Stat’sTheGame.

## 2. Scope of this notice

This Privacy Notice applies to personal information processed through:

- the Stat’sTheGame web application;
- authenticated Stat’sTheGame accounts;
- submitter and administrator workflows;
- Stat’sTheGame API-consumer accounts and API credentials where linked to an identifiable person;
- communications sent to statsthegame@gmail.com; and
- supporting infrastructure used to operate the service.

Public cricket statistics, fixtures, events, datasets and other information about professional cricket are not necessarily personal information about a user of Stat’sTheGame. This notice focuses on personal information relating to people who use, administer or communicate with the service.

## 3. Age requirement

The public areas of Stat’sTheGame may be viewed without creating an account.

You must be **18 years of age or older** to sign in, create or use a Stat’sTheGame account, request submitter access, act as a submitter or administrator, or obtain an API credential linked to an account.

Stat’sTheGame does not knowingly create authenticated accounts for children under 18. If we become aware that an under-18 user has created an account, we may disable the account and take reasonable steps to delete or de-identify the associated personal information, subject to information that must lawfully or reasonably be retained.

## 4. Personal information we process

Depending on how you use Stat’sTheGame, we may process the following categories of information.

### 4.1 Authentication and account information

Stat’sTheGame uses **Google OAuth through Supabase Auth** for managed authentication. When you sign in, Google and Supabase may make identity information available to the application, including your:

- email address;
- display name;
- authentication-provider user identifier; and
- authentication/session information.

The Stat’sTheGame backend maintains application-specific account information such as:

- a provider-neutral account identifier;
- display name where available;
- application role, such as viewer, submitter or administrator;
- submitter-request and approval state;
- authorised competition scopes;
- account creation, authentication and account-status information; and
- deletion or revocation state where applicable.

Stat’sTheGame does **not** receive, store or manage your Google password.

### 4.2 Submitter and administration information

If you request or receive permission to submit cricket data, we may process information associated with that activity, including:

- the account that made a submission;
- the competition scope assigned to the account;
- submission, batch and correction history;
- validation outcomes;
- review and approval decisions;
- timestamps;
- provenance and audit records; and
- administrative actions relating to roles, scopes, approvals, rejections or revocations.

These records are used to keep published statistics traceable and to maintain the integrity of the submission and correction process.

### 4.3 Uploaded files and source data

Approved submitters may upload cricket-event data or batch source files. Uploaded files may contain source metadata and cricket-related information necessary for ingestion, validation and provenance.

Users must not intentionally upload unrelated personal information, sensitive personal information, credentials, secrets or other data that is not required for the submission.

Private raw batch source files are retained for **90 days from receipt** and are then deleted through the platform’s recorded retention process, unless an explicitly authorised legal or licensing hold requires a longer period.

Metadata required to preserve provenance — such as identifiers, checksums, validation results, review decisions and links to published events — may remain after the source file itself has been deleted.

### 4.4 API-consumer information

Where an API credential is issued to or managed by an identifiable person, we may process the account or administrative information needed to issue, manage, rotate, revoke and audit that credential, together with usage information needed to enforce rate limits and quotas.

API keys and access tokens are security credentials. They should not be publicly shared.

### 4.5 Communications

If you contact us at **statsthegame@gmail.com**, we process the information you choose to provide in your message and any correspondence necessary to respond to you.

Do not send passwords, API keys, access tokens or other secrets by email.

### 4.6 Technical and security information

The application and its hosting providers may process limited technical information needed to deliver, secure and troubleshoot the service, such as request metadata, timestamps, error information and network information including IP addresses where generated by hosting infrastructure.

Stat’sTheGame does not intentionally log passwords, access tokens, private keys or unnecessary personal information.

## 5. Why we process personal information

We process personal information only where it is reasonably necessary for the operation, security and integrity of Stat’sTheGame. Purposes include:

- authenticating users and maintaining sessions;
- creating and maintaining application accounts;
- enforcing roles and competition-scoped permissions;
- receiving and validating submissions;
- maintaining submission provenance and correction history;
- administering submitter requests and API credentials;
- preventing abuse, fraud and unauthorised access;
- applying API rate limits and quotas;
- responding to privacy, accessibility, security and support enquiries;
- investigating and resolving technical or security incidents;
- protecting the integrity and reproducibility of published cricket statistics; and
- complying with applicable legal obligations.

Where POPIA requires a lawful justification for processing, the applicable justification may include consent, processing necessary to provide a requested service, compliance with a legal obligation, or the legitimate interests of the project team or another person, provided the processing remains lawful and reasonable.

## 6. Is providing information voluntary?

Using the public, unauthenticated areas of Stat’sTheGame does not require you to create an account.

Providing authentication information is voluntary, but it is necessary if you choose to use authenticated features. If you do not provide or permit the information required for Google/Supabase authentication, you will not be able to sign in or use account-only functionality.

Additional information and permissions are required if you choose to request submitter access, administer users, or use an account-linked API credential.

## 7. Cookies and browser storage

### 7.1 Stat’sTheGame browser storage

Stat’sTheGame currently uses browser **local storage**, rather than first-party advertising or analytics cookies, for the following purposes:

- **Theme preference:** the application stores your selected Day Match or Night Match theme so that the preference is remembered on later visits.
- **Saved fixture context:** when you are signed in, the application stores your selected competition and season under your authenticated account's browser-storage key so that fixture browsing can resume in that context. This preference contains only the selected public record identifiers and is not used for advertising or behavioural profiling.
- **Authentication session:** Supabase Auth uses browser storage to persist the managed authentication session, refresh authentication tokens and recognise a returning signed-in user.

Authentication information stored by the Supabase client is used for account access and is not used by Stat’sTheGame for advertising.

### 7.2 Cookies

The Stat’sTheGame frontend does not currently set cookies for advertising, behavioural profiling or analytics, and the project does not currently use Google Analytics, advertising pixels or comparable behavioural-tracking tools.

Third-party services involved in authentication, including Google and Supabase, may use cookies or similar technologies on their own domains as part of their services. Those technologies are controlled by the relevant third party and are subject to that provider’s privacy terms.

Because Stat’sTheGame does not currently use non-essential advertising or analytics cookies, it does not currently display a cookie-consent banner. If tracking practices change, this notice and any necessary consent controls will be updated.

You can clear local storage and cookies through your browser settings. Clearing authentication storage may sign you out, and clearing a theme or saved fixture-context preference will cause the application to use its normal default behaviour again.

## 8. Service providers and recipients

To operate Stat’sTheGame, the project uses third-party technology providers. Personal information may be processed by or transmitted through providers including:

- **Google**, for Google OAuth authentication and the project’s Gmail inbox;
- **Supabase**, for managed authentication and hosted PostgreSQL services;
- **Microsoft Azure**, for backend hosting, private object storage, infrastructure and related services; and
- **Cloudflare**, for frontend hosting and delivery.

These providers process information according to their own service terms, privacy commitments and the configuration selected by the project team.

Stat’sTheGame may also disclose personal information where required by law, necessary to protect the rights or security of users or the service, or necessary to investigate unlawful activity.

We do not sell personal information to advertisers.

## 9. International processing and transfers

Some service providers used by Stat’sTheGame operate globally or may process information in countries outside South Africa.

Where personal information is transferred outside South Africa, the project team will seek to use providers and arrangements that provide appropriate protection consistent with POPIA, including the requirements governing transfers of personal information outside the Republic.

## 10. Retention

We aim to retain personal information only for as long as reasonably necessary for the purpose for which it was collected, or for another lawful purpose.

In particular:

- account information is retained while the account is active and as needed to operate the service;
- raw private batch source files are retained for **90 days from receipt**, subject to an explicitly authorised legal or licensing hold;
- security and operational records are retained only for as long as reasonably necessary for security, troubleshooting, audit or legal purposes;
- email correspondence is retained for as long as reasonably necessary to resolve the relevant request or maintain an appropriate record of it; and
- provenance and audit records connected to accepted cricket data may be retained after account deletion where necessary to preserve the reproducibility, integrity and traceability of published statistics.

Where retained information no longer needs to identify a person, we seek to remove or replace identifying information.

## 11. Account deletion

Authenticated users may request account deletion through the application where that function is available or by emailing **statsthegame@gmail.com**.

When an account deletion is completed:

- the managed Supabase Auth identity is deleted;
- the application removes the user’s display name, role, submitter approval and competition scopes;
- the application account is permanently disabled;
- the external authentication subject is replaced so that the deleted identity is no longer attached to the retained account record; and
- the browser’s managed local authentication session is cleared.

Stat’sTheGame retains a non-identifying internal account record and limited revocation information where necessary to prevent an already-issued authentication token from recreating a deleted account.

Accepted cricket submissions, deliveries, corrections, derived statistics, checksums, validation evidence and provenance relationships may remain after deletion because they form part of the historical and reproducible record of published cricket data. Retained public cricket data should no longer be associated with the deleted user’s Google identity or display name.

If an automated deletion cannot be completed, contact **statsthegame@gmail.com** so that the team can investigate and complete or reconcile the request.

## 12. Security

Stat’sTheGame uses technical and organisational measures intended to protect personal information, including managed authentication, backend authorisation, scoped permissions, HTTPS, private object storage, access controls, secret management, input validation and security testing.

No online service can guarantee absolute security. If we have reasonable grounds to believe that personal information has been accessed or acquired by an unauthorised person, we will investigate and, where required by POPIA, notify the Information Regulator and affected data subjects as soon as reasonably possible.

Security vulnerabilities should be reported privately to **statsthegame@gmail.com** and not posted publicly with exploitable details.

## 13. Your privacy rights

Subject to applicable law, you may contact us to:

- ask whether we hold personal information about you;
- request access to personal information we hold about you;
- request correction of information that is inaccurate, incomplete, misleading or out of date;
- request deletion or destruction of personal information that we are no longer authorised to retain;
- object to certain processing where POPIA permits an objection;
- withdraw consent where processing is based on consent, without affecting processing that was lawful before withdrawal; or
- raise a concern about how your personal information is processed.

We may need reasonable proof of identity before giving access to or changing personal information.

Send requests to **statsthegame@gmail.com**.

## 14. Complaints to the Information Regulator

If you believe that your personal information has been processed in breach of POPIA, you may first contact us at **statsthegame@gmail.com** so that we can investigate.

You also have the right to lodge a complaint with the **Information Regulator (South Africa)**.

**Information Regulator (South Africa)**
Woodmead North Office Park
54 Maxwell Drive
Woodmead, Johannesburg, 2191
South Africa

**POPIA complaints:** POPIAComplaints@inforegulator.org.za
**General enquiries:** enquiries@inforegulator.org.za
**Telephone:** 010 023 5200
**Toll free:** 0800 017 160
**Website:** https://inforegulator.org.za/

## 15. Changes to this notice

We may update this Privacy Notice when the application, its providers, its data practices or applicable requirements change.

The current version will be published with an updated effective or last-updated date. Material changes affecting how personal information is processed will be communicated through an appropriate channel where reasonably practicable.

## 16. Contact

For privacy questions, access or correction requests, account-deletion assistance or other concerns:

**Stat’sTheGame Student Project Team**
**Email:** statsthegame@gmail.com
**Correspondence address:** Private Bag 3, Wits, 2050, South Africa

---

## References

- Protection of Personal Information Act 4 of 2013: https://www.gov.za/documents/protection-personal-information-act
- Information Regulator (South Africa): https://inforegulator.org.za/

## AI Declaration

The preceding document was planned and generated with the assistance of ChatGPT-Web[GPT-5.6 Sol].
The saved fixture-context browser-storage disclosure was updated with the assistance of Codex[GPT-5].
