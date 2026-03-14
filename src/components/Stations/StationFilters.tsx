import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { lines } from '../../constants/stations';

export interface StationFiltersProps {
  selectedLines: string[];
  onToggleLine: (lineId: string) => void;
  sortBy: 'name' | 'distance' | 'line';
  onChangeSortBy: (sortBy: 'name' | 'distance' | 'line') => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export default function StationFilters({
  selectedLines,
  onToggleLine,
  sortBy,
  onChangeSortBy,
  sortOrder,
  onToggleSortOrder,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  activeFiltersCount,
  onClearFilters,
}: StationFiltersProps) {
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  /**
   * ソート方法のオプション
   */
  const sortOptions = [
    { key: 'name', label: '駅名順', icon: 'text' },
    { key: 'distance', label: '距離順', icon: 'locate' },
    { key: 'line', label: '路線順', icon: 'train' },
  ] as const;

  /**
   * フィルタボタンのスタイル
   */
  const getFilterButtonStyle = () => [
    styles.filterButton,
    activeFiltersCount > 0 && styles.activeFilterButton,
  ];

  const getFilterButtonTextStyle = () => [
    styles.filterButtonText,
    activeFiltersCount > 0 && styles.activeFilterButtonText,
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {/* お気に入りフィルタ */}
        <TouchableOpacity
          style={[
            styles.quickFilterButton,
            showFavoritesOnly && styles.activeQuickFilter,
          ]}
          onPress={onToggleFavoritesOnly}
        >
          <Ionicons
            name={showFavoritesOnly ? 'star' : 'star-outline'}
            size={16}
            color={showFavoritesOnly ? '#FF9500' : '#8E8E93'}
          />
          <Text
            style={[
              styles.quickFilterText,
              showFavoritesOnly && styles.activeQuickFilterText,
            ]}
          >
            お気に入り
          </Text>
        </TouchableOpacity>

        {/* ソート順切り替え */}
        <TouchableOpacity
          style={styles.quickFilterButton}
          onPress={onToggleSortOrder}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={16}
            color="#007AFF"
          />
          <Text style={styles.quickFilterText}>
            {sortOrder === 'asc' ? '昇順' : '降順'}
          </Text>
        </TouchableOpacity>

        {/* ソート方法 */}
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.quickFilterButton,
              sortBy === option.key && styles.activeQuickFilter,
            ]}
            onPress={() => onChangeSortBy(option.key)}
          >
            <Ionicons
              name={option.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={sortBy === option.key ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.quickFilterText,
                sortBy === option.key && styles.activeQuickFilterText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* 詳細フィルタボタン */}
        <TouchableOpacity
          style={getFilterButtonStyle()}
          onPress={() => setShowFiltersModal(true)}
        >
          <Ionicons name="options" size={16} color="#007AFF" />
          <Text style={getFilterButtonTextStyle()}>
            フィルタ {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Text>
        </TouchableOpacity>

        {/* フィルタクリアボタン */}
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearFilters}
          >
            <Ionicons name="close-circle" size={16} color="#FF3B30" />
            <Text style={styles.clearButtonText}>クリア</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 詳細フィルタモーダル */}
      <Modal
        visible={showFiltersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            {/* ヘッダー */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.modalCloseText}>閉じる</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>フィルタ設定</Text>
              <TouchableOpacity onPress={onClearFilters}>
                <Text style={styles.modalClearText}>リセット</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* 路線フィルタ */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>路線で絞り込み</Text>
                <Text style={styles.sectionSubtitle}>
                  複数選択可能（選択なしは全路線表示）
                </Text>

                {lines.map((line) => {
                  const isSelected = selectedLines.includes(line.id);
                  return (
                    <TouchableOpacity
                      key={line.id}
                      style={styles.lineOption}
                      onPress={() => onToggleLine(line.id)}
                    >
                      <View style={styles.lineInfo}>
                        <View
                          style={[
                            styles.lineColorIndicator,
                            { backgroundColor: line.color },
                          ]}
                        />
                        <Text style={styles.lineNameText}>
                          {line.name}
                        </Text>
                        <Text style={styles.lineOperatorText}>
                          {line.operator}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'checkbox-outline'}
                        size={24}
                        color={isSelected ? '#007AFF' : '#8E8E93'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  activeQuickFilter: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeQuickFilterText: {
    color: '#007AFF',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  activeFilterButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  activeFilterButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClearText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  lineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  lineInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineColorIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  lineNameText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  lineOperatorText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
});