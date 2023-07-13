import { ComputeWorker } from '../Common/Worker';

export function splitChannels({
  value,
  channelCount,
}: {
  value: Float32Array,
  channelCount: number,
}) : Float32Array[] {
  const channels: Float32Array[] = [];

  // Create new Float32Array for each channel
  for (let c = 0; c < channelCount; c++) {
    channels[c] = new Float32Array(value.length / channelCount);
  }

  // Split the channels into separate Float32Array samples
  for (let sample = 0; sample < value.length; sample++) {
    // interleaved channels
    // ie. 2 channels
    // [channel1, channel2, channel1, channel2, ...]
    const channel = sample % channelCount;
    // index of the channel sample
    // ie. 2 channels
    // sample = 8, channel = 0, channelIndex = 4
    // sample = 9, channel = 1, channelIndex = 4
    // sample = 10, channel = 0, channelIndex = 5
    // sample = 11, channel = 1, channelIndex = 5
    const channelIndex = Math.floor(sample / channelCount);

    channels[channel][channelIndex] = value[sample];
  }

  return channels;
}

ComputeWorker.Messenger.receive({
  compute: (data, _storage, respond) => {
    respond({
      data: splitChannels(data),
    });
  },

  precompute: (data, _storage, respond) => {
    respond({
      data: splitChannels(data),
    });
  },
});
