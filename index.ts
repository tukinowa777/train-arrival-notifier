import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

// バックグラウンドタスクの定義（グローバルスコープで定義する必要がある）
const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCING_TASK_NAME = 'geofencing-task';

// 位置情報のバックグラウンドタスク
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('バックグラウンド位置情報エラー:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    console.log('バックグラウンド位置情報を受信:', locations);
    // ここで駅への接近をチェックして通知を送る処理を実装
  }
});

// Geofencingタスク（駅に近づいた時のタスク）
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofencingエラー:', error);
    return;
  }
  if (data) {
    const { eventType, region } = data as any;
    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(`駅に接近: ${region.identifier}`);
      // 通知を送信
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '駅に接近しています',
          body: `${region.identifier}駅に近づいています。次の電車を確認してください。`,
          data: { stationId: region.identifier },
        },
        trigger: null,
      });
    }
  }
});

// expo-router用のエントリーポイント
import 'expo-router/entry';
