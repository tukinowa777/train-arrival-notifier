import { Stack } from 'expo-router';
import { useEffect } from 'react';

// 実装した通知サービスを使用
import { setupNotificationHandler } from '../src/services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    // 通知ハンドラーをセットアップ
    setupNotificationHandler();
    console.log('🚀 Train Arrival Notifier を初期化しました');
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          title: '電車到着通知'
        }}
      />
      <Stack.Screen
        name="dropoff-station"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="line-stations"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
