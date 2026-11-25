type RawResult = {
  from_name: string;
  to_name: string;
  type: string;
  value: Record<string, any>;
};

type MSTResult = {
  toJSON(): unknown;
  id: string;
  area: MSTRegion;
  annotation: MSTAnnotation;
  type: string;
  mainValue: any;
  to_name: any;
  // @todo tag
  from_name: any;
};

type MSTObjectTag = {
  isReady?: boolean;
  name: string;
  isControlTag: false;
  isObjectTag: true;
  type: string;
  value: string;
  _value?: any;
};

type MSTControlTag = {
  isControlTag: true;
  isObjectTag: false;
  name: string;
  toname: string;
  children: Array<any>;
  perregion: boolean;
  type: string;
};

type MSTTagImage = MSTObjectTag & {
  type: "image";
  stageWidth: number;
  stageHeight: number;
  containerWidth: number;
  containerHeight: number;
  canvasSize?: { width: number; height: number };
  parsedValue?: string;
};

type MSTTag = MSTTagImage | MSTObjectTag | MSTControlTag;

type MixinMSTArea = {
  id: string;
  ouid: number;
  results: MSTResult[];
  parentID: string | null;
  control: object;
  object: object;
  classification?: boolean;
  selected: boolean;
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
  type: string;
  isReadOnly: () => boolean;
};

type MixinMSTRegionVolatile = {
  hidden: boolean;
  locked: boolean;
  isDrawing: boolean;
  shapeRef: null;
  drawingTimeout: null;
};

type MSTEditableRegionPropertyDefinition = {
  property: string;
  label: string;
};

type MSTEditableRegion = {
  editorEnabled: boolean;
  editableFields: MSTEditableRegionPropertyDefinition[];
  hasEditableFields: boolean;
  getProperty: (string) => any;
  getPropertyType: (string) => any;
  isPropertyEditable: (string) => boolean;
  setProperty: (string, any) => void;
};

type MSTRegion = MixinMSTArea & MixinMSTRegion & MixinMSTRegionVolatile & MSTEditableRegion;

type MSTAnnotation = {
  id: string;
  pk: string;
  user: MSTUserExtended;
  createdBy: string; // used for predictions
  canBeReviewed: boolean;
  isOwnReviewBlocked: boolean;
  userGenerate: boolean;
  sentUserGenerate: boolean;
  skipped: boolean;
  editable: boolean;
  draftId: string;
  versions: {
    draft?: RawResult[];
    result?: RawResult[];
  };
  areas: Map<string, MSTRegion>;
  regions: MSTRegion[];
  results: MSTResult[];
  type: "annotation" | "prediction";
  names: Map<string, MSTTag>;
  isLinkingMode: boolean;
  linkingMode: "create_relation" | "link_to_comment";
  isNonEditableDraft: boolean;

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
  displayName: string | null;
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
  annotation?: MSTAnnotation;
  commentFormSubmit: () => Promise<void>;
  setTooltipMessage: (message: string) => void;
  currentComment: any;
  addedCommentThisSession: boolean;
  isHighlighting: boolean;
  isRelevantList: boolean;
  listComments: (options: { mounted?: { current: boolean }; suppressClearComments: boolean }) => Promise<void>;
  restoreCommentsFromCache: (cacheKey: string) => void;
};

export type MSTStore = {
  customButtons: CustomButtonsField;
  settings: Record<string, boolean>;
  isSubmitting: boolean;
  // @todo WHAT IS THIS?
  explore: any;
  task: {
    data: string;
    dataObj: Record<string, any>;
    agreement: number | null;
  };

  annotationStore: {
    annotations: MSTAnnotation[];
    selected: MSTAnnotation | null;
    selectedHistory: object | null;
    store: MSTStore;
    names: Map<string, MSTTag>;

    selectAnnotation: (id: string | number) => void;
    selectPrediction: (id: string | number) => void;
  };
  commentStore: MSTCommentStore;

  hasInterface: (name: string) => boolean;
  handleCustomButton?: (button: CustomButtonType) => void;
  submitAnnotation: (options?: any) => void;
  updateAnnotation: (options?: any) => void;
  rejectAnnotation: (options?: any) => void;
  acceptAnnotation: (options?: any) => void;
  skipTask: (options?: any) => void;
  unskipTask: (options?: any) => void;
};
