import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Alert, Text, Platform } from 'react-native';
import * as Location from 'expo-location';

// Web環境の判定
const IS_WEB = Platform.OS === 'web';

// Web環境ではreact-native-mapsを一切インポートしない
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let PROVIDER_GOOGLE: any = null;

// Web環境以外でのみ動的インポート
if (!IS_WEB) {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.log('react-native-maps is not available:', error);
  }
}

import { stations } from '../../constants/stations';
import { useLocation } from '../../hooks/useLocation';
import { useStorage } from '../../hooks/useStorage';
import { Station } from '../../types';
import MapControls from './MapControls';
import WebMapFallback from './WebMapFallback';

// Web環境以外でのみMap関連コンポーネントをインポート
let StationMarker: any = null;
let CurrentLocationMarker: any = null;

if (!IS_WEB) {
  try {
    StationMarker = require('./StationMarker').default;
    CurrentLocationMarker = require('./CurrentLocationMarker').default;
  } catch (error) {
    console.log('Map components are not available:', error);
  }
}

// 地図の初期設定
const INITIAL_REGION = {
  latitude: 35.6812,  // 東京駅を中心
  longitude: 139.7671,
  latitudeDelta: 0.1,  // 山手線全体が見える範囲
  longitudeDelta: 0.1,
};

// ジオフェンシング範囲（メートル）
const GEOFENCE_RADIUS = 500;

// パフォーマンス最適化設定
const PERFORMANCE_SETTINGS = {
  MAX_STATIONS_ZOOMED_OUT: 15,  // ズームアウト時の最大駅数
  MAX_STATIONS_ZOOMED_IN: 25,   // ズーム時の最大駅数
  ZOOM_THRESHOLD: 0.05,         // ズーム判定の閾値（latitudeDelta）
  FAVORITE_PRIORITY: true,      // お気に入り駅を優先表示
};

export interface MapViewProps {
  showGeofences?: boolean;
  showCurrentLocation?: boolean;
  onStationPress?: (station: Station) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
}

export default function TrainMapView({
  showGeofences = true,
  showCurrentLocation = true,
  onStationPress,
  onMapPress,
}: MapViewProps) {
  // 状態管理
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);
  const [isFollowingUser, setIsFollowingUser] = useState(false);

  // カスタムフック
  const { state: locationState, actions: locationActions } = useLocation({
    enableBackgroundTracking: false,
    watchPosition: true,
    maxDistance: 2000,
  });

  const { state: storageState } = useStorage();

  // Map参照
  const mapRef = useRef<MapView>(null);

  /**
   * 駅マーカーをタップした時の処理
   */
  const handleStationPress = useCallback((station: Station) => {
    setSelectedStationId(station.id);

    // 駅位置にズーム
    const region = {
      latitude: station.latitude,
      longitude: station.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    mapRef.current?.animateToRegion(region, 500);

    // 外部コールバック実行
    onStationPress?.(station);
  }, [onStationPress]);

  /**
   * パフォーマンス最適化：表示する駅をフィルタリング
   */
  const visibleStations = useMemo(() => {
    const isZoomedIn = mapRegion.latitudeDelta < PERFORMANCE_SETTINGS.ZOOM_THRESHOLD;
    const maxStations = isZoomedIn
      ? PERFORMANCE_SETTINGS.MAX_STATIONS_ZOOMED_IN
      : PERFORMANCE_SETTINGS.MAX_STATIONS_ZOOMED_OUT;

    // 駅の優先度計算（お気に入り > 現在位置からの近さ > 主要駅）
    const stationsWithPriority = stations.map(station => {
      let priority = 0;

      // お気に入り駅は最優先
      if (storageState.favoriteStations.some(fav => fav.id === station.id)) {
        priority += 1000;
      }

      // 選択中の駅は表示
      if (selectedStationId === station.id) {
        priority += 500;
      }

      // 現在位置からの距離（近いほど高い優先度）
      if (locationState.currentLocation) {
        const distance = Math.sqrt(
          Math.pow(station.latitude - locationState.currentLocation.coords.latitude, 2) +
          Math.pow(station.longitude - locationState.currentLocation.coords.longitude, 2)
        );
        priority += Math.max(0, 100 - distance * 1000); // 距離に基づくスコア
      }

      // 地図中心からの距離（表示領域内の駅を優先）
      const centerDistance = Math.sqrt(
        Math.pow(station.latitude - mapRegion.latitude, 2) +
        Math.pow(station.longitude - mapRegion.longitude, 2)
      );
      priority += Math.max(0, 50 - centerDistance * 500); // 表示領域スコア

      // 主要駅（山手線駅）にボーナス
      if (station.lines.some(line => line.id === 'jr-yamanote')) {
        priority += 20;
      }

      return { station, priority };
    });

    // 優先度順にソートして上位のみ返す
    return stationsWithPriority
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxStations)
      .map(item => item.station);
  }, [mapRegion, storageState.favoriteStations, locationState.currentLocation, selectedStationId]);

  /**
   * 現在位置に移動
   */
  const moveToCurrentLocation = useCallback(() => {
    if (!locationState.currentLocation) {
      Alert.alert('位置情報エラー', '現在位置を取得できません');
      return;
    }

    const { latitude, longitude } = locationState.currentLocation.coords;
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    mapRef.current?.animateToRegion(region, 500);
    setIsFollowingUser(true);
  }, [locationState.currentLocation]);

  /**
   * 全駅を表示する範囲に移動
   */
  const showAllStations = useCallback(() => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 1000);
    setSelectedStationId(null);
    setIsFollowingUser(false);
  }, []);

  /**
   * 最寄り駅に移動
   */
  const moveToNearestStation = useCallback(() => {
    if (locationState.closestStation) {
      const station = locationState.closestStation;
      handleStationPress(station);
    } else {
      Alert.alert('最寄り駅が見つかりません', '位置情報を有効にしてください');
    }
  }, [locationState.closestStation, handleStationPress]);

  /**
   * 地図領域変更時の処理
   */
  const handleRegionChange = useCallback((region: typeof INITIAL_REGION) => {
    setMapRegion(region);
    setIsFollowingUser(false);
  }, []);

  /**
   * お気に入り駅のフィルタリング
   */
  const favoriteStations = stations.filter(station =>
    storageState.favoriteStations.some(fav => fav.id === station.id)
  );

  /**
   * 現在位置が変更された時の自動フォロー
   */
  useEffect(() => {
    if (isFollowingUser && locationState.currentLocation) {
      const { latitude, longitude } = locationState.currentLocation.coords;
      const region = {
        latitude,
        longitude,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      };

      mapRef.current?.animateToRegion(region, 500);
    }
  }, [locationState.currentLocation, isFollowingUser, mapRegion]);

  // Web環境ではフォールバック表示
  if (Platform.OS === 'web' || !MapView) {
    return <WebMapFallback onStationPress={onStationPress} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={handleRegionChange}
        onPress={(event) => {
          const { coordinate } = event.nativeEvent;
          onMapPress?.(coordinate);
        }}
        showsUserLocation={false} // カスタムマーカーを使用
        showsMyLocationButton={false} // カスタムボタンを使用
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={true}
        mapType="standard"
      >
        {/* 表示対象駅のマーカー（パフォーマンス最適化） */}
        {visibleStations.map((station) => {
          const isFavorite = storageState.favoriteStations.some(fav => fav.id === station.id);
          const isSelected = selectedStationId === station.id;

          return (
            <StationMarker
              key={station.id}
              station={station}
              isFavorite={isFavorite}
              isSelected={isSelected}
              onPress={handleStationPress}
            />
          );
        })}

        {/* ジオフェンシング範囲の表示 */}
        {showGeofences && selectedStationId && (
          (() => {
            const selectedStation = stations.find(s => s.id === selectedStationId);
            if (!selectedStation) return null;

            return (
              <Circle
                center={{
                  latitude: selectedStation.latitude,
                  longitude: selectedStation.longitude,
                }}
                radius={GEOFENCE_RADIUS}
                fillColor="rgba(0, 122, 255, 0.1)"
                strokeColor="rgba(0, 122, 255, 0.5)"
                strokeWidth={2}
              />
            );
          })()
        )}

        {/* 現在位置マーカー */}
        {showCurrentLocation && locationState.currentLocation && (
          <CurrentLocationMarker
            coordinate={locationState.currentLocation.coords}
            accuracy={locationState.currentLocation.coords.accuracy}
          />
        )}
      </MapView>

      {/* 地図コントロール */}
      <MapControls
        onCurrentLocationPress={moveToCurrentLocation}
        onShowAllPress={showAllStations}
        onNearestStationPress={moveToNearestStation}
        hasCurrentLocation={!!locationState.currentLocation}
        hasNearestStation={!!locationState.closestStation}
        nearestStationName={locationState.closestStation?.name}
      />

      {/* 情報表示（パフォーマンス最適化情報付き） */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          表示: {visibleStations.length}/{stations.length}駅 | お気に入り: {storageState.favoriteStations.length}
        </Text>
        <Text style={styles.infoText}>
          ズーム: {mapRegion.latitudeDelta < PERFORMANCE_SETTINGS.ZOOM_THRESHOLD ? '詳細' : '広域'}
        </Text>
        {locationState.currentLocation && (
          <Text style={styles.infoText}>
            精度: ±{Math.round(locationState.currentLocation.coords.accuracy || 0)}m
          </Text>
        )}
        {locationState.closestStation && (
          <Text style={styles.infoText}>
            最寄り駅: {locationState.closestStation.name}
            ({Math.round(locationState.closestStation.distance)}m)
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
    fontWeight: '500',
  },
});