import { WorkerMessages } from '~/types/worker-commands.interface';

export const waitForMessage = <T extends WorkerMessages, MessageType extends T['type']>(
  worker: Worker,
  messageType: MessageType,
  timeout = 30000,
) =>
  new Promise<T & { type: MessageType }>((resolve, reject) => {
    const removeListener = () => worker.removeEventListener('message', resolveCallback);
    const timeoutTimer = setTimeout(() => {
      removeListener();
      reject(`Worker message not received in ${timeout / 1000} seconds.`);
    }, timeout);
    const resolveCallback = (message: MessageEvent<WorkerMessages>) => {
      if (message.data.type === messageType) {
        removeListener();
        clearTimeout(timeoutTimer);
        resolve(message.data as never);
      }
    };
    worker.addEventListener('message', resolveCallback);
  });
