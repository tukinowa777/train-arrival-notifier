import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Platform
} from 'react-native';

// 実装したサービスとフックをインポート
import { useLocation } from '../../src/hooks/useLocation';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useStorage } from '../../src/hooks/useStorage';

// 駅データ・サービスをインポート
import { stations, lines } from '../../src/constants/stations';
import { timeTables, getTimeTable, getNextTrain } from '../../src/constants/schedules';
import {
  searchStations,
  getNearbyStations,
  getNextTrainInfo,
  getAllNextTrains,
  getDayType
} from '../../src/services/stationService';

export default function DebugScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');

  // カスタムフックを使用
  const { state: locationState, actions: locationActions } = useLocation({
    autoRequestPermissions: false, // 手動でテストするため
    watchPosition: false,
  });

  const { state: notificationState, actions: notificationActions } = useNotifications({
    autoRequestPermission: false, // 手動でテストするため
  });

  const { state: storageState, actions: storageActions } = useStorage({
    autoLoad: false, // 手動でテストするため
  });

  /**
   * ログを追加
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // 最大20件
  };

  /**
   * ログをクリア
   */
  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    addLog('🚀 デバッグ画面を初期化しました');
  }, []);

  // === データテスト関数 ===

  const testStationData = () => {
    addLog('📍 駅データテストを開始');
    addLog(`総駅数: ${stations.length}駅`);
    addLog(`路線数: ${lines.length}路線`);

    // 各路線の駅数を表示
    lines.forEach(line => {
      const stationCount = stations.filter(station =>
        station.lines.some(l => l.id === line.id)
      ).length;
      addLog(`${line.name}: ${stationCount}駅`);
    });

    addLog('✅ 駅データテスト完了');
  };

  const testStationSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('エラー', '検索クエリを入力してください');
      return;
    }

    addLog(`🔍 駅検索テスト: "${searchQuery}"`);
    const results = searchStations(searchQuery);
    addLog(`検索結果: ${results.length}件`);

    results.slice(0, 5).forEach(station => {
      addLog(`- ${station.name} (${station.nameKana})`);
    });

    if (results.length > 5) {
      addLog(`... 他${results.length - 5}件`);
    }
  };

  const testTimeTable = () => {
    if (!selectedStationId) {
      Alert.alert('エラー', '駅を選択してください');
      return;
    }

    addLog(`⏰ 時刻表テスト: 駅ID ${selectedStationId}`);
    const dayType = getDayType();
    addLog(`曜日タイプ: ${dayType}`);

    const station = stations.find(s => s.id === selectedStationId);
    if (!station) {
      addLog('❌ 駅が見つかりません');
      return;
    }

    addLog(`駅名: ${station.name}`);

    // 全路線・全方向の次の電車を取得
    const nextTrains = getAllNextTrains(selectedStationId);
    addLog(`次の電車: ${nextTrains.length}件`);

    nextTrains.slice(0, 3).forEach(train => {
      addLog(`- ${train.line} ${train.direction}: ${train.train.departureTime} (${train.remainingMinutes}分後)`);
    });
  };

  // === 位置情報テスト関数 ===

  const testLocationPermission = async () => {
    addLog('📍 位置情報権限テストを開始');
    const granted = await locationActions.requestForegroundPermission();
    addLog(`フォアグラウンド権限: ${granted ? '✅ 許可' : '❌ 拒否'}`);
  };

  const testLocationGet = async () => {
    addLog('🌍 現在位置取得テストを開始');

    // エラーの詳細を取得するために直接Geolocation APIを呼び出し
    try {
      if (!navigator.geolocation) {
        addLog('❌ このブラウザは位置情報をサポートしていません');
        return;
      }

      addLog('📡 位置情報を取得中... (最大30秒)');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            addLog('✅ ブラウザから位置情報を取得しました');
            resolve(position);
          },
          (error) => {
            let errorMessage = '❌ 位置情報取得エラー: ';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += '権限が拒否されました（ブラウザ設定を確認）';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += '位置情報が利用できません';
                break;
              case error.TIMEOUT:
                errorMessage += 'タイムアウトしました（30秒以内に取得できず）';
                break;
              default:
                errorMessage += `不明なエラー (コード: ${error.code})`;
            }
            addLog(errorMessage);
            addLog(`詳細: ${error.message}`);
            reject(error);
          },
          {
            enableHighAccuracy: false, // 高精度を無効にしてタイムアウトを回避
            timeout: 30000, // 30秒のタイムアウト
            maximumAge: 300000 // 5分間キャッシュを使用
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      addLog(`現在位置: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      addLog(`精度: 約${Math.round(accuracy)}m`);

      // 最寄り駅を検索
      const nearbyStations = getNearbyStations(latitude, longitude, 2000);
      addLog(`最寄り駅: ${nearbyStations.length}件`);

      nearbyStations.slice(0, 3).forEach(station => {
        addLog(`- ${station.name}: ${Math.round(station.distance)}m`);
      });

    } catch (error) {
      addLog('❌ 位置情報の取得に失敗しました');

      // フックの機能も試してみる
      addLog('🔄 フック経由でリトライ中...');
      await locationActions.refreshLocation();

      if (locationState.currentLocation) {
        const { latitude, longitude } = locationState.currentLocation.coords;
        addLog(`✅ フック経由で取得成功: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        addLog('❌ フック経由でも取得失敗');
        if (locationState.error) {
          addLog(`エラー詳細: ${locationState.error}`);
        }
      }
    }
  };

  const testLocationMock = () => {
    addLog('🏢 モック位置情報テスト（新宿駅周辺）');

    // 新宿駅の座標
    const mockLatitude = 35.689607;
    const mockLongitude = 139.700565;

    addLog(`モック位置: ${mockLatitude}, ${mockLongitude}`);

    // 最寄り駅を検索
    const nearbyStations = getNearbyStations(mockLatitude, mockLongitude, 2000);
    addLog(`最寄り駅: ${nearbyStations.length}件`);

    nearbyStations.slice(0, 5).forEach(station => {
      addLog(`- ${station.name}: ${Math.round(station.distance)}m`);
    });

    if (nearbyStations.length === 0) {
      addLog('⚠️ 新宿駅周辺で駅が見つからない - 駅データに問題がある可能性');
    }
  };

  // === 通知テスト関数 ===

  const testNotificationPermission = async () => {
    addLog('🔔 通知権限テストを開始');
    const granted = await notificationActions.requestPermission();
    addLog(`通知権限: ${granted ? '✅ 許可' : '❌ 拒否'}`);
  };

  const testSendNotification = async () => {
    addLog('📢 通知送信テストを開始');

    try {
      // ブラウザ通知APIを直接使用してテスト
      if (!('Notification' in window)) {
        addLog('❌ このブラウザは通知をサポートしていません');
        return;
      }

      addLog(`ブラウザ通知権限: ${Notification.permission}`);

      if (Notification.permission === 'granted') {
        // ブラウザネイティブ通知で先にテスト
        addLog('🌐 ブラウザネイティブ通知でテスト');
        const notification = new Notification('🚃 ブラウザ通知テスト', {
          body: 'ブラウザの通知機能が動作しています',
          icon: '/favicon.ico'
        });

        notification.onclick = () => {
          addLog('✅ ブラウザ通知がクリックされました');
          notification.close();
        };

        setTimeout(() => notification.close(), 5000);
        addLog('✅ ブラウザネイティブ通知送信成功');

        // 次にExpo Notificationsでテスト
        addLog('📱 Expo Notifications経由でテスト');
      } else {
        addLog('⚠️ 通知権限がありません - 先に権限を要求してください');
      }

      const notificationId = await notificationActions.sendNotification(
        '🚃 Expoテスト通知',
        'Expo Notificationsのテスト通知です',
        { sound: true, vibrate: false } // Web環境ではvibrateを無効
      );

      if (notificationId) {
        addLog(`✅ Expo通知送信成功: ${notificationId}`);
      } else {
        addLog('❌ Expo通知送信失敗');
        if (notificationState.error) {
          addLog(`エラー詳細: ${notificationState.error}`);
        }
      }
    } catch (error) {
      addLog(`❌ 通知テストでエラー: ${error}`);
      console.error('Notification test error:', error);
    }
  };

  const testNotificationBasic = async () => {
    addLog('🔔 基本通知機能テストを開始');

    try {
      // 権限状態を詳しく確認
      const permissionStatus = await notificationActions.requestPermission();
      addLog(`権限リクエスト結果: ${permissionStatus ? '✅ 成功' : '❌ 失敗'}`);
      addLog(`現在の権限状態: ${notificationState.permissionGranted ? '✅ 許可' : '❌ 拒否'}`);
      addLog(`権限ステータス: ${notificationState.permissionStatus}`);

      if (notificationState.error) {
        addLog(`権限エラー: ${notificationState.error}`);
      }
    } catch (error) {
      addLog(`❌ 基本通知テストでエラー: ${error}`);
      console.error('Basic notification test error:', error);
    }
  };

  const testBrowserNotificationDirect = async () => {
    addLog('🌐 ブラウザ通知直接テスト開始');

    try {
      // ブラウザサポート確認
      if (!('Notification' in window)) {
        addLog('❌ このブラウザは通知をサポートしていません');
        return;
      }

      addLog(`現在の通知権限: ${Notification.permission}`);

      // 権限リクエスト（必要に応じて）
      if (Notification.permission === 'default') {
        addLog('🔑 通知権限をリクエスト中...');
        const permission = await Notification.requestPermission();
        addLog(`権限リクエスト結果: ${permission}`);
      }

      if (Notification.permission !== 'granted') {
        addLog('❌ 通知権限が許可されていません');
        addLog('💡 ブラウザのアドレスバーの🔒アイコンから通知を許可してください');
        return;
      }

      addLog('📢 詳細ライフサイクル追跡付き通知を作成中...');

      const startTime = Date.now();
      let isManuallyClosing = false;

      // シンプルな通知を作成（requireInteraction を外してテスト）
      const notification = new Notification('🚨 Train Notifier テスト', {
        body: 'この通知が見えますか？ログでライフサイクルを追跡します。',
        icon: '/favicon.ico',
        tag: `test-${Date.now()}`, // 一意のタグ
        silent: false,
      });

      addLog('✅ 通知オブジェクト作成成功');
      addLog(`⏰ 作成時刻: ${new Date(startTime).toLocaleTimeString()}`);

      // より詳細なイベントリスナー
      notification.onshow = () => {
        const showTime = Date.now();
        const elapsed = showTime - startTime;
        addLog(`🎉 通知が表示されました！ (作成から${elapsed}ms後)`);
        addLog(`📍 表示時刻: ${new Date(showTime).toLocaleTimeString()}`);
      };

      notification.onclick = () => {
        const clickTime = Date.now();
        const elapsed = clickTime - startTime;
        addLog(`👆 通知がクリックされました (${elapsed}ms後)`);
        isManuallyClosing = true;
        window.focus();
        notification.close();
      };

      notification.onclose = () => {
        const closeTime = Date.now();
        const elapsed = closeTime - startTime;
        const reason = isManuallyClosing ? 'ユーザーによるクリック' : '自動/システムによるクローズ';
        addLog(`📴 通知が閉じられました (${elapsed}ms後)`);
        addLog(`📍 クローズ時刻: ${new Date(closeTime).toLocaleTimeString()}`);
        addLog(`❓ クローズ理由: ${reason}`);

        if (elapsed < 1000 && !isManuallyClosing) {
          addLog('⚠️ 1秒未満で自動クローズ - システム設定の可能性');
        }
      };

      notification.onerror = (error) => {
        const errorTime = Date.now();
        const elapsed = errorTime - startTime;
        addLog(`❌ 通知エラー (${elapsed}ms後): ${error}`);
        console.error('Notification error:', error);
      };

      // 10秒後のチェック（強制クローズは行わない）
      setTimeout(() => {
        if (!isManuallyClosing) {
          const checkTime = Date.now();
          const elapsed = checkTime - startTime;
          addLog(`⏰ 10秒経過チェック (${elapsed}ms)`);
          addLog('💡 通知がまだ表示されている場合は成功です');
        }
      }, 10000);

      addLog('🔍 通知ライフサイクル追跡開始');
      addLog('💡 通知の表示・非表示タイミングを詳しく記録します');

    } catch (error) {
      addLog(`❌ ブラウザ通知テストエラー: ${error}`);
      console.error('Browser notification test error:', error);
    }
  };

  const testSimpleNotification = () => {
    addLog('⚡ 最もシンプルな通知テスト');

    try {
      if (Notification.permission !== 'granted') {
        addLog('❌ 通知権限がありません');
        return;
      }

      addLog('📢 最小限の通知を作成...');

      // 最小限の通知
      const notification = new Notification('テスト通知');

      addLog('✅ シンプル通知作成成功');
      addLog('🔍 デスクトップ右下をご確認ください（約5秒表示）');

      // ログのみでイベント確認
      notification.onshow = () => addLog('✅ シンプル通知表示確認');
      notification.onclose = () => addLog('📴 シンプル通知クローズ確認');
      notification.onerror = (e) => addLog(`❌ シンプル通知エラー: ${e}`);

    } catch (error) {
      addLog(`❌ シンプル通知エラー: ${error}`);
    }
  };

  const checkNotificationSettings = () => {
    addLog('🔧 通知設定診断開始');

    try {
      // ブラウザ情報
      addLog(`ブラウザ: ${navigator.userAgent.includes('Chrome') ? 'Chrome' :
                      navigator.userAgent.includes('Firefox') ? 'Firefox' :
                      navigator.userAgent.includes('Safari') ? 'Safari' :
                      navigator.userAgent.includes('Edge') ? 'Edge' : '不明'}`);

      // 通知サポート
      addLog(`通知サポート: ${('Notification' in window) ? '✅ サポート' : '❌ 非サポート'}`);

      if ('Notification' in window) {
        addLog(`通知権限: ${Notification.permission}`);
        addLog(`最大アクション数: ${Notification.maxActions || '不明'}`);
      }

      // 焦点状態
      addLog(`ページフォーカス: ${document.hasFocus() ? '✅ フォーカス中' : '❌ バックグラウンド'}`);
      addLog(`ページ可視状態: ${document.visibilityState}`);

      // Web環境での制限について
      addLog('📖 Web環境での通知制限:');
      addLog('  - 通知が表示されない場合の確認事項:');
      addLog('  1. ブラウザ設定: chrome://settings/content/notifications');
      addLog('  2. OS設定: Windows設定 > システム > 通知とアクション');
      addLog('  3. サイト権限: アドレスバーの🔒 > 通知');
      addLog('  4. 集中モード: Windowsの集中モードがOFFか確認');

    } catch (error) {
      addLog(`❌ 設定診断エラー: ${error}`);
    }
  };

  const testTrainNotification = async () => {
    if (!selectedStationId) {
      Alert.alert('エラー', '駅を選択してください');
      return;
    }

    addLog('🚃 電車通知テストを開始');
    const nextTrains = getAllNextTrains(selectedStationId);

    if (nextTrains.length > 0) {
      const notificationId = await notificationActions.sendTrainAlert(nextTrains[0]);
      if (notificationId) {
        addLog(`✅ 電車通知送信成功: ${notificationId}`);
      } else {
        addLog('❌ 電車通知送信失敗');
      }
    } else {
      addLog('❌ 次の電車情報がありません');
    }
  };

  // === ストレージテスト関数 ===

  const testStorageLoad = async () => {
    addLog('💾 ストレージ読み込みテストを開始');
    const success = await storageActions.loadAllData();
    if (success) {
      addLog(`✅ データ読み込み成功`);
      addLog(`お気に入り駅: ${storageState.favoriteStations.length}件`);
      addLog(`アラート設定: ${storageState.alertSettings.length}件`);
      addLog(`検索履歴: ${storageState.searchHistory.length}件`);
    } else {
      addLog('❌ データ読み込み失敗');
    }
  };

  const testFavoriteStation = async () => {
    if (!selectedStationId) {
      Alert.alert('エラー', '駅を選択してください');
      return;
    }

    const station = stations.find(s => s.id === selectedStationId);
    if (!station) {
      addLog('❌ 駅が見つかりません');
      return;
    }

    addLog(`⭐ お気に入り駅テスト: ${station.name}`);
    const success = await storageActions.toggleFavorite(station);

    if (success) {
      const isFav = await storageActions.checkIsFavorite(selectedStationId);
      addLog(`✅ お気に入り${isFav ? '追加' : '削除'}成功`);
    } else {
      addLog('❌ お気に入り操作失敗');
    }
  };

  // === レンダリング ===

  const renderButton = (title: string, onPress: () => void, color = '#007AFF') => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 デバッグ・テスト画面</Text>

      {/* 入力エリア */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 テスト設定</Text>
        <TextInput
          style={styles.input}
          placeholder="駅名検索（例：新宿、しぶや）"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TextInput
          style={styles.input}
          placeholder="駅ID（例：shinjuku、shibuya）"
          value={selectedStationId}
          onChangeText={setSelectedStationId}
        />
      </View>

      {/* 駅データ・時刻表テスト */}
      {renderSection('📍 駅データ・時刻表テスト', (
        <View>
          {renderButton('駅データを確認', testStationData)}
          {renderButton('駅を検索', testStationSearch)}
          {renderButton('時刻表を確認', testTimeTable)}
        </View>
      ))}

      {/* 位置情報テスト */}
      {renderSection('🌍 位置情報テスト', (
        <View>
          {renderButton('位置情報権限を要求', testLocationPermission)}
          {renderButton('現在位置を取得（詳細ログ付き）', testLocationGet)}
          {renderButton('モック位置情報テスト（新宿駅）', testLocationMock, '#FF9500')}
          <Text style={styles.statusText}>
            権限: {locationState.permissionStatus.foregroundGranted ? '✅' : '❌'} |
            位置: {locationState.currentLocation ? '✅' : '❌'} |
            最寄り駅: {locationState.nearbyStations.length}件
          </Text>
          {locationState.error && (
            <Text style={[styles.statusText, { color: '#FF3B30' }]}>
              エラー: {locationState.error}
            </Text>
          )}
        </View>
      ))}

      {/* 通知テスト */}
      {renderSection('🔔 通知テスト', (
        <View>
          {renderButton('通知設定を診断', checkNotificationSettings, '#8E8E93')}
          {renderButton('⚡最もシンプルな通知テスト', testSimpleNotification, '#FF9500')}
          {renderButton('詳細ライフサイクル追跡テスト', testBrowserNotificationDirect, '#007AFF')}
          {renderButton('基本通知機能テスト', testNotificationBasic, '#34C759')}
          {renderButton('詳細通知送信テスト', testSendNotification)}
          {renderButton('電車通知を送信', testTrainNotification)}
          <Text style={styles.statusText}>
            権限: {notificationState.permissionGranted ? '✅' : '❌'} |
            ステータス: {notificationState.permissionStatus} |
            スケジュール: {notificationState.scheduledNotifications.length}件
          </Text>
          {notificationState.error && (
            <Text style={[styles.statusText, { color: '#FF3B30' }]}>
              エラー: {notificationState.error}
            </Text>
          )}
        </View>
      ))}

      {/* ストレージテスト */}
      {renderSection('💾 ストレージテスト', (
        <View>
          {renderButton('データを読み込み', testStorageLoad)}
          {renderButton('お気に入り駅を切り替え', testFavoriteStation)}
          <Text style={styles.statusText}>
            お気に入り: {storageState.favoriteStations.length}件 |
            検索履歴: {storageState.searchHistory.length}件
          </Text>
        </View>
      ))}

      {/* ログ表示エリア */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>📋 実行ログ</Text>
          {renderButton('クリア', clearLogs, '#FF3B30')}
        </View>
        <View style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.noLogsText}>ログはありません</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    minHeight: 200,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noLogsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});