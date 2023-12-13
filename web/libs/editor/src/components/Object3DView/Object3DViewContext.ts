import { createContext } from 'react';

export const Object3DViewContext = createContext<{suggestion: boolean}>({ suggestion: false });

export const Object3DViewProvider = Object3DViewContext.Provider;
