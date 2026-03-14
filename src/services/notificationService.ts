import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NextTrainInfo } from '../types';

// 通知カテゴリ
export enum NotificationCategory {
  TRAIN_ARRIVAL = 'train_arrival',
  STATION_APPROACH = 'station_approach',
  SERVICE_ALERT = 'service_alert',
}

// 通知の優先度
export enum NotificationPriority {
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

// 通知設定
export interface NotificationConfig {
  sound: boolean;
  vibrate: boolean;
  badge: boolean;
  priority: NotificationPriority;
  categoryId?: NotificationCategory;
}

// デフォルト通知設定
const DEFAULT_CONFIG: NotificationConfig = {
  sound: true,
  vibrate: true,
  badge: true,
  priority: NotificationPriority.DEFAULT,
};

/**
 * 通知ハンドラーを設定
 * アプリがフォアグラウンドにあるときの通知の振る舞いを定義
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const categoryId = notification.request.content.categoryIdentifier;

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        // 重要な通知（駅接近など）は優先表示
        priority: categoryId === NotificationCategory.STATION_APPROACH
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      };
    },
  });
}

/**
 * 通知権限をリクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Web環境の場合はブラウザネイティブ通知権限を使用
    if (Platform.OS === 'web') {
      return await requestWebNotificationPermission();
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('通知権限が拒否されました');
      return false;
    }

    // Android用の通知チャンネルを設定
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannels();
    }

    console.log('通知権限が許可されました');
    return true;
  } catch (error) {
    console.error('通知権限のリクエストに失敗:', error);

    // Web環境でExpoが失敗した場合は代替手段を試行
    if (Platform.OS === 'web') {
      console.log('Expo権限失敗、ブラウザネイティブ権限にフォールバック');
      return await requestWebNotificationPermission();
    }

    return false;
  }
}

/**
 * デバイスがiOSかどうか判定
 */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * ブラウザが通知をサポートしているかチェック
 */
function isNotificationSupported(): {
  supported: boolean;
  reason?: string;
  suggestion?: string;
} {
  // ブラウザ通知API存在チェック
  if (!('Notification' in window)) {
    return {
      supported: false,
      reason: 'ブラウザが通知APIをサポートしていません',
      suggestion: '最新のブラウザをご利用ください'
    };
  }

  // iOS固有の制限チェック
  if (isIOSDevice()) {
    const isStandalone = window.navigator.standalone ||
                        window.matchMedia('(display-mode: standalone)').matches;

    if (!isStandalone) {
      return {
        supported: false,
        reason: 'iOSでは、Webアプリをホーム画面に追加した場合のみ通知が利用可能です',
        suggestion: 'Safari で「ホーム画面に追加」してからご利用ください'
      };
    }
  }

  return { supported: true };
}

/**
 * Web環境専用の通知権限リクエスト
 */
async function requestWebNotificationPermission(): Promise<boolean> {
  try {
    // 通知サポート確認
    const supportCheck = isNotificationSupported();
    if (!supportCheck.supported) {
      console.warn('通知制限:', supportCheck.reason);
      if (supportCheck.suggestion) {
        console.info('推奨対応:', supportCheck.suggestion);
      }
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Web通知権限が許可されました');
      return true;
    } else {
      console.log(`Web通知権限が拒否されました: ${permission}`);
      return false;
    }

  } catch (error) {
    console.error('Web通知権限のリクエストに失敗:', error);

    // iOS固有のエラーハンドリング
    if (isIOSDevice()) {
      console.info('iOSデバイスの場合、Webアプリをホーム画面に追加してからお試しください');
    }

    return false;
  }
}

/**
 * Android用の通知チャンネルを設定
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  try {
    // 電車到着通知チャンネル
    await Notifications.setNotificationChannelAsync(NotificationCategory.TRAIN_ARRIVAL, {
      name: '電車到着通知',
      description: '次の電車の到着時刻に関する通知',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066CC',
      sound: 'default',
    });

    // 駅接近通知チャンネル
    await Notifications.setNotificationChannelAsync(NotificationCategory.STATION_APPROACH, {
      name: '駅接近通知',
      description: '駅に近づいた時の通知',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6600',
      sound: 'default',
    });

    // サービス情報チャンネル
    await Notifications.setNotificationChannelAsync(NotificationCategory.SERVICE_ALERT, {
      name: 'サービス情報',
      description: '運行情報や重要なお知らせ',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#9ACD32',
      sound: 'default',
    });

    console.log('Android通知チャンネルを設定しました');
  } catch (error) {
    console.error('Android通知チャンネルの設定に失敗:', error);
  }
}

/**
 * 現在の通知権限状態を取得
 */
export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  message?: string;
  suggestion?: string;
}> {
  try {
    // Web環境の場合はブラウザネイティブ権限を確認
    if (Platform.OS === 'web') {
      const supportCheck = isNotificationSupported();

      if (!supportCheck.supported) {
        return {
          granted: false,
          canAskAgain: false,
          status: 'unsupported',
          message: supportCheck.reason,
          suggestion: supportCheck.suggestion,
        };
      }

      const permission = Notification.permission;
      return {
        granted: permission === 'granted',
        canAskAgain: permission === 'default',
        status: permission,
      };
    }

    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status,
    };
  } catch (error) {
    console.error('通知権限状態の取得に失敗:', error);

    // Web環境でエラーの場合はサポート状況を再確認
    if (Platform.OS === 'web') {
      const supportCheck = isNotificationSupported();

      if (!supportCheck.supported) {
        return {
          granted: false,
          canAskAgain: false,
          status: 'unsupported',
          message: supportCheck.reason,
          suggestion: supportCheck.suggestion,
        };
      }

      if ('Notification' in window) {
        const permission = Notification.permission;
        return {
          granted: permission === 'granted',
          canAskAgain: permission === 'default',
          status: permission,
        };
      }
    }

    return {
      granted: false,
      canAskAgain: true,
      status: 'unknown',
    };
  }
}

/**
 * 即座にローカル通知を送信
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  config: Partial<NotificationConfig> = {}
): Promise<string | null> {
  try {
    // Web環境の場合はブラウザネイティブ通知を使用
    if (Platform.OS === 'web') {
      return await sendWebNotification(title, body, config);
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: finalConfig.sound ? 'default' : false,
        vibrate: finalConfig.vibrate ? [0, 250, 250, 250] : [],
        badge: finalConfig.badge ? 1 : 0,
        categoryIdentifier: finalConfig.categoryId,
        data: {
          timestamp: new Date().toISOString(),
          category: finalConfig.categoryId,
        },
      },
      trigger: null, // 即座に表示
    });

    console.log(`通知を送信しました: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('通知の送信に失敗:', error);

    // Web環境でExpoが失敗した場合は代替手段を試行
    if (Platform.OS === 'web') {
      console.log('Expo通知失敗、ブラウザネイティブ通知にフォールバック');
      return await sendWebNotification(title, body, config);
    }

    return null;
  }
}

/**
 * Web環境専用のブラウザネイティブ通知
 */
async function sendWebNotification(
  title: string,
  body: string,
  config: Partial<NotificationConfig> = {}
): Promise<string | null> {
  try {
    // 通知サポート確認
    const supportCheck = isNotificationSupported();
    if (!supportCheck.supported) {
      console.warn('通知制限:', supportCheck.reason);
      if (supportCheck.suggestion) {
        console.info('推奨対応:', supportCheck.suggestion);
      }
      return null;
    }

    // 権限確認
    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.error('通知権限が許可されていません');
      return null;
    }

    // 通知作成
    const notificationId = `web-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notificationId,
      requireInteraction: false, // 自動で消えるように設定
      silent: !config.sound, // sound設定を反映
    });

    // 5秒後に自動で閉じる
    setTimeout(() => {
      notification.close();
    }, 5000);

    // クリックハンドラー
    notification.onclick = () => {
      console.log('Web通知がクリックされました');
      window.focus(); // ウィンドウをフォーカス
      notification.close();
    };

    // エラーハンドラー
    notification.onerror = (error) => {
      console.error('Web通知エラー:', error);
    };

    console.log(`Web通知を送信しました: ${notificationId}`);
    return notificationId;

  } catch (error) {
    console.error('Web通知の送信に失敗:', error);

    // iOS固有のエラーハンドリング
    if (isIOSDevice()) {
      console.info('iOSデバイスの場合、Webアプリをホーム画面に追加してからお試しください');
    }

    return null;
  }
}

/**
 * 指定時刻に通知をスケジュール
 */
export async function scheduleNotificationAt(
  title: string,
  body: string,
  triggerDate: Date,
  config: Partial<NotificationConfig> = {}
): Promise<string | null> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // 過去の時刻の場合はエラー
    if (triggerDate <= new Date()) {
      throw new Error('過去の時刻には通知をスケジュールできません');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: finalConfig.sound ? 'default' : false,
        vibrate: finalConfig.vibrate ? [0, 250, 250, 250] : [],
        badge: finalConfig.badge ? 1 : 0,
        categoryIdentifier: finalConfig.categoryId,
        data: {
          scheduledFor: triggerDate.toISOString(),
          category: finalConfig.categoryId,
        },
      },
      trigger: { date: triggerDate } as Notifications.DateTriggerInput,
    });

    console.log(`通知をスケジュールしました: ${notificationId} at ${triggerDate.toISOString()}`);
    return notificationId;
  } catch (error) {
    console.error('通知のスケジュールに失敗:', error);
    return null;
  }
}

/**
 * 電車到着通知を送信
 */
export async function sendTrainArrivalNotification(
  nextTrain: NextTrainInfo,
  advanceMinutes: number = 5
): Promise<string | null> {
  const title = `🚃 まもなく ${nextTrain.station}駅`;
  const body = `${nextTrain.line} ${nextTrain.direction} ${nextTrain.train.destination}
${nextTrain.remainingMinutes}分後 (${nextTrain.train.departureTime}発)`;

  return await sendImmediateNotification(title, body, {
    categoryId: NotificationCategory.TRAIN_ARRIVAL,
    priority: NotificationPriority.HIGH,
  });
}

/**
 * 駅接近通知を送信
 */
export async function sendStationApproachNotification(
  stationName: string,
  distance: number
): Promise<string | null> {
  const title = '📍 駅に接近しています';
  const body = `${stationName}駅まで約${Math.round(distance)}m
次の電車を確認しますか？`;

  return await sendImmediateNotification(title, body, {
    categoryId: NotificationCategory.STATION_APPROACH,
    priority: NotificationPriority.HIGH,
    vibrate: true,
  });
}

/**
 * 電車到着の事前通知をスケジュール
 */
export async function scheduleTrainArrivalAlert(
  nextTrain: NextTrainInfo,
  advanceMinutes: number = 5
): Promise<string | null> {
  try {
    const alertTime = new Date(nextTrain.arrivalTime.getTime() - (advanceMinutes * 60 * 1000));

    const title = `⏰ ${advanceMinutes}分後に電車が到着`;
    const body = `${nextTrain.station}駅 ${nextTrain.line}
${nextTrain.train.destination} ${nextTrain.train.departureTime}発`;

    return await scheduleNotificationAt(title, body, alertTime, {
      categoryId: NotificationCategory.TRAIN_ARRIVAL,
      priority: NotificationPriority.DEFAULT,
    });
  } catch (error) {
    console.error('電車到着アラートのスケジュールに失敗:', error);
    return null;
  }
}

/**
 * スケジュール済みの通知を取得
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    // Web環境での制限チェック
    if (Platform.OS === 'web') {
      console.log('Web環境: スケジュール通知の取得は制限されています');
      return [];
    }

    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('スケジュール済み通知の取得に失敗:', error);

    // Web環境特有のエラーの場合は空配列を返す
    if (error instanceof Error && error.message.includes('web')) {
      console.log('Web環境でのスケジュール通知制限を検出');
      return [];
    }

    return [];
  }
}

/**
 * 通知をキャンセル
 */
export async function cancelNotification(notificationId: string): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`通知をキャンセルしました: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('通知のキャンセルに失敗:', error);
    return false;
  }
}

/**
 * 全ての通知をキャンセル
 */
export async function cancelAllNotifications(): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('全ての通知をキャンセルしました');
    return true;
  } catch (error) {
    console.error('全通知のキャンセルに失敗:', error);
    return false;
  }
}

/**
 * バッジ数を設定
 */
export async function setBadgeCount(count: number): Promise<boolean> {
  try {
    await Notifications.setBadgeCountAsync(count);
    return true;
  } catch (error) {
    console.error('バッジ数の設定に失敗:', error);
    return false;
  }
}

/**
 * バッジをクリア
 */
export async function clearBadge(): Promise<boolean> {
  return await setBadgeCount(0);
}

/**
 * 通知履歴をクリア
 */
export async function clearNotificationHistory(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.dismissAllNotificationsAsync();
    }
    return true;
  } catch (error) {
    console.error('通知履歴のクリアに失敗:', error);
    return false;
  }
}