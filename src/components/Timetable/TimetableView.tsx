import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import TimetableHeader from './TimetableHeader';
import TimetableGrid from './TimetableGrid';
import TimetableControls from './TimetableControls';
import TimetableStationSelector from './TimetableStationSelector';
import { Station } from '../../types';

export interface TimetableViewProps {
  selectedStation: Station | null;
  onStationSelect: (station: Station) => void;
  onClearSelection: () => void;
}

export type DayType = 'weekday' | 'saturday' | 'holiday';
export type Direction = 'inbound' | 'outbound';

export default function TimetableView({
  selectedStation,
  onStationSelect,
  onClearSelection,
}: TimetableViewProps) {
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [dayType, setDayType] = useState<DayType>('weekday');
  const [direction, setDirection] = useState<Direction>('inbound');

  /**
   * 路線変更処理
   */
  const handleLineChange = useCallback((lineId: string) => {
    setSelectedLine(lineId);
  }, []);

  /**
   * 運行タイプ変更処理
   */
  const handleDayTypeChange = useCallback((type: DayType) => {
    setDayType(type);
  }, []);

  /**
   * 方向変更処理
   */
  const handleDirectionChange = useCallback((dir: Direction) => {
    setDirection(dir);
  }, []);

  // 駅が選択されていない場合は駅選択画面を表示
  if (!selectedStation) {
    return (
      <TimetableStationSelector onStationSelect={onStationSelect} />
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー：駅名と路線選択 */}
      <TimetableHeader
        station={selectedStation}
        selectedLine={selectedLine}
        onLineChange={handleLineChange}
        onClearSelection={onClearSelection}
      />

      {/* コントロール：運行タイプと方向切り替え */}
      <TimetableControls
        dayType={dayType}
        direction={direction}
        selectedLine={selectedLine}
        onDayTypeChange={handleDayTypeChange}
        onDirectionChange={handleDirectionChange}
      />

      {/* 時刻表グリッド */}
      <TimetableGrid
        station={selectedStation}
        lineId={selectedLine}
        dayType={dayType}
        direction={direction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});