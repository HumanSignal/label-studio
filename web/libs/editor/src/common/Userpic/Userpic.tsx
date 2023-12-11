import chroma from 'chroma-js';
import { CSSProperties, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { FF_DEV_1507, isFF } from '../../utils/feature-flags';
import { isDefined, userDisplayName } from '../../utils/utilities';
import { Tooltip } from '../Tooltip/Tooltip';
import './Userpic.styl';

const FALLBACK_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

interface UserpicProps {
  badge?: Record<string, any> | null;
  className?: string;
  faded?: boolean;
  showUsername?: boolean;
  size?: any;
  src?: string;
  style?: CSSProperties;
  user?: any;
  username?: string;
  useRandomBackground?: boolean;
}

export const Userpic = forwardRef<any, UserpicProps>(({
  badge = null,
  className,
  faded = false,
  showUsername,
  size,
  src,
  style,
  user = {},
  username,
  useRandomBackground = true,
  children,
  ...rest
}, ref) => {
  const propsSrc = user?.avatar ?? src;
  const imgRef = useRef();
  const [finalSrc, setFinalSrc] = useState(propsSrc);
  const [imgVisible, setImgVisible] = useState(false);
  const [nameVisible, setNameVisible] = useState(true);

  if (isFF(FF_DEV_1507)) {
    useEffect(() => {
      if (propsSrc !== finalSrc) {
        setFinalSrc(propsSrc);
        setImgVisible(false);
        setNameVisible(true);
      }
    }, [propsSrc]);
  }

  if (size) {
    style = Object.assign({ width: size, height: size, fontSize: size * 0.4 }, style);
  }

  const displayName = useMemo(() => {
    return userDisplayName(user);
  }, [user]);

  const background = useMemo(() => {
    if (isDefined(user.id)) {
      const color = localStorage.getItem(`userpic-color-${user.id}`) ?? chroma.average([chroma.random(), '#cfcfcf']).css();

      localStorage.setItem(`userpic-color-${user.id}`, color);
      return color;
    }

    return null;
  }, [user, useRandomBackground]);

  const textColor = useMemo(() => {
    if (background) {
      const contrast = chroma.contrast(background, '#fff');

      return contrast >= 4.5 ? '#fff' : '#000';
    }

    return null;
  }, [background]);

  const onImageLoaded = useCallback(() => {
    setImgVisible(true);
    if (finalSrc !== FALLBACK_IMAGE) setNameVisible(false);
  }, [finalSrc]);

  const stylesheet = { ...(style ?? {}), background, color: textColor };

  const userpic = (
    <Block ref={ref} name="userpic" mix={className} mod={{ faded }} style={stylesheet} {...rest}>
      {children ? children : (
        <>
          <Elem
            tag="img"
            name="avatar"
            ref={imgRef}
            src={finalSrc}
            alt={(displayName ?? '').toUpperCase()}
            style={{ opacity: imgVisible ? (faded ? 0.3 : 1) : 0 }}
            onLoad={onImageLoaded}
            onError={() => setFinalSrc(FALLBACK_IMAGE) }
            mod={{ faded }}
          />
          {nameVisible && (
            <Elem tag="span" name="username">
              {(displayName ?? '').slice(0, 2).toUpperCase()}
            </Elem>
          )}
        </>
      )}

      {badge && Object.entries(badge).map(([align, content], i) => {
        return (
          <Elem key={`badge-${i}`} name="badge" mod={{ [align]: true }}>
            {content}
          </Elem>
        );
      })}
    </Block>
  );

  const userFullName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    } else if (user?.email) {
      return user.email;
    } else {
      return username;
    }
  }, [user, username]);

  return (showUsername && userFullName) ? (
    <Tooltip title={userFullName}>
      {userpic}
    </Tooltip>
  ) : userpic;
});

Userpic.displayName = 'Userpic';
