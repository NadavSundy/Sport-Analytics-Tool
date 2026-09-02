# Private object-storage operations

Issue #358 implements the provider-independent `ObjectStore` boundary and its production Azure Blob
Storage adapter. The storage account and container are deployment resources and are not created by
the application.

## Provisioning and access

- Use a general-purpose v2 Azure Storage account and an `incoming` container with anonymous access
  disabled. Disable account-wide public blob access.
- Give only the API and batch-worker managed identities the minimum Blob Data Contributor access
  required for upload, download, and lifecycle deletion. Do not grant browser identities, public
  users, or the frontend access to the container.
- Construct `AzureBlobObjectStore` with a server-side `ContainerClient`. The adapter does not issue
  URLs or signed tokens and does not expose provider credentials through its interface.
- Enable secure transfer. Apply network restrictions, soft delete, versioning, and abandoned-block
  cleanup according to ADR-011 before enabling the batch receipt endpoint.
- Keep Azure SDK HTTP logging disabled for payload bodies and authorisation headers. Application logs
  may contain only the application object ID and safe lifecycle state, never source content,
  submitted paths, provider URLs, connection strings, account keys, or SAS tokens.

The application generates every Blob key as an opaque UUID under a date-partitioned
`incoming/batch-source` prefix. A submitted filename is sanitised and retained only as display and
provenance metadata. The 50 MB limit and SHA-256 calculation are enforced while bytes flow through
the backend, both before the metadata is marked retained and again on download.

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

## Credential and identity rotation

Managed identity is the normal production credential and avoids an application-held secret. Rotate
access by granting the replacement identity the same least-privilege role, verifying upload and
authorised download through the backend, moving the deployment to the new identity, and only then
removing the old role assignment. A storage account or container move follows the same overlap,
verification, cutover, and revocation sequence.

If an account key or connection string is temporarily required for recovery, store it only in the
Azure App Service or Container App secret settings. Use Azure's two-key sequence: switch the
application to the inactive key, verify storage operations, regenerate the old key, and remove the
temporary secret after managed-identity access is restored. Never place either key in source,
frontend configuration, command output, tickets, or logs. Revoke a suspected exposed key first when
the incident risk outweighs availability, then reconcile any interrupted storage operations.

## Related records

- [ADR-011: Private Azure Blob Storage with PostgreSQL provenance](../../evidence/decisions/ADR-011-file-and-object-storage.md)
- [Batch staging, file storage and processing pipeline](../architecture/batch-ingestion-pipeline.md)
- [Privacy and retention](../security/privacy-retention.md)

## AI Declaration

This operations guide was created with the assistance of Codex[GPT-5].
