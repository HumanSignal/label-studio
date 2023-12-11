import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { Tooltip } from '../Tooltip/Tooltip';
import './Userpic.styl';

const FALLBACK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const Userpic = forwardRef(({
  username,
  size,
  src,
  user,
  className,
  showUsername,
  style,
  ...rest
}, ref) => {
  const imgRef = useRef();
  const [finalUsername, setFinalUsername] = useState(username);
  const [finalSrc, setFinalSrc] = useState(user?.avatar ?? src);
  const [imgVisible, setImgVisible] = useState(false);
  const [nameVisible, setNameVisible] = useState(true);

  if (size) {
    style = Object.assign({ width: size, height: size, fontSize: size * 0.4 }, style);
  }

  useEffect(() => {
    if (user) {
      const {first_name, last_name, email, initials, username} = user;

      if (initials) {
        setFinalUsername(initials);
      } else if (username) {
        setFinalUsername(username);
      } else if (first_name && last_name) {
        setFinalUsername(`${first_name[0]}${last_name[0]}`);
      } else if (email) {
        setFinalUsername(email.substring(0, 2));
      }

      if (user.avatar) setFinalSrc(user.avatar);
    } else {
      setFinalUsername(username);
      setFinalSrc(src);
    }
  }, [user]);

  const onImageLoaded = useCallback(() => {
    setImgVisible(true);
    if (finalSrc !== FALLBACK_IMAGE) setNameVisible(false);
  }, [finalSrc]);

  const userpic = (
    <Block ref={ref} name="userpic" mix={className} style={style} {...rest}>
      <Elem
        tag="img"
        name="avatar"
        ref={imgRef}
        src={finalSrc}
        alt={(finalUsername ?? "").toUpperCase()}
        style={{opacity: imgVisible ? 1 : 0}}
        onLoad={onImageLoaded}
        onError={() => setFinalSrc(FALLBACK_IMAGE) }
      />
      {nameVisible && (
        <Elem tag="span" name="username">
          {(finalUsername ?? "").toUpperCase()}
        </Elem>
      )}
    </Block>
  );

  const userFullName = useMemo(() => {
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
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
