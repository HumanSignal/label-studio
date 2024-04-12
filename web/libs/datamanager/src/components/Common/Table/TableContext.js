import React from "react";
import { BemWithSpecifiContext } from "../../../utils/bem";

export const TableContext = React.createContext();

export const { Block: TableBlock, Elem: TableElem } = BemWithSpecifiContext();
