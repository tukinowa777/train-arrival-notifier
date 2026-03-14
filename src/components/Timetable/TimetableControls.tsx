import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DayType, Direction } from './TimetableView';

export interface TimetableControlsProps {
  dayType: DayType;
  direction: Direction;
  selectedLine: string;
  onDayTypeChange: (type: DayType) => void;
  onDirectionChange: (direction: Direction) => void;
}

export default function TimetableControls({
  dayType,
  direction,
  selectedLine,
  onDayTypeChange,
  onDirectionChange,
}: TimetableControlsProps) {
  /**
   * 運行タイプのオプション
   */
  const dayTypeOptions = [
    { key: 'weekday', label: '平日', icon: 'business-outline' },
    { key: 'saturday', label: '土曜', icon: 'partly-sunny-outline' },
    { key: 'holiday', label: '休日', icon: 'sunny-outline' },
  ] as const;

  /**
   * 方向のオプション
   */
  const directionOptions = [
    { key: 'inbound', label: '上り', icon: 'arrow-up-outline' },
    { key: 'outbound', label: '下り', icon: 'arrow-down-outline' },
  ] as const;

  const currentDayTypeLabel = dayTypeOptions.find((option) => option.key === dayType)?.label ?? '';
  const currentDirectionLabel = directionOptions.find((option) => option.key === direction)?.label ?? '';
  const currentSettingsLabel = `${currentDayTypeLabel} • ${currentDirectionLabel}`;

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <View style={styles.dayTypeSection}>
          <Text style={styles.sectionLabel}>運行日</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsContainer}
          >
            {dayTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  dayType === option.key && styles.activeOption,
                ]}
                onPress={() => onDayTypeChange(option.key)}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={dayType === option.key ? '#007AFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.optionText,
                    dayType === option.key && styles.activeOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedLine ? (
          <View style={styles.directionSection}>
            <Text style={styles.sectionLabel}>方向</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsContainer}
            >
              {directionOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionButton,
                    direction === option.key && styles.activeOption,
                  ]}
                  onPress={() => onDirectionChange(option.key)}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={direction === option.key ? '#007AFF' : '#8E8E93'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      direction === option.key && styles.activeOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={styles.currentSettings}>
        <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
        <Text style={styles.currentSettingsText}>{currentSettingsLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
  },
  dayTypeSection: {
    flex: 1.35,
  },
  directionSection: {
    flex: 0.85,
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  optionsContainer: {
    paddingHorizontal: 4,
    gap: 6,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  activeOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeOptionText: {
    color: '#007AFF',
  },
  currentSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    gap: 6,
  },
  currentSettingsText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
