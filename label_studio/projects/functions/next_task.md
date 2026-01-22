# Label Stream: Next Task Selection (LSE)

This doc summarizes how Label Studio Enterprise selects the next task for labeling, based on the current code in `label_studio/projects/functions/next_task.py` and LSE-specific logic from `label_studio_enterprise/lse_projects/functions.py`.

Notes
- Queue labels shown in the UI (e.g. "Ground truth queue", "Show overlap first") indicate which strategies were attempted, not always the final source of the selected task.
- Feature flags impact ordering and inclusion at several steps (see Legend below).

## High-level flow

```mermaid
flowchart TD
  A["Input: prepared_tasks, dm_queue, assigned_flag, user, project"] --> B

  subgraph Build candidate pool not_solved_tasks
    B[Start from prepared_tasks] --> B1[Exclude tasks annotated by this user]
    B1 --> B2[Exclude user's postponed drafts]
    B2 --> B3{assigned_flag?}
    B3 -- yes --> B5[Skip agreement logic] --> B7

    B3 -- no --> B4{"LSE low-agreement path?<br/>fflag OPTIC-161<br/>agreement_threshold set<br/>user is annotator"}
    B4 -- yes --> B6["Filter by agreement threshold<br/>and annotator capacity"] --> B7[Optionally prioritize by low agreement]

    B4 -- no --> B8{"Evaluation mode?<br/>fflag ALL-LEAP-1825<br/>annotator_evaluation_enabled"}
    B8 -- yes --> B7
    B8 -- no --> B9[Filter: is_labeled=false] --> B7
  end

  B7 --> C{dm_queue?}
  C -- yes --> DM["Data manager queue<br/>not_solved_tasks.first()"] --> K
  C -- no --> D

  subgraph No DM queue path
    D{assigned_flag?} -- yes --> M["Manually assigned queue<br/>first() from not_solved_tasks"] --> K
    D -- no --> E["Check existing lock for user<br/>if exists: Task lock"] --> F

    F{prioritized_low_agreement?} -- yes --> LAL["Low agreement queue<br/>first unlocked"] --> K
    F -- no --> G

    G{"GT-first gating?<br/>should_attempt_ground_truth_first(user, project)"} -- yes --> GT["Ground truth queue<br/>_try_ground_truth()"] --> H
    G -- no --> H

    H{project.maximum_annotations > 1?} -- yes --> BF["Breadth first queue<br/>_try_breadth_first()"] --> I
    H -- no --> I

    I{"FF overlap-after?<br/>fflag FIX-BACK-LSDV-4523 AND show_overlap_first<br/>AND no next_task"}
    I -- yes --> OF["Filter to overlap>1<br/>Show overlap first"] --> S
    I -- no --> S

    S{next_task selected?}
    S -- yes --> P[Check post-queues]
    S -- no --> T{project.sampling}
    T -- Sequence --> SQ["Sequence queue<br/>first unlocked"] --> P
    T -- Uncertainty --> AL["Active learning or random queue"] --> P
    T -- Uniform --> UR["Uniform random queue<br/>random unlocked"] --> P
  end

  subgraph Post queues user-specific
    P --> PD["Postponed draft queue<br/>user drafts: was_postponed=true, is_labeled=false"] --> SK
    SK["Skipped queue (REQUEUE_FOR_ME)<br/>user annotations: was_cancelled=true, is_labeled=false"] --> K
  end

  K["Finalize<br/>- Set task lock if required<br/>- add_stream_history()<br/>- return next_task + queue_info"]
```

## Legend and flags

- fflag FIX-BACK-LSDV-4523 (Overlap First Ordering): applies the "Show overlap first" filtering after GT/low-agreement/breadth-first attempts; otherwise, it is applied earlier while building the candidate pool.

### GT-first gating
- `should_attempt_ground_truth_first(user, project)` returns true when:
  - `annotator_evaluation_enabled=True` and `annotator_evaluation_onboarding_tasks > 0` and the user's completed GT-equipped tasks < `annotator_evaluation_onboarding_tasks`.
- Otherwise returns false (GT-first disabled; proceed via low-agreement/overlap/sampling).

## Queue labels appended to response

The `queue_info` string aggregates labels as specific stages are attempted:
- "Manually assigned queue" when `assigned_flag` path is used.
- "Task lock" when returning a task already locked by the user.
- "Low agreement queue" when the prioritized low-agreement branch returns a task.
- "Ground truth queue" when GT is attempted (label may appear even if selection falls through).
- "Breadth first queue" for in-progress tasks (when `maximum_annotations > 1`).
- "Show overlap first" when overlap filtering is applied.
- Sampling labels:
  - "Sequence queue"
  - "Active learning or random queue" (uncertainty)
  - "Uniform random queue"
- Post queues:
  - "Postponed draft queue"
  - "Skipped queue"

## References
- Core selection: `label_studio/projects/functions/next_task.py`
- LSE agreement & counters: `label_studio_enterprise/lse_projects/functions.py`


