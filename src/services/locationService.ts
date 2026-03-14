import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// バックグラウンドタスク名
export const BACKGROUND_LOCATION_TASK = 'background-location-task';
export const GEOFENCING_TASK = 'geofencing-task';

// 位置情報の権限状態
export interface LocationPermissionStatus {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  canAskAgain: boolean;
}

// 位置情報の設定
export interface LocationServiceConfig {
  accuracy: Location.LocationAccuracy;
  timeInterval: number; // ミリ秒
  distanceInterval: number; // メートル
}

// デフォルト設定
const DEFAULT_CONFIG: LocationServiceConfig = {
  accuracy: Location.LocationAccuracy.Balanced,
  timeInterval: 30000, // 30秒
  distanceInterval: 100, // 100メートル
};

/**
 * フォアグラウンド位置情報の権限をリクエスト
 */
export async function requestForegroundPermission(): Promise<LocationPermissionStatus> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

    return {
      foregroundGranted: status === 'granted',
      backgroundGranted: false,
      canAskAgain,
    };
  } catch (error) {
    console.error('フォアグラウンド位置情報権限のリクエストに失敗:', error);
    return {
      foregroundGranted: false,
      backgroundGranted: false,
      canAskAgain: false,
    };
  }
}

/**
 * バックグラウンド位置情報の権限をリクエスト
 * 注意: フォアグラウンド権限が必要
 */
export async function requestBackgroundPermission(): Promise<LocationPermissionStatus> {
  try {
    // まずフォアグラウンド権限を確認
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    if (foregroundStatus.status !== 'granted') {
      throw new Error('バックグラウンド権限にはフォアグラウンド権限が必要です');
    }

    const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();

    return {
      foregroundGranted: true,
      backgroundGranted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('バックグラウンド位置情報権限のリクエストに失敗:', error);
    return {
      foregroundGranted: true,
      backgroundGranted: false,
      canAskAgain: false,
    };
  }
}

/**
 * 現在の権限状態を取得
 */
export async function getPermissionStatus(): Promise<LocationPermissionStatus> {
  try {
    const [foregroundStatus, backgroundStatus] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);

    return {
      foregroundGranted: foregroundStatus.status === 'granted',
      backgroundGranted: backgroundStatus.status === 'granted',
      canAskAgain: foregroundStatus.canAskAgain && backgroundStatus.canAskAgain,
    };
  } catch (error) {
    console.error('権限状態の取得に失敗:', error);
    return {
      foregroundGranted: false,
      backgroundGranted: false,
      canAskAgain: false,
    };
  }
}

/**
 * 現在位置を取得
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    // Web環境での位置情報チェック
    if (typeof navigator !== 'undefined' && !navigator.geolocation) {
      console.warn('Web環境: このブラウザは位置情報をサポートしていません');
      return null;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Web環境: 位置情報の権限が許可されていません。ブラウザの設定で許可してください。');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.LocationAccuracy.Balanced,
    });

    return location;
  } catch (error: any) {
    // Web環境での詳細なエラーハンドリング
    if (typeof window !== 'undefined') {
      if (error?.message?.includes('HTTPS')) {
        console.warn('Web環境: 位置情報の取得にはHTTPS接続が必要です（localhostは除く）');
      } else if (error?.message?.includes('denied')) {
        console.warn('Web環境: ユーザーが位置情報の使用を拒否しました');
      } else if (error?.message?.includes('timeout')) {
        console.warn('Web環境: 位置情報の取得がタイムアウトしました');
      } else if (error?.message?.includes('unavailable')) {
        console.warn('Web環境: 位置情報サービスが利用できません');
      } else {
        console.warn('Web環境: 位置情報の取得に失敗:', error?.message || 'Unknown error');
      }
    } else {
      console.error('現在位置の取得に失敗:', error);
    }
    return null;
  }
}

/**
 * バックグラウンドでの位置情報追跡を開始
 */
export async function startBackgroundLocationTracking(
  config: Partial<LocationServiceConfig> = {}
): Promise<boolean> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // バックグラウンド権限を確認
    const permissionStatus = await getPermissionStatus();
    if (!permissionStatus.backgroundGranted) {
      throw new Error('バックグラウンド位置情報の権限が許可されていません');
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: finalConfig.accuracy,
      timeInterval: finalConfig.timeInterval,
      distanceInterval: finalConfig.distanceInterval,
      foregroundService: {
        notificationTitle: '電車到着通知アプリが動作中',
        notificationBody: '位置情報を監視して駅への接近を検出しています',
      },
    });

    console.log('バックグラウンド位置情報追跡を開始しました');
    return true;
  } catch (error) {
    console.error('バックグラウンド位置情報追跡の開始に失敗:', error);
    return false;
  }
}

/**
 * バックグラウンドでの位置情報追跡を停止
 */
export async function stopBackgroundLocationTracking(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('バックグラウンド位置情報追跡を停止しました');
    }
    return true;
  } catch (error) {
    console.error('バックグラウンド位置情報追跡の停止に失敗:', error);
    return false;
  }
}

/**
 * Geofenceを設定
 * @param regions ジオフェンス領域のリスト
 */
export async function startGeofencing(
  regions: Location.LocationRegion[]
): Promise<boolean> {
  try {
    // バックグラウンド権限を確認
    const permissionStatus = await getPermissionStatus();
    if (!permissionStatus.backgroundGranted) {
      throw new Error('Geofencingにはバックグラウンド位置情報の権限が必要です');
    }

    await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
    console.log(`${regions.length}個のGeofence領域を設定しました`);
    return true;
  } catch (error) {
    console.error('Geofencingの開始に失敗:', error);
    return false;
  }
}

/**
 * Geofencingを停止
 */
export async function stopGeofencing(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
      console.log('Geofencingを停止しました');
    }
    return true;
  } catch (error) {
    console.error('Geofencingの停止に失敗:', error);
    return false;
  }
}

/**
 * 駅の周辺にGeofence領域を作成
 * @param stationId 駅ID
 * @param latitude 緯度
 * @param longitude 経度
 * @param radius 半径（メートル、デフォルト: 500m）
 */
export function createStationGeofence(
  stationId: string,
  latitude: number,
  longitude: number,
  radius: number = 500
): Location.LocationRegion {
  return {
    identifier: `station_${stationId}`,
    latitude,
    longitude,
    radius,
    notifyOnEnter: true,
    notifyOnExit: true,
  };
}

/**
 * 位置情報サービスが利用可能かチェック
 */
export async function isLocationServiceEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('位置情報サービスの確認に失敗:', error);
    return false;
  }
}

/**
 * 位置情報の精度設定を取得
 */
export function getLocationAccuracyOptions(): Array<{
  key: Location.LocationAccuracy;
  label: string;
  description: string;
}> {
  return [
    {
      key: Location.LocationAccuracy.Lowest,
      label: '省電力',
      description: '精度は低いがバッテリー消費が最小',
    },
    {
      key: Location.LocationAccuracy.Low,
      label: '低精度',
      description: '1km程度の精度',
    },
    {
      key: Location.LocationAccuracy.Balanced,
      label: 'バランス',
      description: '100m程度の精度（推奨）',
    },
    {
      key: Location.LocationAccuracy.High,
      label: '高精度',
      description: '10m程度の精度',
    },
    {
      key: Location.LocationAccuracy.Highest,
      label: '最高精度',
      description: '最も正確だがバッテリー消費が大',
    },
  ];
}