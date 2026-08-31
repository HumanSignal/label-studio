import { MediaPlayer } from "../Common/MediaPlayer/MediaPlayer";

/**
 * Data Collection: the file submitted for the task, read from the latest
 * submitted annotation. The serializer sends `{url, content_type, filename}`
 * (or null while nothing has been submitted yet).
 */
export const SubmissionCell = (column) => {
  const value = column.value;

  if (!value?.url) return null;

  const contentType = value.content_type ?? "";

  if (contentType.startsWith("video/")) {
    return <MediaPlayer src={value.url} video />;
  }
  if (contentType.startsWith("audio/")) {
    return <MediaPlayer src={value.url} />;
  }
  if (contentType.startsWith("image/")) {
    return (
      <img
        key={value.url}
        src={value.url}
        alt={value.filename ?? "Submission"}
        loading="lazy"
        style={{
          maxHeight: "100%",
          maxWidth: "100%",
          objectFit: "contain",
          borderRadius: 3,
        }}
      />
    );
  }

  return (
    <a href={value.url} target="_blank" rel="noreferrer noopener">
      {value.filename ?? "Open file"}
    </a>
  );
};

SubmissionCell.style = {
  width: 240,
  minWidth: 240,
};
