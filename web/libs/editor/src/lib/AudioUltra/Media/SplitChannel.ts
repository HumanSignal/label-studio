import { Destructable } from '../Common/Destructable';
import { ComputeWorker } from '../Common/Worker';

export class SplitChannel extends Destructable {
  static usage = 0;
  channelCount = 1;
  static worker: ComputeWorker | undefined;

  constructor(channelCount: number) {
    super();
    SplitChannel.usage++;
    if (!SplitChannel.worker) {
      // eslint-disable-next-line
      // @ts-ignore
      SplitChannel.worker = new ComputeWorker(new Worker(new URL('./SplitChannelWorker.ts', import.meta.url)));
    }
    this.channelCount = channelCount;
  }

  destroy() {
    SplitChannel.usage--;
    if (SplitChannel.usage === 0) {
      SplitChannel.worker?.destroy();
      SplitChannel.worker = undefined;
    }
    super.destroy();
  }

  async split(value: Float32Array): Promise<Float32Array[]> {
    if (!SplitChannel.worker) throw new Error('AudioDecoder: worker not initialized');

    return SplitChannel.worker.compute({
      value,
      channelCount: this.channelCount,
    });
  }
}
	
