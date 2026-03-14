import { useState, useCallback, useEffect } from 'react';
import { Station } from '../types';

const STORAGE_KEY = 'train_notifier_favorites';

/**
 * シンプルで確実なお気に入り駅管理フック
 */
export function useFavoriteStations() {
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);
  const [favoriteStationIds, setFavoriteStationIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  /**
   * ローカルストレージから読み込み
   */
  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const favorites: Station[] = JSON.parse(data);
        console.log('[useFavoriteStations] 読み込み:', favorites.length, '駅');
        setFavoriteStations(favorites);
        setFavoriteStationIds(new Set(favorites.map(station => station.id)));
      } else {
        console.log('[useFavoriteStations] 初期化: お気に入りなし');
        setFavoriteStations([]);
        setFavoriteStationIds(new Set());
      }
    } catch (error) {
      console.error('[useFavoriteStations] 読み込みエラー:', error);
      setFavoriteStations([]);
      setFavoriteStationIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ローカルストレージに保存
   */
  const saveFavorites = useCallback(async (favorites: Station[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      console.log('[useFavoriteStations] 保存:', favorites.length, '駅');
    } catch (error) {
      console.error('[useFavoriteStations] 保存エラー:', error);
    }
  }, []);

  /**
   * お気に入りに追加
   */
  const addFavorite = useCallback(async (station: Station) => {
    console.log('[useFavoriteStations] 追加:', station.name);

    setFavoriteStations(prev => {
      if (prev.some(fav => fav.id === station.id)) {
        console.log('[useFavoriteStations] 既に存在するためスキップ');
        return prev;
      }
      const newFavorites = [...prev, station];
      saveFavorites(newFavorites);
      return newFavorites;
    });

    setFavoriteStationIds(prev => new Set([...prev, station.id]));
  }, [saveFavorites]);

  /**
   * お気に入りから削除
   */
  const removeFavorite = useCallback(async (stationId: string) => {
    console.log('[useFavoriteStations] 削除:', stationId);

    setFavoriteStations(prev => {
      const newFavorites = prev.filter(fav => fav.id !== stationId);
      saveFavorites(newFavorites);
      return newFavorites;
    });

    setFavoriteStationIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(stationId);
      return newSet;
    });
  }, [saveFavorites]);

  /**
   * お気に入り切り替え
   */
  const toggleFavorite = useCallback(async (station: Station) => {
    console.log('[useFavoriteStations] ===== 切り替え開始 =====');
    console.log('[useFavoriteStations] 駅:', station.name, 'ID:', station.id);

    const isFavorite = favoriteStationIds.has(station.id);
    console.log('[useFavoriteStations] 現在の状態:', isFavorite ? 'お気に入り' : '未登録');

    if (isFavorite) {
      console.log('[useFavoriteStations] → 削除実行');
      await removeFavorite(station.id);
    } else {
      console.log('[useFavoriteStations] → 追加実行');
      await addFavorite(station);
    }

    console.log('[useFavoriteStations] ===== 切り替え完了 =====');
    return true;
  }, [favoriteStationIds, addFavorite, removeFavorite]);

  /**
   * お気に入りかどうかチェック
   */
  const isFavorite = useCallback((stationId: string) => {
    return favoriteStationIds.has(stationId);
  }, [favoriteStationIds]);

  // 初期化
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    // 状態
    favoriteStations,
    favoriteStationIds,
    isLoading,

    // アクション
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    loadFavorites,

    // 統計
    count: favoriteStations.length,
  };
}
