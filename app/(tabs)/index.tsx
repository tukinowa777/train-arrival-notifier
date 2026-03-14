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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Station } from '../../src/types';
import { getAllNextTrains, searchStations } from '../../src/services/stationService';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useStorage } from '../../src/hooks/useStorage';
import { createDropoffTarget } from '../../src/hooks/useDropoffNotifier';
import { lines, stations } from '../../src/constants/stations';
import {
  sendDropoffTargetToAndroid,
  sendSelectedStationToAndroid,
} from '../../src/services/androidBridgeService';

export default function ArrivalStationScreen() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [showLineStations, setShowLineStations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { actions: notificationActions } = useNotifications();
  const { state: storageState, actions: storageActions } = useStorage();

  const selectedLine = useMemo(
    () => lines.find((line) => line.id === selectedLineId) || null,
    [selectedLineId]
  );

  const lineStations = useMemo(() => {
    if (!selectedLineId) {
      return [];
    }

    return stations.filter((station) =>
      station.lines.some((line) => line.id === selectedLineId)
    );
  }, [selectedLineId]);

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

    try {
      const nextTrains = getAllNextTrains(station.id);
      console.log(`${station.name}駅の次の電車:`, nextTrains.slice(0, 2));
    } catch (error) {
      console.error('次の電車情報の取得に失敗:', error);
    }
  }, []);

  const handleSetDropoffStation = useCallback(async () => {
    if (!selectedStation) return;

    try {
      const dropoffTarget = createDropoffTarget(selectedStation);
      const success = await storageActions.setDropoffTarget(dropoffTarget);
      if (!success) {
        throw new Error('dropoff target save failed');
      }

      sendDropoffTargetToAndroid(dropoffTarget);
      Alert.alert(
        '到着駅',
        `${selectedStation.name}駅を到着駅に設定しました。到着3分前を目安に通知します。`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('エラー', '到着駅の設定に失敗しました');
    }
  }, [selectedStation, storageActions]);

  const handleSendTrainAlert = useCallback(async () => {
    if (!selectedStation) return;

    try {
      const nextTrains = getAllNextTrains(selectedStation.id);
      if (nextTrains.length > 0) {
        const success = await notificationActions.sendTrainAlert(nextTrains[0]);
        if (success) {
          Alert.alert(
            '通知送信',
            `${selectedStation.name}駅の電車情報を通知しました`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('エラー', '通知の送信に失敗しました');
        }
      } else {
        Alert.alert('情報なし', '次の電車情報が見つかりません');
      }
    } catch (error) {
      Alert.alert('エラー', '通知の送信中にエラーが発生しました');
    }
  }, [selectedStation, notificationActions]);

  const handleSelectLine = useCallback((lineId: string) => {
    const isSameLine = selectedLineId === lineId;
    setSelectedLineId(lineId);
    setShowLineStations(isSameLine ? !showLineStations : true);
    setShowQuickActions(false);
  }, [selectedLineId, showLineStations]);

  const handleSelectSearchResult = useCallback((station: Station) => {
    setSearchQuery(station.name);
    handleStationPress(station);
  }, [handleStationPress]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {storageState.homeStation && (
          <View style={styles.homeStationCard}>
            <View style={styles.homeStationHeader}>
              <Ionicons name="home" size={18} color="#007AFF" />
              <Text style={styles.homeStationLabel}>HOME駅</Text>
            </View>
            <Text style={styles.homeStationName}>{storageState.homeStation.station.name}駅</Text>
            <Text style={styles.homeStationLines}>
              {storageState.homeStation.station.lines.map((line) => line.name).join('・')}
            </Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>到着駅を検索</Text>
          <Text style={styles.sectionSubtitle}>
            駅名で検索して、そのまま到着駅を選択できます。
          </Text>

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
          <Text style={styles.sectionTitle}>路線から到着駅を選ぶ</Text>
          <Text style={styles.sectionSubtitle}>
            路線を選ぶと、その路線の駅がプルダウン表示されます。
          </Text>

          <View style={styles.lineGrid}>
            {lines.map((line) => {
              const isSelected = selectedLineId === line.id;

              return (
                <TouchableOpacity
                  key={line.id}
                  style={[
                    styles.lineItem,
                    isSelected && styles.lineItemSelected,
                    isSelected && { borderColor: line.color, backgroundColor: `${line.color}22` },
                  ]}
                  onPress={() => handleSelectLine(line.id)}
                >
                  <View style={styles.lineTileHeader}>
                    <View style={[styles.lineDot, { backgroundColor: line.color }]} />
                    <Ionicons
                      name={isSelected && showLineStations ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#8E8E93"
                    />
                  </View>
                  <Text style={styles.lineItemName}>{line.name}</Text>
                  <Text style={styles.lineItemOperator}>{line.operator}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedLine && showLineStations && (
            <View style={styles.dropdownContainer}>
              <View style={styles.selectedLineHeader}>
                <View style={styles.lineItemLeft}>
                  <View style={[styles.lineDot, { backgroundColor: selectedLine.color }]} />
                  <Text style={styles.selectedLineTitle}>{selectedLine.name}</Text>
                </View>
                <Text style={styles.stationCount}>{lineStations.length}駅</Text>
              </View>

              <View style={styles.stationList}>
                {lineStations.map((station) => (
                  <TouchableOpacity
                    key={station.id}
                    style={styles.stationItem}
                    onPress={() => handleStationPress(station)}
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
          )}
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
              onPress={handleSetDropoffStation}
            >
              <Ionicons
                name={storageState.dropoffTarget?.station.id === selectedStation.id ? 'checkmark-circle' : 'navigate-circle-outline'}
                size={20}
                color="#007AFF"
              />
              <Text style={styles.actionButtonText}>この駅を到着駅にする</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSendTrainAlert}
            >
              <Ionicons name="notifications-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>通知送信</Text>
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

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 16,
  },
  homeStationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D7E6FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  homeStationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  homeStationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  homeStationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  homeStationLines: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  lineItemSelected: {
    borderWidth: 1.5,
  },
  lineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  dropdownContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DCE6F3',
  },
  selectedLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedLineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  stationCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
    color: '#007AFF',
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
    color: '#333',
    textAlign: 'center',
  },
});
