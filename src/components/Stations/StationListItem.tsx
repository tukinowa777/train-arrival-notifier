import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Station, NextTrainInfo } from '../../types';
import { getAllNextTrains } from '../../services/stationService';

export interface StationListItemProps {
  station: Station;
  isFavorite: boolean;
  isDropoffTarget?: boolean;
  isHomeStation?: boolean;
  distance?: number;
  onPress: (station: Station) => void;
  onToggleFavorite: (station: Station) => Promise<boolean | void>;
  onSetDropoffStation?: (station: Station) => Promise<boolean | void>;
  onSendNotification: (station: Station) => Promise<void>;
  showDistance?: boolean;
  showNextTrains?: boolean;
}

const StationListItem = memo(function StationListItem({
  station,
  isFavorite,
  isDropoffTarget = false,
  isHomeStation = false,
  distance,
  onPress,
  onToggleFavorite,
  onSetDropoffStation,
  onSendNotification,
  showDistance = false,
  showNextTrains = false,
}: StationListItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [nextTrains, setNextTrains] = useState<NextTrainInfo[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(false);

  /**
   * 駅タップ時の処理
   */
  const handlePress = useCallback(() => {
    onPress(station);
  }, [station, onPress]);

  /**
   * アクションメニューを開く
   */
  const handleOpenActions = useCallback(async () => {
    setShowActions(true);

    // 次の電車情報を取得
    if (showNextTrains && nextTrains.length === 0) {
      setLoadingTrains(true);
      try {
        const trains = getAllNextTrains(station.id);
        setNextTrains(trains.slice(0, 3)); // 最大3本表示
      } catch (error) {
        console.error('次の電車情報の取得に失敗:', error);
      } finally {
        setLoadingTrains(false);
      }
    }
  }, [station.id, showNextTrains, nextTrains.length]);

  /**
   * 降車駅を設定
   */
  const handleSetDropoff = useCallback(async () => {
    try {
      await onSetDropoffStation?.(station);
      setShowActions(false);
    } catch (error) {
      Alert.alert('エラー', '降車駅の設定に失敗しました');
    }
  }, [onSetDropoffStation, station]);

  /**
   * 通知送信
   */
  const handleSendNotification = useCallback(async () => {
    try {
      await onSendNotification(station);
      setShowActions(false);
    } catch (error) {
      Alert.alert('エラー', '通知の送信に失敗しました');
    }
  }, [station, onSendNotification]);

  /**
   * 距離表示フォーマット
   */
  const formatDistance = (dist: number) => {
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    } else {
      return `${(dist / 1000).toFixed(1)}km`;
    }
  };

  /**
   * 路線色インジケーター
   */
  const renderLineIndicators = () => (
    <View style={styles.lineIndicators}>
      {station.lines.slice(0, 3).map((line) => (
        <View
          key={line.id}
          style={[
            styles.lineIndicator,
            { backgroundColor: line.color },
          ]}
        />
      ))}
      {station.lines.length > 3 && (
        <Text style={styles.moreLines}>+{station.lines.length - 3}</Text>
      )}
    </View>
  );

  return (
    <>
      {/* 駅アイテム */}
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {/* 左側：駅情報 */}
          <View style={styles.stationInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.stationName}>{station.name}</Text>
              {isFavorite && (
                <Ionicons name="star" size={16} color="#FF9500" />
              )}
              {isHomeStation && (
                <Ionicons name="home" size={16} color="#007AFF" />
              )}
            </View>

            <Text style={styles.stationKana}>{station.nameKana}</Text>

            <View style={styles.metaContainer}>
              {renderLineIndicators()}
              <Text style={styles.linesText}>
                {station.lines.map(line => line.name).join('・')}
              </Text>
            </View>

            {showDistance && distance !== undefined && (
              <Text style={styles.distanceText}>
                📍 {formatDistance(distance)}
              </Text>
            )}
          </View>

          {/* 右側：アクションボタン */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenActions}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* 乗換案内 */}
        {station.lines.length > 1 && (
          <View style={styles.transferInfo}>
            <Ionicons name="swap-horizontal" size={14} color="#34C759" />
            <Text style={styles.transferText}>
              乗換可能 ({station.lines.length}路線)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* アクションモーダル */}
      <Modal
        visible={showActions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View style={styles.actionModal}>
            {/* 駅情報ヘッダー */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalStationName}>{station.name}駅</Text>
              <Text style={styles.modalStationLines}>
                {station.lines.map(line => line.name).join('・')}
              </Text>
            </View>

            {/* 次の電車情報 */}
            {showNextTrains && (
              <View style={styles.nextTrainsSection}>
                <Text style={styles.sectionTitle}>次の電車</Text>
                {loadingTrains ? (
                  <Text style={styles.loadingText}>読み込み中...</Text>
                ) : nextTrains.length > 0 ? (
                  nextTrains.map((train, index) => (
                    <View key={index} style={styles.trainInfo}>
                      <Text style={styles.trainLine}>{train.line}</Text>
                      <Text style={styles.trainTime}>
                        {train.train.departureTime} ({train.remainingMinutes}分後)
                      </Text>
                      <Text style={styles.trainDestination}>
                        {train.train.destination}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noTrainsText}>
                    時刻表情報がありません
                  </Text>
                )}
              </View>
            )}

            {/* アクションボタン */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleSetDropoff}
              >
                <Ionicons
                  name={isDropoffTarget ? 'checkmark-circle' : 'navigate-circle-outline'}
                  size={20}
                  color="#007AFF"
                />
                <Text style={styles.actionButtonText}>
                  この駅で降りる
                </Text>
              </TouchableOpacity>

              {isHomeStation && (
                <View style={styles.homeBadge}>
                  <Ionicons name="home" size={16} color="#007AFF" />
                  <Text style={styles.homeBadgeText}>ホーム駅に設定済み</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleSendNotification}
              >
                <Ionicons name="notifications-outline" size={20} color="#007AFF" />
                <Text style={styles.actionButtonText}>通知を送信</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handlePress}
              >
                <Ionicons name="information-circle-outline" size={20} color="#34C759" />
                <Text style={styles.actionButtonText}>詳細を表示</Text>
              </TouchableOpacity>
            </View>

            {/* 閉じるボタン */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowActions(false)}
            >
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

export default StationListItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  stationInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stationKana: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  lineIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lineIndicator: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
  },
  moreLines: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  linesText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  transferInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  transferText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalStationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalStationLines: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  nextTrainsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },
  trainInfo: {
    marginBottom: 12,
  },
  trainLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  trainTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  trainDestination: {
    fontSize: 14,
    color: '#666',
  },
  noTrainsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  homeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  closeButton: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
