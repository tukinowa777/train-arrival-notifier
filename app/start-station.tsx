import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { searchStations } from '../src/services/stationService';
import { useStorage } from '../src/hooks/useStorage';
import { sendHomeStationToAndroid } from '../src/services/androidBridgeService';
import { Station } from '../src/types';

export default function StartStationScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { actions: storageActions } = useStorage();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return searchStations(searchQuery).slice(0, 20);
  }, [searchQuery]);

  const handleSelectStation = useCallback(async (station: Station) => {
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
  }, [storageActions]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>出発駅を選ぶ</Text>
        <Text style={styles.subtitle}>駅名検索で手動設定できます。</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="駅名を入力"
          placeholderTextColor="#8E8E93"
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {searchResults.map((station) => (
          <TouchableOpacity
            key={station.id}
            style={styles.resultCard}
            onPress={() => void handleSelectStation(station)}
          >
            <Text style={styles.stationName}>{station.name}駅</Text>
            <Text style={styles.stationMeta}>
              {station.lines.map((line) => line.name).join('・')}
            </Text>
          </TouchableOpacity>
        ))}

        {!!searchQuery && searchResults.length === 0 && (
          <Text style={styles.emptyText}>一致する駅が見つかりません。</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6E6E73',
  },
  searchBox: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.1)',
  },
  searchInput: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 10,
  },
  resultCard: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  stationMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6E6E73',
    lineHeight: 18,
  },
  emptyText: {
    paddingTop: 20,
    fontSize: 14,
    color: '#6E6E73',
    textAlign: 'center',
  },
});
