import { createContext } from 'react';

export const ImageViewContext = createContext<{suggestion: boolean}>({ suggestion: false });

export const ImageViewProvider = ImageViewContext.Provider;
