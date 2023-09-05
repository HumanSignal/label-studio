import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { set } from 'date-fns';

export const UserInfo = forwardRef(({
  user,
  className,
  //   showFullName,
  style,
  ...rest
}, ref) => {
//   const [fullNameVisible, setFullNameVisible] = useState(showFullName);

  //   setFullNameVisible(true);

  const fullName = useMemo(() => {
    console.log("user: ", user);
    const { firstName, lastName, email, username } = user;

    console.log("first_name: ", firstName);
    console.log("last_name: ", lastName);
    console.log("email: ", email);
    console.log("username: ", username);
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (email) {
      return email;
    } else {
      return username || '';
    }
  }, [user]);

  //   const onMouseEnter = useCallback(() => {
  //     setFullNameVisible(true);
  //   }, []);

  //   const onMouseLeave = useCallback(() => {
  //     setFullNameVisible(false);
  //   }, []);

  const userInfo = (
    <Block ref={ref} name="userinfo" mix={className} style={style} {...rest}>
      <div
        name="user-info"
        // onMouseEnter={onMouseEnter}
        // onMouseLeave={onMouseLeave}
      >
        <div title={fullName} >
          <Elem tag="span" name="full-name">
            {fullName}
          </Elem>
        </div>
      </div>
    </Block>
  );

  return userInfo;
});

UserInfo.displayName = 'UserInfo';
