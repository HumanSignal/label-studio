const EXCLUDED_FILTER_OPERATIONS = {
  "DE": ["contains", "not_contains", "regex"],
};

export const allowedFilterOperations = (operationsList, context = "") => {
  return (context in EXCLUDED_FILTER_OPERATIONS) ? (
    operationsList.filter(op => !EXCLUDED_FILTER_OPERATIONS[context].includes(op.key))
  ) : (
    operationsList
  );
};