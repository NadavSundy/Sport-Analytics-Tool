# Issue #376 — Dedicated repository CI runner verification

Date: 2026-09-02

## Objective

Provide repository-specific Gitea Actions capacity so Sport Analytics CI is not
entirely dependent on the two course-wide shared runners.

The dedicated runner supplements the shared runners rather than replacing
them. When the Azure-hosted runner is unavailable, existing workflows remain
eligible for the shared Wits runners through the common `ubuntu-24.04` label.

## Provisioned infrastructure

A repository-scoped Gitea Actions runner was provisioned on Azure with the
following configuration:

| Setting            | Value                      |
| ------------------ | -------------------------- |
| Runner             | `sport-analytics-runner-1` |
| Gitea scope        | Repository                 |
| Gitea label        | `ubuntu-24.04`             |
| Runner version     | v3.3.2                     |
| Runner capacity    | 1                          |
| Azure region       | Central India              |
| VM size            | `Standard_B2als_v2`        |
| Compute            | 2 vCPU / 4 GiB RAM         |
| Operating system   | Ubuntu Server 24.04 LTS    |
| Disk               | 64 GiB Standard SSD        |
| Swap               | 4 GiB                      |
| Container runtime  | Docker                     |
| Automatic shutdown | 22:00 South Africa time    |

The existing shared runners remain:

- `sdp-runner-1`;
- `sdp-runner-2`.

All three advertise `ubuntu-24.04`, allowing the existing workflow definitions
to continue without runner-specific routing changes.

## Host verification

Docker was installed and verified successfully on the Azure VM.

A basic Docker execution test completed successfully using:

```bash
docker run --rm hello-world
```

The VM reported approximately:

```text
Memory total:     3.8 GiB
Memory available: 3.0 GiB
Swap total:       4.0 GiB
Swap used:        negligible
```

The root filesystem had approximately 59 GiB available after initial setup.

This confirmed that the selected 2-vCPU / 4-GiB VM had sufficient memory and
storage headroom during the observed CI activity.

## Runner registration

The runner was registered using a repository-scoped Gitea runner registration
token.

Gitea displayed the new runner as:

```text
sport-analytics-runner-1
Scope: Repository
Label: ubuntu-24.04
```

The runner successfully declared itself with the following observed log output:

```text
Starting runner daemon
runner: sport-analytics-runner-1, with version: v3.3.2, with labels: [ubuntu-24.04], declare successfully
```

The runner capacity remained at one concurrent job.

## Persistence and token removal

Persistent runner state is stored under:

```text
/opt/gitea-runner/data
```

The registered runner identity is stored in:

```text
/opt/gitea-runner/data/.runner
```

After successful registration:

1. the runner container was stopped and removed;
2. the container was recreated while preserving `/opt/gitea-runner/data`;
3. the runner successfully re-declared using the persisted `.runner` identity;
4. the reusable registration-token file was removed from the VM;
5. `.runner` permissions were restricted to `600`.

Observed verification:

```text
Registration token removed
-rw------- ... .runner
```

The recreated runner then reported:

```text
runner: sport-analytics-runner-1, with version: v3.3.2, with labels: [ubuntu-24.04], declare successfully
```

This verifies that normal runner operation no longer depends on retaining the
reusable registration token.

## Hosted CI verification

The repository-scoped runner accepted a real Sport Analytics hosted CI task.

While the runner was available, the repository's main CI/CD workflow completed
successfully across the configured pipeline, including:

- change-aware planning;
- repository validation;
- browser validation;
- database validation;
- required quality aggregation;
- frontend deployment;
- backend deployment;
- documentation deployment.

The new runner therefore operates as additional repository CI capacity while
preserving the existing shared-runner fallback model.

## Resource behaviour during CI

During hosted CI activity, VM resource usage was checked with:

```bash
free -h
docker stats --no-stream
```

Observed memory state was approximately:

```text
Mem total:       3.8 GiB
Mem available:   3.0 GiB
Swap total:      4.0 GiB
Swap used:       negligible
```

The observed workload therefore did not require increasing the VM to an
8-GiB instance.

Runner capacity remains intentionally limited to one concurrent job to avoid
CPU or memory contention on the 2-vCPU host.

## Security controls

The runner configuration includes the following controls:

- repository-scoped rather than global Gitea registration;
- SSH public-key authentication for administrative access;
- no retained reusable runner registration token;
- restricted permissions on the persisted `.runner` identity;
- runner capacity limited to one;
- no sharing of the Azure account owner's password;
- no sharing of the SSH private key;
- Azure RBAC used for team VM management access.

Team members are granted `Virtual Machine Contributor` access scoped to the
individual CI runner VM so they can start and deallocate the VM without gaining
subscription-wide administrative access.

## Operational model

Normal team use is:

1. Start `sport-analytics-runner-1` from the Azure portal when additional CI
   capacity is useful.
2. Wait for the VM status to become `Running`.
3. Confirm the runner appears as `Idle` or `Active` in Gitea.
4. Use the existing CI workflows normally.
5. Manually stop and deallocate the VM when additional capacity is no longer
   needed.
6. If left running, Azure automatically shuts the VM down at 22:00 South
   Africa time.

No SSH access or Docker commands are required during normal team usage.

If the Azure runner is off, CI continues using the two shared Wits runners.

## Cost controls

The VM uses Azure for Students credit.

The selected VM is intentionally treated as supplementary capacity rather than
an always-on service.

Cost controls include:

- a low-cost burstable VM size;
- Standard SSD rather than Premium SSD;
- manual VM start when additional capacity is required;
- manual deallocation when work finishes early;
- automatic shutdown at 22:00 South Africa time;
- shared Wits runners remaining available while the Azure runner is off.

This keeps compute usage proportional to actual development activity.

## Result

Issue #376's dedicated-runner infrastructure was successfully provisioned and
verified.

The repository now has access to an additional repository-scoped
`ubuntu-24.04` Gitea runner without replacing or disabling the shared Wits
runner pool.

The runner:

- successfully registered;
- accepted hosted work;
- retained its identity across container recreation;
- operates without retaining the reusable registration token;
- remained within the selected VM's resource capacity during verification;
- can be started and stopped by authorised team members;
- preserves existing CI behaviour when it is offline.

## AI declaration

The preceding document was generated with the assistance of:
ChatGPT-Web[GPT-5.6 Sol].

ChatGPT assisted with runner architecture, Azure VM configuration, Docker and
Gitea runner setup, operational security, cost-control planning, verification
steps and documentation structure. The resulting infrastructure and commands
were reviewed and executed by the student.
