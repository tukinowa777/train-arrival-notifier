import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Station, NextTrainInfo } from '../../types';
import { getAllNextTrains } from '../../services/stationService';
import { useStorage } from '../../hooks/useStorage';
import { useNotifications } from '../../hooks/useNotifications';
import { createDropoffTarget } from '../../hooks/useDropoffNotifier';
import { sendDropoffTargetToAndroid } from '../../services/androidBridgeService';

export interface StationDetailModalProps {
  visible: boolean;
  station: Station;
  onClose: () => void;
}

export default function StationDetailModal({
  visible,
  station,
  onClose,
}: StationDetailModalProps) {
  const [nextTrains, setNextTrains] = useState<NextTrainInfo[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { state: storageState, actions: storageActions } = useStorage();
  const { actions: notificationActions } = useNotifications();

  // お気に入り状態の確認
  const isDropoffTarget = storageState.dropoffTarget?.station.id === station.id;

  /**
   * 次の電車情報を取得
   */
  const loadNextTrains = useCallback(async () => {
    setLoadingTrains(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const trains = getAllNextTrains(station.id);
      setNextTrains(trains.slice(0, 5)); // 最大5本表示
    } catch (error) {
      console.error('次の電車情報の取得に失敗:', error);
      setNextTrains([]);
    } finally {
      setLoadingTrains(false);
    }
  }, [station.id]);

  /**
   * モーダル表示時に電車情報を読み込み
   */
  useEffect(() => {
    if (visible) {
      loadNextTrains();
    } else {
      setNextTrains([]);
    }
  }, [visible, loadNextTrains, refreshKey]);

  /**
   * 降車駅を設定
   */
  const handleSetDropoffStation = useCallback(async () => {
    try {
      const dropoffTarget = createDropoffTarget(station);
      const success = await storageActions.setDropoffTarget(dropoffTarget);
      if (!success) {
        throw new Error('dropoff target save failed');
      }
      sendDropoffTargetToAndroid(dropoffTarget);
      Alert.alert('この駅で降りる', `${station.name}駅を降車駅に設定しました。到着3分前を目安に通知します。`);
    } catch (error) {
      Alert.alert('エラー', '降車駅の設定に失敗しました');
    }
  }, [station, storageActions]);

  /**
   * 通知送信
   */
  const handleSendNotification = useCallback(async () => {
    try {
      if (nextTrains.length > 0) {
        await notificationActions.sendTrainAlert(nextTrains[0]);
        Alert.alert('通知送信', `${station.name}駅の電車情報を通知しました`);
      } else {
        Alert.alert('情報なし', '次の電車情報が見つかりません');
      }
    } catch (error) {
      Alert.alert('エラー', '通知の送信に失敗しました');
    }
  }, [station.name, nextTrains, notificationActions]);

  /**
   * 情報更新
   */
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  /**
   * 路線インジケーターの描画
   */
  const renderLineIndicators = () => (
    <View style={styles.lineIndicators}>
      {station.lines.map((line) => (
        <View key={line.id} style={styles.lineItem}>
          <View
            style={[
              styles.lineColorBar,
              { backgroundColor: line.color },
            ]}
          />
          <View style={styles.lineInfo}>
            <Text style={styles.lineName}>{line.name}</Text>
            <Text style={styles.lineOperator}>{line.operator}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  /**
   * 次の電車情報の描画
   */
  const renderNextTrains = () => {
    if (loadingTrains) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      );
    }

    if (nextTrains.length === 0) {
      return (
        <View style={styles.noTrainsContainer}>
          <Ionicons name="time-outline" size={24} color="#8E8E93" />
          <Text style={styles.noTrainsText}>
            現在運行中の電車情報がありません
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.trainsContainer}>
        {nextTrains.map((train, index) => (
          <View key={index} style={styles.trainItem}>
            <View style={styles.trainHeader}>
              <Text style={styles.trainLine}>{train.line}</Text>
              <View style={styles.timeInfo}>
                <Text style={styles.trainTime}>
                  {train.train.departureTime}
                </Text>
                <Text style={styles.remainingTime}>
                  ({train.remainingMinutes}分後)
                </Text>
              </View>
            </View>
            <Text style={styles.trainDestination}>
              {train.train.destination}行き
            </Text>
            <Text style={styles.trainType}>
              {train.train.trainType}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{station.name}駅</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 駅基本情報 */}
          <View style={styles.stationInfoSection}>
            <View style={styles.stationNameContainer}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationKana}>{station.nameKana}</Text>
              {isDropoffTarget && (
                <Ionicons name="navigate-circle" size={20} color="#007AFF" />
              )}
            </View>

            {/* 路線情報 */}
            <View style={styles.linesSection}>
              <Text style={styles.sectionTitle}>路線情報</Text>
              {renderLineIndicators()}
            </View>
          </View>

          {/* 次の電車情報 */}
          <View style={styles.nextTrainsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>次の電車</Text>
              <Text style={styles.lastUpdated}>
                更新: {new Date().toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            {renderNextTrains()}
          </View>

          {/* アクションボタン */}
          <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSetDropoffStation}
              >
                <Ionicons
                  name={isDropoffTarget ? 'checkmark-circle' : 'navigate-circle-outline'}
                  size={20}
                  color="#007AFF"
                />
                <Text style={styles.actionButtonText}>この駅で降りる</Text>
              </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSendNotification}
              disabled={nextTrains.length === 0}
            >
              <Ionicons name="notifications-outline" size={20} color="#007AFF" />
              <Text style={[
                styles.actionButtonText,
                nextTrains.length === 0 && styles.disabledText
              ]}>
                通知を送信
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 56,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  stationInfoSection: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingVertical: 20,
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  stationKana: {
    fontSize: 16,
    color: '#666',
  },
  linesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  lineIndicators: {
    gap: 12,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  lineOperator: {
    fontSize: 14,
    color: '#8E8E93',
  },
  nextTrainsSection: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#8E8E93',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  noTrainsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  noTrainsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  trainsContainer: {
    gap: 16,
  },
  trainItem: {
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  trainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trainLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  trainTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  remainingTime: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  trainDestination: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  trainType: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 40,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  disabledText: {
    color: '#8E8E93',
  },
});
