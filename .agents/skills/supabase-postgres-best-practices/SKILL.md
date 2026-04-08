---
name: supabase-postgres-best-practices
description: Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
---

# Supabase Postgres Best Practices

Use this skill as a thin workflow wrapper around the bundled Supabase reference notes. The reference files contain the detailed SQL guidance; this file tells Codex when to load them and how to apply them.

## When to Apply

Use this skill when the task involves any of the following:
- Writing or reviewing SQL, migrations, functions, triggers, or views
- Designing tables, indexes, constraints, partitions, or primary keys
- Optimizing slow queries or diagnosing Postgres performance issues
- Reviewing Row Level Security or privilege design
- Choosing connection pooling, prepared statement, or concurrency patterns
- Working in Supabase-backed applications where Postgres behavior matters

## Rule Categories by Priority

Start with the highest-impact category that matches the task:

| Prefix | Category | Use For |
|--------|----------|---------|
| `query-` | Query performance | Missing indexes, bad plans, scans, index strategy |
| `conn-` | Connection management | Pooling, limits, prepared statements, serverless connection patterns |
| `security-` | Security and RLS | Privileges, policy design, auth-aware filtering, RLS performance |
| `schema-` | Schema design | Constraints, types, foreign keys, partitioning, identifiers |
| `lock-` | Concurrency and locking | Deadlocks, transaction scope, advisory locks, `skip locked` |
| `data-` | Data access patterns | N+1, batching, pagination, upserts |
| `monitor-` | Monitoring and diagnostics | `EXPLAIN ANALYZE`, `pg_stat_statements`, vacuum and analyze |
| `advanced-` | Advanced features | JSONB, full text search, feature-specific optimizations |

## How to Use

1. Classify the problem into one or two categories from the table above.
2. Read only the matching reference files from `references/`.
3. Apply the guidance to the actual SQL, schema, or migration in the repo.
4. Prefer concrete fixes over generic advice: propose the index, rewrite the query, tighten the policy, or change the schema.
5. If performance is the concern, explain the expected tradeoff in plain terms: fewer rows scanned, less lock time, lower connection pressure, or better policy execution.

Load `references/_sections.md` only if you need the category map.

Common entry points:
- `references/query-missing-indexes.md`
- `references/query-composite-indexes.md`
- `references/security-rls-basics.md`
- `references/security-rls-performance.md`
- `references/schema-foreign-key-indexes.md`
- `references/data-pagination.md`
- `references/conn-pooling.md`
- `references/monitor-explain-analyze.md`

## Working Style

- Default to the smallest change that materially improves correctness or performance.
- Do not recommend indexes or partitions without tying them to an actual query pattern.
- Treat RLS as both a correctness and performance concern.
- When multiple fixes are possible, prefer the one that reduces operational complexity.
- If the repo uses Supabase, align recommendations with managed Postgres constraints rather than generic self-hosted advice.

## References

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
