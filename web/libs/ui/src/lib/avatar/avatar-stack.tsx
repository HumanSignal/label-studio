import { type CSSProperties, forwardRef, useState } from "react";
import { userDisplayName } from "@humansignal/core/lib/utils/helpers";
import { Popover } from "../popover/popover";
import { SearchInput } from "../search-input/search-input";
import { Typography } from "../typography/typography";
import { Avatar, type AvatarProps, type AvatarSize } from "./avatar";
import "./avatar-stack.prefix.css";

export type AvatarStackUser = { id: string | number; [key: string]: unknown };

export interface AvatarStackProps {
  users: AvatarStackUser[];
  /** The total when `users` is a partial list; defaults to `users.length`. */
  count?: number;
  /** Avatars drawn before the +N tile takes a slot (default 4). */
  max?: number;
  /** The +N tile does not take one of the `max` slots. */
  inclusive?: boolean;
  /** Overlapping avatars with a ring between them; otherwise they sit side by side. */
  overlap?: boolean;
  /** Ring colour between overlapping avatars; defaults to the page background. */
  overlayColor?: string | null;
  /** Avatar size for every avatar and the +N tile (default medium). */
  size?: AvatarSize | number;
  showUsernameTooltip?: boolean;
  showUsername?: boolean;
  useRandomBackground?: boolean;
  /** Props for every avatar (style, badge…); `getAvatarProps` wins per avatar. */
  avatarProps?: Partial<AvatarProps>;
  getAvatarProps?: (user: AvatarStackUser, index: number) => Partial<AvatarProps> | undefined;
  /** What the +N tile does: nothing, or open the list of everyone. */
  overflow?: "tile" | "list";
  onOverflowClick?: () => void;
  /** The list gets a search field from this many rows (default 8). */
  searchFrom?: number;
  /** Copy for the list total, e.g. "12 members". */
  countLabel?: (count: number) => string;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

const DEFAULT_MAX = 4;
const DEFAULT_SEARCH_FROM = 8;
const defaultCountLabel = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;

type OverflowListProps = {
  users: AvatarStackUser[];
  total: number;
  searchFrom: number;
  countLabel: (count: number) => string;
  useRandomBackground?: boolean;
};

const OverflowList = ({ users, total, searchFrom, countLabel, useRandomBackground }: OverflowListProps) => {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = needle ? users.filter((user) => userDisplayName(user).toLowerCase().includes(needle)) : users;
  const hidden = total - users.length;

  return (
    <div className="lsf-avatar-stack-list" data-testid="avatar-stack-list">
      {users.length > searchFrom && (
        <div className="lsf-avatar-stack-list__search">
          <SearchInput
            value={query}
            placeholder="Search"
            aria-label="Search people"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      <Typography size="smaller" className="lsf-avatar-stack-list__meta" aria-live="polite">
        {needle ? `${rows.length} of ${total}` : countLabel(total)}
      </Typography>
      <ul className="lsf-avatar-stack-list__rows">
        {rows.map((user) => (
          <li key={user.id} className="lsf-avatar-stack-list__row">
            <Avatar user={user} size="small" useRandomBackground={useRandomBackground} />
            <Typography size="small" className="lsf-avatar-stack-list__name" title={userDisplayName(user)}>
              {userDisplayName(user)}
            </Typography>
          </li>
        ))}
      </ul>
      {!needle && hidden > 0 && (
        <Typography size="small" className="lsf-avatar-stack-list__more">
          +{hidden} more
        </Typography>
      )}
    </div>
  );
};

/**
 * A row of avatars with a +N tile once there are more people than fit. The list may be partial
 * (`count` carries the total); the tile can do nothing, call back, or open the list of everyone.
 */
export const AvatarStack = forwardRef<HTMLDivElement, AvatarStackProps>(
  (
    {
      users,
      count,
      max = DEFAULT_MAX,
      inclusive = false,
      overlap = false,
      overlayColor,
      size,
      showUsernameTooltip = false,
      showUsername = false,
      useRandomBackground = false,
      avatarProps,
      getAvatarProps,
      overflow = "tile",
      onOverflowClick,
      searchFrom = DEFAULT_SEARCH_FROM,
      countLabel = defaultCountLabel,
      className,
      style,
      "data-testid": dataTestId,
    },
    ref,
  ) => {
    const total = Math.max(count ?? users.length, users.length);
    if (total === 0) return null;

    const tooMuch = total > max || total > users.length;
    const toDisplay = Math.min(users.length, max - (inclusive ? 0 : 1));
    const shown = users.slice(0, tooMuch ? toDisplay : max);
    const rest = total - shown.length;

    const itemClass = "lsf-userpics__userpic";
    const stackStyle = overlayColor ? ({ ...style, "--avatar-stack-ring": overlayColor } as CSSProperties) : style;

    const tile = <Avatar addCount={`+${rest}`} size={size} useRandomBackground={false} {...avatarProps} />;
    const tileLabel = `Show all ${total} people`;
    const tileStyle = { "--avatar-stack-layer": 1 } as CSSProperties;
    const tileButton = (
      <button type="button" className="lsf-avatar-stack-tile-button" aria-label={tileLabel} onClick={onOverflowClick}>
        {tile}
      </button>
    );
    const overflowTile = (
      <div className={itemClass} style={tileStyle} data-overflow="" data-testid="avatar-stack-overflow">
        {overflow === "list" ? (
          <Popover align="start" ariaLabel={countLabel(total)} trigger={tileButton}>
            <OverflowList
              users={users}
              total={total}
              searchFrom={searchFrom}
              countLabel={countLabel}
              useRandomBackground={useRandomBackground}
            />
          </Popover>
        ) : onOverflowClick ? (
          tileButton
        ) : (
          tile
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className={["lsf-userpics", overlap && "lsf-userpics_overlay", className].filter(Boolean).join(" ")}
        data-avatar-stack=""
        style={stackStyle}
        data-testid={dataTestId}
      >
        {shown.map((user, index) => (
          <div
            key={user.id}
            className={itemClass}
            style={{ "--avatar-stack-layer": shown.length + 2 - index } as CSSProperties}
          >
            <Avatar
              user={user}
              size={size}
              showUsernameTooltip={showUsernameTooltip}
              showUsername={showUsername}
              useRandomBackground={useRandomBackground}
              {...avatarProps}
              {...getAvatarProps?.(user, index)}
            />
          </div>
        ))}
        {tooMuch && overflowTile}
      </div>
    );
  },
);

AvatarStack.displayName = "AvatarStack";
