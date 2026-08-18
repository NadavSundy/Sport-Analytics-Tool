# Password recovery ownership

## Decision

The Sport Analytics Tool does not implement its own forgotten-password or password-reset flow
while Google OAuth is the only supported sign-in method.

Users authenticate with their Google Account through Supabase Auth. The application does not
create, receive, store, verify or change the password for that account. A user who cannot sign in
because they have forgotten their Google Account password must use
[Google Account recovery](https://support.google.com/accounts/answer/41078).

This provider-managed recovery satisfies the password-recovery requirement without duplicating a
security-sensitive identity workflow inside the application.

## Project requirement alignment

The project brief requires users to be able to sign up, sign in, reset their passwords and delete
their accounts. It also prohibits the team from writing its own authentication system and requires
the use of established practices and libraries.

The selected architecture satisfies those requirements by using:

- Google OAuth 2.0 as the established federated sign-in practice;
- Supabase Auth and its maintained `@supabase/supabase-js` library to broker authentication and
  manage application sessions; and
- Google's established account-recovery process to reset the Google Account credential.

The password-reset requirement does not mean the application must own a password-reset screen. It
means that users must have an established recovery path appropriate to the selected authentication
method. For Google OAuth identities, that path is Google Account recovery. Building custom password
handling would cross the provider boundary and conflict with the requirement to rely on established
authentication practices and libraries.

## Credential ownership

| Component            | Responsibility                                                                 |
| -------------------- | ------------------------------------------------------------------------------ |
| Google               | Verifies the user's Google Account and owns its password and recovery process. |
| Supabase Auth        | Brokers the Google OAuth flow and issues the application's managed session.    |
| React frontend       | Starts Google sign-in and uses the resulting Supabase session.                 |
| Express backend      | Validates the Supabase access token and loads application permissions.         |
| Application database | Stores application roles and data, but no authentication password.             |

OAuth allows the user to authenticate with Google without sharing their password with either
Supabase or the Sport Analytics Tool. The application receives a managed identity and tokens after
Google has authenticated the user; it never receives a credential that it could reset.

## Why an application reset would not reset Gmail

A Gmail password is the password for the wider Google Account and may also protect services such as
Google Drive and YouTube. Only Google's account-recovery service can verify ownership and change
that password.

The standard Supabase password-recovery API, `resetPasswordForEmail`, belongs to Supabase's
**email/password** authentication method. It does not call Google's account-recovery service and
has no authority to change a Google Account password.

If the project added the normal Supabase recovery screens for an existing Google OAuth user, the
resulting `updateUser({ password: ... })` operation could add a separate Supabase email/password
sign-in method to that user's Supabase account. The new password would work only for the Sport
Analytics Tool's Supabase authentication. It would not change the user's Google Account or Gmail
password.

The user could then have two distinct ways to authenticate:

1. Google OAuth, using a credential controlled by Google; and
2. Supabase email/password, using a separate credential controlled by Supabase Auth.

Presenting that operation as a Google or Gmail password reset would therefore be inaccurate and
misleading.

## Why a second password method is not introduced

Adding Supabase email/password authentication solely to satisfy
[issue #65](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/issues/65) would expand the
authentication architecture rather than complete the existing Google OAuth flow. It would require:

- an approved product and architecture decision for a second sign-in method;
- password sign-up and sign-in interfaces in addition to recovery screens;
- email verification, redirect allow-list and production SMTP configuration;
- password-policy, rate-limit, abuse-prevention and account-enumeration controls;
- testing of automatic identity linking and account-recovery edge cases; and
- ongoing user support for two independent credentials associated with one application account.

That scope is unnecessary for the current Google-only sign-in journey and would create additional
security and support obligations.

## User journey

When a user cannot access the application because they have forgotten their Google Account
password:

1. the application directs them to Google Account recovery;
2. Google verifies that they own the account;
3. Google changes the Google Account password; and
4. the user returns and selects **Login or Sign up** to complete Google OAuth again.

The Sport Analytics Tool must not collect a Google password, send a password-reset email that
claims to reset Google, or provide a form that suggests it can change Gmail credentials.

## Issue #65 conclusion

Issue #65 was written with a dependency on Supabase email/password authentication. That dependency
is not part of the implemented architecture: the product currently supports Google OAuth only.

The issue should therefore be resolved through this documented provider-owned recovery journey,
without implementing forgotten-password pages or calling `resetPasswordForEmail`. It should be
reopened as implementation work only if the team separately approves Supabase email/password as an
additional authentication method.

## References

- [Supabase social login](https://supabase.com/docs/guides/auth/social-login)
- [Supabase password-based authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Google Account password recovery](https://support.google.com/accounts/answer/41078)

## AI Declaration

This password-recovery decision was documented with the assistance of Codex[GPT-5].
