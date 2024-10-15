import { createContext } from "react";

interface SidePanelsContextProps {
  locked: boolean;
}

export const SidePanelsContext = createContext<SidePanelsContextProps>({
  locked: false,
});
