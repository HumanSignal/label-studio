import chroma from "chroma-js";
import {
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Align } from "@humansignal/core/lib/utils/dom";
import { isDefined, userDisplayName } from "@humansignal/core/lib/utils/helpers";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./avatar.module.css";
import clsx from "clsx";

/** First and last initial when both names start with a letter; otherwise the first two letters of what is shown. */
export const avatarInitials = (user: Record<string, any> | null | undefined, displayName?: string): string => {
  const first = (user?.first_name ?? user?.firstName ?? "").trim();
  const last = (user?.last_name ?? user?.lastName ?? "").trim();
  if (/^\p{L}/u.test(first) && /^\p{L}/u.test(last)) return `${first[0]}${last[0]}`.toUpperCase();
  return (displayName ?? "").slice(0, 2).toUpperCase();
};

/** The five avatar diameters, in px. `medium` is the default. */
export const AVATAR_SIZES = { xsmall: 16, small: 20, medium: 24, large: 28, xlarge: 64 } as const;
export type AvatarSize = keyof typeof AVATAR_SIZES;
const INITIALS_FONT_SIZE: Record<AvatarSize, number> = { xsmall: 8, small: 8, medium: 10, large: 12, xlarge: 26 };

const resolveSize = (size: AvatarSize | number | undefined) =>
  typeof size === "number"
    ? { width: size, fontSize: Math.max(size * 0.4, 8) }
    : { width: AVATAR_SIZES[size ?? "medium"], fontSize: INITIALS_FONT_SIZE[size ?? "medium"] };

export type AvatarProps = {
  /** A status marker pinned to a corner, usually an `AvatarBadge`. */
  badge?: ReactNode;
  /** The corner the badge sits in (default bottomRight). */
  badgePosition?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  className?: string;
  /** Dims the avatar, e.g. someone assigned who has not acted yet. */
  faded?: boolean;
  /** Full name in a tooltip on hover. */
  showUsernameTooltip?: boolean;
  /** Side the name tooltip opens on (default above, centred). */
  tooltipAlignment?: Align;
  /** Display name next to the avatar. */
  showUsername?: boolean;
  /** xsmall 16, small 20, medium 24 (default), large 28, xlarge 64. A number in px still works for one release; use a name. */
  size?: AvatarSize | number;
  /** Image URL when there is no `user.avatar`. */
  src?: string;
  style?: CSSProperties;
  /** The person: avatar image, name and email; the initials come from the name. */
  user?: any;
  /** Name for the tooltip when there is no `user`. */
  username?: string;
  /** Replaces the image and initials. */
  children?: any;
  /** Draws a count instead of initials, e.g. "+4" (the AvatarStack overflow tile). */
  addCount?: string;
  /** Kept for compatibility; the background colour is always derived per person. */
  useRandomBackground?: boolean;
  /** Shows initials while a new image is uploading. */
  isInProgress?: boolean;
};

/** One person: photo, or initials on a colour stable for that person. Several people: `AvatarStack`. */

const FALLBACK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export const Avatar = forwardRef(
  (
    {
      badge = null,
      badgePosition = "bottomRight",
      className,
      faded = false,
      showUsernameTooltip = false,
      tooltipAlignment,
      showUsername = false,
      size,
      src,
      style = {},
      addCount,
      user,
      username,
      useRandomBackground = true,
      children,
      isInProgress = false,
      ...rest
    }: AvatarProps,
    ref,
  ) => {
    const propsSrc = user?.avatar ?? src;
    const imgRef = useRef();
    const userRef = useRef(user);
    const [finalSrc, setFinalSrc] = useState(propsSrc);
    const [imgVisible, setImgVisible] = useState(false);
    const [nameVisible, setNameVisible] = useState(true);

    useEffect(() => {
      if (isInProgress) {
        setFinalSrc(null);
        setImgVisible(false);
        setNameVisible(true);
      } else if (propsSrc !== finalSrc) {
        setFinalSrc(propsSrc);
        setImgVisible(false);
        setNameVisible(true);
      }
    }, [propsSrc, isInProgress]);

    const { width, fontSize } = resolveSize(size);
    style = Object.assign({ width, height: width, fontSize }, style ?? {});

    const displayName = useMemo(() => {
      return userDisplayName(user ?? userRef.current);
    }, [user]);

    const background = useMemo(() => {
      const curUser = user ?? userRef.current;

      if (isDefined(curUser?.id)) {
        const color =
          localStorage.getItem(`userpic-color-${curUser.id}`) ?? chroma.average([chroma.random(), "#cfcfcf"]).css();

        localStorage.setItem(`userpic-color-${curUser.id}`, color);
        return color;
      }

      return null;
    }, [user, useRandomBackground]);

    const textColor = useMemo(() => {
      if (background) {
        const contrast = chroma.contrast(background, "#fff");

        return contrast >= 4.5 ? "#fff" : "#000";
      }

      return null;
    }, [background]);

    const onImageLoaded = useCallback(() => {
      setImgVisible(true);
      if (finalSrc !== FALLBACK_IMAGE) setNameVisible(false);
    }, [finalSrc]);

    const stylesheet = { ...(style ?? {}), background, color: textColor };

    const renderName = () => {
      let name = "";

      if (addCount) {
        name = addCount;
      } else if (nameVisible) {
        name = avatarInitials(user ?? userRef.current, displayName);
      }

      return (
        <span className={styles.username} style={style}>
          {name}
        </span>
      );
    };

    const classNameList: Record<string, any> = {};
    if (className) {
      className
        .toString()
        .split(" ")
        .forEach((c) => {
          classNameList[c] = true;
        });
    }

    const avatar = (
      <div className="flex w-fit items-center gap-2">
        <div
          ref={ref}
          data-testid="userpic"
          className={clsx(styles.userpic, { [styles.faded]: faded, ...classNameList })}
          style={stylesheet}
          {...rest}
        >
          {children ? (
            children
          ) : (
            <>
              <img
                className={clsx(styles.avatar, { [styles.faded]: faded })}
                ref={imgRef}
                src={finalSrc}
                alt={(displayName ?? "").toUpperCase()}
                style={{
                  opacity: imgVisible ? (faded ? 0.3 : 1) : 0,
                  pointerEvents: imgVisible ? "auto" : "none",
                }}
                onLoad={onImageLoaded}
                onError={() => setFinalSrc(FALLBACK_IMAGE)}
              />
              {renderName()}
            </>
          )}
          {badge && <div className={clsx(styles.badge, styles[badgePosition])}>{badge}</div>}
        </div>

        {showUsername && <span className="text-sm text-gray-500 line-clamp-1">{displayName}</span>}
      </div>
    );

    const userFullName = useMemo(() => {
      const curUser = user ?? userRef.current;

      if (!curUser) return username;
      if (curUser.displayName) return curUser.displayName;
      if (curUser.first_name || curUser.last_name) {
        return `${curUser.first_name ?? ""} ${curUser.last_name ?? ""}`.trim();
      }
      if (curUser.email) {
        return curUser.email;
      }
      return username;
    }, [user, username]);

    return showUsernameTooltip && userFullName ? (
      <Tooltip title={userFullName} alignment={tooltipAlignment}>
        {avatar}
      </Tooltip>
    ) : (
      avatar
    );
  },
);

Avatar.displayName = "Avatar";
