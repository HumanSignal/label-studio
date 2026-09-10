import { observable } from "mobx";

type Slot = { host: HTMLElement; home: HTMLElement };

export const slots = observable.map<string, Slot>({}, { deep: false });
