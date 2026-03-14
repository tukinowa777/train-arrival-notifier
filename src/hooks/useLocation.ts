import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';

import {
  LocationPermissionStatus,
  getCurrentLocation,
  getPermissionStatus,
  requestForegroundPermission,
  requestBackgroundPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isLocationServiceEnabled,
} from '../services/locationService';
import { getNearbyStations, getClosestStation } from '../services/stationService';
import { Station } from '../types';

// 位置情報フックの状態
export interface LocationState {
  // 現在位置
  currentLocation: Location.LocationObject | null;

  // 権限状態
  permissionStatus: LocationPermissionStatus;

  // 最寄り駅
  nearbyStations: Array<Station & { distance: number }>;
  closestStation: (Station & { distance: number }) | null;

  // 状態フラグ
  isLoading: boolean;
  isLocationServiceEnabled: boolean;
  isBackgroundTrackingActive: boolean;

  // エラー状態
  error: string | null;

  // 最終更新時刻
  lastUpdated: Date | null;
}

// 位置情報フックのオプション
export interface UseLocationOptions {
  enableBackgroundTracking?: boolean;
  autoRequestPermissions?: boolean;
  watchPosition?: boolean;
  maxDistance?: number; // 最寄り駅検索の最大距離（メートル）
  updateInterval?: number; // 位置更新間隔（ミリ秒）
}

// デフォルトオプション
const DEFAULT_OPTIONS: UseLocationOptions = {
  enableBackgroundTracking: false,
  autoRequestPermissions: true,
  watchPosition: true,
  maxDistance: 2000,
  updateInterval: 30000, // 30秒
};

/**
 * 位置情報を管理するカスタムフック
 */
export function useLocation(options: UseLocationOptions = {}): {
  state: LocationState;
  actions: {
    refreshLocation: () => Promise<void>;
    requestForegroundPermission: () => Promise<boolean>;
    requestBackgroundPermission: () => Promise<boolean>;
    startBackgroundTracking: () => Promise<boolean>;
    stopBackgroundTracking: () => Promise<boolean>;
    clearError: () => void;
  };
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 状態管理
  const [state, setState] = useState<LocationState>({
    currentLocation: null,
    permissionStatus: {
      foregroundGranted: false,
      backgroundGranted: false,
      canAskAgain: true,
    },
    nearbyStations: [],
    closestStation: null,
    isLoading: true,
    isLocationServiceEnabled: false,
    isBackgroundTrackingActive: false,
    error: null,
    lastUpdated: null,
  });

  // 位置情報監視用のsubscription
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const updateTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * エラー状態を更新
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  /**
   * 位置情報に基づいて最寄り駅を更新
   */
  const updateNearbyStations = useCallback(
    (location: Location.LocationObject) => {
      try {
        const nearby = getNearbyStations(
          location.coords.latitude,
          location.coords.longitude,
          opts.maxDistance
        );

        const closest = getClosestStation(
          location.coords.latitude,
          location.coords.longitude
        );

        setState(prev => ({
          ...prev,
          nearbyStations: nearby,
          closestStation: closest || null,
        }));
      } catch (error) {
        console.error('最寄り駅の更新に失敗:', error);
      }
    },
    [opts.maxDistance]
  );

  /**
   * 位置情報を更新
   */
  const updateLocation = useCallback(
    async (location: Location.LocationObject) => {
      setState(prev => ({
        ...prev,
        currentLocation: location,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      }));

      // 最寄り駅を更新
      updateNearbyStations(location);
    },
    [updateNearbyStations]
  );

  /**
   * 現在位置を手動で更新
   */
  const refreshLocation = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const location = await getCurrentLocation();
      if (location) {
        await updateLocation(location);
      } else {
        setError('位置情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('位置情報の更新に失敗:', error);
      setError(error instanceof Error ? error.message : '位置情報の取得に失敗しました');
    }
  }, [updateLocation, setError]);

  /**
   * フォアグラウンド権限をリクエスト
   */
  const handleRequestForegroundPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await requestForegroundPermission();
      setState(prev => ({ ...prev, permissionStatus: status }));

      if (status.foregroundGranted) {
        await refreshLocation();
      }

      return status.foregroundGranted;
    } catch (error) {
      console.error('フォアグラウンド権限のリクエストに失敗:', error);
      setError('位置情報の権限取得に失敗しました');
      return false;
    }
  }, [refreshLocation, setError]);

  /**
   * バックグラウンド権限をリクエスト
   */
  const handleRequestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await requestBackgroundPermission();
      setState(prev => ({ ...prev, permissionStatus: status }));
      return status.backgroundGranted;
    } catch (error) {
      console.error('バックグラウンド権限のリクエストに失敗:', error);
      setError('バックグラウンド位置情報の権限取得に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * バックグラウンド追跡を開始
   */
  const handleStartBackgroundTracking = useCallback(async (): Promise<boolean> => {
    try {
      const success = await startBackgroundLocationTracking();
      setState(prev => ({ ...prev, isBackgroundTrackingActive: success }));
      return success;
    } catch (error) {
      console.error('バックグラウンド追跡の開始に失敗:', error);
      setError('バックグラウンド追跡の開始に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * バックグラウンド追跡を停止
   */
  const handleStopBackgroundTracking = useCallback(async (): Promise<boolean> => {
    try {
      const success = await stopBackgroundLocationTracking();
      setState(prev => ({ ...prev, isBackgroundTrackingActive: !success }));
      return success;
    } catch (error) {
      console.error('バックグラウンド追跡の停止に失敗:', error);
      setError('バックグラウンド追跡の停止に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 位置情報の継続的な監視を開始
   */
  const startWatchingPosition = useCallback(async () => {
    try {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }

      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.Balanced,
          timeInterval: opts.updateInterval,
          distanceInterval: 100,
        },
        (location) => {
          updateLocation(location);
        }
      );
    } catch (error) {
      console.error('位置情報監視の開始に失敗:', error);
    }
  }, [opts.updateInterval, updateLocation]);

  /**
   * 位置情報の監視を停止
   */
  const stopWatchingPosition = useCallback(() => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }

    if (updateTimer.current) {
      clearInterval(updateTimer.current);
      updateTimer.current = null;
    }
  }, []);

  /**
   * アプリの状態変化に応じて処理を調整
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && opts.watchPosition) {
        // アプリがアクティブになったら位置情報を更新
        refreshLocation();
      } else if (nextAppState === 'background' && !opts.enableBackgroundTracking) {
        // バックグラウンドになり、バックグラウンド追跡が無効な場合は監視を停止
        stopWatchingPosition();
      }
    },
    [opts.watchPosition, opts.enableBackgroundTracking, refreshLocation, stopWatchingPosition]
  );

  // 初期化処理
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // 位置情報サービスの利用可否を確認
        const serviceEnabled = await isLocationServiceEnabled();
        if (!serviceEnabled) {
          setError('位置情報サービスが無効になっています');
          return;
        }

        // 権限状態を確認
        const permissions = await getPermissionStatus();

        if (mounted) {
          setState(prev => ({
            ...prev,
            permissionStatus: permissions,
            isLocationServiceEnabled: serviceEnabled,
          }));

          // 自動で権限をリクエストする場合
          if (opts.autoRequestPermissions && !permissions.foregroundGranted) {
            await handleRequestForegroundPermission();
          } else if (permissions.foregroundGranted) {
            await refreshLocation();

            // 位置情報の監視を開始
            if (opts.watchPosition) {
              await startWatchingPosition();
            }
          }
        }
      } catch (error) {
        console.error('位置情報フックの初期化に失敗:', error);
        if (mounted) {
          setError('位置情報の初期化に失敗しました');
        }
      }
    };

    initialize();

    // AppStateの監視を開始
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mounted = false;
      stopWatchingPosition();
      appStateSubscription?.remove();
    };
  }, [
    opts.autoRequestPermissions,
    opts.watchPosition,
    handleRequestForegroundPermission,
    refreshLocation,
    startWatchingPosition,
    stopWatchingPosition,
    handleAppStateChange,
    setError,
  ]);

  return {
    state,
    actions: {
      refreshLocation,
      requestForegroundPermission: handleRequestForegroundPermission,
      requestBackgroundPermission: handleRequestBackgroundPermission,
      startBackgroundTracking: handleStartBackgroundTracking,
      stopBackgroundTracking: handleStopBackgroundTracking,
      clearError,
    },
  };
}