import { ChangeEvent } from 'react';

export interface SettingsProperty {
  description: string;
  defaultValue: any;
  type: 'boolean' | 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  ff?: string;
  onChangeEvent?: (e: ChangeEvent) => void;
}

export type SettingsProperties = Record<string, SettingsProperty>
