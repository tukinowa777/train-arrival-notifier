import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { stations } from '../../constants/stations';
import { searchStations } from '../../services/stationService';
import { useStorage } from '../../hooks/useStorage';
import { Station } from '../../types';

export interface TimetableStationSelectorProps {
  onStationSelect: (station: Station) => void;
}

export default function TimetableStationSelector({
  onStationSelect,
}: TimetableStationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { state: storageState } = useStorage();

  /**
   * 検索とフィルタリングされた駅リスト
   */
  const filteredStations = useMemo(() => {
    if (searchQuery.trim()) {
      const searchResults = searchStations(searchQuery);
      return stations.filter(station =>
        searchResults.some(s => s.id === station.id)
      );
    }
    return stations;
  }, [searchQuery]);

  /**
   * お気に入り駅リスト
   */
  const favoriteStations = useMemo(() => {
    return storageState.favoriteStations.slice(0, 5); // 最大5件
  }, [storageState.favoriteStations]);

  /**
   * 駅選択処理
   */
  const handleStationPress = useCallback((station: Station) => {
    onStationSelect(station);
  }, [onStationSelect]);

  /**
   * 駅アイテムのレンダリング
   */
  const renderStationItem = useCallback(({ item }: { item: Station }) => {
    const isFavorite = storageState.favoriteStations.some(fav => fav.id === item.id);

    return (
      <TouchableOpacity
        style={styles.stationItem}
        onPress={() => handleStationPress(item)}
      >
        <View style={styles.stationInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.stationName}>{item.name}</Text>
            {isFavorite && (
              <Ionicons name="star" size={14} color="#FF9500" />
            )}
          </View>
          <Text style={styles.stationKana}>{item.nameKana}</Text>
          <Text style={styles.linesText}>
            {item.lines.map(line => line.name).join('・')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      </TouchableOpacity>
    );
  }, [storageState.favoriteStations, handleStationPress]);

  return (
    <View style={styles.container}>
      {/* タイトル */}
      <View style={styles.titleContainer}>
        <Ionicons name="time-outline" size={24} color="#007AFF" />
        <Text style={styles.title}>時刻表を見る駅を選択</Text>
      </View>

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="駅名を検索（例: 新宿、しぶや）"
          placeholderTextColor="#8E8E93"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* お気に入り駅（検索していない時のみ表示） */}
      {!searchQuery && favoriteStations.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>お気に入り</Text>
          {favoriteStations.map((station) => (
            <TouchableOpacity
              key={station.id}
              style={styles.favoriteItem}
              onPress={() => handleStationPress(station)}
            >
              <Ionicons name="star" size={16} color="#FF9500" />
              <Text style={styles.favoriteText}>{station.name}</Text>
              <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 駅一覧 */}
      <View style={styles.stationsSection}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? `検索結果 (${filteredStations.length}件)` : '全ての駅'}
        </Text>
        <FlatList
          data={filteredStations}
          renderItem={renderStationItem}
          keyExtractor={(item) => item.id}
          style={styles.stationsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  favoritesSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: 12,
  },
  favoriteText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  stationsSection: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingTop: 16,
  },
  stationsList: {
    flex: 1,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  stationInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  stationKana: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  linesText: {
    fontSize: 12,
    color: '#007AFF',
  },
});