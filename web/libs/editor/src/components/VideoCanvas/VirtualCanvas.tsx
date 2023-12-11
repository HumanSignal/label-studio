import { forwardRef, LegacyRef, useEffect, useRef } from 'react';

interface VirtualCanvasProps {
  width: number;
  height: number;
}

export const VirtualCanvas = forwardRef<HTMLCanvasElement, VirtualCanvasProps>((props, ref) => {
  const rootRef = useRef<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const attachRef = (canvas: HTMLCanvasElement | null) => {
    if (ref instanceof Function) {
      ref(canvas);
    } else if (ref) {
      ref.current = canvas;
    }
  };

  useEffect(() => {
    const canvas = document.createElement('canvas');

    canvas.width = props.width;
    canvas.height = props.height;
    canvas.style.background = '#efefef';

    canvasRef.current = canvas;
    rootRef.current?.appendChild(canvas);

    attachRef(canvasRef.current);
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = props.width;
      canvasRef.current.height = props.height;
    }
  }, [props.width, props.height]);

  useEffect(() => () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');

    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    canvas.remove();
    canvasRef.current = null;
    attachRef(null);
  }, []);

  return (
    <div ref={rootRef as LegacyRef<HTMLDivElement>}/>
  );
});
