# Dedicated CI runner operations

The Sport Analytics Tool repository has a dedicated repository-scoped Gitea
Actions runner that supplements the shared Wits runners.

The dedicated runner provides additional CI capacity when the course-wide
runners are busy. It does not replace the shared runners.

## Runner overview

| Setting            | Value                       |
| ------------------ | --------------------------- |
| Runner name        | `sport-analytics-runner-1`  |
| Scope              | Repository                  |
| Gitea label        | `ubuntu-24.04`              |
| Runner capacity    | 1 concurrent job            |
| Runner version     | v3.3.2                      |
| Host               | Azure Linux virtual machine |
| Region             | Central India               |
| VM size            | `Standard_B2als_v2`         |
| Compute            | 2 vCPU, 4 GiB RAM           |
| OS                 | Ubuntu Server 24.04 LTS     |
| OS disk            | 64 GiB Standard SSD         |
| Swap               | 4 GiB                       |
| Container runtime  | Docker                      |
| Automatic shutdown | 22:00 South Africa time     |

The repository runner uses the same `ubuntu-24.04` label as the two shared
course runners. Existing workflows therefore do not need special routing:
jobs may execute on the repository runner or an available shared runner.

If the Azure runner is off, CI continues using the shared Wits runners.

## Normal team usage

The virtual machine is kept off when additional CI capacity is not required.

To enable the dedicated runner:

1. Sign in to the Azure portal using an authorised team account.
2. Open **Virtual machines**.
3. Open `sport-analytics-runner-1`.
4. Select **Start**.
5. Wait for the VM status to become **Running**.
6. In Gitea, open **Settings → Actions → Runners**.
7. Confirm `sport-analytics-runner-1` appears as `Idle` or `Active`.

No SSH access or manual Docker commands are required during normal use.

The runner container uses Docker's `--restart always` policy and starts
automatically when the VM boots.

When work finishes early, the VM should be stopped and deallocated through
Azure. If it is left running, Azure's automatic shutdown stops it at 22:00
South Africa time.

## Shared-runner fallback

The dedicated runner supplements the shared runners:

- `sdp-runner-1`
- `sdp-runner-2`

All three advertise the `ubuntu-24.04` label.

Stopping the Azure VM does not disable repository CI. Jobs remain eligible for
the shared runners, although they may queue when course-wide demand is high.

## Runner architecture

The Gitea runner runs inside a Docker container on the Azure VM.

Persistent runner state is stored at:

```text
/opt/gitea-runner/data
```

The registered runner identity is stored in:

```text
/opt/gitea-runner/data/.runner
```

The `.runner` file is permission-restricted and must not be edited, copied into
the repository, or exposed in logs.

The reusable repository registration token was removed from the VM after the
runner successfully registered. Normal runner restarts therefore use the
persisted runner identity rather than a reusable registration token.

The Docker socket is mounted into the runner container so Gitea Actions can
create isolated job containers.

## Resource configuration

The VM currently uses:

- 2 vCPU;
- 4 GiB RAM;
- 4 GiB swap;
- 64 GiB Standard SSD storage;
- runner capacity of one job.

The runner capacity intentionally remains `1`. Increasing runner-level
concurrency on this small VM could create CPU or memory contention, especially
for Playwright/Chromium workloads.

The host uses a low swap tendency so physical memory remains preferred:

```text
vm.swappiness=10
```

## Health checks

SSH access is only required for runner administration.

Useful commands on the VM are:

```bash
free -h
df -h /
docker ps
docker logs sport-analytics-runner-1 --tail 50
docker stats --no-stream
```

A healthy runner container should appear in `docker ps` and its logs should
contain a successful runner declaration similar to:

```text
runner: sport-analytics-runner-1
labels: [ubuntu-24.04]
declare successfully
```

Gitea should show the runner as `Idle` when it is available or `Active` while
executing a job.

## Restarting the runner container

If the runner container stops unexpectedly:

```bash
docker restart sport-analytics-runner-1
docker logs sport-analytics-runner-1 --tail 50
```

If the container must be recreated, preserve `/opt/gitea-runner/data`.

The current container can be recreated with:

```bash
docker run -d \
  --name sport-analytics-runner-1 \
  --restart always \
  -e GITEA_INSTANCE_URL="https://sdp.ms.wits.ac.za/" \
  -e GITEA_RUNNER_NAME="sport-analytics-runner-1" \
  -e GITEA_RUNNER_LABELS="ubuntu-24.04:docker://docker.gitea.com/runner-images:ubuntu-24.04" \
  -v /opt/gitea-runner/data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker.io/gitea/runner:3
```

Do not add the original registration token when recreating an already
registered runner while its persisted `.runner` state remains available.

## Security

The runner is repository-scoped rather than global.

Operational controls include:

- SSH public-key authentication;
- no password-based runner administration;
- repository-scoped Gitea runner registration;
- removal of the reusable registration token after setup;
- restricted permissions on `.runner`;
- runner capacity limited to one;
- team Azure access granted without sharing the Azure account owner's
  credentials or SSH private key.

The private SSH key, `.runner` contents, Gitea registration tokens and other
credentials must never be committed to the repository.

## Team Azure access

Authorised team members can start and stop the runner VM through Azure without
receiving the Azure account owner's password or SSH private key.

Team access is granted using Azure RBAC at the individual VM scope with the
`Virtual Machine Contributor` role.

Normal team use is:

1. Open the Azure portal.
2. Open **Virtual machines**.
3. Select `sport-analytics-runner-1`.
4. Select **Start** when additional CI capacity is required.
5. Wait for the VM to report **Running**.
6. Confirm the runner appears in Gitea under **Settings → Actions → Runners**.
7. When finished early, select **Stop** and allow Azure to deallocate the VM.

The role assignment is scoped only to the CI runner VM rather than the entire
subscription or resource group.

## Cost controls

The VM uses Azure for Students credit and is intentionally operated as
additional capacity rather than an always-on service.

The VM:

- is started when the team needs extra CI capacity;
- may be manually deallocated when work finishes;
- automatically shuts down at 22:00 South Africa time;
- can remain off without breaking CI because shared Wits runners remain
  available.

The VM is currently priced at approximately `$0.0246/hour` for compute in the
selected Azure region. The displayed monthly Azure estimate assumes continuous
24-hour operation; actual compute cost is lower when the VM is deallocated
outside active development periods.

This keeps compute usage proportional to actual development activity.

## Operational failure modes

### Runner is not visible in Gitea

First confirm the Azure VM is running.

If the VM is running, connect through SSH and check:

```bash
docker ps
docker logs sport-analytics-runner-1 --tail 50
```

If the container is stopped:

```bash
docker start sport-analytics-runner-1
```

If the container is unhealthy:

```bash
docker restart sport-analytics-runner-1
```

### Runner is visible but CI jobs are queued

The runner may already be executing its single allowed concurrent job.

Check Gitea **Settings → Actions → Runners**:

- `Idle` means the runner is available.
- `Active` means it is currently processing work.

Because runner capacity is intentionally `1`, additional jobs may execute on
the shared Wits runners or wait until capacity becomes available.

### Azure runner is unavailable

No CI workflow changes are required.

The repository workflows continue using the shared Wits runners because they
advertise the same `ubuntu-24.04` label.

### VM memory pressure

Check:

```bash
free -h
docker stats --no-stream
```

The VM has 4 GiB RAM and 4 GiB swap.

If sustained memory pressure occurs, first inspect the running workload rather
than immediately increasing runner concurrency or VM size.

### Disk usage is high

Check:

```bash
df -h /
docker system df
```

Unused Docker data can be reviewed before cleanup.

Do not run destructive Docker cleanup commands without first confirming that
required runner images or active job resources will not be affected.

## Verification performed

The runner setup was verified by:

- successful Docker installation and `hello-world` execution;
- successful repository-scoped Gitea registration;
- runner visibility in Gitea as `sport-analytics-runner-1`;
- execution of a real hosted Sport Analytics CI task;
- recreation of the runner container using the persisted `.runner` identity;
- successful re-declaration without the reusable registration token;
- removal of the registration token from the VM;
- restriction of `.runner` permissions to `600`;
- runtime memory and swap checks during hosted CI activity;
- successful full main CI/CD execution while the dedicated runner was
  available.

The dedicated runner therefore provides additional repository CI capacity while
preserving shared-runner fallback and existing workflow behaviour.
