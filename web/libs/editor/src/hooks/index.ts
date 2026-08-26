/**
 * FIT-720: Public hook exports for the editor
 */
export {
  useAnnotation,
  useAnnotationFetcher,
  annotationKeys,
  ANNOTATION_DETAIL_TASK_SCOPE,
  fetchAnnotation,
  invalidateAnnotationCache,
  invalidateAnnotationCachesForTask,
  invalidateTaskAgreementCache,
  type AnnotationData,
} from "./useAnnotationQuery";
