# Database Inspection Policy

`database-inspect.mjs` is an evidence tool, not a data browser. Its output must
remain useful to AI programmers without exposing private couple data.

## Permitted metrics

- model and collection names already represented in source
- estimated document counts
- declared and actual index names/key shapes
- missing declared index signatures
- count/percentage of records containing an explicitly approved field
- count/percentage of array elements containing an approved ownership field
- duplicate group counts without duplicate key values
- MongoDB topology category and transaction support

## Forbidden output

- raw or sampled documents
- names, messages, notes, mood text, health values or financial values
- photo paths, signed URLs or storage object keys
- user IDs, couple IDs, emails, pair codes or tokens
- connection strings, hosts, credentials or database names
- duplicate key values

## Inspection policy file

`scripts/ai/inspection-policy.json` contains the only field-level metrics that
are collected. Add a metric only when an Issue or migration needs it.

Each entry should answer:

- why the field matters
- whether the metric is document-level or array-element-level
- what decision will be made from the result
- when the metric can be removed

The initial policy checks couple scope for postgraduate progress, actor identity
on postgraduate check-ins, and duplicate couple progress records. The check-in metric is especially relevant while PR #1
and legacy records without `userId` remain unresolved.

## Performance and production safety

The inspector uses one connection and a small pool. Field and duplicate metrics
use aggregation and can scan the affected collection. Before adding broad
metrics to a large collection, review query cost and run during an appropriate
operational window.

A passed inspection means the script completed. It does not mean the data model
is correct; findings must be interpreted against `DATABASE_CONTRACT.md` and the
related acceptance criteria.
