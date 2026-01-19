/**
 * LightweightPreview - Fast preview using static rendering (no MST)
 * 
 * This is a drop-in replacement for the full Preview that renders configs
 * much faster by avoiding MobX-State-Tree entirely. Updates are instant
 * because it's just React re-renders.
 * 
 * Trade-offs:
 * - Pros: Very fast renders, no UI blocking, instant updates
 * - Cons: Doesn't show exactly how the editor will look (simplified rendering)
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Spinner } from '@humansignal/ui';
import { cnb as cn } from '../utils/bem';
import { StaticConfigPreview } from './StaticConfigPreview';

const EMPTY_CONFIG = '<View></View>';

const configClass = cn('configure');

export interface LightweightPreviewProps {
  config?: string;
  data?: Record<string, any>;
  error?: any;
  loading?: boolean;
  project?: any;
  viewOnly?: boolean;
  isAdvancedMode?: boolean;
  lsfRef?: React.MutableRefObject<any>; // Not used - kept for API compatibility
}

export const LightweightPreview: React.FC<LightweightPreviewProps> = ({
  config,
  data,
  error,
  loading = false,
  viewOnly = false,
}) => {
  // Debounce config updates for very rapid typing
  const [debouncedConfig, setDebouncedConfig] = useState(config);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setDebouncedConfig(config);
    }, 50);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [config]);

  const currentConfig = useMemo(() => debouncedConfig ?? EMPTY_CONFIG, [debouncedConfig]);
  const taskData = useMemo(() => data || {}, [data]);
  const isLoading = !data && loading;

  const previewUIStyle: React.CSSProperties = {
    opacity: loading || error ? 0.6 : 1,
    overflow: 'auto',
  };

  if (viewOnly) {
    return (
      <div className={configClass.elem('preview').mod({ viewOnly: true }).toClassName()}>
        <div className={configClass.elem('preview-ui').toClassName()}>
          <StaticConfigPreview config={currentConfig} data={taskData} />
        </div>
        <div className={configClass.elem('preview-overlay').toClassName()} />
      </div>
    );
  }

  return (
    <div className={configClass.elem('preview').toClassName()}>
      {error && (
        <div className={configClass.elem('preview-error').toClassName()}>
          <h2>{error.detail} {error.id}</h2>
          {error.validation_errors?.non_field_errors?.map?.((err: string) => <p key={err}>{err}</p>)}
          {error.validation_errors?.label_config?.map?.((err: string) => <p key={err}>{err}</p>)}
          {error.validation_errors?.map?.((err: string) => <p key={err}>{err}</p>)}
        </div>
      )}
      
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '50vh' }}>
          <Spinner size={40} />
        </div>
      )}
      
      <div
        className={configClass.elem('preview-ui').mod({ isLoading }).toClassName()}
        style={previewUIStyle}
      >
        <StaticConfigPreview config={currentConfig} data={taskData} />
      </div>
    </div>
  );
};

export default LightweightPreview;
