// .gaia/rules/skills/w-deploy.ts — rules owned by `w-deploy`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'w-deploy' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'w-deploy' as const

export const wDeployRules = [
  {
    id: 'deployment/promote-digest',
    skill: 'w-deploy',
    description: 'Image deploys reference content-addressable digests, not floating tags.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'digest-deploy' },
  },
  {
    id: 'deployment/preview-env-per-pr',
    skill: 'w-deploy',
    description: 'Every PR opens a preview deployment + preview database (Neon branch).',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'preview-env' },
  },
  {
    id: 'deployment/three-health-checks',
    skill: 'w-deploy',
    description:
      'Three endpoints: /health (liveness), /health/ready (readiness), post-deploy synthetic test.',
    tier: 'lint',
    mechanism: { kind: 'ci', job: 'health-routes' },
  },
  {
    id: 'deployment/rollback-mttr',
    skill: 'w-deploy',
    description: '≤5 minute rollback MTTR; previous image digest reachable; runbook exists.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'rollback-runbook' },
  },
  {
    id: 'deployment/ttfd-30min',
    skill: 'w-deploy',
    description: 'New operator reaches green /health/ready in ≤30 minutes from clone.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/first-deploy-audit.ts' },
  },
] as const satisfies readonly Rule[]
