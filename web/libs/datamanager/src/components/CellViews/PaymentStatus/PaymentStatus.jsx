import clsx from "clsx";
import { cn } from "../../../utils/bem";
import { Tooltip, Userpic } from "@humansignal/ui";
import "./PaymentStatus.prefix.css";

// When one user has multiple line-level statuses, this order picks the most advanced for the badge.
const STATUS_PRIORITY = ["approved", "in_payout", "paid", "excluded"];

// Maps API status strings to CSS modifiers and short labels on the avatar badge.
// UI naming: the API status key stays "approved", but the user-facing label is "Ready for
// payment" — the payments "approve" wording was renamed in the UI only, to disambiguate it from
// review-approve and batch-approve. Keep the "approved" key (it's the value the API sends).
const STATUS_CONFIG = {
  approved: { mod: "approved", label: "Ready for payment" },
  in_payout: { mod: "in-payout", label: "In batch" },
  paid: { mod: "paid", label: "Paid" },
  excluded: { mod: "excluded", label: "Excluded" },
};

// Show a bounded number of distinct payees per cell so wide tasks stay readable in the grid.
const MAX_VISIBLE = 4;

const statusCN = cn("payment-status");
const badgeCN = cn("payment-badge");

// Collapse multiple payment line items into one object per workforce user for stacked userpics.
function groupByUser(items) {
  const map = new Map();
  for (const item of items) {
    const uid = item.user_id;
    if (!map.has(uid)) {
      map.set(uid, {
        user_id: uid,
        email: item.email,
        username: item.username,
        first_name: item.first_name,
        last_name: item.last_name,
        avatar: item.avatar,
        statuses: new Set(),
        workTypes: new Set(),
      });
    }
    const entry = map.get(uid);
    entry.statuses.add(item.status);
    entry.workTypes.add(item.work_type);
  }
  return Array.from(map.values());
}

// Surfaces the dominant lifecycle state in the corner badge when a user has mixed rows.
function pickDisplayStatus(statuses) {
  for (const s of STATUS_PRIORITY) {
    if (statuses.has(s)) return s;
  }
  return STATUS_PRIORITY[0];
}

// Userpic fallback when names are missing—keeps avatars identifiable in dense lists.
function getInitials(group) {
  const fromNames = `${group.first_name?.[0] ?? ""}${group.last_name?.[0] ?? ""}`.toUpperCase();
  if (fromNames) return fromNames;
  if (group.username?.length) return group.username.slice(0, 2).toUpperCase();
  if (group.email?.length) return group.email.slice(0, 2).toUpperCase();
  return "U";
}

// Data Manager cell: shows who is on the payment track for this task and at what lifecycle stage.
export const PaymentStatus = (cell) => {
  const { value } = cell;

  // No payment rows yet—hide the column chrome so non-pay tasks stay clean.
  if (!value || !Array.isArray(value) || value.length === 0) {
    return null;
  }

  const groups = groupByUser(value);
  const visible = groups.slice(0, MAX_VISIBLE);
  const overflow = groups.length - MAX_VISIBLE;

  return (
    <div className={statusCN.toClassName()}>
      {visible.map((g) => {
        const user = {
          id: g.user_id,
          email: g.email,
          username: g.username,
          first_name: g.first_name,
          last_name: g.last_name,
          avatar: g.avatar,
          initials: getInitials(g),
        };

        const status = pickDisplayStatus(g.statuses);
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.approved;

        const roles = Array.from(g.workTypes)
          .map((w) => (w === "annotation" ? "Annotator" : "Reviewer"))
          .join(", ");
        const allStatuses = Array.from(g.statuses)
          .map((s) => STATUS_CONFIG[s]?.label || s)
          .join(", ");

        const displayName =
          [g.first_name, g.last_name].filter(Boolean).join(" ") || g.username || g.email || `User ${g.user_id}`;
        const identity = g.email ? `${displayName} (${g.email})` : displayName;
        // Full tooltip supports ops: identity, roles, and every raw status on underlying items.
        const tooltipText = `${identity} — ${roles} · ${allStatuses}`;

        return (
          <div key={`ps-${g.user_id}`} className={statusCN.elem("item").toClassName()}>
            <Tooltip title={tooltipText}>
              <Userpic
                user={user}
                badge={{
                  bottomRight: (
                    <div className={clsx(badgeCN.toClassName(), badgeCN.mod({ [cfg.mod]: true }).toClassName())} />
                  ),
                }}
              />
            </Tooltip>
          </div>
        );
      })}
      {/* +N communicates additional payees without expanding column width. */}
      {overflow > 0 && (
        <div className={statusCN.elem("item").toClassName()}>
          <Userpic addCount={`+${overflow}`} />
        </div>
      )}
    </div>
  );
};
