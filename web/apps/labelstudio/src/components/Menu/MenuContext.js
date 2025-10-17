import React from "react";
import { BemWithSpecificContext } from "../../utils/bem";

export const MenuContext = React.createContext();
export const { Block, Elem } = BemWithSpecificContext();
