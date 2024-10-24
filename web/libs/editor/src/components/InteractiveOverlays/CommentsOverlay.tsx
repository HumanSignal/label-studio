import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "../../common/Utils/useMounted";
import { LINK_COMMENT_MODE } from "../../stores/Annotation/LinkingModes";
import ResizeObserver from "../../utils/resize-observer";
import { guidGenerator } from "../../utils/unique";
import NodesConnector from "./NodesConnector";

import styles from "./CommentsOverlay.module.scss";

const CommentIcon = () => {
  return (
    <g className={styles.commentIcon}>
      <path
        className={styles.commentIconBackground}
        d="M0 12C0 5.3726 5.3726 0 12 0C18.6274 0 24 5.3726 24 12C24 18.6274 18.6274 24 12 24H0V12Z"
      />
      <path
        className={styles.commentIconLines}
        d="M18 8V9.3333H6V8H18ZM6 16H12V14.6667H6V16ZM6 12.6667H18V11.3333H6V12.6667Z"
      />
    </g>
  );
};

const ICON_SIZE = 24;
const PADDING_COMPENSATION = 3;
const COMMENT_ICON_OVERLAP = 4;
type CommentItemProps = {
  comment: MSTComment;
  rootRef: React.MutableRefObject<HTMLOrSVGElement | undefined>;
};
const CommentItem: React.FC<CommentItemProps> = observer(({ comment, rootRef }) => {
  const root = rootRef.current;
  const node = comment.regionRef?.overlayNode;
  const isHidden = !node;
  // {} !== {} it's always so, and it's a way to force re-render
  const [forceUpdateId, forceUpdate] = useState<any>({});

  const onHover = useCallback(() => {
    comment.setHighlighted(true);
  }, [comment]);
  const onUnHover = useCallback(() => {
    comment.setHighlighted(false);
  }, [comment]);

  const shape = useMemo(() => {
    return node && root ? NodesConnector.createShape(node, root) : null;
  }, [node, root]);

  const { shapeBBox, positionStyle } = useMemo(() => {
    const shapeBBox =
      shape && root ? NodesConnector.calculateBBox(shape, root)[0] : { x: 0, y: 0, width: 0, height: 0 };
    const pos = { x: shapeBBox.x + shapeBBox.width, y: shapeBBox.y };
    const transform = `translate(${pos.x - PADDING_COMPENSATION - COMMENT_ICON_OVERLAP}px, ${
      pos.y - ICON_SIZE + PADDING_COMPENSATION + COMMENT_ICON_OVERLAP
    }px)`;
    const positionStyle = { transform };
    return { shapeBBox, positionStyle };
  }, [shape, root, forceUpdateId]);

  useEffect(() => {
    shape?.onUpdate(() => {
      forceUpdate({});
    });
    return () => {
      shape?.destroy();
    };
  }, [shape]);

  if (!root || !node || isHidden) return null;
  if (shapeBBox.width < 1 || shapeBBox.height < 1) return null;

  const itemStyles = [styles.commentItem];
  if (comment.isHighlighted) {
    itemStyles.push(styles._highlighted);
  }
  return (
    <g
      className={itemStyles.join(" ")}
      style={positionStyle}
      onMouseEnter={onHover}
      onMouseLeave={onUnHover}
      onClick={comment.scrollIntoView}
    >
      <CommentIcon />
    </g>
  );
});

/** Is used to narrow all results down to classifications good to be selected */
const isClassification = (result: MSTResult) => {
  const { isClassificationTag } = result.from_name;
  const isGlobalClassification = result.area.classification;
  const isActivePerRegion = result.area.selected;

  return isClassificationTag && (isGlobalClassification || isActivePerRegion);
};

type ResultItemProps = {
  result: MSTResult;
  rootRef: React.MutableRefObject<HTMLOrSVGElement | undefined>;
};
const ResultTagBbox: React.FC<ResultItemProps> = observer(({ result, rootRef }) => {
  const root = rootRef.current;
  const node = result.area;
  const isHidden = !node || node.hidden;
  const [forceUpdateId, forceUpdate] = useState<any>({});
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    return result && root ? NodesConnector.createShape(result, root) : null;
  }, [result, root]);

  const bbox = useMemo(() => {
    if (!shape || !root) return { x: 0, y: 0, width: 0, height: 0 };
    return NodesConnector.calculateBBox(shape, root)[0];
  }, [shape, root, forceUpdateId]);

  useEffect(() => {
    shape?.onUpdate(() => {
      forceUpdate({});
    });
    return () => {
      shape?.destroy();
    };
  }, [shape]);

  if (!root || !node || isHidden) return null;
  if (bbox.width < 1 || bbox.height < 1) return null;

  const itemStyle = {
    pointerEvents: "all" as const,
    stroke: "var(--grape_600)",
    strokeDasharray: hovered ? undefined : "4 2",
    cursor: "crosshair",
  };

  return (
    <rect
      {...bbox}
      rx={3}
      ry={3}
      style={itemStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      stroke="red"
      strokeWidth={1}
      fill="none"
      onClick={() => {
        result.annotation.addLinkedResult(result);
        result.annotation.stopLinkingMode();
      }}
    />
  );
});

type CommentsOverlayProps = {
  commentStore: MSTCommentStore;
  annotation: MSTAnnotation;
};
const CommentsOverlayInner = observer(({ annotation, commentStore }: CommentsOverlayProps) => {
  const { overlayComments } = commentStore || {};
  const rootRef = useRef<SVGSVGElement>();
  const [uniqKey, forceUpdate] = useState<any>(guidGenerator());

  const mounted = useMounted();

  const loadComments = async () => {
    await commentStore.listComments({ mounted, suppressClearComments: commentStore.isRelevantList });
  };

  useEffect(() => {
    loadComments();
    // id is internal id,
    // always different for different annotations, even empty ones;
    // remain the same when user submit draft, so no unneeded calls.
  }, [commentStore.annotation?.id]);

  const resizeObserver: ResizeObserver = useMemo(() => {
    let requestId: number;

    return new ResizeObserver((entities) => {
      cancelAnimationFrame(requestId);
      requestId = requestAnimationFrame(() => {
        forceUpdate(guidGenerator());
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      resizeObserver?.disconnect();
    };
  }, []);
  const setRef = useCallback((ref: SVGSVGElement | null) => {
    const refOfFixedType = ref || undefined;
    if (ref) {
      resizeObserver?.observe(ref);
      resizeObserver?.observe(document.body);
    } else if (rootRef.current) {
      resizeObserver?.unobserve(rootRef.current);
      resizeObserver?.unobserve(document.body);
    }
    rootRef.current = refOfFixedType;
  }, []);

  if (!overlayComments) return null;

  const containerStyles = [styles.container];
  if (commentStore?.isHighlighting) {
    containerStyles.push(styles._highlighting);
  }

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: It's not just an icon or a figure; it's an entire interactive layer.
    <svg className={containerStyles.join(" ")} ref={setRef} xmlns="http://www.w3.org/2000/svg">
      <g key={uniqKey}>
        {annotation.linkingMode === LINK_COMMENT_MODE &&
          annotation.results
            .filter(isClassification)
            .map((result) => <ResultTagBbox key={result.id} result={result} rootRef={rootRef} />)}
        {overlayComments.map((comment: MSTComment) => {
          const { id } = comment;
          return <CommentItem key={id} comment={comment} rootRef={rootRef} />;
        })}
      </g>
    </svg>
  );
});

type WhenTagsReadyProps = {
  tags: Map<string, MSTTag>;
  children: React.ReactNode;
};
const WhenTagsReady: React.FC<WhenTagsReadyProps> = memo(
  observer(({ tags, children }) => {
    if (
      !Array.from(tags.values()).every((tag) => {
        if (!isAlive(tag)) return false;

        return tag?.isReady ?? true;
      }, true)
    ) {
      return null;
    }
    return <>{children}</>;
  }),
);

const CommentsOverlay: React.FC<CommentsOverlayProps> = observer((props) => {
  const { annotation } = props;

  return (
    <WhenTagsReady tags={annotation.names}>
      <CommentsOverlayInner {...props} />
    </WhenTagsReady>
  );
});

export { CommentsOverlay };
