import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Station } from '../src/types';
import { searchStations } from '../src/services/stationService';
import { useStorage } from '../src/hooks/useStorage';
import { createDropoffTarget } from '../src/hooks/useDropoffNotifier';
import { lines } from '../src/constants/stations';
import {
  sendDropoffTargetToAndroid,
  sendHomeStationToAndroid,
  sendSelectedStationToAndroid,
} from '../src/services/androidBridgeService';

export default function StationPickerScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const selectionMode = params.mode === 'home' ? 'home' : 'dropoff';
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { state: storageState, actions: storageActions } = useStorage();

  const pageTitle = selectionMode === 'home' ? '出発駅を選ぶ' : '降車駅を選ぶ';
  const primaryActionLabel = selectionMode === 'home' ? 'この駅を出発駅にする' : 'この駅を降車駅にする';

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return searchStations(searchQuery).slice(0, 12);
  }, [searchQuery]);

  const handleStationPress = useCallback((station: Station) => {
    setSelectedStation(station);
    setShowQuickActions(true);
    sendSelectedStationToAndroid(station);
  }, []);

  const handleSetSelectedStation = useCallback(async () => {
    if (!selectedStation) {
      return;
    }

    if (selectionMode === 'home') {
      const homeStationSetting = {
        station: selectedStation,
        setAt: new Date().toISOString(),
      };

      const success = await storageActions.setHomeStation(homeStationSetting);
      if (!success) {
        Alert.alert('出発駅', '出発駅の設定に失敗しました。');
        return;
      }

      sendHomeStationToAndroid(homeStationSetting);
      setShowQuickActions(false);
      router.back();
      return;
    }

    const dropoffTarget = createDropoffTarget(selectedStation);
    const success = await storageActions.setDropoffTarget(dropoffTarget);
    if (!success) {
      Alert.alert('降車駅', '降車駅の設定に失敗しました。');
      return;
    }

    sendDropoffTargetToAndroid(dropoffTarget);
    Alert.alert('降車駅', `${selectedStation.name}駅を設定しました。`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [selectedStation, selectionMode, storageActions]);

  const handleSelectLine = useCallback((lineId: string) => {
    setShowQuickActions(false);
    router.push(`/line-stations?mode=${selectionMode}&lineId=${lineId}`);
  }, [selectionMode]);

  const handleSelectSearchResult = useCallback((station: Station) => {
    setSearchQuery(station.name);
    handleStationPress(station);
  }, [handleStationPress]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{pageTitle}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {selectionMode === 'home' && storageState.homeStation && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedCardLabel}>現在の出発駅</Text>
            <Text style={styles.selectedCardName}>{storageState.homeStation.station.name}駅</Text>
          </View>
        )}

        {selectionMode === 'dropoff' && storageState.dropoffTarget && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedCardLabel}>現在の降車駅</Text>
            <Text style={styles.selectedCardName}>{storageState.dropoffTarget.station.name}駅</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>駅名で検索</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="駅名を入力"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.stationItem}
                  onPress={() => handleSelectSearchResult(station)}
                >
                  <View style={styles.stationTextGroup}>
                    <Text style={styles.stationName}>{station.name}駅</Text>
                    <Text style={styles.stationKana}>{station.nameKana}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>路線から選ぶ</Text>
          <View style={styles.lineGrid}>
            {lines.map((line) => {
              return (
                <TouchableOpacity
                  key={line.id}
                  style={[
                    styles.lineItem,
                    { borderColor: line.color, backgroundColor: `${line.color}18` },
                  ]}
                  onPress={() => handleSelectLine(line.id)}
                >
                  <View style={styles.lineTileHeader}>
                    <View style={[styles.lineDot, { backgroundColor: line.color }]} />
                    <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                  </View>
                  <Text style={styles.lineItemName}>{line.name}</Text>
                  <Text style={styles.lineItemOperator}>{line.operator}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {showQuickActions && selectedStation && (
        <View style={styles.quickActionsContainer}>
          <Text style={styles.selectedStationName}>{selectedStation.name}駅</Text>
          <Text style={styles.selectedStationLines}>
            {selectedStation.lines.map((line) => line.name).join('・')}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => void handleSetSelectedStation()}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#1E3A5F"
              />
              <Text style={styles.actionButtonText}>{primaryActionLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowQuickActions(false)}
            >
              <Ionicons name="close" size={20} color="#8E8E93" />
              <Text style={styles.actionButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    minWidth: 64,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBarSpacer: {
    minWidth: 64,
  },
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 16,
  },
  selectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D7E6FF',
  },
  selectedCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B708A',
  },
  selectedCardName: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D7E2',
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  searchResults: {
    marginTop: 12,
    gap: 8,
  },
  lineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  lineItem: {
    width: '48%',
    minHeight: 112,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  lineTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  lineItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 20,
  },
  lineItemOperator: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
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
  quickActionsContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedStationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedStationLines: {
    fontSize: 14,
    color: '#1E3A5F',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
});
