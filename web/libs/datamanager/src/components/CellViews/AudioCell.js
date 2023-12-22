import { MediaPlayer } from "../Common/MediaPlayer/MediaPlayer";

export const AudioCell = (column) => {
  return <MediaPlayer src={column.value} />;
};

AudioCell.style = {
  width: 50,
  minWidth: 240,
};

/* Audio Plus */

export const AudioPlusCell = (column) => {
  return <MediaPlayer src={column.value} />;
};

AudioPlusCell.style = {
  width: 240,
  minWidth: 240,
};

AudioPlusCell.userSelectable = false;
