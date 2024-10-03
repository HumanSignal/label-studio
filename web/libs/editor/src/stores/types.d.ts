type RawResult = {
  from_name: string;
  to_name: string;
  value: object;
};

type MSTagProps = {
  isReady?: boolean;
};

type MSTTagImage = {
  type: "image";
  stageWidth: number;
  stageHeight: number;
  containerWidth: number;
  containerHeight: number;
  canvasSize?: { width: number; height: number };
} & MSTagProps;

type MSTTag = (
  | MSTTagImage
  | {
      type: string;
    }
) &
  MSTagProps;

type MixinMSTArea = {
  id: string;
  ouid: number;
  results: RawResult[];
  parentID: string | null;
};

type MixinMSTRegion = {
  pid: string;
  score: number | null;
  filtered: boolean;
  parentID: string;
  fromSuggestion: boolean;
  dynamic: boolean;
  origin: "prediction" | "prediction-changed" | "manual";
  item_index: number | null;
};

type MixinMSTRegionVolatile = {
  hidden: boolean;
  locked: boolean;
  isDrawing: boolean;
  shapeRef: null;
  drawingTimeout: null;
};

type MSTRegion = MixinMSTArea & MixinMSTRegion & MixinMSTRegionVolatile;

type MSTAnnotation = {
  canBeReviewed: boolean;
  userGenerate: boolean;
  sentUserGenerate: boolean;
  skipped: boolean;
  editable: boolean;
  id: string;
  draftId: string;
  versions: {
    draft?: RawResult[];
    result?: RawResult[];
  };
  results: RawResult[];
  names: Map<string, MSTTag>;

  submissionInProgress: () => void;
};

type MSTUserExtended = {
  id: types.identifierNumber;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  lastActivity: string | null;
  avatar: string | null;
  initials: string | null;
  phone: string | null;
};

type MSTAnchor = {
  regionId?: string;
  controlName?: string;
  region?: MSTRegion;
  overlayNode?: MSTRegion;
};

type MSTComment = {
  id: number;
  text: types.string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
  createdBy: MSTUserExtended | null;
  isResolved: boolean;
  isEditMode: boolean;
  isDeleted: boolean;
  isConfirmDelete: boolean;
  isUpdating: boolean;
  regionRef: MSTAnchor;
  isHighlighted: boolean;
  setHighlighted: (value: boolean) => void;
  scrollIntoView: () => void;
};

type MSTCommentStore = {
  comments: MSTComment[];
  overlayComments: MSTComment[];
  annotationId: string;
  commentFormSubmit: () => void;
  setTooltipMessage: (message: string) => void;
  currentComment: any;
  addedCommentThisSession: boolean;
  isHighlighting: boolean;
  isRelevantList: boolean;
  listComments: (options: { mounted?: { current: boolean }; suppressClearComments: boolean }) => Promise<void>;
  restoreCommentsFromCache: (cacheKey: string) => void;
};

type MSTStore = {
  customButtons: CustomControlProps.button[];
  settings: Record<string, boolean>;
  isSubmitting: boolean;
  // @todo WHAT IS THIS?
  explore: any;

  annotationStore: {
    selected: MSTAnnotation | null;
    selectedHistory: object | null;
  };
  commentStore: MSTCommentStore;

  hasInterface: (name: string) => boolean;
  handleCustomButton?: (name: string) => void;
  submitAnnotation: (options?: any) => void;
  updateAnnotation: (options?: any) => void;
  rejectAnnotation: (options?: any) => void;
  acceptAnnotation: (options?: any) => void;
  skipTask: (options?: any) => void;
  unskipTask: (options?: any) => void;
};
