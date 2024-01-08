type MessengerResponder = (result: Record<string, any>) => void;

type MessengerCallback = (data: any, storage: Record<string, any>, respond: MessengerResponder) => void;

type MessengerInput = {
  compute: MessengerCallback,
  precompute?: MessengerCallback,
}

export class ComputeWorker {
  private worker: Worker;

  static Messenger = {
    receive({
      compute: computeCallback,
      precompute: precomputeCallback,
    }: MessengerInput) {
      const storage: Record<string, any> = {};

      const storeData = (e: MessageEvent) => {
        Object.assign(storage, e.data.data);
      };

      const compute = (data: any, eventId: string) => {
        const respond = (result: Record<string, any>) => {
          self.postMessage({
            result,
            eventId,
          });
        };

        computeCallback(data, storage, respond);
      };

      const precompute = (data: any) => {
        precomputeCallback?.(data, storage, (result) => {
          Object.assign(storage, result);
        });
      };

      const getStorage = (eventId: string) => {
        self.postMessage({
          result: storage,
          eventId,
        });
      };

      self.addEventListener('message', (e) => {
        if (!e.data) return;

        const { data, type, eventId } = e.data;

        switch (type) {
          case 'compute': compute(data, eventId); break;
          case 'precompute': precompute(data); break;
          case 'store': storeData(e); break;
          case 'getStorage': getStorage(eventId); break;
        }
      });
    },
  };

  constructor(url: Worker) {
    this.worker = url;
  }

  async compute(data: Record<string, any>) {
    const result = await this.sendMessage(this.worker, {
      data,
      type: 'compute',
    }, true);

    return result?.data?.result?.data;
  }

  async precompute(data: Record<string, any>) {
    await this.sendMessage(this.worker, {
      data,
      type: 'precompute',
    });
  }

  async store(data: Record<string, any>) {
    await this.sendMessage(this.worker, {
      data,
      type: 'store',
    });
  }

  async getStorage() {
    const response = await this.sendMessage(this.worker, {
      type: 'getStorage',
    }, true);

    return response?.data?.result;
  }

  destroy() {
    this.worker.terminate();
  }

  private sendMessage(worker: Worker, data: Record<string, any>, waitResponse = false) {
    return new Promise<MessageEvent | undefined>((resolve) => {
      const eventId = Math.random().toString();

      if (waitResponse) {
        const resolver = (e: MessageEvent) => {
          if (eventId === e.data.eventId) {
            worker.removeEventListener('message', resolver);
            resolve(e);
          }
        };

        worker.addEventListener('message', resolver);
      }

      worker.postMessage({ ...data, eventId });

      if (!waitResponse) resolve(undefined);
    });
  }
}
