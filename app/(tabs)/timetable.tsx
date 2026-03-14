import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import TimetableView from '../../src/components/Timetable/TimetableView';
import { Station } from '../../src/types';

export default function TimetableScreen() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  /**
   * 駅選択処理
   */
  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  /**
   * 駅選択クリア
   */
  const handleClearSelection = useCallback(() => {
    setSelectedStation(null);
  }, []);

  return (
    <View style={styles.container}>
      <TimetableView
        selectedStation={selectedStation}
        onStationSelect={handleStationSelect}
        onClearSelection={handleClearSelection}
      />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});