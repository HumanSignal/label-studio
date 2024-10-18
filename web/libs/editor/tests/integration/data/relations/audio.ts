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

export const audioWithFourRegionsResult = [
  {
    original_length: 98.719925,
    value: {
      start: 25.10367191523605,
      end: 49.99549849785408,
      channel: 0,
      labels: ["Music"],
    },
    id: "1",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    origin: "manual",
  },
  {
    original_length: 98.719925,
    value: {
      start: 50.10367191523605,
      end: 74.995498497854,
      channel: 0,
      labels: ["Speech"],
    },
    id: "2",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    origin: "manual",
  },
  {
    original_length: 98.719925,
    value: {
      start: 75.10367191523605,
      end: 99.995498497854,
      channel: 0,
      labels: ["Noise"],
    },
    id: "3",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    origin: "manual",
  },
  {
    original_length: 98.719925,
    value: {
      start: 0,
      end: 24.99549849785408,
      channel: 0,
      labels: ["Noise"],
    },
    id: "4",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    origin: "manual",
  },
];
