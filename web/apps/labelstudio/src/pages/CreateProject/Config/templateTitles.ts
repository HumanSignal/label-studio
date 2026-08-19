import i18next from "i18next";

// Template gallery names come from the backend (/api/templates reads the
// annotation_templates YAML files). Map them to projects-namespace keys at
// display time; unknown names (templates added later) pass through as-is.

export const TEMPLATE_GROUP_TITLES: Record<string, string> = {
  "Computer Vision": "projects:tplGroupComputerVision",
  "Natural Language Processing": "projects:tplGroupNaturalLanguageProcessing",
  "Audio/Speech Processing": "projects:tplGroupAudioSpeechProcessing",
  "Conversational AI": "projects:tplGroupConversationalAI",
  Chat: "projects:tplGroupChat",
  "Ranking & Scoring": "projects:tplGroupRankingScoring",
  "Structured Data Parsing": "projects:tplGroupStructuredDataParsing",
  "Time Series Analysis": "projects:tplGroupTimeSeriesAnalysis",
  Videos: "projects:tplGroupVideos",
  "Generative AI": "projects:tplGroupGenerativeAI",
  "Community Contributions": "projects:tplGroupCommunityContributions",
};

export const TEMPLATE_TITLES: Record<string, string> = {
  "ASR Hypotheses Selection": "projects:tplASRHypothesesSelection",
  "Activity Recognition": "projects:tplActivityRecognition",
  "Automatic Speech Recognition": "projects:tplAutomaticSpeechRecognition",
  "Automatic Speech Recognition using Segments": "projects:tplAutomaticSpeechRecognitionUsingSegments",
  "Breast Cancer Mammogram Classification": "projects:tplBreastCancerMammogramClassification",
  "Change Point Detection": "projects:tplChangePointDetection",
  "Chatbot Evaluation": "projects:tplChatbotEvaluation",
  "Chatbot Model Assessment": "projects:tplChatbotModelAssessment",
  "Content Moderation": "projects:tplContentModeration",
  "Content-based Image Retrieval": "projects:tplContentBasedImageRetrieval",
  "Conversational Analysis": "projects:tplConversationalAnalysis",
  "Coreference Resolution & Entity Linking": "projects:tplCoreferenceResolutionEntityLinking",
  "Document Retrieval": "projects:tplDocumentRetrieval",
  "Evaluate Production Conversations for RLHF": "projects:tplEvaluateProductionConversationsForRLHF",
  "Fine-Tune an Agent with an LLM": "projects:tplFineTuneAnAgentWithAnLLM",
  "Fine-Tune an Agent without an LLM": "projects:tplFineTuneAnAgentWithoutAnLLM",
  "Freeform Metadata": "projects:tplFreeformMetadata",
  "HTML Entity Recognition": "projects:tplHTMLEntityRecognition",
  "HTML NER Tagging": "projects:tplHTMLNERTagging",
  "Human Preference collection for RLHF": "projects:tplHumanPreferenceCollectionForRLHF",
  "Image Captioning": "projects:tplImageCaptioning",
  "Image Classification": "projects:tplImageClassification",
  "Intent Classification": "projects:tplIntentClassification",
  "Intent Classification and Slot Filling": "projects:tplIntentClassificationAndSlotFilling",
  "Inventory Tracking": "projects:tplInventoryTracking",
  "Keypoint Labeling": "projects:tplKeypointLabeling",
  "LLM Ranker": "projects:tplLLMRanker",
  "LLM Response Grading": "projects:tplLLMResponseGrading",
  "Machine Translation": "projects:tplMachineTranslation",
  "Medical Image Classification with Bounding Boxes": "projects:tplMedicalImageClassificationWithBoundingBoxes",
  "Multi-page document annotation": "projects:tplMultiPageDocumentAnnotation",
  "NER Tagging for Invoices (BIO Format)": "projects:tplNERTaggingForInvoicesBIOFormat",
  "Named Entity Recognition": "projects:tplNamedEntityRecognition",
  "OCR Invoices Pre-NER BIO Format": "projects:tplOCRInvoicesPreNERBIOFormat",
  "OCR Labeling for PDFs": "projects:tplOCRLabelingForPDFs",
  "Object Detection with Bounding Boxes": "projects:tplObjectDetectionWithBoundingBoxes",
  "Optical Character Recognition": "projects:tplOpticalCharacterRecognition",
  "Outliers & Anomaly Detection": "projects:tplOutliersAnomalyDetection",
  "PDF Classification": "projects:tplPDFClassification",
  "Pairwise classification": "projects:tplPairwiseClassification",
  "Pairwise regression": "projects:tplPairwiseRegression",
  "Question Answering": "projects:tplQuestionAnswering",
  "Red-Teaming in Chat": "projects:tplRedTeamingInChat",
  "Relation Extraction": "projects:tplRelationExtraction",
  "Response Generation": "projects:tplResponseGeneration",
  "Response Selection": "projects:tplResponseSelection",
  "Search Page Ranking": "projects:tplSearchPageRanking",
  "Semantic Segmentation with Masks": "projects:tplSemanticSegmentationWithMasks",
  "Semantic Segmentation with Polygons": "projects:tplSemanticSegmentationWithPolygons",
  "Signal Quality": "projects:tplSignalQuality",
  "Signal Quality Detection": "projects:tplSignalQualityDetection",
  "Sound Event Detection": "projects:tplSoundEventDetection",
  "Speaker Segmentation": "projects:tplSpeakerSegmentation",
  "Speech Transcription": "projects:tplSpeechTranscription",
  "Supervised Language Model Fine-tuning": "projects:tplSupervisedLanguageModelFineTuning",
  "Tabular Data": "projects:tplTabularData",
  Taxonomy: "projects:tplTaxonomy",
  "Text Classification": "projects:tplTextClassification",
  "Text Summarization": "projects:tplTextSummarization",
  "Text-to-Image Generation": "projects:tplTextToImageGeneration",
  "Time Series Forecasting": "projects:tplTimeSeriesForecasting",
  "Two-Level Sentiment Analysis of X / Twitter posts": "projects:tplTwoLevelSentimentAnalysisOfXTwitterPosts",
  "Video Classification": "projects:tplVideoClassification",
  "Video Frame Classification": "projects:tplVideoFrameClassification",
  "Video Object Tracking": "projects:tplVideoObjectTracking",
  "Video Timeline Segmentation": "projects:tplVideoTimelineSegmentation",
  "Visual Genome": "projects:tplVisualGenome",
  "Visual Question Answering": "projects:tplVisualQuestionAnswering",
  "Visual Ranker": "projects:tplVisualRanker",
};

export function translateTemplateGroup(group: string): string {
  const key = TEMPLATE_GROUP_TITLES[group];
  return key ? i18next.t(key, { defaultValue: group }) : group;
}

export function translateTemplateTitle(title: string): string {
  const key = TEMPLATE_TITLES[title];
  return key ? i18next.t(key, { defaultValue: title }) : title;
}
