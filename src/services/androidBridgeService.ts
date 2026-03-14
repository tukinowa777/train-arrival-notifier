import { Station } from '../types';
import { DropoffTarget, HomeStationSetting } from './storageService';

declare global {
  interface Window {
    AndroidBridge?: {
      postMessage?: (message: string) => void;
    };
  }
}

type BridgeEnvelope = {
  type: string;
  requestId: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

function createBridgeEnvelope(type: string, payload: Record<string, unknown>): BridgeEnvelope {
  return {
    type,
    requestId: `${type}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    payload,
  };
}

export function canUseAndroidBridge(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return typeof window.AndroidBridge?.postMessage === 'function';
}

export function postAndroidBridgeMessage(type: string, payload: Record<string, unknown>): boolean {
  if (!canUseAndroidBridge()) {
    return false;
  }

  const envelope = createBridgeEnvelope(type, payload);
  window.AndroidBridge?.postMessage?.(JSON.stringify(envelope));
  return true;
}

export function sendAndroidTestNotification(title: string, body: string): boolean {
  return postAndroidBridgeMessage('notification.test', {
    title,
    body,
  });
}

export function sendHomeStationToAndroid(setting: HomeStationSetting | null): boolean {
  if (!setting) {
    return postAndroidBridgeMessage('homeStation.clear', {});
  }

  return postAndroidBridgeMessage('homeStation.set', {
    station: setting.station,
    setAt: setting.setAt,
  });
}

export function sendDropoffTargetToAndroid(target: DropoffTarget | null): boolean {
  if (!target) {
    return postAndroidBridgeMessage('dropoffTarget.clear', {});
  }

  return postAndroidBridgeMessage('dropoffTarget.set', {
    station: target.station,
    enabled: target.enabled,
    notified: target.notified,
    notifyBeforeMinutes: target.notifyBeforeMinutes,
    targetDistance: target.targetDistance,
    setAt: target.setAt,
    notifiedAt: target.notifiedAt,
  });
}

export function sendSelectedStationToAndroid(station: Station): boolean {
  return postAndroidBridgeMessage('station.preview', {
    station,
  });
}
