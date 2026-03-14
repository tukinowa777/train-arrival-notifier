import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

import {
  setupNotificationHandler,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  sendImmediateNotification,
  scheduleNotificationAt,
  sendTrainArrivalNotification,
  sendStationApproachNotification,
  scheduleTrainArrivalAlert,
  getScheduledNotifications,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
  NotificationConfig,
  NotificationCategory,
} from '../services/notificationService';
import { NextTrainInfo } from '../types';

// 通知の状態
export interface NotificationState {
  // 権限状態
  permissionGranted: boolean;
  canAskAgain: boolean;
  permissionStatus: string;

  // スケジュール済み通知
  scheduledNotifications: Notifications.NotificationRequest[];

  // 通知履歴
  lastNotification: Notifications.Notification | null;
  notificationCount: number;

  // 状態フラグ
  isLoading: boolean;
  isInitialized: boolean;

  // エラー状態
  error: string | null;
}

// 通知フックのオプション
export interface UseNotificationsOptions {
  autoRequestPermission?: boolean;
  enableBackgroundHandling?: boolean;
  maxScheduledNotifications?: number;
  defaultConfig?: Partial<NotificationConfig>;
}

// デフォルトオプション
const DEFAULT_OPTIONS: UseNotificationsOptions = {
  autoRequestPermission: true,
  enableBackgroundHandling: true,
  maxScheduledNotifications: 50,
  defaultConfig: {
    sound: true,
    vibrate: true,
    badge: true,
  },
};

/**
 * 通知を管理するカスタムフック
 */
export function useNotifications(options: UseNotificationsOptions = {}): {
  state: NotificationState;
  actions: {
    requestPermission: () => Promise<boolean>;
    sendNotification: (title: string, body: string, config?: Partial<NotificationConfig>) => Promise<string | null>;
    scheduleNotification: (title: string, body: string, triggerDate: Date, config?: Partial<NotificationConfig>) => Promise<string | null>;
    sendTrainAlert: (nextTrain: NextTrainInfo, advanceMinutes?: number) => Promise<string | null>;
    sendStationAlert: (stationName: string, distance: number) => Promise<string | null>;
    scheduleTrainAlert: (nextTrain: NextTrainInfo, advanceMinutes?: number) => Promise<string | null>;
    cancelNotification: (notificationId: string) => Promise<boolean>;
    cancelAllNotifications: () => Promise<boolean>;
    refreshScheduledNotifications: () => Promise<void>;
    setBadgeCount: (count: number) => Promise<boolean>;
    clearBadge: () => Promise<boolean>;
    clearError: () => void;
  };
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 状態管理
  const [state, setState] = useState<NotificationState>({
    permissionGranted: false,
    canAskAgain: true,
    permissionStatus: 'unknown',
    scheduledNotifications: [],
    lastNotification: null,
    notificationCount: 0,
    isLoading: true,
    isInitialized: false,
    error: null,
  });

  // リスナーの参照
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  /**
   * エラー状態を設定
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  /**
   * スケジュール済み通知を更新
   */
  const refreshScheduledNotifications = useCallback(async (): Promise<void> => {
    try {
      const scheduled = await getScheduledNotifications();
      setState(prev => ({
        ...prev,
        scheduledNotifications: scheduled,
      }));
      console.log(`スケジュール済み通知: ${scheduled.length}件`);
    } catch (error) {
      console.error('スケジュール済み通知の取得に失敗:', error);
      // Web環境ではスケジュール通知が制限されている可能性がある
      setState(prev => ({
        ...prev,
        scheduledNotifications: [],
        error: `スケジュール通知取得エラー: ${error instanceof Error ? error.message : 'unknown'}`,
      }));
    }
  }, []);

  /**
   * 権限をリクエスト
   */
  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const granted = await requestNotificationPermission();
      const status = await getNotificationPermissionStatus();

      setState(prev => ({
        ...prev,
        permissionGranted: granted,
        canAskAgain: status.canAskAgain,
        permissionStatus: status.status,
        isLoading: false,
      }));

      if (granted) {
        await refreshScheduledNotifications();
      }

      return granted;
    } catch (error) {
      console.error('通知権限のリクエストに失敗:', error);
      setError('通知権限の取得に失敗しました');
      return false;
    }
  }, [refreshScheduledNotifications, setError]);

  /**
   * 通知を送信
   */
  const handleSendNotification = useCallback(
    async (
      title: string,
      body: string,
      config: Partial<NotificationConfig> = {}
    ): Promise<string | null> => {
      try {
        const finalConfig = { ...opts.defaultConfig, ...config };
        const notificationId = await sendImmediateNotification(title, body, finalConfig);

        if (notificationId) {
          setState(prev => ({
            ...prev,
            notificationCount: prev.notificationCount + 1,
          }));
        }

        return notificationId;
      } catch (error) {
        console.error('通知の送信に失敗:', error);
        setError('通知の送信に失敗しました');
        return null;
      }
    },
    [opts.defaultConfig, setError]
  );

  /**
   * 通知をスケジュール
   */
  const handleScheduleNotification = useCallback(
    async (
      title: string,
      body: string,
      triggerDate: Date,
      config: Partial<NotificationConfig> = {}
    ): Promise<string | null> => {
      try {
        // スケジュール数の制限をチェック
        if (state.scheduledNotifications.length >= (opts.maxScheduledNotifications || 50)) {
          throw new Error('スケジュール済み通知が上限に達しています');
        }

        const finalConfig = { ...opts.defaultConfig, ...config };
        const notificationId = await scheduleNotificationAt(title, body, triggerDate, finalConfig);

        if (notificationId) {
          await refreshScheduledNotifications();
        }

        return notificationId;
      } catch (error) {
        console.error('通知のスケジュールに失敗:', error);
        setError('通知のスケジュールに失敗しました');
        return null;
      }
    },
    [state.scheduledNotifications.length, opts.maxScheduledNotifications, opts.defaultConfig, refreshScheduledNotifications, setError]
  );

  /**
   * 電車到着通知を送信
   */
  const handleSendTrainAlert = useCallback(
    async (nextTrain: NextTrainInfo, advanceMinutes: number = 5): Promise<string | null> => {
      try {
        return await sendTrainArrivalNotification(nextTrain, advanceMinutes);
      } catch (error) {
        console.error('電車到着通知の送信に失敗:', error);
        setError('電車到着通知の送信に失敗しました');
        return null;
      }
    },
    [setError]
  );

  /**
   * 駅接近通知を送信
   */
  const handleSendStationAlert = useCallback(
    async (stationName: string, distance: number): Promise<string | null> => {
      try {
        return await sendStationApproachNotification(stationName, distance);
      } catch (error) {
        console.error('駅接近通知の送信に失敗:', error);
        setError('駅接近通知の送信に失敗しました');
        return null;
      }
    },
    [setError]
  );

  /**
   * 電車到着アラートをスケジュール
   */
  const handleScheduleTrainAlert = useCallback(
    async (nextTrain: NextTrainInfo, advanceMinutes: number = 5): Promise<string | null> => {
      try {
        const notificationId = await scheduleTrainArrivalAlert(nextTrain, advanceMinutes);

        if (notificationId) {
          await refreshScheduledNotifications();
        }

        return notificationId;
      } catch (error) {
        console.error('電車到着アラートのスケジュールに失敗:', error);
        setError('電車到着アラートのスケジュールに失敗しました');
        return null;
      }
    },
    [refreshScheduledNotifications, setError]
  );

  /**
   * 通知をキャンセル
   */
  const handleCancelNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const success = await cancelNotification(notificationId);

        if (success) {
          await refreshScheduledNotifications();
        }

        return success;
      } catch (error) {
        console.error('通知のキャンセルに失敗:', error);
        setError('通知のキャンセルに失敗しました');
        return false;
      }
    },
    [refreshScheduledNotifications, setError]
  );

  /**
   * 全通知をキャンセル
   */
  const handleCancelAllNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const success = await cancelAllNotifications();

      if (success) {
        await refreshScheduledNotifications();
      }

      return success;
    } catch (error) {
      console.error('全通知のキャンセルに失敗:', error);
      setError('全通知のキャンセルに失敗しました');
      return false;
    }
  }, [refreshScheduledNotifications, setError]);

  /**
   * バッジ数を設定
   */
  const handleSetBadgeCount = useCallback(async (count: number): Promise<boolean> => {
    try {
      return await setBadgeCount(count);
    } catch (error) {
      console.error('バッジ数の設定に失敗:', error);
      return false;
    }
  }, []);

  /**
   * バッジをクリア
   */
  const handleClearBadge = useCallback(async (): Promise<boolean> => {
    try {
      return await clearBadge();
    } catch (error) {
      console.error('バッジのクリアに失敗:', error);
      return false;
    }
  }, []);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 通知リスナーをセットアップ
   */
  const setupNotificationListeners = useCallback(() => {
    // 通知受信リスナー
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('通知を受信:', notification);
        setState(prev => ({
          ...prev,
          lastNotification: notification,
          notificationCount: prev.notificationCount + 1,
        }));
      }
    );

    // 通知タップリスナー
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('通知がタップされました:', response);

        const { categoryIdentifier, data } = response.notification.request.content;

        // カテゴリ別の処理
        if (categoryIdentifier === NotificationCategory.STATION_APPROACH) {
          // 駅接近通知の場合、アプリを開いて電車情報画面へ
          console.log('駅接近通知がタップされました - 電車情報画面へ遷移');
        } else if (categoryIdentifier === NotificationCategory.TRAIN_ARRIVAL) {
          // 電車到着通知の場合、時刻表画面へ
          console.log('電車到着通知がタップされました - 時刻表画面へ遷移');
        }

        setState(prev => ({
          ...prev,
          lastNotification: response.notification,
        }));
      }
    );
  }, []);

  /**
   * 通知リスナーをクリーンアップ
   */
  const cleanupNotificationListeners = useCallback(() => {
    if (notificationListener.current) {
      notificationListener.current.remove();
      notificationListener.current = null;
    }

    if (responseListener.current) {
      responseListener.current.remove();
      responseListener.current = null;
    }
  }, []);

  /**
   * アプリ状態変化の処理
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // アプリがアクティブになったらスケジュール済み通知を更新
        refreshScheduledNotifications();
        // バッジをクリア
        handleClearBadge();
      }
    },
    [refreshScheduledNotifications, handleClearBadge]
  );

  // 初期化処理
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // 通知ハンドラーをセットアップ
        setupNotificationHandler();

        // 通知リスナーをセットアップ
        if (opts.enableBackgroundHandling) {
          setupNotificationListeners();
        }

        // 権限状態を確認
        const permissionStatus = await getNotificationPermissionStatus();

        if (mounted) {
          setState(prev => ({
            ...prev,
            permissionGranted: permissionStatus.granted,
            canAskAgain: permissionStatus.canAskAgain,
            permissionStatus: permissionStatus.status,
            isInitialized: true,
            isLoading: false,
          }));

          // 権限がある場合はスケジュール済み通知を取得
          if (permissionStatus.granted) {
            await refreshScheduledNotifications();
          }

          // 自動で権限をリクエストする場合
          if (opts.autoRequestPermission && !permissionStatus.granted) {
            await handleRequestPermission();
          }
        }
      } catch (error) {
        console.error('通知フックの初期化に失敗:', error);
        if (mounted) {
          setError('通知システムの初期化に失敗しました');
        }
      }
    };

    initialize();

    // AppStateの監視を開始
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mounted = false;
      cleanupNotificationListeners();
      appStateSubscription?.remove();
    };
  }, [
    opts.autoRequestPermission,
    opts.enableBackgroundHandling,
    setupNotificationListeners,
    cleanupNotificationListeners,
    refreshScheduledNotifications,
    handleRequestPermission,
    handleAppStateChange,
    setError,
  ]);

  return {
    state,
    actions: {
      requestPermission: handleRequestPermission,
      sendNotification: handleSendNotification,
      scheduleNotification: handleScheduleNotification,
      sendTrainAlert: handleSendTrainAlert,
      sendStationAlert: handleSendStationAlert,
      scheduleTrainAlert: handleScheduleTrainAlert,
      cancelNotification: handleCancelNotification,
      cancelAllNotifications: handleCancelAllNotifications,
      refreshScheduledNotifications,
      setBadgeCount: handleSetBadgeCount,
      clearBadge: handleClearBadge,
      clearError,
    },
  };
}