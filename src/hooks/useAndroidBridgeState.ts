import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AndroidBridgeEventEnvelope,
  ensureAndroidBridgeEventHandler,
  requestAndroidPermissionState,
  subscribeAndroidBridgeEvents,
} from '../services/androidBridgeEventService';
import { canUseAndroidBridge } from '../services/androidBridgeService';

interface AndroidBridgeState {
  isBridgeAvailable: boolean;
  lastEventType: string | null;
  lastEventAt: string | null;
  notificationPermissionGranted: boolean | null;
  foregroundLocationGranted: boolean | null;
  backgroundLocationGranted: boolean | null;
  lastNotificationTestAt: string | null;
}

function getBooleanValue(payload: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
}

/**
 * Android 側から返る状態イベントを管理する
 */
export function useAndroidBridgeState(): {
  state: AndroidBridgeState;
  actions: {
    requestPermissionState: () => boolean;
  };
} {
  const [state, setState] = useState<AndroidBridgeState>({
    isBridgeAvailable: false,
    lastEventType: null,
    lastEventAt: null,
    notificationPermissionGranted: null,
    foregroundLocationGranted: null,
    backgroundLocationGranted: null,
    lastNotificationTestAt: null,
  });

  useEffect(() => {
    const bridgeAvailable = canUseAndroidBridge();
    ensureAndroidBridgeEventHandler();

    setState((prev) => ({
      ...prev,
      isBridgeAvailable: bridgeAvailable,
    }));

    const unsubscribe = subscribeAndroidBridgeEvents((event: AndroidBridgeEventEnvelope) => {
      const payload = event.payload ?? {};
      const eventTimestamp = event.timestamp ?? new Date().toISOString();

      setState((prev) => {
        const nextState: AndroidBridgeState = {
          ...prev,
          isBridgeAvailable: canUseAndroidBridge(),
          lastEventType: event.type,
          lastEventAt: eventTimestamp,
        };

        if (event.type === 'permissions.state') {
          nextState.notificationPermissionGranted = getBooleanValue(payload, [
            'notificationGranted',
            'notificationPermissionGranted',
          ]);
          nextState.foregroundLocationGranted = getBooleanValue(payload, [
            'foregroundLocationGranted',
            'locationGranted',
          ]);
          nextState.backgroundLocationGranted = getBooleanValue(payload, [
            'backgroundLocationGranted',
          ]);
        }

        if (event.type === 'notification.test.sent' || event.type === 'notification.sent') {
          nextState.lastNotificationTestAt = eventTimestamp;
        }

        return nextState;
      });
    });

    return unsubscribe;
  }, []);

  const requestPermissionState = useCallback(() => {
    const requested = requestAndroidPermissionState();

    setState((prev) => ({
      ...prev,
      isBridgeAvailable: canUseAndroidBridge(),
    }));

    return requested;
  }, []);

  return useMemo(
    () => ({
      state,
      actions: {
        requestPermissionState,
      },
    }),
    [requestPermissionState, state]
  );
}
