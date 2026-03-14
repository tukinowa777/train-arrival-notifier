import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { Station } from '../../types';

export interface StationMarkerProps {
  station: Station;
  isFavorite: boolean;
  isSelected: boolean;
  onPress: (station: Station) => void;
}

const StationMarker = memo(function StationMarker({
  station,
  isFavorite,
  isSelected,
  onPress,
}: StationMarkerProps) {
  /**
   * 駅の種類によってマーカーの色を決定（メモ化）
   */
  const markerColor = useMemo(() => {
    if (isSelected) return '#FF3B30'; // 赤：選択中
    if (isFavorite) return '#FF9500'; // オレンジ：お気に入り
    return '#007AFF'; // 青：通常
  }, [isSelected, isFavorite]);

  /**
   * 駅のアイコンを決定（メモ化）
   */
  const markerIcon = useMemo((): keyof typeof Ionicons.glyphMap => {
    if (isSelected) return 'location';
    if (isFavorite) return 'star';
    return 'train';
  }, [isSelected, isFavorite]);

  /**
   * 路線情報の表示用文字列を作成（メモ化）
   */
  const lineNames = useMemo(() => {
    return station.lines.map(line => line.name).join('・');
  }, [station.lines]);

  /**
   * マーカーサイズを決定（メモ化）
   */
  const markerSize = useMemo(() => {
    if (isSelected) return 32;
    if (isFavorite) return 28;
    return 24;
  }, [isSelected, isFavorite]);

  /**
   * マーカープレスハンドラー（メモ化）
   */
  const handlePress = useCallback(() => {
    onPress(station);
  }, [onPress, station]);

  return (
    <Marker
      coordinate={{
        latitude: station.latitude,
        longitude: station.longitude,
      }}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
    >
      {/* カスタムマーカー */}
      <View style={[
        styles.markerContainer,
        { backgroundColor: markerColor },
        isSelected && styles.selectedMarker,
      ]}>
        <Ionicons
          name={markerIcon}
          size={markerSize * 0.6}
          color="white"
        />
      </View>

      {/* 選択中の駅には駅名ラベルを表示 */}
      {isSelected && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{station.name}</Text>
        </View>
      )}

      {/* タップ時の詳細情報 */}
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{station.name}</Text>
          <Text style={styles.calloutSubtitle}>{station.nameKana}</Text>

          <View style={styles.linesContainer}>
            <Text style={styles.calloutLines}>{lineNames}</Text>
          </View>

          <View style={styles.statusContainer}>
            {isFavorite && (
              <View style={styles.statusBadge}>
                <Ionicons name="star" size={12} color="#FF9500" />
                <Text style={styles.statusText}>お気に入り</Text>
              </View>
            )}

            {station.lines.length > 1 && (
              <View style={styles.statusBadge}>
                <Ionicons name="swap-horizontal" size={12} color="#34C759" />
                <Text style={styles.statusText}>乗換駅</Text>
              </View>
            )}
          </View>

          <Text style={styles.calloutFooter}>
            タップして時刻表を表示
          </Text>
        </View>
      </Callout>
    </Marker>
  );
});

export default StationMarker;

const styles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  selectedMarker: {
    borderColor: '#FFD60A',
    borderWidth: 4,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  labelContainer: {
    position: 'absolute',
    top: 35,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  labelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  linesContainer: {
    marginBottom: 12,
  },
  calloutLines: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  calloutFooter: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});