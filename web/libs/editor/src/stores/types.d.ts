type RawResult = {
  from_name: string;
  to_name: string;
  value: object;
}

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

  submissionInProgress: () => void;
};

type MSTCommentStore = {
  commentFormSubmit: () => void;
  setTooltipMessage: (message: string) => void;
  currentComment: any;
  addedCommentThisSession: boolean;
}

type MSTStore = {
  customButtons: Instance<typeof CustomButton>[];
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
}
