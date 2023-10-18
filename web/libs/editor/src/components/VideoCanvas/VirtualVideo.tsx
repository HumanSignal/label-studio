import { DetailedHTMLProps, forwardRef, useCallback, useEffect, useRef, VideoHTMLAttributes } from 'react';
import InfoModal from '../../components/Infomodal/Infomodal';
import { FF_LSDV_4711, isFF } from '../../utils/feature-flags';


type VirtualVideoProps = DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> & {
  canPlayType?: (supported: boolean) => void,
};

const DEBUG_MODE = false;

// Just a mapping of file types to mime types, so we can check if the browser can play the file
// before having to fall back to using a fetch request.
const mimeTypeMapping = {
  // Supported
  'mp4': 'video/mp4',
  'mp4v': 'video/mp4',
  'mpg4': 'video/mp4',

  'ogg': 'video/ogg',
  'ogv': 'video/ogg',
  'ogm': 'video/ogg',
  'ogx': 'video/ogg',

  // Partially supported
  'webm': 'video/webm',

  // Unsupported
  'avi': 'video/avi',
  'mov': 'video/quicktime',
  'qt': 'video/quicktime',
};

const isBinary = (mimeType: string|null|undefined) => {
  if (!mimeType) {
    return false;
  }

  return mimeType.includes('octet-stream');
};

export const canPlayUrl = async (url: string) => {
  const video = document.createElement('video');

  const pathName = new URL(url, /^https?/.exec(url) ? undefined : window.location.href).pathname;

  const fileType = (pathName.split('.').pop() ?? '') as keyof typeof mimeTypeMapping;

  let fileMimeType: string|null|undefined = mimeTypeMapping[fileType];

  if (!fileMimeType) {
    const fileMeta = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-0',
      },
    });

    fileMimeType = fileMeta.headers.get('content-type');
  }

  // If the file is binary, we can't check if the browser can play it, so we just assume it can.
  const supported = isBinary(fileMimeType) || (!!fileMimeType && video.canPlayType(fileMimeType) !== '');
  const modalExists = document.querySelector('.ant-modal');

  if (!supported && !modalExists) InfoModal.error('There has been an error rendering your video, please check the format is supported');
  return supported;
};

export const VirtualVideo = forwardRef<HTMLVideoElement, VirtualVideoProps>((props, ref) => {
  const video = useRef<HTMLVideoElement | null>(null);
  const source = useRef<HTMLSourceElement | null>(null);
  const attachedEvents = useRef<[string, any][]>([]);

  const canPlayType = useCallback(async (url: string) => {
    let supported = false;

    if (url) {
      supported = await canPlayUrl(url);
    }

    if (props.canPlayType) {
      props.canPlayType(supported);
    }
    return supported;
  }, [props.canPlayType]);

  const createVideoElement = useCallback(() => {
    const videoEl = document.createElement('video');

    videoEl.muted = !!props.muted;
    videoEl.controls = false;
    videoEl.preload = 'auto';

    if (isFF(FF_LSDV_4711)) videoEl.crossOrigin = 'anonymous';

    Object.assign(videoEl.style, {
      top: '-9999px',
      width: 0,
      height: 0,
      position: 'absolute',
    });

    if (DEBUG_MODE) {
      Object.assign(videoEl.style, {
        top: 0,
        zIndex: 10000,
        width: '200px',
        height: '200px',
        position: 'absolute',
      });
    }

    video.current = videoEl;
  }, []);

  const attachRef = useCallback((video: HTMLVideoElement | null) => {
    if (ref instanceof Function) {
      ref(video);
    } else if (ref) {
      ref.current = video;
    }
  }, []);

  const attachEventListeners = () => {
    const eventHandlers = Object
      .entries(props)
      .filter(([key]) => key.startsWith('on'))
      .map(([evt, handler]) => [evt.toLowerCase(), handler]);

    const attached: [string, any][] = [];

    eventHandlers.forEach(([evt, handler]) => {
      const evtName = evt.replace(/^on/, '');

      video.current?.addEventListener(evtName, handler);
      attached.push([evtName, handler]);
    });

    attachedEvents.current = attached;
  };

  const detachEventListeners = () => {
    if (!video.current) return;

    (attachedEvents.current ?? []).forEach(([evt, handler]) => {
      video.current?.removeEventListener(evt, handler);
    });

    attachedEvents.current = [];
  };

  const unloadSource = () => {
    if (source && video) {
      video.current?.pause();
      source.current?.setAttribute('src', '');
      video.current?.load();
    }
  };

  const attachSource = useCallback(() => {
    if (!video.current) return;

    video.current?.pause();

    if (source.current) unloadSource();

    const sourceEl = document.createElement('source');

    sourceEl.setAttribute('src', props.src ?? '');
    video.current?.appendChild(sourceEl);

    source.current = sourceEl;
  }, [props.src]);

  useEffect(() => {
    detachEventListeners();
    attachEventListeners();
  });

  // Create a video tag
  useEffect(() => {
    createVideoElement();
    attachEventListeners();
    canPlayType(props.src ?? '').then((canPlay) => {
      if (canPlay && video.current) {
        attachSource();
        attachRef(video.current);

        document.body.append(video.current!);
      }
    });

    return () => {
      // Handle video cleanup
      detachEventListeners();
      unloadSource();
      attachRef(null);
      video.current?.remove();
      video.current = null;
    };
  }, []);

  useEffect(() => {
    if (video.current && props.muted !== undefined) {
      video.current.muted = props.muted;
    }
  }, [props.muted]);

  return null;
});
