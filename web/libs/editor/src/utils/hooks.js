import React from 'react';

export const useRenderTime = name => {
  console.time(`RENDER TIME ${name}`);

  React.useEffect(() => console.timeEnd(`RENDER TIME ${name}`), [name]);
};
