import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MapControlsProps {
  onCurrentLocationPress: () => void;
  onShowAllPress: () => void;
  onNearestStationPress: () => void;
  hasCurrentLocation: boolean;
  hasNearestStation: boolean;
  nearestStationName?: string;
}

export default function MapControls({
  onCurrentLocationPress,
  onShowAllPress,
  onNearestStationPress,
  hasCurrentLocation,
  hasNearestStation,
  nearestStationName,
}: MapControlsProps) {

  return (
    <View style={styles.container}>
      {/* 現在位置ボタン */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          !hasCurrentLocation && styles.disabledButton,
        ]}
        onPress={onCurrentLocationPress}
        disabled={!hasCurrentLocation}
      >
        <Ionicons
          name="locate"
          size={24}
          color={hasCurrentLocation ? '#007AFF' : '#8E8E93'}
        />
      </TouchableOpacity>

      {/* 全駅表示ボタン */}
      <TouchableOpacity
        style={styles.controlButton}
        onPress={onShowAllPress}
      >
        <Ionicons
          name="train"
          size={24}
          color="#007AFF"
        />
      </TouchableOpacity>

      {/* 最寄り駅ボタン */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          styles.nearestStationButton,
          !hasNearestStation && styles.disabledButton,
        ]}
        onPress={onNearestStationPress}
        disabled={!hasNearestStation}
      >
        <View style={styles.nearestStationContent}>
          <Ionicons
            name="location-outline"
            size={20}
            color={hasNearestStation ? '#FF9500' : '#8E8E93'}
          />
          {nearestStationName && (
            <Text
              style={[
                styles.nearestStationText,
                !hasNearestStation && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {nearestStationName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* 位置情報状態インジケーター */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          {
            backgroundColor: hasCurrentLocation
              ? hasNearestStation
                ? '#34C759'  // 緑：位置情報取得済み & 最寄り駅あり
                : '#FF9500'  // オレンジ：位置情報取得済み & 最寄り駅なし
              : '#FF3B30'    // 赤：位置情報なし
          }
        ]} />
        <Text style={styles.statusText}>
          {hasCurrentLocation
            ? hasNearestStation
              ? 'GPS取得済み'
              : '位置取得済み'
            : '位置情報なし'
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'flex-end',
    gap: 12,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  nearestStationButton: {
    width: 'auto',
    minWidth: 50,
    maxWidth: 120,
    height: 50,
    paddingHorizontal: 12,
  },
  nearestStationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearestStationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    maxWidth: 60,
  },
  disabledText: {
    color: '#8E8E93',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
});