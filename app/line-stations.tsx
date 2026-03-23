import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { lines, stations } from '../src/constants/stations';
import { createDropoffTarget } from '../src/hooks/useDropoffNotifier';
import { useStorage } from '../src/hooks/useStorage';
import { sendDropoffTargetToAndroid, sendHomeStationToAndroid } from '../src/services/androidBridgeService';
import { Station } from '../src/types';

export default function LineStationsScreen() {
  const params = useLocalSearchParams<{ mode?: string; lineId?: string }>();
  const selectionMode = params.mode === 'home' ? 'home' : 'dropoff';
  const lineId = typeof params.lineId === 'string' ? params.lineId : '';
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const { actions: storageActions } = useStorage();

  const selectedLine = useMemo(
    () => lines.find((line) => line.id === lineId) || null,
    [lineId]
  );

  const lineStations = useMemo(() => {
    if (!lineId) {
      return [];
    }

    return stations.filter((station) =>
      station.lines.some((line) => line.id === lineId)
    );
  }, [lineId]);

  const handleSelectStation = useCallback(async (station: Station) => {
    setSelectedStation(station);

    if (selectionMode === 'home') {
      const homeStationSetting = {
        station,
        setAt: new Date().toISOString(),
      };

      const success = await storageActions.setHomeStation(homeStationSetting);
      if (!success) {
        Alert.alert('出発駅', '出発駅の設定に失敗しました。');
        return;
      }

      sendHomeStationToAndroid(homeStationSetting);
      router.back();
      router.back();
      return;
    }

    const dropoffTarget = createDropoffTarget(station);
    const success = await storageActions.setDropoffTarget(dropoffTarget);
    if (!success) {
      Alert.alert('降車駅', '降車駅の設定に失敗しました。');
      return;
    }

    sendDropoffTargetToAndroid(dropoffTarget);
    router.back();
    router.back();
  }, [selectionMode, storageActions]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.backButtonText}>路線一覧へ戻る</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{selectedLine?.name ?? '路線'}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{selectedLine?.name ?? '路線'}</Text>
          <Text style={styles.sectionSubtitle}>
            駅を選ぶと、そのまま{selectionMode === 'home' ? '出発駅' : '降車駅'}に設定します。
          </Text>

          <View style={styles.stationList}>
            {lineStations.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={[
                  styles.stationItem,
                  selectedStation?.id === station.id && styles.stationItemSelected,
                ]}
                onPress={() => void handleSelectStation(station)}
              >
                <View style={styles.stationTextGroup}>
                  <Text style={styles.stationName}>{station.name}駅</Text>
                  <Text style={styles.stationKana}>{station.nameKana}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#1E3A5F',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  topBarSpacer: {
    minWidth: 96,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  stationList: {
    gap: 8,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationItemSelected: {
    borderColor: '#1E3A5F',
    backgroundColor: '#F3F8FD',
  },
  stationTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  stationKana: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
});
