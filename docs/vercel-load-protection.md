# Vercel launch protection checklist

Status: preparation only. No Vercel project is linked, no application deployment or firewall rule is active from this task. Database-backed write limits and Storage protection already operate in Supabase.

## Application preparation

Simultaneous recipe reads in one Node instance share one in-flight database request. Results are not cached after completion, preserving current freshness and write behavior. This is not cross-instance protection and does not replace edge rate limiting.

## Configure when deploying

- Link the intended Vercel project before staging firewall rules. Inspect its plan and supported rate-limit settings first.
- Stage per-IP limits at Vercel: start with 120 recipe reads/minute, 10 recipe submissions/minute and 5 admin attempts/minute. These are starting budgets, not measured capacity; tune against legitimate traffic and NAT sharing.
- Retain the existing global database write budgets as an additional ceiling; inspect their suitability before opening to many simultaneous users. Per-IP edge budgets must not trust arbitrary client-supplied forwarding headers.
- Use managed bot protection and provider DDoS mitigation; avoid browser challenges on API routes unless the client explicitly supports them.
- Configure usage alerts and spending controls available on the chosen plan. Do not promise that rate limiting prevents all DDoS or all billing exposure.
- For sustained growth, replace full-catalog reads with paginated summaries and direct recipe-by-ID queries, then add cache invalidation for writes before enabling CDN caching. Current full-catalog responses must not be described as production-scale optimized.
- Run a bounded, authorized load test against an isolated preview with test data. Measure p95 latency, errors, database usage, and cached versus uncached requests. No public-hosting load test has been run.

Official references: https://vercel.com/docs/vercel-firewall and https://vercel.com/docs/cli/firewall
