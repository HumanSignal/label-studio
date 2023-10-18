import { createContext } from 'react';

export const ToolbarContext = createContext({ expanded: false });

export const ToolbarProvider = ToolbarContext.Provider;
