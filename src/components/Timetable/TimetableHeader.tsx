import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Station } from '../../types';

export interface TimetableHeaderProps {
  station: Station;
  selectedLine: string;
  onLineChange: (lineId: string) => void;
  onClearSelection: () => void;
}

export default function TimetableHeader({
  station,
  selectedLine,
  onLineChange,
  onClearSelection,
}: TimetableHeaderProps) {
  const [showLineSelector, setShowLineSelector] = useState(false);

  /**
   * デフォルト路線の設定（初回表示時）
   */
  useEffect(() => {
    if (!selectedLine && station.lines.length > 0) {
      onLineChange(station.lines[0].id);
    }
  }, [station.lines, selectedLine, onLineChange]);

  /**
   * 路線選択処理
   */
  const handleLineSelect = useCallback((lineId: string) => {
    onLineChange(lineId);
    setShowLineSelector(false);
  }, [onLineChange]);

  /**
   * 選択中の路線情報を取得
   */
  const getSelectedLineInfo = () => {
    return station.lines.find(line => line.id === selectedLine) || station.lines[0];
  };

  const selectedLineInfo = getSelectedLineInfo();

  return (
    <>
      <View style={styles.container}>
        {/* 駅名と戻るボタン */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClearSelection}
          >
            <Ionicons name="arrow-back" size={20} color="#007AFF" />
            <Text style={styles.backText}>駅選択</Text>
          </TouchableOpacity>

          <View style={styles.stationInfo}>
            <Text style={styles.stationName}>{station.name}</Text>
            <Text style={styles.stationKana}>{station.nameKana}</Text>
          </View>
        </View>

        {/* 路線選択 */}
        {station.lines.length > 1 ? (
          <TouchableOpacity
            style={styles.lineSelector}
            onPress={() => setShowLineSelector(true)}
          >
            <View style={styles.lineInfo}>
              <View
                style={[
                  styles.lineColorIndicator,
                  { backgroundColor: selectedLineInfo?.color || '#007AFF' },
                ]}
              />
              <Text style={styles.lineName}>
                {selectedLineInfo?.name || '路線を選択'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#8E8E93" />
          </TouchableOpacity>
        ) : (
          <View style={styles.singleLine}>
            <View
              style={[
                styles.lineColorIndicator,
                { backgroundColor: selectedLineInfo?.color || '#007AFF' },
              ]}
            />
            <Text style={styles.lineName}>
              {selectedLineInfo?.name}
            </Text>
          </View>
        )}
      </View>

      {/* 路線選択モーダル */}
      <Modal
        visible={showLineSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLineSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLineSelector(false)}
        >
          <View style={styles.lineModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>路線を選択</Text>
              <TouchableOpacity onPress={() => setShowLineSelector(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.linesList}>
              {station.lines.map((line) => {
                const isSelected = line.id === selectedLine;
                return (
                  <TouchableOpacity
                    key={line.id}
                    style={[
                      styles.lineOption,
                      isSelected && styles.selectedLineOption,
                    ]}
                    onPress={() => handleLineSelect(line.id)}
                  >
                    <View style={styles.lineOptionInfo}>
                      <View
                        style={[
                          styles.lineColorIndicator,
                          { backgroundColor: line.color },
                        ]}
                      />
                      <View style={styles.lineDetails}>
                        <Text style={[
                          styles.lineOptionName,
                          isSelected && styles.selectedLineText,
                        ]}>
                          {line.name}
                        </Text>
                        <Text style={styles.lineOperator}>
                          {line.operator}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  stationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  stationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stationKana: {
    fontSize: 14,
    color: '#8E8E93',
  },
  lineSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  singleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  lineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  lineColorIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lineModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  linesList: {
    maxHeight: 300,
  },
  lineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedLineOption: {
    backgroundColor: '#E3F2FD',
  },
  lineOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  lineDetails: {
    flex: 1,
  },
  lineOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  selectedLineText: {
    color: '#007AFF',
  },
  lineOperator: {
    fontSize: 14,
    color: '#8E8E93',
  },
});