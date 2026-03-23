import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
  const [isFloatingSummaryVisible, setIsFloatingSummaryVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isHomeActionModalVisible, setIsHomeActionModalVisible] = useState(false);
  const [isNearbyStationModalVisible, setIsNearbyStationModalVisible] = useState(false);
  const [nearbySelectableStations, setNearbySelectableStations] = useState<Array<Station & { distance: number }>>([]);
  const [sleepSummary, setSleepSummary] = useState<string | null>(null);
  const [sleepCountdownSeconds, setSleepCountdownSeconds] = useState<number | null>(null);
  const { state: storageState, actions: storageActions } = useStorage();
  const { state: androidBridgeState } = useAndroidBridgeState();
  const { state: locationState, actions: locationActions } = useLocation({
    watchPosition: false,
    autoRequestPermissions: false,
  });
  const hasHomeStation = isLoadingNearbyStations || Boolean(storageState.homeStation);
  const hasDropoffStation = Boolean(storageState.dropoffTarget);

  useEffect(() => {
    if (sleepCountdownSeconds === null || sleepCountdownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSleepCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [sleepCountdownSeconds]);

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
      Alert.alert('エラー', '出発駅の設定に失敗しました。');
      return;
    }

    sendHomeStationToAndroid(homeStationSetting);
    Alert.alert('出発駅', `${station.name}駅を出発駅として設定しました。`);
  }, [storageActions]);

  const showNearbyStationSelector = useCallback((stations: Array<Station & { distance: number }>) => {
    if (stations.length === 0) {
      Alert.alert('出発駅', '近くの駅候補が見つかりませんでした。');
      return;
    }
    setNearbySelectableStations(stations);
    setIsNearbyStationModalVisible(true);
  }, [handleSelectHomeStation]);

  const handleSetAutoDetectedHomeStation = useCallback(async (
    stations: Array<Station & { distance: number }>
  ) => {
    const closestStation = stations[0];

    if (!closestStation) {
      Alert.alert('出発駅', '近くの駅候補が見つかりませんでした。');
      return;
    }

    await handleSelectHomeStation(closestStation);
  }, [handleSelectHomeStation]);

  const handleManualHomeStationPress = useCallback(() => {
    router.push('/dropoff-station?mode=home');
  }, []);

  const handleAutoDetectHomeStationPress = useCallback(async () => {
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
            Alert.alert('出発駅', 'Android アプリに現在地取得を依頼しました。少し待ってからもう一度押してください。');
            return;
          }

          Alert.alert('出発駅', '位置情報の権限が必要です。');
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
        Alert.alert('出発駅', 'Android アプリに現在地取得を依頼しました。少し待ってからもう一度押してください。');
        return;
      }

      Alert.alert('出発駅', '近くの駅候補を取得できませんでした。');
    } finally {
      setIsLoadingNearbyStations(false);
    }
  }, [
    locationActions,
    locationState.permissionStatus.foregroundGranted,
    handleSetAutoDetectedHomeStation,
    showNearbyStationSelector,
    nearbyStationCandidates,
  ]);

  const handleCurrentLocationPress = useCallback(() => {
    setIsHomeActionModalVisible(true);
  }, [handleAutoDetectHomeStationPress, handleManualHomeStationPress]);

  const handleDropoffStationPress = useCallback(() => {
    router.push('/dropoff-station?mode=dropoff');
  }, []);

  const handleSleepPress = useCallback(async () => {
    if (!storageState.dropoffTarget) {
      Alert.alert('START', '先に降車駅を設定してください。');
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
      Alert.alert('START', '先に現在地を取得するか、出発駅を設定してください。');
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
    const nextSleepCountdownSeconds = Math.max(0, Math.floor((estimatedArrivalMinutes - 2) * 60));

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
      Alert.alert('START', '通知待機の開始に失敗しました。');
      return;
    }

    if (storageState.homeStation) {
      sendHomeStationToAndroid(storageState.homeStation);
    }
    sendDropoffTargetToAndroid(nextDropoffTarget);

    setSleepSummary(
      `${nextDropoffTarget.station.name}駅まで約${Math.ceil(estimatedArrivalMinutes)}分です。通知までは約${roundedSleepMinutes}分です。到着2分前に通知とバイブでお知らせします。`
    );
    setSleepCountdownSeconds(nextSleepCountdownSeconds);
    setIsFloatingSummaryVisible(true);
  }, [
    androidBridgeState.currentLatitude,
    androidBridgeState.currentLongitude,
    locationState.currentLocation,
    storageActions,
    storageState.dropoffTarget,
    storageState.homeStation,
  ]);

  const handleResetTripCachePress = useCallback(async () => {
    if (isResetting) {
      return;
    }

    setIsResetting(true);

    try {
      const success = await storageActions.resetTripCache();

      if (!success) {
        Alert.alert('リセット', 'キャッシュのリセットに失敗しました。');
        return;
      }

      locationActions.clearLocationState();
      sendHomeStationToAndroid(null);
      sendDropoffTargetToAndroid(null);
      setSleepSummary(null);
      setSleepCountdownSeconds(null);
      setIsFloatingSummaryVisible(false);
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, locationActions, storageActions]);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.tileGrid}>
          <TouchableOpacity style={styles.tileButton} onPress={handleCurrentLocationPress}>
            <View style={styles.buttonContent}>
              <Text style={hasHomeStation ? styles.tileButtonLabelCompact : styles.tileButtonValue}>
                出発駅
              </Text>
              <Text
                style={styles.stationTileValue}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {isLoadingNearbyStations
                  ? '取得中'
                  : storageState.homeStation
                    ? `${storageState.homeStation.station.name}駅`
                    : '未設定'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tileButton} onPress={handleDropoffStationPress}>
            <View style={styles.buttonContent}>
              <Text style={hasDropoffStation ? styles.tileButtonLabelCompact : styles.tileButtonValue}>
                降車駅
              </Text>
              <Text
                style={styles.stationTileValue}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {storageState.dropoffTarget
                  ? `${storageState.dropoffTarget.station.name}駅`
                  : '未設定'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tileButton} onPress={() => void handleSleepPress()}>
            <View style={styles.buttonContent}>
              <Text style={styles.tileButtonValue}>START</Text>
              <Text style={styles.buttonSubtext}>
                {storageState.dropoffTarget
                  ? `${storageState.dropoffTarget.station.name}駅で通知`
                  : '降車駅を設定してください'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tileButton} onPress={() => void handleResetTripCachePress()}>
            <View style={styles.buttonContent}>
              <Text style={styles.tileButtonValue}>{isResetting ? 'RESET...' : 'RESET'}</Text>
              <Text style={styles.buttonSubtext}>
                現在地と降車駅を初期化
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {sleepSummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>到着までの目安</Text>
            {sleepCountdownSeconds !== null && (
              <Text style={styles.summaryCountdown}>
                {Math.floor(sleepCountdownSeconds / 60)}:{String(sleepCountdownSeconds % 60).padStart(2, '0')}
              </Text>
            )}
            <Text style={styles.summaryText}>{sleepSummary}</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isHomeActionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHomeActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>出発駅の設定</Text>
            <Text style={styles.modalDescription}>設定方法を選んでください。</Text>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setIsHomeActionModalVisible(false);
                void handleAutoDetectHomeStationPress();
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>GPSで自動取得</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                setIsHomeActionModalVisible(false);
                handleManualHomeStationPress();
              }}
            >
              <Text style={styles.modalSecondaryButtonText}>自分で出発駅を選ぶ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsHomeActionModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isNearbyStationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNearbyStationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>出発駅</Text>
            <Text style={styles.modalDescription}>近い駅を選んでください。</Text>
            {nearbySelectableStations.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setIsNearbyStationModalVisible(false);
                  void handleSelectHomeStation(station);
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>{station.name}駅</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsNearbyStationModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {sleepSummary && isFloatingSummaryVisible && (
        <View style={styles.floatingOverlay}>
          <View style={styles.floatingCard}>
            <Text style={styles.summaryTitle}>到着までの目安</Text>
            {sleepCountdownSeconds !== null && (
              <Text style={styles.summaryCountdown}>
                {Math.floor(sleepCountdownSeconds / 60)}:{String(sleepCountdownSeconds % 60).padStart(2, '0')}
              </Text>
            )}
            <Text style={styles.summaryText}>{sleepSummary}</Text>
            <TouchableOpacity
              style={styles.floatingCloseButton}
              onPress={() => {
                setIsFloatingSummaryVisible(false);
              }}
            >
              <Text style={styles.floatingCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#DCEBF4',
  },
  container: {
    flex: 1,
    backgroundColor: '#DCEBF4',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  tileButton: {
    width: '48%',
    minHeight: 188,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FBFE',
  },
  buttonContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5D7890',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  tileButtonLabelCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D879D',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  tileButtonValue: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#15212E',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  stationTileValue: {
    width: '100%',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#15212E',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  buttonSubtext: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4A647C',
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(18, 29, 43, 0.24)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3EEFA',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  modalDescription: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: '#4A647C',
    textAlign: 'center',
  },
  modalPrimaryButton: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D1D1F',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSecondaryButton: {
    minHeight: 58,
    marginTop: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3FAFF',
    borderWidth: 1,
    borderColor: '#D3EEFA',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF4F8',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A647C',
  },
  summaryCard: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: '#BFEFCC',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  floatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(18, 29, 43, 0.18)',
  },
  floatingCard: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFEFCC',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 14,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23A26D',
    textAlign: 'center',
  },
  summaryCountdown: {
    marginTop: 10,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 54,
    color: '#129B67',
    textAlign: 'center',
    letterSpacing: -1.6,
  },
  summaryText: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 26,
    color: '#1D1D1F',
    textAlign: 'center',
  },
  floatingCloseButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E9FFF2',
  },
  floatingCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#129B67',
  },
});
