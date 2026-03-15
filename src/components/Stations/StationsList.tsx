import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { stations } from '../../constants/stations';
import { useLocation } from '../../hooks/useLocation';
import { useStorage } from '../../hooks/useStorage';
import { useNotifications } from '../../hooks/useNotifications';
import { createDropoffTarget } from '../../hooks/useDropoffNotifier';
import { sendDropoffTargetToAndroid } from '../../services/androidBridgeService';
import { Station } from '../../types';
import {
  searchStations,
  getNearbyStations,
  getAllNextTrains,
} from '../../services/stationService';

import StationSearchBar from './StationSearchBar';
import StationFilters from './StationFilters';
import StationListItem from './StationListItem';

export interface StationsListProps {
  onStationSelect?: (station: Station) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showDistance?: boolean;
  showNextTrains?: boolean;
  initialSearchQuery?: string;
}

const StationsList = memo(function StationsList({
  onStationSelect,
  showSearch = true,
  showFilters = true,
  showDistance = true,
  showNextTrains = false,
  initialSearchQuery = '',
}: StationsListProps) {
  // 状態管理
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'line'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // カスタムフック
  const { state: locationState } = useLocation({
    watchPosition: true,
    maxDistance: 5000,
  });
  const { state: storageState, actions: storageActions } = useStorage();
  const { actions: notificationActions } = useNotifications();

  /**
   * 検索処理
   */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    // 検索履歴に追加
    if (query.trim()) {
      await storageActions.addSearch(query);
    }
  }, [storageActions]);

  /**
   * 検索履歴選択
   */
  const handleSelectHistory = useCallback((history: any) => {
    setSearchQuery(history.query);
  }, []);

  /**
   * 検索履歴クリア
   */
  const handleClearHistory = useCallback(async () => {
    await storageActions.clearSearches();
  }, [storageActions]);

  /**
   * 路線フィルタ切り替え
   */
  const handleToggleLine = useCallback((lineId: string) => {
    setSelectedLines(prev =>
      prev.includes(lineId)
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  }, []);

  /**
   * フィルタクリア
   */
  const handleClearFilters = useCallback(() => {
    setSelectedLines([]);
    setShowFavoritesOnly(false);
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  /**
   * 駅リストのフィルタリング・ソート
   */
  const filteredAndSortedStations = useMemo(() => {
    let result = [...stations];

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const searchResults = searchStations(searchQuery);
      result = result.filter(station =>
        searchResults.some(s => s.id === station.id)
      );
    }

    // 路線フィルタリング
    if (selectedLines.length > 0) {
      result = result.filter(station =>
        station.lines.some(line => selectedLines.includes(line.id))
      );
    }

    // お気に入りフィルタリング
    if (showFavoritesOnly) {
      result = result.filter(station =>
        storageState.favoriteStations.some(fav => fav.id === station.id)
      );
    }

    // 距離情報の追加（位置情報がある場合）
    if (locationState.currentLocation && showDistance) {
      const { latitude, longitude } = locationState.currentLocation.coords;
      const nearbyStations = getNearbyStations(latitude, longitude, 50000); // 50km以内

      result = result.map(station => {
        const nearbyInfo = nearbyStations.find(n => n.id === station.id);
        return nearbyInfo ? { ...station, distance: nearbyInfo.distance } : station;
      });
    }

    // ソート
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;

        case 'distance':
          const aDistance = (a as any).distance || Infinity;
          const bDistance = (b as any).distance || Infinity;
          comparison = aDistance - bDistance;
          break;

        case 'line':
          comparison = a.lines[0]?.name.localeCompare(b.lines[0]?.name, 'ja') || 0;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    searchQuery,
    selectedLines,
    showFavoritesOnly,
    sortBy,
    sortOrder,
    locationState.currentLocation,
    showDistance,
    storageState.favoriteStations,
  ]);

  /**
   * アクティブフィルタ数の計算
   */
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedLines.length > 0) count += selectedLines.length;
    if (showFavoritesOnly) count += 1;
    return count;
  }, [selectedLines.length, showFavoritesOnly]);

  /**
   * 駅選択処理
   */
  const handleStationPress = useCallback((station: Station) => {
    onStationSelect?.(station);
  }, [onStationSelect]);

  /**
   * お気に入り切り替え（簡潔版）
   */
  const handleToggleFavorite = useCallback(async (station: Station) => {
    try {
      return await storageActions.toggleFavorite(station);
    } catch (error) {
      console.error('[StationsList] お気に入り切り替えエラー:', error);
      Alert.alert('エラー', 'お気に入りの操作に失敗しました');
      return false;
    }
  }, [storageActions]);

  /**
   * 降車駅を設定
   */
  const handleSetDropoffStation = useCallback(async (station: Station) => {
    const dropoffTarget = createDropoffTarget(station);
    const success = await storageActions.setDropoffTarget(dropoffTarget);

    if (!success) {
      Alert.alert('エラー', '降車駅の設定に失敗しました');
      return false;
    }

    sendDropoffTargetToAndroid(dropoffTarget);
    Alert.alert('この駅で降りる', `${station.name}駅を降車駅に設定しました。到着3分前を目安に通知します。`);
    return true;
  }, [storageActions]);

  /**
   * 通知送信
   */
  const handleSendNotification = useCallback(async (station: Station) => {
    try {
      const nextTrains = getAllNextTrains(station.id);
      if (nextTrains.length > 0) {
        await notificationActions.sendTrainAlert(nextTrains[0]);
        Alert.alert('通知送信', `${station.name}駅の電車情報を通知しました`);
      } else {
        Alert.alert('情報なし', '次の電車情報が見つかりません');
      }
    } catch (error) {
      Alert.alert('エラー', '通知の送信に失敗しました');
    }
  }, [notificationActions]);

  /**
   * リフレッシュ処理
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // データを再読み込み
      await storageActions.loadAllData();
      // 位置情報を更新
      // locationActions.refreshLocation(); // 必要に応じて有効化
    } catch (error) {
      console.error('リフレッシュに失敗:', error);
    } finally {
      setRefreshing(false);
    }
  }, [storageActions]);

  /**
   * 駅アイテムのレンダリング
   */
  const renderStationItem = useCallback(({ item }: { item: Station }) => {
    const isFavorite = storageState.favoriteStations.some(fav => fav.id === item.id);
    const distance = (item as any).distance;

    return (
      <StationListItem
        station={item}
        isFavorite={isFavorite}
        isDropoffTarget={storageState.dropoffTarget?.station.id === item.id}
        isHomeStation={storageState.homeStation?.station.id === item.id}
        distance={distance}
        onPress={handleStationPress}
        onToggleFavorite={handleToggleFavorite}
        onSetDropoffStation={handleSetDropoffStation}
        onSendNotification={handleSendNotification}
        showDistance={showDistance && distance !== undefined}
        showNextTrains={showNextTrains}
      />
    );
  }, [
    storageState.favoriteStations,
    storageState.dropoffTarget,
    storageState.homeStation,
    handleStationPress,
    handleToggleFavorite,
    handleSetDropoffStation,
    handleSendNotification,
    showDistance,
    showNextTrains,
  ]);

  /**
   * 空リスト表示
   */
  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>駅が見つかりません</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? '検索条件を変更してください'
          : activeFiltersCount > 0
          ? 'フィルタ条件を変更してください'
          : '駅データの読み込み中です'
        }
      </Text>
    </View>
  ), [searchQuery, activeFiltersCount]);

  return (
    <View style={styles.container}>
      {/* 検索バー */}
      {showSearch && (
        <View style={styles.searchSection}>
          <StationSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSearch={handleSearch}
            searchHistory={storageState.searchHistory}
            onSelectHistory={handleSelectHistory}
            onClearHistory={handleClearHistory}
          />
        </View>
      )}

      {/* フィルタ */}
      {showFilters && (
        <StationFilters
          selectedLines={selectedLines}
          onToggleLine={handleToggleLine}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={() => setShowFavoritesOnly(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />
      )}

      {storageState.homeStation && (
        <View style={styles.homeStationBanner}>
          <Ionicons name="home" size={18} color="#007AFF" />
          <Text style={styles.homeStationBannerText}>
            <Text style={styles.homeStationBannerLabel}>ホーム駅: </Text>
            <Text style={styles.homeStationBannerName}>{storageState.homeStation.station.name}駅</Text>
          </Text>
        </View>
      )}

      {/* 結果件数 */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredAndSortedStations.length}件の駅
        </Text>
        {locationState.currentLocation && (
          <Text style={styles.locationInfo}>
            現在位置から検索中
          </Text>
        )}
      </View>

      {/* 駅リスト */}
      <FlatList
        data={filteredAndSortedStations}
        renderItem={renderStationItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // モバイル端末でのスクロール性能を向上
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyList}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
      />
    </View>
  );
});

export default StationsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    // モバイル端末での確実なスクロール動作を保証
    ...(Platform.OS === 'web' ? {
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    } : {}),
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  homeStationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  homeStationBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  homeStationBannerLabel: {
    fontWeight: '500',
    color: '#4B5563',
  },
  homeStationBannerName: {
    fontWeight: '700',
    color: '#007AFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  locationInfo: {
    fontSize: 12,
    color: '#8E8E93',
  },
  list: {
    flex: 1,
    // モバイル端末でのタッチスクロールを確実に有効化
    ...(Platform.OS === 'web' ? {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      // 最小高さを設定してスクロール可能領域を確保
      minHeight: '100%',
    } : {}),
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
