import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import {
  UserSettings,
  AlertSettings,
  SearchHistory,
  LocationHistory,
  DropoffTarget,
  HomeStationSetting,
  loadFavoriteStations,
  loadDropoffTarget,
  loadHomeStation,
  saveFavoriteStations,
  saveDropoffTarget,
  saveHomeStation,
  addFavoriteStation,
  removeFavoriteStation,
  isFavoriteStation,
  clearDropoffTarget,
  clearHomeStation,
  loadNotificationSettings,
  saveNotificationSettings,
  loadAlertSettings,
  saveAlertSettings,
  addAlertSetting,
  updateAlertSetting,
  removeAlertSetting,
  loadUserSettings,
  saveUserSettings,
  loadSearchHistory,
  saveSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  loadLastLocation,
  saveLastLocation,
  clearLastLocation,
  clearAllData,
  getStorageInfo,
} from '../services/storageService';
import { NotificationConfig } from '../services/notificationService';
import { Station } from '../types';

// ストレージの状態
export interface StorageState {
  // お気に入り駅
  favoriteStations: Station[];

  // 設定
  userSettings: UserSettings;
  dropoffTarget: DropoffTarget | null;
  homeStation: HomeStationSetting | null;
  notificationSettings: NotificationConfig;
  alertSettings: AlertSettings[];

  // 履歴
  searchHistory: SearchHistory[];
  lastLocation: LocationHistory | null;

  // 状態フラグ
  isLoading: boolean;
  isInitialized: boolean;

  // エラー状態
  error: string | null;

  // 統計情報
  storageInfo: {
    totalKeys: number;
    estimatedSize: number;
    keys: string[];
  };
}

// ストレージフックのオプション
export interface UseStorageOptions {
  autoLoad?: boolean;
  autoSave?: boolean;
  syncOnAppStateChange?: boolean;
}

// デフォルトオプション
const DEFAULT_OPTIONS: UseStorageOptions = {
  autoLoad: true,
  autoSave: true,
  syncOnAppStateChange: true,
};

const STORAGE_SYNC_EVENT = 'train_notifier_storage_updated';

/**
 * データの永続化を管理するカスタムフック
 */
export function useStorage(options: UseStorageOptions = {}): {
  state: StorageState;
  actions: {
    // お気に入り駅
    addFavorite: (station: Station) => Promise<boolean>;
    removeFavorite: (stationId: string) => Promise<boolean>;
    toggleFavorite: (station: Station) => Promise<boolean>;
    checkIsFavorite: (stationId: string) => Promise<boolean>;
    setDropoffTarget: (target: DropoffTarget | null) => Promise<boolean>;
    setHomeStation: (station: HomeStationSetting | null) => Promise<boolean>;

    // 設定
    updateUserSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
    updateNotificationSettings: (settings: NotificationConfig) => Promise<boolean>;

    // アラート設定
    addAlert: (alert: Omit<AlertSettings, 'createdAt' | 'updatedAt'>) => Promise<boolean>;
    updateAlert: (stationId: string, lineId: string, direction: string, updates: Partial<AlertSettings>) => Promise<boolean>;
    removeAlert: (stationId: string, lineId: string, direction: string) => Promise<boolean>;
    toggleAlert: (stationId: string, lineId: string, direction: string) => Promise<boolean>;

    // 検索履歴
    addSearch: (query: string, stationId?: string) => Promise<boolean>;
    clearSearches: () => Promise<boolean>;

    // 位置情報
    saveLocation: (location: LocationHistory) => Promise<boolean>;
    clearLocation: () => Promise<boolean>;
    resetTripCache: () => Promise<boolean>;

    // データ管理
    loadAllData: () => Promise<boolean>;
    saveAllData: () => Promise<boolean>;
    clearAllData: () => Promise<boolean>;
    refreshStorageInfo: () => Promise<void>;

    // エラー
    clearError: () => void;
  };
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 状態管理
  const [state, setState] = useState<StorageState>({
    favoriteStations: [],
    userSettings: {} as UserSettings,
    dropoffTarget: null,
    homeStation: null,
    notificationSettings: {} as NotificationConfig,
    alertSettings: [],
    searchHistory: [],
    lastLocation: null,
    isLoading: true,
    isInitialized: false,
    error: null,
    storageInfo: {
      totalKeys: 0,
      estimatedSize: 0,
      keys: [],
    },
  });

  /**
   * エラー状態を設定
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  /**
   * Webの同一タブ内でストレージ更新を共有する
   */
  const emitStorageSync = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.dispatchEvent === 'function' &&
      typeof CustomEvent === 'function'
    ) {
      window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT));
    }
  }, []);

  /**
   * ストレージ情報を更新
   */
  const refreshStorageInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await getStorageInfo();
      setState(prev => ({ ...prev, storageInfo: info }));
    } catch (error) {
      console.error('ストレージ情報の更新に失敗:', error);
    }
  }, []);

  /**
   * 全データを読み込み
   */
  const loadAllData = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [
        favorites,
        dropoffTarget,
        homeStation,
        userSettings,
        notificationSettings,
        alertSettings,
        searchHistory,
        lastLocation,
      ] = await Promise.all([
        loadFavoriteStations(),
        loadDropoffTarget(),
        loadHomeStation(),
        loadUserSettings(),
        loadNotificationSettings(),
        loadAlertSettings(),
        loadSearchHistory(),
        loadLastLocation(),
      ]);

      setState(prev => ({
        ...prev,
        favoriteStations: favorites,
        dropoffTarget,
        homeStation,
        userSettings,
        notificationSettings,
        alertSettings,
        searchHistory,
        lastLocation,
        isLoading: false,
        isInitialized: true,
      }));

      await refreshStorageInfo();

      console.log('全データの読み込みが完了しました');
      return true;
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
      setError('データの読み込みに失敗しました');
      return false;
    }
  }, [refreshStorageInfo, setError]);

  /**
   * 全データを保存
   */
  const saveAllData = useCallback(async (): Promise<boolean> => {
    try {
      const { favoriteStations, userSettings, notificationSettings, alertSettings } = state;

      const results = await Promise.all([
        saveFavoriteStations(favoriteStations),
        saveUserSettings(userSettings),
        saveNotificationSettings(notificationSettings),
        saveAlertSettings(alertSettings),
      ]);

      const success = results.every(result => result);

      if (success) {
        await refreshStorageInfo();
        console.log('全データの保存が完了しました');
      } else {
        throw new Error('一部のデータの保存に失敗しました');
      }

      return success;
    } catch (error) {
      console.error('データの保存に失敗:', error);
      setError('データの保存に失敗しました');
      return false;
    }
  }, [state, refreshStorageInfo, setError]);

  /**
   * お気に入り駅を追加
   */
  const handleAddFavorite = useCallback(async (station: Station): Promise<boolean> => {
    try {
      console.log('[useStorage] お気に入り追加開始:', station.name);
      const success = await addFavoriteStation(station);

      if (success) {
        setState(prev => {
          const exists = prev.favoriteStations.some(fav => fav.id === station.id);
          if (exists) {
            console.log('[useStorage] 既に存在するためスキップ');
            return prev;
          }

          const newFavorites = [...prev.favoriteStations, { ...station, isFavorite: true }];
          console.log('[useStorage] 状態更新:', newFavorites.length, '駅');

          return {
            ...prev,
            favoriteStations: newFavorites,
          };
        });

        // Web環境での追加確認のため、少し遅延してから再読み込み
        if (typeof window !== 'undefined') {
          setTimeout(async () => {
            try {
              const updatedFavorites = await loadFavoriteStations();
              console.log('[useStorage] 再読み込み結果:', updatedFavorites.length);
              setState(prev => ({
                ...prev,
                favoriteStations: updatedFavorites,
              }));
            } catch (error) {
              console.error('[useStorage] 再読み込みに失敗:', error);
            }
          }, 200);
        }

        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('[useStorage] お気に入り駅の追加に失敗:', error);
      setError('お気に入り駅の追加に失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * お気に入り駅を削除
   */
  const handleRemoveFavorite = useCallback(async (stationId: string): Promise<boolean> => {
    try {
      console.log('[useStorage] お気に入り削除開始:', stationId);
      const success = await removeFavoriteStation(stationId);

      if (success) {
        setState(prev => {
          const newFavorites = prev.favoriteStations.filter(station => station.id !== stationId);
          console.log('[useStorage] 削除後の状態更新:', newFavorites.length, '駅');

          return {
            ...prev,
            favoriteStations: newFavorites,
          };
        });

        // Web環境での削除確認のため、少し遅延してから再読み込み
        if (typeof window !== 'undefined') {
          setTimeout(async () => {
            try {
              const updatedFavorites = await loadFavoriteStations();
              console.log('[useStorage] 削除後の再読み込み結果:', updatedFavorites.length);
              setState(prev => ({
                ...prev,
                favoriteStations: updatedFavorites,
              }));
            } catch (error) {
              console.error('[useStorage] 削除後の再読み込みに失敗:', error);
            }
          }, 200);
        }

        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('[useStorage] お気に入り駅の削除に失敗:', error);
      setError('お気に入り駅の削除に失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * お気に入り駅を切り替え
   */
  const handleToggleFavorite = useCallback(async (station: Station): Promise<boolean> => {
    console.log('[useStorage] ===== toggleFavorite開始 =====');
    console.log('[useStorage] 対象駅:', station.name, 'ID:', station.id);

    const isFav = await isFavoriteStation(station.id);
    console.log('[useStorage] 現在のお気に入り状態:', isFav);

    let result: boolean;
    if (isFav) {
      console.log('[useStorage] お気に入りから削除します');
      result = await handleRemoveFavorite(station.id);
    } else {
      console.log('[useStorage] お気に入りに追加します');
      result = await handleAddFavorite(station);
    }

    console.log('[useStorage] toggleFavorite結果:', result);
    console.log('[useStorage] ===== toggleFavorite完了 =====');
    return result;
  }, [handleAddFavorite, handleRemoveFavorite]);

  /**
   * お気に入り駅かチェック
   */
  const handleCheckIsFavorite = useCallback(async (stationId: string): Promise<boolean> => {
    return await isFavoriteStation(stationId);
  }, []);

  /**
   * 降車駅を設定
   */
  const handleSetDropoffTarget = useCallback(async (target: DropoffTarget | null): Promise<boolean> => {
    try {
      const success = target
        ? await saveDropoffTarget(target)
        : await clearDropoffTarget();

      if (success) {
        setState(prev => ({
          ...prev,
          dropoffTarget: target,
        }));
        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('降車駅の保存に失敗:', error);
      setError('降車駅の保存に失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * ホーム駅を設定
   */
  const handleSetHomeStation = useCallback(async (station: HomeStationSetting | null): Promise<boolean> => {
    try {
      const success = station
        ? await saveHomeStation(station)
        : await clearHomeStation();

      if (success) {
        setState(prev => ({
          ...prev,
          homeStation: station,
        }));
        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('ホーム駅の保存に失敗:', error);
      setError('ホーム駅の保存に失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * ユーザー設定を更新
   */
  const handleUpdateUserSettings = useCallback(async (settings: Partial<UserSettings>): Promise<boolean> => {
    try {
      const success = await saveUserSettings(settings);

      if (success) {
        setState(prev => ({
          ...prev,
          userSettings: { ...prev.userSettings, ...settings },
        }));
      }

      return success;
    } catch (error) {
      console.error('ユーザー設定の更新に失敗:', error);
      setError('ユーザー設定の更新に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * 通知設定を更新
   */
  const handleUpdateNotificationSettings = useCallback(async (settings: NotificationConfig): Promise<boolean> => {
    try {
      const success = await saveNotificationSettings(settings);

      if (success) {
        setState(prev => ({
          ...prev,
          notificationSettings: settings,
        }));
      }

      return success;
    } catch (error) {
      console.error('通知設定の更新に失敗:', error);
      setError('通知設定の更新に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * アラート設定を追加
   */
  const handleAddAlert = useCallback(async (alert: Omit<AlertSettings, 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const success = await addAlertSetting(alert);

      if (success) {
        const newAlert: AlertSettings = {
          ...alert,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setState(prev => ({
          ...prev,
          alertSettings: [...prev.alertSettings, newAlert],
        }));
      }

      return success;
    } catch (error) {
      console.error('アラート設定の追加に失敗:', error);
      setError('アラート設定の追加に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * アラート設定を更新
   */
  const handleUpdateAlert = useCallback(async (
    stationId: string,
    lineId: string,
    direction: string,
    updates: Partial<AlertSettings>
  ): Promise<boolean> => {
    try {
      const success = await updateAlertSetting(stationId, lineId, direction, updates);

      if (success) {
        setState(prev => ({
          ...prev,
          alertSettings: prev.alertSettings.map(alert =>
            alert.stationId === stationId &&
            alert.lineId === lineId &&
            alert.direction === direction
              ? { ...alert, ...updates, updatedAt: new Date().toISOString() }
              : alert
          ),
        }));
      }

      return success;
    } catch (error) {
      console.error('アラート設定の更新に失敗:', error);
      setError('アラート設定の更新に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * アラート設定を削除
   */
  const handleRemoveAlert = useCallback(async (
    stationId: string,
    lineId: string,
    direction: string
  ): Promise<boolean> => {
    try {
      const success = await removeAlertSetting(stationId, lineId, direction);

      if (success) {
        setState(prev => ({
          ...prev,
          alertSettings: prev.alertSettings.filter(alert =>
            !(alert.stationId === stationId &&
              alert.lineId === lineId &&
              alert.direction === direction)
          ),
        }));
      }

      return success;
    } catch (error) {
      console.error('アラート設定の削除に失敗:', error);
      setError('アラート設定の削除に失敗しました');
      return false;
    }
  }, [setError]);

  /**
   * アラート設定を有効/無効切り替え
   */
  const handleToggleAlert = useCallback(async (
    stationId: string,
    lineId: string,
    direction: string
  ): Promise<boolean> => {
    const alert = state.alertSettings.find(a =>
      a.stationId === stationId && a.lineId === lineId && a.direction === direction
    );

    if (!alert) {
      return false;
    }

    return await handleUpdateAlert(stationId, lineId, direction, { enabled: !alert.enabled });
  }, [state.alertSettings, handleUpdateAlert]);

  /**
   * 検索履歴を追加
   */
  const handleAddSearch = useCallback(async (query: string, stationId?: string): Promise<boolean> => {
    try {
      const success = await addSearchHistory(query, stationId);

      if (success) {
        const newSearch: SearchHistory = {
          query,
          timestamp: new Date().toISOString(),
          stationId,
        };

        setState(prev => {
          const filteredSearches = prev.searchHistory.filter(search => search.query !== query);
          return {
            ...prev,
            searchHistory: [newSearch, ...filteredSearches],
          };
        });
      }

      return success;
    } catch (error) {
      console.error('検索履歴の追加に失敗:', error);
      return false;
    }
  }, []);

  /**
   * 検索履歴をクリア
   */
  const handleClearSearches = useCallback(async (): Promise<boolean> => {
    try {
      const success = await clearSearchHistory();

      if (success) {
        setState(prev => ({ ...prev, searchHistory: [] }));
      }

      return success;
    } catch (error) {
      console.error('検索履歴のクリアに失敗:', error);
      return false;
    }
  }, []);

  /**
   * 位置情報を保存
   */
  const handleSaveLocation = useCallback(async (location: LocationHistory): Promise<boolean> => {
    try {
      const success = await saveLastLocation(location);

      if (success) {
        setState(prev => ({ ...prev, lastLocation: location }));
      }

      return success;
    } catch (error) {
      console.error('位置情報の保存に失敗:', error);
      return false;
    }
  }, []);

  /**
   * 位置情報をクリア
   */
  const handleClearLocation = useCallback(async (): Promise<boolean> => {
    try {
      const success = await clearLastLocation();

      if (success) {
        setState(prev => ({ ...prev, lastLocation: null }));
        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('位置情報のクリアに失敗:', error);
      setError('位置情報のクリアに失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * 現在地と降車駅のキャッシュをまとめてリセット
   */
  const handleResetTripCache = useCallback(async (): Promise<boolean> => {
    try {
      const results = await Promise.all([
        clearDropoffTarget(),
        clearHomeStation(),
        clearLastLocation(),
      ]);
      const success = results.every(result => result);

      if (success) {
        setState(prev => ({
          ...prev,
          dropoffTarget: null,
          homeStation: null,
          lastLocation: null,
        }));
        emitStorageSync();
      }

      return success;
    } catch (error) {
      console.error('移動キャッシュのリセットに失敗:', error);
      setError('移動キャッシュのリセットに失敗しました');
      return false;
    }
  }, [emitStorageSync, setError]);

  /**
   * 全データをクリア
   */
  const handleClearAllData = useCallback(async (): Promise<boolean> => {
    try {
      const success = await clearAllData();

      if (success) {
        setState(prev => ({
          ...prev,
          favoriteStations: [],
          dropoffTarget: null,
          homeStation: null,
          alertSettings: [],
          searchHistory: [],
          lastLocation: null,
        }));

        await refreshStorageInfo();
        console.log('全データをクリアしました');
      }

      return success;
    } catch (error) {
      console.error('データのクリアに失敗:', error);
      setError('データのクリアに失敗しました');
      return false;
    }
  }, [refreshStorageInfo, setError]);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * アプリ状態変化の処理
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (opts.syncOnAppStateChange) {
        if (nextAppState === 'active') {
          // アプリがアクティブになったらデータを再読み込み
          loadAllData();
        } else if (nextAppState === 'background') {
          // バックグラウンドになったらデータを保存
          if (opts.autoSave) {
            saveAllData();
          }
        }
      }
    },
    [opts.syncOnAppStateChange, opts.autoSave, loadAllData, saveAllData]
  );

  // 初期化処理
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (opts.autoLoad && mounted) {
        await loadAllData();
      }
    };

    initialize();

    // AppStateの監視を開始
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mounted = false;
      appStateSubscription?.remove();
    };
  }, [opts.autoLoad]); // 依存配列からloadAllDataとhandleAppStateChangeを除去して無限ループを防止

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function' ||
      typeof window.removeEventListener !== 'function'
    ) {
      return;
    }

    const handleStorageSync = () => {
      loadAllData();
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleStorageSync);

    return () => {
      window.removeEventListener(STORAGE_SYNC_EVENT, handleStorageSync);
    };
  }, [loadAllData]);

  return {
    state,
    actions: {
      // お気に入り駅
      addFavorite: handleAddFavorite,
      removeFavorite: handleRemoveFavorite,
      toggleFavorite: handleToggleFavorite,
      checkIsFavorite: handleCheckIsFavorite,
      setDropoffTarget: handleSetDropoffTarget,
      setHomeStation: handleSetHomeStation,

      // 設定
      updateUserSettings: handleUpdateUserSettings,
      updateNotificationSettings: handleUpdateNotificationSettings,

      // アラート設定
      addAlert: handleAddAlert,
      updateAlert: handleUpdateAlert,
      removeAlert: handleRemoveAlert,
      toggleAlert: handleToggleAlert,

      // 検索履歴
      addSearch: handleAddSearch,
      clearSearches: handleClearSearches,

      // 位置情報
      saveLocation: handleSaveLocation,
      clearLocation: handleClearLocation,
      resetTripCache: handleResetTripCache,

      // データ管理
      loadAllData,
      saveAllData,
      clearAllData: handleClearAllData,
      refreshStorageInfo,

      // エラー
      clearError,
    },
  };
}
