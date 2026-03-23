import AsyncStorage from '@react-native-async-storage/async-storage';
import { Station } from '../types';
import { NotificationConfig } from './notificationService';

// ストレージキー
export const STORAGE_KEYS = {
  FAVORITE_STATIONS: '@train_notifier:favorite_stations',
  DROPOFF_TARGET: '@train_notifier:dropoff_target',
  HOME_STATION: '@train_notifier:home_station',
  NOTIFICATION_SETTINGS: '@train_notifier:notification_settings',
  ALERT_SETTINGS: '@train_notifier:alert_settings',
  USER_SETTINGS: '@train_notifier:user_settings',
  RECENT_SEARCHES: '@train_notifier:recent_searches',
  LAST_LOCATION: '@train_notifier:last_location',
} as const;

// ユーザー設定の型
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  autoLocationTracking: boolean;
  backgroundLocationEnabled: boolean;
  showAdvanceNotificationMinutes: number;
  defaultSearchRadius: number; // メートル
  enableVibration: boolean;
  enableSound: boolean;
  lastUpdated: string;
}

// アラート設定の型
export interface AlertSettings {
  stationId: string;
  lineId: string;
  direction: 'inbound' | 'outbound' | 'both';
  advanceMinutes: number[];
  enabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  daysOfWeek: number[]; // 0=日曜, 1=月曜, ..., 6=土曜
  createdAt: string;
  updatedAt: string;
}

// 検索履歴の型
export interface SearchHistory {
  query: string;
  timestamp: string;
  stationId?: string;
}

// 位置情報履歴の型
export interface LocationHistory {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number;
}

export interface DropoffTarget {
  station: Station;
  enabled: boolean;
  notified: boolean;
  notifyBeforeMinutes: number;
  targetDistance: number;
  setAt: string;
  notifiedAt?: string;
}

export interface HomeStationSetting {
  station: Station;
  setAt: string;
}

// デフォルト設定
const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'ja',
  autoLocationTracking: true,
  backgroundLocationEnabled: false,
  showAdvanceNotificationMinutes: 5,
  defaultSearchRadius: 2000,
  enableVibration: true,
  enableSound: true,
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationConfig = {
  sound: true,
  vibrate: true,
  badge: true,
  priority: 'default' as any,
};

/**
 * データをAsyncStorageに保存
 */
async function saveData<T>(key: string, data: T): Promise<boolean> {
  try {
    const jsonData = JSON.stringify(data);
    console.log(`[saveData] 保存開始: ${key}, サイズ: ${jsonData.length}文字`);

    await AsyncStorage.setItem(key, jsonData);

    // Web環境での保存確認
    if (typeof window !== 'undefined') {
      // 保存の確認
      const savedData = await AsyncStorage.getItem(key);
      if (savedData) {
        console.log(`[saveData] Web環境: 保存確認OK: ${key}`);
      } else {
        console.warn(`[saveData] Web環境: 保存確認NG: ${key}`);
        return false;
      }
    }

    console.log(`[saveData] データを保存しました: ${key}`);
    return true;
  } catch (error) {
    console.error(`[saveData] データの保存に失敗: ${key}`, error);
    return false;
  }
}

/**
 * AsyncStorageからデータを読み込み
 */
async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const jsonData = await AsyncStorage.getItem(key);
    if (jsonData === null) {
      console.log(`データが見つかりません、デフォルト値を使用: ${key}`);
      return defaultValue;
    }

    const data = JSON.parse(jsonData) as T;
    console.log(`データを読み込みました: ${key}`);
    return data;
  } catch (error) {
    console.error(`データの読み込みに失敗: ${key}`, error);
    return defaultValue;
  }
}

/**
 * AsyncStorageからデータを削除
 */
async function removeData(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`データを削除しました: ${key}`);
    return true;
  } catch (error) {
    console.error(`データの削除に失敗: ${key}`, error);
    return false;
  }
}

// === お気に入り駅の管理 ===

/**
 * お気に入り駅を保存
 */
export async function saveFavoriteStations(stations: Station[]): Promise<boolean> {
  const favoriteStations = stations.filter(station => station.isFavorite);
  return await saveData(STORAGE_KEYS.FAVORITE_STATIONS, favoriteStations);
}

/**
 * お気に入り駅を読み込み
 */
export async function loadFavoriteStations(): Promise<Station[]> {
  return await loadData<Station[]>(STORAGE_KEYS.FAVORITE_STATIONS, []);
}

/**
 * お気に入り駅を追加
 */
export async function addFavoriteStation(station: Station): Promise<boolean> {
  try {
    console.log('[Storage] お気に入り駅追加開始:', station.name, 'ID:', station.id);
    const favorites = await loadFavoriteStations();
    console.log('[Storage] 現在のお気に入り数:', favorites.length);

    // 既に登録済みかチェック
    const exists = favorites.some(fav => fav.id === station.id);
    if (exists) {
      console.log(`[Storage] 駅は既にお気に入りに登録済み: ${station.name}`);
      return true;
    }

    // お気に入りフラグを設定
    const favoriteStation = { ...station, isFavorite: true };
    favorites.push(favoriteStation);

    console.log('[Storage] 新しいお気に入り数:', favorites.length);
    const result = await saveData(STORAGE_KEYS.FAVORITE_STATIONS, favorites);
    console.log('[Storage] 保存結果:', result);

    // Web環境での保存確認
    if (typeof window !== 'undefined') {
      setTimeout(async () => {
        const savedFavorites = await loadFavoriteStations();
        console.log('[Storage] 保存後の確認:', savedFavorites.length, '駅');
      }, 100);
    }

    return result;
  } catch (error) {
    console.error('[Storage] お気に入り駅の追加に失敗:', error);
    return false;
  }
}

/**
 * お気に入り駅を削除
 */
export async function removeFavoriteStation(stationId: string): Promise<boolean> {
  try {
    const favorites = await loadFavoriteStations();
    const updatedFavorites = favorites.filter(station => station.id !== stationId);

    return await saveData(STORAGE_KEYS.FAVORITE_STATIONS, updatedFavorites);
  } catch (error) {
    console.error('お気に入り駅の削除に失敗:', error);
    return false;
  }
}

/**
 * 駅がお気に入りかチェック
 */
export async function isFavoriteStation(stationId: string): Promise<boolean> {
  const favorites = await loadFavoriteStations();
  return favorites.some(station => station.id === stationId);
}

// === 降車駅通知の管理 ===

export async function saveDropoffTarget(target: DropoffTarget): Promise<boolean> {
  return await saveData(STORAGE_KEYS.DROPOFF_TARGET, target);
}

export async function loadDropoffTarget(): Promise<DropoffTarget | null> {
  return await loadData<DropoffTarget | null>(STORAGE_KEYS.DROPOFF_TARGET, null);
}

export async function clearDropoffTarget(): Promise<boolean> {
  return await removeData(STORAGE_KEYS.DROPOFF_TARGET);
}

export async function saveHomeStation(setting: HomeStationSetting): Promise<boolean> {
  return await saveData(STORAGE_KEYS.HOME_STATION, setting);
}

export async function loadHomeStation(): Promise<HomeStationSetting | null> {
  return await loadData<HomeStationSetting | null>(STORAGE_KEYS.HOME_STATION, null);
}

export async function clearHomeStation(): Promise<boolean> {
  return await removeData(STORAGE_KEYS.HOME_STATION);
}

// === 通知設定の管理 ===

/**
 * 通知設定を保存
 */
export async function saveNotificationSettings(settings: NotificationConfig): Promise<boolean> {
  return await saveData(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    ...settings,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * 通知設定を読み込み
 */
export async function loadNotificationSettings(): Promise<NotificationConfig> {
  return await loadData(STORAGE_KEYS.NOTIFICATION_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS);
}

// === アラート設定の管理 ===

/**
 * アラート設定を保存
 */
export async function saveAlertSettings(alerts: AlertSettings[]): Promise<boolean> {
  return await saveData(STORAGE_KEYS.ALERT_SETTINGS, alerts);
}

/**
 * アラート設定を読み込み
 */
export async function loadAlertSettings(): Promise<AlertSettings[]> {
  return await loadData<AlertSettings[]>(STORAGE_KEYS.ALERT_SETTINGS, []);
}

/**
 * アラート設定を追加
 */
export async function addAlertSetting(alert: Omit<AlertSettings, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  try {
    const alerts = await loadAlertSettings();

    const newAlert: AlertSettings = {
      ...alert,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    alerts.push(newAlert);
    return await saveData(STORAGE_KEYS.ALERT_SETTINGS, alerts);
  } catch (error) {
    console.error('アラート設定の追加に失敗:', error);
    return false;
  }
}

/**
 * アラート設定を更新
 */
export async function updateAlertSetting(
  stationId: string,
  lineId: string,
  direction: string,
  updates: Partial<AlertSettings>
): Promise<boolean> {
  try {
    const alerts = await loadAlertSettings();

    const index = alerts.findIndex(alert =>
      alert.stationId === stationId &&
      alert.lineId === lineId &&
      alert.direction === direction
    );

    if (index === -1) {
      console.log('アラート設定が見つかりません');
      return false;
    }

    alerts[index] = {
      ...alerts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return await saveData(STORAGE_KEYS.ALERT_SETTINGS, alerts);
  } catch (error) {
    console.error('アラート設定の更新に失敗:', error);
    return false;
  }
}

/**
 * アラート設定を削除
 */
export async function removeAlertSetting(stationId: string, lineId: string, direction: string): Promise<boolean> {
  try {
    const alerts = await loadAlertSettings();

    const updatedAlerts = alerts.filter(alert =>
      !(alert.stationId === stationId &&
        alert.lineId === lineId &&
        alert.direction === direction)
    );

    return await saveData(STORAGE_KEYS.ALERT_SETTINGS, updatedAlerts);
  } catch (error) {
    console.error('アラート設定の削除に失敗:', error);
    return false;
  }
}

// === ユーザー設定の管理 ===

/**
 * ユーザー設定を保存
 */
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<boolean> {
  try {
    const currentSettings = await loadUserSettings();

    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString(),
    };

    return await saveData(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
  } catch (error) {
    console.error('ユーザー設定の保存に失敗:', error);
    return false;
  }
}

/**
 * ユーザー設定を読み込み
 */
export async function loadUserSettings(): Promise<UserSettings> {
  return await loadData(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
}

// === 検索履歴の管理 ===

/**
 * 検索履歴を保存
 */
export async function saveSearchHistory(searches: SearchHistory[]): Promise<boolean> {
  // 最大50件まで保存
  const limitedSearches = searches.slice(0, 50);
  return await saveData(STORAGE_KEYS.RECENT_SEARCHES, limitedSearches);
}

/**
 * 検索履歴を読み込み
 */
export async function loadSearchHistory(): Promise<SearchHistory[]> {
  return await loadData<SearchHistory[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
}

/**
 * 検索履歴を追加
 */
export async function addSearchHistory(query: string, stationId?: string): Promise<boolean> {
  try {
    const searches = await loadSearchHistory();

    // 同じクエリが既にある場合は削除（最新を上に）
    const filteredSearches = searches.filter(search => search.query !== query);

    const newSearch: SearchHistory = {
      query,
      timestamp: new Date().toISOString(),
      stationId,
    };

    filteredSearches.unshift(newSearch);

    return await saveSearchHistory(filteredSearches);
  } catch (error) {
    console.error('検索履歴の追加に失敗:', error);
    return false;
  }
}

/**
 * 検索履歴をクリア
 */
export async function clearSearchHistory(): Promise<boolean> {
  return await removeData(STORAGE_KEYS.RECENT_SEARCHES);
}

// === 位置情報履歴の管理 ===

/**
 * 最後の位置情報を保存
 */
export async function saveLastLocation(location: LocationHistory): Promise<boolean> {
  return await saveData(STORAGE_KEYS.LAST_LOCATION, location);
}

/**
 * 最後の位置情報を読み込み
 */
export async function loadLastLocation(): Promise<LocationHistory | null> {
  try {
    const location = await loadData<LocationHistory | null>(STORAGE_KEYS.LAST_LOCATION, null);
    return location;
  } catch (error) {
    console.error('位置情報の読み込みに失敗:', error);
    return null;
  }
}

/**
 * 最後の位置情報を削除
 */
export async function clearLastLocation(): Promise<boolean> {
  return await removeData(STORAGE_KEYS.LAST_LOCATION);
}

// === データのクリア ===

/**
 * 全データをクリア
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await Promise.all([
      removeData(STORAGE_KEYS.FAVORITE_STATIONS),
      removeData(STORAGE_KEYS.DROPOFF_TARGET),
      removeData(STORAGE_KEYS.HOME_STATION),
      removeData(STORAGE_KEYS.NOTIFICATION_SETTINGS),
      removeData(STORAGE_KEYS.ALERT_SETTINGS),
      removeData(STORAGE_KEYS.USER_SETTINGS),
      removeData(STORAGE_KEYS.RECENT_SEARCHES),
      removeData(STORAGE_KEYS.LAST_LOCATION),
    ]);

    console.log('全データをクリアしました');
    return true;
  } catch (error) {
    console.error('データのクリアに失敗:', error);
    return false;
  }
}

/**
 * ストレージの使用量を取得（概算）
 */
export async function getStorageInfo(): Promise<{
  totalKeys: number;
  estimatedSize: number; // バイト
  keys: string[];
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => key.startsWith('@train_notifier:'));

    let totalSize = 0;

    for (const key of appKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // Unicode文字のバイト数概算
      }
    }

    return {
      totalKeys: appKeys.length,
      estimatedSize: totalSize,
      keys: appKeys,
    };
  } catch (error) {
    console.error('ストレージ情報の取得に失敗:', error);
    return {
      totalKeys: 0,
      estimatedSize: 0,
      keys: [],
    };
  }
}
