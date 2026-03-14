import React, { useMemo, useState, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Station, Train } from '../../types';
import { getStationSchedules } from '../../services/stationService';
import { DayType, Direction } from './TimetableView';

export interface TimetableGridProps {
  station: Station;
  lineId: string;
  dayType: DayType;
  direction: Direction;
}

interface TimetableHour {
  hour: number;
  trains: Train[];
}

const TimetableGrid = memo(function TimetableGrid({
  station,
  lineId,
  dayType,
  direction,
}: TimetableGridProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * 現在時刻を更新（1分毎）
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  /**
   * 時刻表データの取得と整理
   */
  const timetableData = useMemo(() => {
    try {
      const schedules = getStationSchedules(station.id, lineId, dayType, direction);

      // 時間別にグループ化
      const hourlyData: { [hour: number]: TimetableHour } = {};

      schedules.forEach((schedule) => {
        const [hours, minutes] = schedule.departureTime.split(':').map(Number);

        if (!hourlyData[hours]) {
          hourlyData[hours] = {
            hour: hours,
            trains: [],
          };
        }

        hourlyData[hours].trains.push(schedule);
      });

      // 時間順にソート
      return Object.values(hourlyData)
        .sort((a, b) => a.hour - b.hour)
        .map(hourData => ({
          ...hourData,
          trains: hourData.trains.sort((a, b) => {
            const aMinutes = parseInt(a.departureTime.split(':')[1]);
            const bMinutes = parseInt(b.departureTime.split(':')[1]);
            return aMinutes - bMinutes;
          }),
        }));
    } catch (error) {
      console.error('時刻表データの取得に失敗:', error);
      return [];
    }
  }, [station.id, lineId, dayType, direction]);

  /**
   * 現在時刻のハイライト判定
   */
  const isCurrentHour = (hour: number) => {
    return currentTime.getHours() === hour;
  };

  const isCurrentOrNextTrain = (departureTime: string) => {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const trainTime = new Date();
    trainTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const timeDiff = trainTime.getTime() - now.getTime();

    // 30分以内の電車をハイライト
    return timeDiff >= 0 && timeDiff <= 30 * 60 * 1000;
  };

  /**
   * 電車種別の色取得（メモ化）
   */
  const getTrainTypeColor = useCallback((type: import('../../types').TrainType) => {
    switch (type) {
      case 'express':
        return '#FF9500';
      case 'rapid':
        return '#34C759';
      case 'semi-express':
        return '#FF9500';
      case 'local':
        return '#8E8E93';
      case 'limited':
        return '#FF3B30';
      case 'commuter':
        return '#007AFF';
      default:
        return '#007AFF';
    }
  }, []);

  /**
   * 電車種別の日本語名取得（メモ化）
   */
  const getTrainTypeLabel = useCallback((type: import('../../types').TrainType) => {
    switch (type) {
      case 'express':
        return '急行';
      case 'rapid':
        return '快速';
      case 'semi-express':
        return '準急';
      case 'local':
        return '各停';
      case 'limited':
        return '特急';
      case 'commuter':
        return '通勤';
      default:
        return '普通';
    }
  }, []);

  /**
   * リフレッシュ処理（メモ化）
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentTime(new Date());
    // 少し遅延を入れてリフレッシュ感を演出
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  /**
   * 空の時刻表表示（メモ化）
   */
  const renderEmptyTimetable = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={48} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>時刻表データがありません</Text>
      <Text style={styles.emptySubtitle}>
        選択された条件での運行情報が見つかりません
      </Text>
    </View>
  ), []);

  if (timetableData.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderEmptyTimetable()}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* ヘッダー情報 */}
      <View style={styles.infoHeader}>
        <Text style={styles.infoText}>
          現在時刻: {currentTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <Text style={styles.trainCountText}>
          {timetableData.reduce((sum, hour) => sum + hour.trains.length, 0)}本運行
        </Text>
      </View>

      {/* 時刻表グリッド */}
      <View style={styles.timetableGrid}>
        {timetableData.map((hourData) => (
          <View
            key={hourData.hour}
            style={[
              styles.hourSection,
              isCurrentHour(hourData.hour) && styles.currentHourSection,
            ]}
          >
            {/* 時間ヘッダー */}
            <View style={[
              styles.hourHeader,
              isCurrentHour(hourData.hour) && styles.currentHourHeader,
            ]}>
              <Text style={[
                styles.hourText,
                isCurrentHour(hourData.hour) && styles.currentHourText,
              ]}>
                {hourData.hour}
              </Text>
            </View>

            {/* 分の一覧 */}
            <View style={styles.trainsContainer}>
              {hourData.trains.map((train, index) => {
                const minutes = parseInt(train.departureTime.split(':')[1]);
                const isHighlighted = isCurrentOrNextTrain(train.departureTime);

                return (
                  <View
                    key={index}
                    style={[
                      styles.trainItem,
                      isHighlighted && styles.highlightedTrain,
                    ]}
                  >
                    <Text style={[
                      styles.minuteText,
                      isHighlighted && styles.highlightedMinuteText,
                    ]}>
                      {minutes.toString().padStart(2, '0')}
                    </Text>
                    <View style={[
                      styles.trainTypeBadge,
                      { backgroundColor: getTrainTypeColor(train.trainType) },
                    ]}>
                      <Text style={styles.trainTypeText}>
                        {getTrainTypeLabel(train.trainType).charAt(0)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.destinationText,
                      isHighlighted && styles.highlightedDestinationText,
                    ]}>
                      {train.destination}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>凡例</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('express') }]}>
                <Text style={styles.legendBadgeText}>急</Text>
              </View>
              <Text style={styles.legendText}>急行</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('rapid') }]}>
                <Text style={styles.legendBadgeText}>快</Text>
              </View>
              <Text style={styles.legendText}>快速</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('local') }]}>
                <Text style={styles.legendBadgeText}>各</Text>
              </View>
              <Text style={styles.legendText}>各駅停車</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('limited') }]}>
                <Text style={styles.legendBadgeText}>特</Text>
              </View>
              <Text style={styles.legendText}>特急</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('semi-express') }]}>
                <Text style={styles.legendBadgeText}>準</Text>
              </View>
              <Text style={styles.legendText}>準急</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: getTrainTypeColor('commuter') }]}>
                <Text style={styles.legendBadgeText}>通</Text>
              </View>
              <Text style={styles.legendText}>通勤</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

export default TimetableGrid;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  trainCountText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timetableGrid: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hourSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  currentHourSection: {
    backgroundColor: '#FFF3E0',
  },
  hourHeader: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRightWidth: 2,
    borderRightColor: '#E5E5EA',
    paddingVertical: 16,
  },
  currentHourHeader: {
    backgroundColor: '#FF9500',
  },
  hourText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  currentHourText: {
    color: 'white',
  },
  trainsContainer: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    minWidth: 80,
    gap: 4,
  },
  highlightedTrain: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  minuteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 20,
  },
  highlightedMinuteText: {
    color: '#007AFF',
  },
  trainTypeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  destinationText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  highlightedDestinationText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  legendContainer: {
    gap: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 20,
  },
});
