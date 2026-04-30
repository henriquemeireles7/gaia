# infra/iii/Dockerfile — iii engine for Gaia (thin wrapper).
#
# The official image (iiidev/iii) is distroless, runs as non-root UID
# 65532, and has the right entrypoint baked in. We add Gaia's config
# at /app/config.yaml — that's it. No need to reinstall the binary.
#
# Source repo: https://github.com/iii-hq/iii
# Image:       https://hub.docker.com/r/iiidev/iii

# Pinned to digest for supply-chain integrity. Renovate keeps this current.
ARG III_VERSION=latest@sha256:4e8d34f382e03501dc8376dd751b98b65eab122e4ea185a7a4d6f6619fa5c674
FROM iiidev/iii:${III_VERSION}

# Override the upstream development default. Gaia treats the engine as
# production-grade once deployed.
ENV III_ENV=production

# Bake the queue + retry policy in. Same file documented in
# packages/workflows/CLAUDE.md §5.
COPY iii-config.yaml /app/config.yaml

# Inherit ENTRYPOINT (/app/iii) and CMD (--config /app/config.yaml)
# from upstream. Inherit the four EXPOSEd ports too:
#   3111  HTTP API
#   3112  Streams API
#   49134 Worker WebSocket  (gaia-api connects here)
#   9464  Prometheus metrics
