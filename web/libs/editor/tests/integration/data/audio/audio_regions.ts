export const audioWithLabelsConfig = `<View>
  <Audio name="audio" value="$audio" />
  <Labels name="labels" toName="audio">
    <Label value="Noise" />
    <Label value="Music" />
    <Label value="Speech" />
  </Labels>
</View>`;

export const audioWithLabelsData = {
  audio: "/public/files/barradeen-emotional.mp3",
};

export const audioOneRegionResult = [
  {
    original_length: 98.719925,
    value: {
      start: 25.10367191523605,
      end: 49.99549849785408,
      channel: 0,
      labels: ["Music"],
    },
    id: "M5lfg",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    origin: "manual",
  },
];
