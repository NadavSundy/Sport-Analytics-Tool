# Private object-storage operations

Issue #358 implements the provider-independent `ObjectStore` boundary and its production Azure Blob
Storage adapter. The storage account and container are deployment resources and are not created by
the application.

## Provisioning and access

- The development deployment uses storage account `statsthegameblobdev` and private container
  `staged-ingestion`. Anonymous container access and account-wide public Blob access must remain
  disabled.
- The backend App Service identity is `statsthegame-api-dev`. Azure must enable/assign that managed
  identity and grant it **Storage Blob Data Contributor** on the account or the narrower container
  scope. Do not grant browser identities, public users, or the frontend access to the container.
- Azure resources and RBAC assignments already exist outside this repository. The repository
  configures application startup and documents the required settings; its publish-profile workflow
  deploys code and does not create the account, container, identity, or role assignment.
- Production App Service configuration supplies only
  `AZURE_STORAGE_ACCOUNT_NAME=statsthegameblobdev` and
  `AZURE_STORAGE_CONTAINER_NAME=staged-ingestion`. These identifiers are non-secret App Settings.
- Enable secure transfer. Apply network restrictions, soft delete, versioning, and abandoned-block
  cleanup according to ADR-011 before enabling the batch receipt endpoint.
- Keep Azure SDK HTTP logging disabled for payload bodies and authorisation headers. Application logs
  may contain only the application object ID and safe lifecycle state, never source content,
  submitted paths, provider URLs, connection strings, account keys, or SAS tokens.

The application generates every Blob key as an opaque UUID under a date-partitioned
`incoming/batch-source` prefix. A submitted filename is sanitised and retained only as display and
provenance metadata. The 50 MB limit and SHA-256 calculation are enforced while bytes flow through
the backend, both before the metadata is marked retained and again on download.

## Production startup and authentication

When `NODE_ENV=production`, environment validation requires the account and container identifiers.
Startup derives the HTTPS endpoint
`https://statsthegameblobdev.blob.core.windows.net`, constructs `DefaultAzureCredential`, creates a
`BlobServiceClient`, resolves the configured `ContainerClient`, wraps it in
`AzureBlobObjectStore`, and injects that adapter into `BatchPayloadStorageService`. Constructing this
dependency path performs no storage request; the adapter checks that the container is private before
its first read, write, or delete.

On Azure App Service, `DefaultAzureCredential` obtains a Microsoft Entra token from the assigned
managed identity. Blob account keys, Azure Storage connection strings, SAS tokens,
`SharedKeyCredential`, and public or pre-signed Blob URLs are intentionally unsupported. Do not add
any of them to Gitea secrets, App Settings, source, tests, examples, or operational recovery steps.
Local and unit tests inject `FakeObjectStore` or constructor fakes and do not require an Azure
account.

## Immutable dataset release artifacts

Dataset publication uses the same private `ObjectStore` boundary and managed identity. Each attempt
writes to a server-generated `dataset-releases/<uuid>.json` key with the adapter's non-overwrite
condition. PostgreSQL reads accepted current deliveries in 10,000-row deterministic keyset pages;
the backend streams canonical JSON to Blob Storage and computes the event count and SHA-256 digest
as the exact UTF-8 bytes pass through. Only after the upload succeeds does it insert immutable
release metadata and the opaque storage key/provider version in PostgreSQL. The public artifact
endpoint streams the resolved private Blob through the backend and never exposes a provider URL or
credential.

Release artifacts have no scheduled expiry because the public version and checksum are permanent.
If paging, serialization, upload or metadata insertion fails, the attempt has no release row and the
backend deletes the generated key. A concurrent same-version publisher keeps the first immutable
row and deletes the losing attempt's unreferenced object. Reconciliation must also inspect the
`dataset-releases/` prefix for keys absent from `dataset_release`, because an Azure outage can prevent
request-time cleanup. It must never replace bytes referenced by an existing release; a missing or
checksum-mismatched release artifact is an integrity incident.

## Runtime verification and diagnosis

After deploying, verify through an authorised backend-only operational path that the runtime can:

1. write a disposable object using a server-generated key;
2. read it back and match its byte count and SHA-256 checksum; and
3. delete it and confirm a subsequent read is unavailable.

Do not verify by making the container public, exposing a Blob URL, or placing credentials in a
client. Until issue #277 introduces the authorised batch receipt boundary, this is an Azure-side or
temporary backend diagnostic performed by an operator, not a public HTTP workflow.

For `401` authentication failures, confirm the `statsthegame-api-dev` identity is enabled on the
running App Service and that the deployment is using the intended App Service instance. For `403`
authorisation failures, inspect the identity's role assignment scope and confirm **Storage Blob Data
Contributor** applies to `statsthegameblobdev` or `staged-ingestion`. New role assignments can take
time to propagate; wait for propagation and retry with the same managed identity rather than adding
a key, connection string, or SAS fallback. Also verify the account/container names, private-access
setting, secure-transfer requirement, and any storage-network restrictions. Record only safe status
and object IDs; do not dump environment variables, Azure SDK credential details, tokens, provider
URLs, or payloads.

## Recovery and reconciliation

PostgreSQL metadata and Blob bytes form one recoverable system even though they cannot share a
transaction. Schedule reconciliation to detect:

- retained metadata whose Blob is missing;
- generated Blob keys with no metadata record;
- `deletion_pending` or `deletion_failed` records requiring another delete attempt; and
- abandoned uncommitted blocks from interrupted uploads.

For a failed upload, the request fails closed and attempts to delete its generated key. No stored
object metadata or processable batch may be created. If cleanup cannot reach Azure, reconciliation
must delete the orphan; the key is safe to handle because it is generated and never reused.

For accidental deletion, use Azure soft delete or a retained version to restore the same generated
key. Stream the restored bytes through SHA-256 and compare the result and byte count with the
permanent `stored_object` record before returning the retention state to `retained`. A mismatch is
an integrity incident and must not be made processable.

Restore exercises must restore PostgreSQL and Blob Storage to an isolated environment, reconcile
both sides, verify representative checksums, and prove an authorised backend download. Restoring
only one side is incomplete. Record recovery point, recovery time, orphan count, missing-object
count, and checksum results as deployment evidence.

Raw batch bytes expire after 90 days through the retryable `deletion_pending` to `expired` workflow.
Expiry deletes only the Blob. The object ID, filename, media type, size, checksum, generated storage
key, retention timestamps, batch metadata, expanded items, and published-event provenance remain.

## Managed-identity changes

Managed identity is the only production credential and avoids an application-held storage secret.
There are therefore no Blob keys, SAS tokens, or connection strings for the application team to
rotate. Change identity access by granting the replacement identity the same least-privilege role,
verifying upload and authorised download through the backend, moving the deployment to the new
identity, and only then removing the old role assignment. A storage account or container move
follows the same overlap, verification, cutover, and revocation sequence.

Do not introduce a temporary account-key, connection-string, SAS, or shared-key recovery path. If
managed-identity access is unavailable, diagnose the identity, RBAC, networking, or Azure service
failure and keep file-dependent operations failed closed.

## Related records

- [ADR-011: Private Azure Blob Storage with PostgreSQL provenance](https://sdp.ms.wits.ac.za/git-push-pray/Sport-Analytics-Tool/src/branch/main/evidence/decisions/ADR-011-file-and-object-storage.md)
- [Batch staging, file storage and processing pipeline](../architecture/batch-ingestion-pipeline.md)
- [Privacy and retention](../security/privacy-retention.md)

## AI Declaration

This operations guide was created with the assistance of Codex[GPT-5].
The production managed-identity wiring and credential-safe operational guidance were updated with
the assistance of Codex[GPT-5]. The immutable dataset-release storage lifecycle was documented with
the assistance of Codex[GPT-5].
