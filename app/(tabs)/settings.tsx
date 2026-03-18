import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { getNearbyStations, calculateDistance } from '../../src/services/stationService';
import { useAndroidBridgeState } from '../../src/hooks/useAndroidBridgeState';
import { useLocation } from '../../src/hooks/useLocation';
import { useStorage } from '../../src/hooks/useStorage';
import { getCurrentLocation } from '../../src/services/locationService';
import {
  requestCurrentLocationFromAndroid,
  sendDropoffTargetToAndroid,
  sendHomeStationToAndroid,
} from '../../src/services/androidBridgeService';
import { Station } from '../../src/types';
import { getEstimatedArrivalMinutes } from '../../src/hooks/useDropoffNotifier';

export default function SettingsScreen() {
  const [isLoadingNearbyStations, setIsLoadingNearbyStations] = useState(false);
  const [isCurrentLocationSheetVisible, setIsCurrentLocationSheetVisible] = useState(false);
  const [sleepSummary, setSleepSummary] = useState<string | null>(null);
  const { state: storageState, actions: storageActions } = useStorage();
  const { state: androidBridgeState } = useAndroidBridgeState();
  const { state: locationState, actions: locationActions } = useLocation({
    watchPosition: false,
    autoRequestPermissions: false,
  });

  const nearbyStationCandidates = useMemo(() => {
    if (locationState.currentLocation) {
      return getNearbyStations(
        locationState.currentLocation.coords.latitude,
        locationState.currentLocation.coords.longitude,
        10000
      ).slice(0, 3);
    }

    if (
      androidBridgeState.currentLatitude !== null &&
      androidBridgeState.currentLongitude !== null
    ) {
      return getNearbyStations(
        androidBridgeState.currentLatitude,
        androidBridgeState.currentLongitude,
        10000
      ).slice(0, 3);
    }

    return locationState.nearbyStations.slice(0, 3);
  }, [
    androidBridgeState.currentLatitude,
    androidBridgeState.currentLongitude,
    locationState.nearbyStations,
  ]);

  const handleSelectHomeStation = useCallback(async (station: Station) => {
    const homeStationSetting = {
      station,
      setAt: new Date().toISOString(),
    };

    const success = await storageActions.setHomeStation(homeStationSetting);
    if (!success) {
      Alert.alert('エラー', '現在地の設定に失敗しました。');
      return;
    }

    sendHomeStationToAndroid(homeStationSetting);
    Alert.alert('現在地', `${station.name}駅を出発駅として設定しました。`);
  }, [storageActions]);

  const showNearbyStationSelector = useCallback((stations: Array<Station & { distance: number }>) => {
    if (stations.length === 0) {
      Alert.alert('現在地', '近くの駅候補が見つかりませんでした。');
      return;
    }

    Alert.alert(
      '現在地',
      '近い駅を選んでください。',
      [
        ...stations.map((station) => ({
          text: `${station.name}駅`,
          onPress: () => {
            void handleSelectHomeStation(station);
          },
        })),
        {
          text: 'キャンセル',
          style: 'cancel' as const,
        },
      ]
    );
  }, [handleSelectHomeStation]);

  const handleSetAutoDetectedHomeStation = useCallback(async (
    stations: Array<Station & { distance: number }>
  ) => {
    const closestStation = stations[0];

    if (!closestStation) {
      Alert.alert('現在地', '近くの駅候補が見つかりませんでした。');
      return;
    }

    await handleSelectHomeStation(closestStation);
  }, [handleSelectHomeStation]);

  const handleManualHomeStationPress = useCallback(() => {
    setIsCurrentLocationSheetVisible(false);
    router.push('/dropoff-station?mode=home');
  }, []);

  const handleAutoDetectHomeStationPress = useCallback(async () => {
    setIsCurrentLocationSheetVisible(false);
    if (nearbyStationCandidates.length > 0) {
      await handleSetAutoDetectedHomeStation(nearbyStationCandidates);
      return;
    }

    setIsLoadingNearbyStations(true);

    try {
      if (!locationState.permissionStatus.foregroundGranted) {
        const granted = await locationActions.requestForegroundPermission();
        if (!granted) {
          if (requestCurrentLocationFromAndroid()) {
            Alert.alert('現在地', 'Android アプリに現在地取得を依頼しました。少し待ってからもう一度押してください。');
            return;
          }

          Alert.alert('現在地', '位置情報の権限が必要です。');
          return;
        }
      }

      const currentLocation = await getCurrentLocation();
      if (currentLocation) {
        const refreshedCandidates = getNearbyStations(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          10000
        ).slice(0, 3);

        if (refreshedCandidates.length > 0) {
          await handleSetAutoDetectedHomeStation(refreshedCandidates);
          return;
        }
      }

      await locationActions.refreshLocation();

      const refreshedCandidates = nearbyStationCandidates;
      if (refreshedCandidates.length > 0) {
        await handleSetAutoDetectedHomeStation(refreshedCandidates);
        return;
      }

      if (requestCurrentLocationFromAndroid()) {
        Alert.alert('現在地', 'Android アプリに現在地取得を依頼しました。少し待ってからもう一度押してください。');
        return;
      }

      Alert.alert('現在地', '近くの駅候補を取得できませんでした。');
    } finally {
      setIsLoadingNearbyStations(false);
    }
  }, [
    locationActions,
    locationState.permissionStatus.foregroundGranted,
    handleSetAutoDetectedHomeStation,
    nearbyStationCandidates,
  ]);

  const handleCurrentLocationPress = useCallback(() => {
    setIsCurrentLocationSheetVisible(true);
  }, []);

  const handleDropoffStationPress = useCallback(() => {
    router.push('/dropoff-station?mode=dropoff');
  }, []);

  const handleSleepPress = useCallback(async () => {
    if (!storageState.dropoffTarget) {
      Alert.alert('寝る', '先に降車駅を設定してください。');
      return;
    }

    const currentLatitude =
      locationState.currentLocation?.coords.latitude ?? androidBridgeState.currentLatitude;
    const currentLongitude =
      locationState.currentLocation?.coords.longitude ?? androidBridgeState.currentLongitude;

    const fallbackLatitude = storageState.homeStation?.station.latitude ?? null;
    const fallbackLongitude = storageState.homeStation?.station.longitude ?? null;

    const originLatitude = currentLatitude ?? fallbackLatitude;
    const originLongitude = currentLongitude ?? fallbackLongitude;

    if (originLatitude === null || originLongitude === null) {
      Alert.alert('寝る', '先に現在地を取得するか、出発駅を設定してください。');
      return;
    }

    const distanceMeters = calculateDistance(
      originLatitude,
      originLongitude,
      storageState.dropoffTarget.station.latitude,
      storageState.dropoffTarget.station.longitude
    );
    const estimatedArrivalMinutes = getEstimatedArrivalMinutes(
      distanceMeters,
      locationState.currentLocation?.coords.speed
    );
    const roundedSleepMinutes = Math.max(0, Math.floor(estimatedArrivalMinutes - 2));

    const nextDropoffTarget = {
      ...storageState.dropoffTarget,
      enabled: true,
      notified: false,
      notifyBeforeMinutes: 2,
      notifiedAt: undefined,
      setAt: new Date().toISOString(),
    };

    const success = await storageActions.setDropoffTarget(nextDropoffTarget);
    if (!success) {
      Alert.alert('寝る', '通知待機の開始に失敗しました。');
      return;
    }

    if (storageState.homeStation) {
      sendHomeStationToAndroid(storageState.homeStation);
    }
    sendDropoffTargetToAndroid(nextDropoffTarget);

    setSleepSummary(
      `${nextDropoffTarget.station.name}駅まで約${Math.ceil(estimatedArrivalMinutes)}分です。あと約${roundedSleepMinutes}分寝られます。到着2分前に通知とバイブでお知らせします。`
    );
  }, [
    androidBridgeState.currentLatitude,
    androidBridgeState.currentLongitude,
    locationState.currentLocation,
    storageActions,
    storageState.dropoffTarget,
    storageState.homeStation,
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroBlock}>
        <Text style={styles.eyebrow}>Train Arrival Notifier</Text>
        <Text style={styles.title}>降りる駅教える君β</Text>
        <Text style={styles.subtitle}>
          降りる駅の近くまで来たら、知らせるよ
        </Text>
      </View>

      <View style={styles.topRow}>
        <TouchableOpacity style={styles.squareButton} onPress={() => void handleCurrentLocationPress()}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonLabel}>Start</Text>
            <Text style={styles.squareButtonText}>現在地</Text>
            <Text style={styles.buttonSubtext}>
              {isLoadingNearbyStations
                ? '取得中'
                : storageState.homeStation
                  ? `${storageState.homeStation.station.name}駅`
                  : '未設定'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.squareButton} onPress={handleDropoffStationPress}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonLabel}>Target</Text>
            <Text style={styles.squareButtonText}>降車駅</Text>
            <Text style={styles.buttonSubtext}>
              {storageState.dropoffTarget
                ? `${storageState.dropoffTarget.station.name}駅`
                : '未設定'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.sleepButton} onPress={() => void handleSleepPress()}>
        <View style={styles.buttonContent}>
          <Text style={styles.buttonLabel}>Ready</Text>
          <Text style={styles.sleepButtonText}>START</Text>
          <Text style={styles.buttonSubtext}>
            {storageState.dropoffTarget
              ? `${storageState.dropoffTarget.station.name}駅で通知`
              : '降車駅を設定してください'}
          </Text>
        </View>
      </TouchableOpacity>

      {sleepSummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>睡眠時間の目安</Text>
          <Text style={styles.summaryText}>{sleepSummary}</Text>
        </View>
      )}

      {isCurrentLocationSheetVisible && (
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>出発駅の設定</Text>
            <Text style={styles.sheetText}>設定方法を選んでください。</Text>

            <TouchableOpacity
              style={styles.sheetActionButton}
              onPress={() => void handleAutoDetectHomeStationPress()}
            >
              <Text style={styles.sheetActionTitle}>GPSで自動取得</Text>
              <Text style={styles.sheetActionText}>近くの駅候補から出発駅を設定します。</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetActionButton}
              onPress={handleManualHomeStationPress}
            >
              <Text style={styles.sheetActionTitle}>自分で出発駅を選ぶ</Text>
              <Text style={styles.sheetActionText}>駅名検索で手動設定します。</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setIsCurrentLocationSheetVisible(false)}
            >
              <Text style={styles.sheetCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FAFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },
  heroBlock: {
    marginTop: 8,
    marginBottom: 44,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#4D9BCF',
  },
  title: {
    marginTop: 10,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1D1D1F',
    letterSpacing: -0.9,
  },
  subtitle: {
    marginTop: 12,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#4A647C',
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
  },
  squareButton: {
    flex: 1,
    minHeight: 192,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#D3EEFA',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  buttonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#0DA6D8',
    textAlign: 'center',
  },
  squareButtonText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  sleepButton: {
    minHeight: 188,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#FFE08A',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8D8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 34,
    elevation: 5,
  },
  sleepButtonText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -1,
    textAlign: 'center',
  },
  buttonSubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A647C',
    textAlign: 'center',
  },
  summaryCard: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: '#E8FFF3',
    borderWidth: 1,
    borderColor: '#BFEFCC',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23A26D',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 26,
    color: '#1D1D1F',
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  sheetCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F6FCFF',
    gap: 12,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  sheetText: {
    fontSize: 14,
    color: '#4A647C',
    textAlign: 'center',
  },
  sheetActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6EEF9',
  },
  sheetActionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  sheetActionText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#4A647C',
    textAlign: 'center',
  },
  sheetCloseButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#DFF3FF',
  },
  sheetCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
  },
});
