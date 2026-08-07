export const getInteractiveContextResult = (serializedAnnotation, region, group) => {
  const control = region.results?.[0];
  const fromName = control?.from_name?.name ?? control?.from_name;
  const toName = control?.to_name?.name ?? control?.to_name;

  if (region.type === "rectangleregion" && fromName && toName) {
    const currentRegion = region.serialize?.();
    const annotationResults = currentRegion
      ? serializedAnnotation.some((result) => result.id === currentRegion.id)
        ? serializedAnnotation
        : [...serializedAnnotation, currentRegion]
      : serializedAnnotation;

    return annotationResults.filter(
      (result) =>
        result.type === "rectanglelabels" &&
        result.from_name === fromName &&
        result.to_name === toName,
    );
  }

  const ids = group.map((item) => item.cleanId);

  return serializedAnnotation.filter((result) => ids.includes(result.id));
};