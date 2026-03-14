import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SearchHistory } from '../../services/storageService';

export interface StationSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  searchHistory: SearchHistory[];
  onSelectHistory: (history: SearchHistory) => void;
  onClearHistory: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function StationSearchBar({
  value,
  onChangeText,
  onSearch,
  searchHistory,
  onSelectHistory,
  onClearHistory,
  placeholder = '駅名を検索（例: 新宿、しぶや）',
  autoFocus = false,
}: StationSearchBarProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  /**
   * 検索実行
   */
  const handleSearch = useCallback(() => {
    if (value.trim()) {
      onSearch(value.trim());
      setShowHistory(false);
    }
  }, [value, onSearch]);

  /**
   * 履歴選択
   */
  const handleSelectHistory = useCallback((history: SearchHistory) => {
    onSelectHistory(history);
    setShowHistory(false);
  }, [onSelectHistory]);

  /**
   * フォーカス処理
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  }, [searchHistory.length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // 少し遅延させてタップを処理できるように
    setTimeout(() => setShowHistory(false), 150);
  }, []);

  /**
   * クリアボタン
   */
  const handleClear = useCallback(() => {
    onChangeText('');
    setShowHistory(false);
  }, [onChangeText]);

  /**
   * 検索履歴アイテムのレンダリング
   */
  const renderHistoryItem = useCallback(({ item }: { item: SearchHistory }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleSelectHistory(item)}
    >
      <Ionicons name="time-outline" size={16} color="#8E8E93" />
      <View style={styles.historyContent}>
        <Text style={styles.historyQuery}>{item.query}</Text>
        <Text style={styles.historyTime}>
          {new Date(item.timestamp).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
    </TouchableOpacity>
  ), [handleSelectHistory]);

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.focusedContainer,
      ]}>
        {/* 検索アイコン */}
        <Ionicons name="search" size={20} color="#8E8E93" />

        {/* 検索入力 */}
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSearch}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never" // カスタムクリアボタンを使用
        />

        {/* クリアボタン */}
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}

        {/* 履歴ボタン */}
        {searchHistory.length > 0 && !isFocused && (
          <TouchableOpacity
            onPress={() => setShowHistory(true)}
            style={styles.historyButton}
          >
            <Ionicons name="time" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* 検索履歴モーダル */}
      <Modal
        visible={showHistory}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHistory(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHistory(false)}
        >
          <View style={styles.historyModal}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>最近の検索</Text>
              <TouchableOpacity onPress={onClearHistory}>
                <Text style={styles.clearHistoryText}>すべてクリア</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchHistory.slice(0, 10)} // 最新10件
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.timestamp}
              showsVerticalScrollIndicator={false}
              style={styles.historyList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  focusedContainer: {
    backgroundColor: 'white',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 2,
  },
  historyButton: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  historyModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearHistoryText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyQuery: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
});