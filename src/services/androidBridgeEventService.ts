import { canUseAndroidBridge, postAndroidBridgeMessage } from './androidBridgeService';

const ANDROID_BRIDGE_EVENT = 'train_notifier_android_bridge_event';

export interface AndroidBridgeEventEnvelope {
  type: string;
  requestId?: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
}

type AndroidBridgeEventListener = (event: AndroidBridgeEventEnvelope) => void;

declare global {
  interface Window {
    handleAndroidBridgeMessage?: (rawMessage: string) => void;
  }
}

/**
 * Android 側からのメッセージ受信口を初期化する
 */
export function ensureAndroidBridgeEventHandler(): void {
  if (
    typeof window === 'undefined' ||
    window.handleAndroidBridgeMessage ||
    typeof window.dispatchEvent !== 'function' ||
    typeof CustomEvent !== 'function'
  ) {
    return;
  }

  window.handleAndroidBridgeMessage = (rawMessage: string) => {
    try {
      const parsedMessage = JSON.parse(rawMessage) as AndroidBridgeEventEnvelope;
      window.dispatchEvent(
        new CustomEvent<AndroidBridgeEventEnvelope>(ANDROID_BRIDGE_EVENT, {
          detail: parsedMessage,
        })
      );
    } catch (error) {
      console.error('AndroidBridge メッセージの解析に失敗:', error);
    }
  };
}

/**
 * Android 側からのイベントを購読する
 */
export function subscribeAndroidBridgeEvents(listener: AndroidBridgeEventListener): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.addEventListener !== 'function' ||
    typeof window.removeEventListener !== 'function'
  ) {
    return () => undefined;
  }

  ensureAndroidBridgeEventHandler();

  const handleEvent = (event: Event) => {
    const customEvent = event as CustomEvent<AndroidBridgeEventEnvelope>;
    listener(customEvent.detail);
  };

  window.addEventListener(ANDROID_BRIDGE_EVENT, handleEvent);

  return () => {
    window.removeEventListener(ANDROID_BRIDGE_EVENT, handleEvent);
  };
}

/**
 * Android 側へ権限状態の返却を要求する
 */
export function requestAndroidPermissionState(): boolean {
  if (!canUseAndroidBridge()) {
    return false;
  }

  return postAndroidBridgeMessage('permissions.get', {});
}
