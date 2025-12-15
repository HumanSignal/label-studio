import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SegmentationMetricsPane } from "./SegmentationMetricsPane";

export function SegmentationMetricsPortal({ active }) {
  const [host, setHost] = useState(null);
  const lastRoot = useRef();

  useEffect(() => {
    if (!active) return;
    // Find the custom View div from label config: <View name="segmetrics_host">
    // Could refine selector if class/id is added instead
    const root = document.querySelector(
      '.lsf-main-view [name="segmetrics_host"], .segmetrics-host, [data-segmetrics-host]'
    );
    if (root && root !== lastRoot.current) {
      setHost(root);
      lastRoot.current = root;
    }
  }, [active]);

  if (!host || !active) return null;
  return createPortal(<SegmentationMetricsPane />, host);
}

