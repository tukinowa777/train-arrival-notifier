import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { stations } from '../../constants/stations';
import { useLocation } from '../../hooks/useLocation';
import { useStorage } from '../../hooks/useStorage';
import { Station } from '../../types';
import { searchStations, getNearbyStations } from '../../services/stationService';

export interface WebMapFallbackProps {
  onStationPress?: (station: Station) => void;
}

const WebMapFallback = memo(function WebMapFallback({ onStationPress }: WebMapFallbackProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nearby' | 'favorites'>('all');

  // カスタムフック
  const { state: locationState } = useLocation({
    watchPosition: false,
    updateInterval: 60000,
  });
  const { state: storageState, actions: storageActions } = useStorage();
  const favoriteCount = storageState.favoriteStations.length;
  const favoriteStationIds = useMemo(
    () => new Set(storageState.favoriteStations.map((station) => station.id)),
    [storageState.favoriteStations]
  );

  /**
   * 表示する駅のリストを取得（メモ化）
   */
  const displayStations = useMemo((): Station[] => {
    let baseStations: Station[] = [];

    // カテゴリ別フィルタリング
    switch (selectedCategory) {
      case 'nearby':
        if (locationState.currentLocation) {
          const { latitude, longitude } = locationState.currentLocation.coords;
          const nearbyWithDistance = getNearbyStations(latitude, longitude, 2000);
          baseStations = nearbyWithDistance.slice(0, 10); // 最大10駅
        } else {
          baseStations = [];
        }
        break;

      case 'favorites':
        baseStations = storageState.favoriteStations;
        break;

      default:
        baseStations = stations;
        break;
    }

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const searchResults = searchStations(searchQuery);
      const searchResultIds = new Set(searchResults.map((station) => station.id));
      baseStations = baseStations.filter(station =>
        searchResultIds.has(station.id)
      );
    }

    return baseStations;
  }, [searchQuery, selectedCategory, locationState.currentLocation, storageState.favoriteStations]);

  /**
   * カテゴリボタンのスタイル（メモ化）
   */
  const getCategoryButtonStyle = useCallback((category: string) => [
    styles.categoryButton,
    selectedCategory === category && styles.selectedCategoryButton,
  ], [selectedCategory]);

  const getCategoryTextStyle = useCallback((category: string) => [
    styles.categoryButtonText,
    selectedCategory === category && styles.selectedCategoryButtonText,
  ], [selectedCategory]);

  /**
   * お気に入り切り替え処理
   */
  const handleToggleFavorite = useCallback(async (station: Station, event: any) => {
    // イベント伝播を止める（駅選択を発生させない）
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    try {
      await storageActions.toggleFavorite(station);
    } catch (error) {
      console.error('[WebMapFallback] お気に入り切り替えエラー:', error);
    }
  }, [storageActions]);

  /**
   * 駅情報の表示（メモ化）
   */
  const renderStationInfo = useCallback((station: Station, index: number) => {
    const isStationFavorite = favoriteStationIds.has(station.id);
    const distance = 'distance' in station ? (station as any).distance : null;

    return (
      <TouchableOpacity
        key={station.id}
        style={styles.stationItem}
        onPress={() => onStationPress?.(station)}
      >
        <View style={styles.stationHeader}>
          <View style={styles.stationInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationKana}>{station.nameKana}</Text>
          </View>

          <View style={styles.stationMeta}>
            {/* お気に入りボタン */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(event) => handleToggleFavorite(station, event)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={isStationFavorite ? "star" : "star-outline"}
                size={18}
                color={isStationFavorite ? "#FF9500" : "#8E8E93"}
              />
            </TouchableOpacity>

            {distance !== null && (
              <Text style={styles.distanceText}>
                {Math.round(distance)}m
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.stationLines}>
          {station.lines.map(line => line.name).join('・')}
        </Text>

        <View style={styles.stationFooter}>
          <Text style={styles.coordinateText}>
            {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  }, [favoriteStationIds, onStationPress, handleToggleFavorite]);

  const renderStationItem = useCallback(({ item, index }: { item: Station; index: number }) => {
    return renderStationInfo(item, index);
  }, [renderStationInfo]);

  const renderListHeader = useMemo(() => (
    <>
      {/* Web環境説明 */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="map-outline" size={24} color="#007AFF" />
          <Text style={styles.title}>駅一覧（Web版）</Text>
        </View>
        <Text style={styles.subtitle}>
          Web環境では地図の代わりに駅リストを表示しています
        </Text>
      </View>

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="駅名を検索（例: 新宿、しぶや）"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* カテゴリボタン */}
      <View style={styles.categoryContainer}>
        <TouchableOpacity
          style={getCategoryButtonStyle('all')}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={getCategoryTextStyle('all')}>
            全駅 ({stations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={getCategoryButtonStyle('nearby')}
          onPress={() => setSelectedCategory('nearby')}
        >
          <Text style={getCategoryTextStyle('nearby')}>
            最寄り駅 {locationState.nearbyStations.length > 0 && `(${locationState.nearbyStations.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={getCategoryButtonStyle('favorites')}
          onPress={() => setSelectedCategory('favorites')}
        >
          <Text style={getCategoryTextStyle('favorites')}>
            お気に入り ({favoriteCount})
          </Text>
        </TouchableOpacity>
      </View>
    </>
  ), [
    favoriteCount,
    getCategoryButtonStyle,
    getCategoryTextStyle,
    locationState.nearbyStations.length,
    searchQuery,
  ]);

  const renderListFooter = useMemo(() => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsText}>
        表示中: {displayStations.length}駅 |
        お気に入り: {favoriteCount}駅 |
        位置情報: {locationState.currentLocation ? '✅' : '❌'} |
        最寄り駅: {locationState.nearbyStations.length}駅
      </Text>
    </View>
  ), [displayStations.length, favoriteCount, locationState.currentLocation, locationState.nearbyStations.length]);

  return (
    <View style={styles.container}>
      <FlatList
        data={displayStations}
        renderItem={renderStationItem}
        keyExtractor={(item) => item.id}
        style={styles.mainScrollView}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={
          <View style={styles.stationListContainer}>
            <View style={styles.emptyContainer}>
              <Ionicons name="train-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>駅が見つかりません</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory === 'nearby' && !locationState.currentLocation
                  ? '位置情報を有効にしてください'
                  : selectedCategory === 'favorites'
                  ? 'お気に入り駅を追加してください'
                  : '検索条件を変更してください'
                }
              </Text>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={6}
      />
    </View>
  );
});

export default WebMapFallback;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  mainScrollView: {
    flex: 1,
    // モバイル端末でのタッチスクロールを確実に有効化
    ...(Platform.OS === 'web' ? {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
    } : {}),
  },
  listContent: {
    paddingBottom: 16,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  stationListContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#EEF3FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    gap: 12,
  },
  stationItem: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#AFC6F5',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 7,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  stationKana: {
    fontSize: 14,
    color: '#666',
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    padding: 4,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  stationLines: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  stationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinateText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
