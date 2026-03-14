import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import StationsList from '../../src/components/Stations/StationsList';
import { Station } from '../../src/types';
import StationDetailModal from '../../src/components/Stations/StationDetailModal';

export default function StationsScreen() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showStationDetail, setShowStationDetail] = useState(false);

  /**
   * 駅選択時の処理
   */
  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
    setShowStationDetail(true);
  }, []);

  /**
   * 駅詳細モーダルを閉じる
   */
  const handleCloseStationDetail = useCallback(() => {
    setShowStationDetail(false);
    setSelectedStation(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* 駅一覧 */}
      <StationsList
        onStationSelect={handleStationSelect}
        showSearch={true}
        showFilters={true}
        showDistance={true}
        showNextTrains={false}
      />

      {/* 駅詳細モーダル */}
      {selectedStation && (
        <StationDetailModal
          visible={showStationDetail}
          station={selectedStation}
          onClose={handleCloseStationDetail}
        />
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
});
