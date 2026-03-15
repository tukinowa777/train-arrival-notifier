import { useEffect, useRef } from 'react';

import { useStorage } from './useStorage';
import {
  canUseAndroidBridge,
  sendDropoffTargetToAndroid,
  sendHomeStationToAndroid,
} from '../services/androidBridgeService';

/**
 * Web 側の保存状態を Android 側へ同期する
 */
export function useAndroidBridgeSync(): void {
  const { state: storageState } = useStorage();
  const lastHomeStationRef = useRef<string | null>(null);
  const lastDropoffTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storageState.isInitialized || !canUseAndroidBridge()) {
      return;
    }

    const serializedHomeStation = JSON.stringify(storageState.homeStation);

    if (lastHomeStationRef.current === serializedHomeStation) {
      return;
    }

    sendHomeStationToAndroid(storageState.homeStation);
    lastHomeStationRef.current = serializedHomeStation;
  }, [storageState.homeStation, storageState.isInitialized]);

  useEffect(() => {
    if (!storageState.isInitialized || !canUseAndroidBridge()) {
      return;
    }

    const serializedDropoffTarget = JSON.stringify(storageState.dropoffTarget);

    if (lastDropoffTargetRef.current === serializedDropoffTarget) {
      return;
    }

    sendDropoffTargetToAndroid(storageState.dropoffTarget);
    lastDropoffTargetRef.current = serializedDropoffTarget;
  }, [storageState.dropoffTarget, storageState.isInitialized]);
}
