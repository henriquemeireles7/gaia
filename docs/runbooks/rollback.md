# Rollback runbook

> SLO: ≤5 minute rollback MTTR.

When prod is broken, roll back. Don't debug forward. Investigation happens
after recovery.

## Decision tree (30 seconds)

1. Is `/health/ready` returning 200? → not a deploy issue, see oncall guide.
2. Did the bad code ship in the most recent deploy? → **roll back** (below).
3. Is the bad code 2+ deploys old? → forward-fix is fine; roll back only if
   the regression is user-visible and severe.

## Roll back via Railway (primary)

Railway's redeploy promotes a previous image digest. The previous deploy's
digest is reachable for 30 days.

```sh
# List recent deploys for this service.
railway status

# Redeploy the previous successful build.
railway redeploy --previous

# Or pin to a specific digest:
railway redeploy --image registry.railway.app/<service>@sha256:<digest>
```

Verify recovery:

```sh
curl -fsS https://<your-prod-host>/health/ready
```

## Roll back via Fly (alt)

```sh
# List image digests for this app.
fly image show

# Redeploy a specific digest.
fly deploy --image registry.fly.io/<app>@sha256:<digest>
```

## After rollback

1. Open an incident issue with the digest you rolled back from + to.
2. Run `/d-fail` to diagnose, fix, and ship the forward fix.
3. Update this runbook if the rollback path itself failed.

## Pre-flight (do this once per service)

- [ ] Confirm `railway redeploy --previous` works in staging.
- [ ] Confirm at least 5 prior digests are retained.
- [ ] Confirm /health/ready accurately reflects DB connectivity.
