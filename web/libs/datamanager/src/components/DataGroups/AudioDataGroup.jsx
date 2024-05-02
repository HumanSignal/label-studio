import { MediaPlayer } from "../Common/MediaPlayer/MediaPlayer";

export const AudioDataGroup = ({ value }) => {
  const style = {
    padding: 10,
    height: AudioDataGroup.height,
    boxSizing: "content-box",
  };

  return (
    <div style={style}>
      <MediaPlayer src={value} />
    </div>
  );
};

AudioDataGroup.height = 32;
