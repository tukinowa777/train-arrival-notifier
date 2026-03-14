import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { stations } from '../../constants/stations';
import { useLocation } from '../../hooks/useLocation';
import { Station } from '../../types';
import { searchStations, getNearbyStations } from '../../services/stationService';

export interface WebMapFallbackProps {
  onStationPress?: (station: Station) => void;
}

const WebMapFallback = memo(function WebMapFallback({ onStationPress }: WebMapFallbackProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nearby' | 'favorites'>('all');

  // お気に入り駅のIDを管理（シンプルにSet型で管理）
  const [favoriteStationIds, setFavoriteStationIds] = useState<Set<string>>(new Set());
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);

  // カスタムフック
  const { state: locationState } = useLocation();

  /**
   * ローカルストレージからお気に入り駅を読み込み
   */
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favoritesData = localStorage.getItem('favoriteStations');
        if (favoritesData) {
          const favorites: Station[] = JSON.parse(favoritesData);
          setFavoriteStations(favorites);
          setFavoriteStationIds(new Set(favorites.map(station => station.id)));
          console.log('[WebMapFallback] お気に入り読み込み:', favorites.length, '駅');
        }
      } catch (error) {
        console.error('[WebMapFallback] お気に入り読み込みエラー:', error);
      }
    };

    loadFavorites();
  }, []);

  /**
   * ローカルストレージにお気に入り駅を保存
   */
  const saveFavoritesToStorage = useCallback((favorites: Station[]) => {
    try {
      localStorage.setItem('favoriteStations', JSON.stringify(favorites));
      console.log('[WebMapFallback] お気に入り保存:', favorites.length, '駅');
    } catch (error) {
      console.error('[WebMapFallback] お気に入り保存エラー:', error);
    }
  }, []);

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
        baseStations = favoriteStations;
        break;

      default:
        baseStations = stations;
        break;
    }

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const searchResults = searchStations(searchQuery);
      baseStations = baseStations.filter(station =>
        searchResults.some(result => result.id === station.id)
      );
    }

    return baseStations;
  }, [searchQuery, selectedCategory, locationState.currentLocation, favoriteStations]);

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
   * お気に入り切り替え処理（簡潔版）
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
      console.log('[WebMapFallback] ===== お気に入り切り替え開始 =====');
      console.log('[WebMapFallback] 駅:', station.name, 'ID:', station.id);

      const isCurrentlyFavorite = favoriteStationIds.has(station.id);
      console.log('[WebMapFallback] 現在の状態:', isCurrentlyFavorite ? 'お気に入り' : '未登録');

      let newFavoriteStations: Station[];
      let newFavoriteStationIds: Set<string>;

      if (isCurrentlyFavorite) {
        // お気に入りから削除
        newFavoriteStations = favoriteStations.filter(fav => fav.id !== station.id);
        newFavoriteStationIds = new Set([...favoriteStationIds]);
        newFavoriteStationIds.delete(station.id);
        console.log('[WebMapFallback] → お気に入りから削除');
      } else {
        // お気に入りに追加
        newFavoriteStations = [...favoriteStations, station];
        newFavoriteStationIds = new Set([...favoriteStationIds, station.id]);
        console.log('[WebMapFallback] → お気に入りに追加');
      }

      // 状態を即座に更新
      setFavoriteStations(newFavoriteStations);
      setFavoriteStationIds(newFavoriteStationIds);

      // ローカルストレージに保存
      saveFavoritesToStorage(newFavoriteStations);

      console.log('[WebMapFallback] 更新後のお気に入り数:', newFavoriteStations.length, '駅');
      console.log('[WebMapFallback] ===== お気に入り切り替え完了 =====');

    } catch (error) {
      console.error('[WebMapFallback] お気に入り切り替えエラー:', error);
    }
  }, [favoriteStationIds, favoriteStations, saveFavoritesToStorage]);

  /**
   * 駅情報の表示（メモ化）
   */
  const renderStationInfo = useCallback((station: Station, index: number) => {
    const isFavorite = favoriteStationIds.has(station.id);
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
                name={isFavorite ? "star" : "star-outline"}
                size={18}
                color={isFavorite ? "#FF9500" : "#8E8E93"}
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
      >
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
              お気に入り ({favoriteStations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 駅リスト */}
        <View style={styles.stationListContainer}>
          {displayStations.length > 0 ? (
            displayStations.map(renderStationInfo)
          ) : (
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
          )}
        </View>

        {/* 統計情報 */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            表示中: {displayStations.length}駅 |
            お気に入り: {favoriteStations.length}駅 |
            位置情報: {locationState.currentLocation ? '✅' : '❌'} |
            最寄り駅: {locationState.nearbyStations.length}駅
          </Text>
        </View>
      </ScrollView>
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
    marginBottom: 16,
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
    paddingBottom: 16,
  },
  stationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
