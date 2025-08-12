import { useConnect, Connector } from '@starknet-react/core';
import { setUserConnectedCookie } from '~/actions';
import { getEnv } from '~/config/env';
import { useNotifications } from './context/useNotificationsContext';
import { useSafeApp } from './useSafeApp';
const { TEST_MODE } = getEnv();

export const useCustomConnect = () => {
  const { addNotification } = useNotifications();
  const { connectors, connectAsync } = useConnect();
  const { isSafeApp } = useSafeApp();

  // Filter connectors based on context
  const availableConnectors = TEST_MODE
    ? connectors
    : isSafeApp
      ? [
          ...connectors.filter((connector) => connector.id === 'safe'), // Prefer Safe connector when in Safe
          ...connectors.filter((connector) => connector.id === 'injected'), // Fallback to injected
        ]
      : connectors;

  const customConnect = async (connector: Connector) => {
    try {
      await connectAsync({ connector });
      setUserConnectedCookie();
    } catch (error) {
      const err = error as Error;
      console.error(err);
      addNotification('error', `Failed to connect: ${err.message}`);
    }
  };

  // Automatically connect to Safe when running in Safe app
  const autoConnectSafe = async () => {
    if (isSafeApp) {
      const safeConnector = connectors.find((connector) => connector.id === 'safe');
      if (safeConnector) {
        await customConnect(safeConnector);
      }
    }
  };

  return {
    availableConnectors,
    customConnect,
    autoConnectSafe,
    isSafeApp,
  };
};
