import { generateWithdrawalProof } from '~/utils';
import { WorkerCommands, WorkerMessages } from '../types/worker-commands.interface';

const sendResponse = <T extends WorkerMessages>(message: T) => {
  self.postMessage(message);
};

self.onmessage = async (event: MessageEvent<WorkerCommands>) => {
  const command = event.data;
  switch (command.type) {
    case 'generateWithdrawalProof': {
      const { input, commitment } = command.payload;
      const proof = await generateWithdrawalProof(commitment, input);
      sendResponse({
        type: 'withdrawalProved',
        payload: proof,
        id: command.id,
      });
    }
  }
};

// self.onmessage = async (event: MessageEvent<WorkerCommands>) => {
//   const { type, id } = event.data;

//   try {
//     // Send progress update for circuit loading
//     self.postMessage({
//       type: 'progress',
//       payload: { phase: 'loading_circuits', progress: 0.2 },
//       id,
//     } as ZKProofWorkerResponse);

//     // Simulate some work
//     await new Promise((resolve) => setTimeout(resolve, 300));

//     // Send progress update for proof generation start
//     self.postMessage({
//       type: 'progress',
//       payload: { phase: 'generating_proof', progress: 0.3 },
//       id,
//     } as ZKProofWorkerResponse);

//     await new Promise((resolve) => setTimeout(resolve, 500));

//     // Send progress update for proof generation middle
//     self.postMessage({
//       type: 'progress',
//       payload: { phase: 'generating_proof', progress: 0.5 },
//       id,
//     } as ZKProofWorkerResponse);

//     await new Promise((resolve) => setTimeout(resolve, 500));

//     // Send progress update for proof generation advanced
//     self.postMessage({
//       type: 'progress',
//       payload: { phase: 'generating_proof', progress: 0.7 },
//       id,
//     } as ZKProofWorkerResponse);

//     await new Promise((resolve) => setTimeout(resolve, 500));

//     // Send progress update for verification start
//     self.postMessage({
//       type: 'progress',
//       payload: { phase: 'verifying_proof', progress: 0.8 },
//       id,
//     } as ZKProofWorkerResponse);

//     await new Promise((resolve) => setTimeout(resolve, 300));

//     // For now, just return a mock result to test communication
//     // In a real implementation, this would call the SDK
//     let result: unknown;

//     switch (type) {
//       case 'generateRagequitProof':
//         // Mock result - in real implementation this would call SDK
//         result = {
//           proof: {
//             pi_a: ['0', '0'],
//             pi_b: [
//               ['0', '0'],
//               ['0', '0'],
//             ],
//             pi_c: ['0', '0'],
//           },
//           publicSignals: ['0', '0', '0', '0'],
//         };
//         break;

//       case 'generateWithdrawalProof':
//         // Mock result - in real implementation this would call SDK
//         result = {
//           proof: {
//             pi_a: ['0', '0'],
//             pi_b: [
//               ['0', '0'],
//               ['0', '0'],
//             ],
//             pi_c: ['0', '0'],
//           },
//           publicSignals: ['0', '0', '0', '0'],
//         };
//         break;

//       case 'verifyWithdrawalProof':
//         // Mock result - in real implementation this would call SDK
//         result = true;
//         break;

//       default:
//         throw new Error(`Unknown message type: ${type}`);
//     }

//     self.postMessage({
//       type: 'success',
//       payload: result,
//       id,
//     } as ZKProofWorkerResponse);
//   } catch (error) {
//     self.postMessage({
//       type: 'error',
//       payload: {
//         message: error instanceof Error ? error.message : 'Unknown error',
//         stack: error instanceof Error ? error.stack : undefined,
//       },
//       id,
//     } as ZKProofWorkerResponse);
//   }
// };
