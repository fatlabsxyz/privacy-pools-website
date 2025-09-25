import { deposit, generateWithdrawalProof, rageQuit } from '~/utils';
import { WorkerCommands, WorkerMessages } from '../types/worker-commands.interface';

const sendResponse = <T extends WorkerMessages>(message: T) => {
  self.postMessage(message);
};

self.onmessage = async (event: MessageEvent<WorkerCommands>) => {
  const command = event.data;
  const { id, type } = command;
  switch (type) {
    case 'generateWithdrawalProof': {
      const { input, commitment } = command.payload;
      const proof = await generateWithdrawalProof(commitment, input);
      sendResponse({
        type: 'withdrawalProved',
        payload: proof,
        id: id,
      });
      break;
    }
    case 'generateDepositProve': {
      const payload = await deposit(command.payload);
      sendResponse({
        type: 'depositProved',
        payload,
        id,
      });
      break;
    }
    case 'generateRagequiteProve': {
      const payload = await rageQuit(command.payload);
      sendResponse({
        type: 'rageQuitProved',
        payload,
        id,
      });
      break;
    }
  }
};
