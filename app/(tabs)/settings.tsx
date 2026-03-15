import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { searchStations } from '../../src/services/stationService';
import { useAndroidBridgeState } from '../../src/hooks/useAndroidBridgeState';
import { useStorage } from '../../src/hooks/useStorage';
import { useLocation } from '../../src/hooks/useLocation';
import { useNotifications } from '../../src/hooks/useNotifications';
import { Station } from '../../src/types';
import {
  sendAndroidTestNotification,
  sendHomeStationToAndroid,
} from '../../src/services/androidBridgeService';

export default function SettingsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { state: androidBridgeState, actions: androidBridgeActions } = useAndroidBridgeState();
  const { state: storageState, actions: storageActions } = useStorage();
  const { state: locationState, actions: locationActions } = useLocation({
    watchPosition: false,
    autoRequestPermissions: false,
  });
  const { state: notificationState, actions: notificationActions } = useNotifications({
    autoRequestPermission: false,
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return searchStations(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const nearbyStationCandidates = useMemo(
    () => locationState.nearbyStations.slice(0, 3),
    [locationState.nearbyStations]
  );

  const handleSelectHomeStation = useCallback(async (station: Station) => {
    const homeStationSetting = {
      station,
      setAt: new Date().toISOString(),
    };

    const success = await storageActions.setHomeStation(homeStationSetting);

    if (!success) {
      Alert.alert('エラー', 'ホーム駅の設定に失敗しました');
      return;
    }

    sendHomeStationToAndroid(homeStationSetting);
    setSearchQuery('');
    Alert.alert('ホーム駅', `${station.name}駅をホーム駅に設定しました。`);
  }, [storageActions]);

  const handleClearHomeStation = useCallback(async () => {
    const success = await storageActions.setHomeStation(null);

    if (!success) {
      Alert.alert('エラー', 'ホーム駅の解除に失敗しました');
      return;
    }

    sendHomeStationToAndroid(null);
    Alert.alert('ホーム駅', 'ホーム駅を解除しました。');
  }, [storageActions]);

  const ensureNearbyStationsLoaded = useCallback(async () => {
    if (!locationState.permissionStatus.foregroundGranted) {
      const granted = await locationActions.requestForegroundPermission();
      if (!granted) {
        Alert.alert('位置情報', '位置情報の権限が必要です。');
        return false;
      }
    }

    if (locationState.nearbyStations.length === 0) {
      await locationActions.refreshLocation();
    }

    return true;
  }, [locationActions, locationState.nearbyStations.length, locationState.permissionStatus.foregroundGranted]);

  const handleSetNearbyStationAsHome = useCallback(async (station: Station) => {
    const homeStationSetting = {
      station,
      setAt: new Date().toISOString(),
    };

    const success = await storageActions.setHomeStation(homeStationSetting);

    if (!success) {
      Alert.alert('エラー', '最寄駅のHOME設定に失敗しました');
      return;
    }

    sendHomeStationToAndroid(homeStationSetting);
    Alert.alert('HOME駅', `${station.name}駅を最寄駅候補から設定しました。`);
  }, [storageActions]);

  const handleLoadNearbyStations = useCallback(async () => {
    const ready = await ensureNearbyStationsLoaded();
    if (!ready) {
      return;
    }

    if (locationState.nearbyStations.length === 0) {
      Alert.alert('位置情報', '最寄駅を判定できませんでした。GPS環境を確認してください。');
    }
  }, [ensureNearbyStationsLoaded, locationState.nearbyStations.length]);

  const handleSendTestNotification = useCallback(async () => {
    const sentToAndroid = sendAndroidTestNotification(
      '通知テスト',
      '到着駅教える君β の通知テストです。'
    );

    if (sentToAndroid) {
      Alert.alert('通知テスト', 'Android アプリへ通知テストを送信しました。');
      return;
    }

    const notificationId = await notificationActions.sendNotification(
      '通知テスト',
      '到着駅教える君β の通知テストです。'
    );

    if (notificationId) {
      Alert.alert('通知テスト', '通知を送信しました。');
      return;
    }

    Alert.alert('通知テスト', '通知の送信に失敗しました。');
  }, [notificationActions]);

  const handleRequestAndroidState = useCallback(() => {
    const requested = androidBridgeActions.requestPermissionState();

    if (!requested) {
      Alert.alert('Android連携', 'Android アプリ連携が利用できません。WebView アプリから開いてください。');
      return;
    }

    Alert.alert('Android連携', 'Android 側へ状態取得を要求しました。');
  }, [androidBridgeActions]);

  const androidNotificationStateLabel = useMemo(() => {
    if (androidBridgeState.notificationPermissionGranted === null) {
      return '-';
    }

    return androidBridgeState.notificationPermissionGranted ? '許可済み' : '未許可';
  }, [androidBridgeState.notificationPermissionGranted]);

  const androidLocationStateLabel = useMemo(() => {
    if (androidBridgeState.foregroundLocationGranted === null) {
      return '-';
    }

    return androidBridgeState.foregroundLocationGranted ? '許可済み' : '未許可';
  }, [androidBridgeState.foregroundLocationGranted]);

  const androidLastNotificationLabel = useMemo(() => {
    if (!androidBridgeState.lastNotificationTestAt) {
      return '-';
    }

    return new Date(androidBridgeState.lastNotificationTestAt).toLocaleString('ja-JP');
  }, [androidBridgeState.lastNotificationTestAt]);

  const androidLastDropoffLabel = useMemo(() => {
    if (!androidBridgeState.lastDropoffNotificationAt) {
      return '-';
    }

    const notifiedAt = new Date(androidBridgeState.lastDropoffNotificationAt).toLocaleString('ja-JP');
    const stationName = androidBridgeState.lastDropoffNotificationStationName;
    return stationName ? `${stationName}駅 / ${notifiedAt}` : notifiedAt;
  }, [
    androidBridgeState.lastDropoffNotificationAt,
    androidBridgeState.lastDropoffNotificationStationName,
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>HOME駅</Text>
        </View>

        {storageState.homeStation ? (
          <View style={styles.homeStationCard}>
            <Text style={styles.homeStationName}>{storageState.homeStation.station.name}駅</Text>
            <Text style={styles.homeStationLines}>
              {storageState.homeStation.station.lines.map((line) => line.name).join('・')}
            </Text>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearHomeStation}>
              <Text style={styles.clearButtonText}>ホーム駅を解除</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.placeholderText}>
            まだホーム駅が設定されていません。
          </Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Android通知確認</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>通知権限</Text>
            <Text style={styles.statusValue}>
              {notificationState.permissionGranted ? '許可済み' : '未許可'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>位置情報権限</Text>
            <Text style={styles.statusValue}>
              {locationState.permissionStatus.foregroundGranted ? '許可済み' : '未許可'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>最寄駅候補数</Text>
            <Text style={styles.statusValue}>{locationState.nearbyStations.length}件</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>降車駅</Text>
            <Text style={styles.statusValue}>
              {storageState.dropoffTarget ? `${storageState.dropoffTarget.station.name}駅` : '未設定'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Android連携</Text>
            <Text style={styles.statusValue}>
              {androidBridgeState.isBridgeAvailable ? '接続中' : '未接続'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Android通知権限</Text>
            <Text style={styles.statusValue}>{androidNotificationStateLabel}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Android位置権限</Text>
            <Text style={styles.statusValue}>{androidLocationStateLabel}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>最終Androidイベント</Text>
            <Text style={styles.statusValue}>
              {androidBridgeState.lastEventType ?? '未受信'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Android HOME駅</Text>
            <Text style={styles.statusValue}>
              {androidBridgeState.homeStationName ? `${androidBridgeState.homeStationName}駅` : '-'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Android 到着駅</Text>
            <Text style={styles.statusValue}>
              {androidBridgeState.dropoffTargetName ? `${androidBridgeState.dropoffTargetName}駅` : '-'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>最終通知テスト</Text>
            <Text style={styles.statusValue}>{androidLastNotificationLabel}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>最終到着駅通知</Text>
            <Text style={styles.statusValue}>{androidLastDropoffLabel}</Text>
          </View>
        </View>

        <View style={styles.debugButtonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => notificationActions.requestPermission()}
          >
            <Text style={styles.secondaryButtonText}>通知権限を確認</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => locationActions.refreshLocation()}
          >
            <Text style={styles.secondaryButtonText}>位置情報を更新</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.secondaryOutlineButton}
          onPress={handleRequestAndroidState}
        >
          <Ionicons name="sync-outline" size={18} color="#007AFF" />
          <Text style={styles.secondaryOutlineButtonText}>Android状態を取得</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryDebugButton}
          onPress={handleSendTestNotification}
        >
          <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryDebugButtonText}>通知テストを送信</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="locate-outline" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>GPSで最寄駅を自動判定</Text>
        </View>

        <View style={styles.autoDetectCard}>
          <Text style={styles.autoDetectLabel}>現在の最寄駅候補（最大3件）</Text>
          <Text style={styles.autoDetectSubtext}>
            {nearbyStationCandidates.length > 0
              ? '候補の中からHOME駅を選択してください。'
              : '位置情報の権限を許可して最寄駅候補を取得します。'}
          </Text>

          <TouchableOpacity
            style={styles.autoDetectButton}
            onPress={handleLoadNearbyStations}
          >
            <Ionicons name="navigate-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.autoDetectButtonText}>最寄駅候補を取得</Text>
          </TouchableOpacity>

          {nearbyStationCandidates.length > 0 && (
            <View style={styles.nearbyCandidatesList}>
              {nearbyStationCandidates.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.nearbyCandidateItem}
                  onPress={() => handleSetNearbyStationAsHome(station)}
                >
                  <View>
                    <Text style={styles.nearbyCandidateName}>{station.name}駅</Text>
                    <Text style={styles.nearbyCandidateMeta}>
                      {station.lines.map((line) => line.name).join('・')}
                      {' '}・ 約{Math.round(station.distance)}m
                    </Text>
                  </View>
                  <Ionicons name="home-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="search" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>HOME駅を検索</Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="駅名を入力してください"
            style={styles.searchInput}
          />
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={styles.resultItem}
                onPress={() => handleSelectHomeStation(station)}
              >
                <View>
                  <Text style={styles.resultName}>{station.name}駅</Text>
                  <Text style={styles.resultLines}>
                    {station.lines.map((line) => line.name).join('・')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!searchQuery && searchResults.length === 0 && (
          <Text style={styles.placeholderText}>該当する駅が見つかりません。</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  homeStationCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    gap: 4,
  },
  homeStationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  homeStationLines: {
    fontSize: 14,
    color: '#355070',
  },
  clearButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D0D7E2',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  searchBox: {
    borderWidth: 1,
    borderColor: '#D0D7E2',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  autoDetectCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  statusCard: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#475569',
  },
  statusValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  debugButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryDebugButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  primaryDebugButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
  },
  secondaryOutlineButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: '#F8FAFC',
  },
  secondaryOutlineButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  autoDetectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#355070',
  },
  autoDetectSubtext: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  autoDetectButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  autoDetectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nearbyCandidatesList: {
    marginTop: 12,
    gap: 8,
  },
  nearbyCandidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E6FF',
  },
  nearbyCandidateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  nearbyCandidateMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  searchInput: {
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  resultsList: {
    marginTop: 12,
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultLines: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748B',
  },
});
