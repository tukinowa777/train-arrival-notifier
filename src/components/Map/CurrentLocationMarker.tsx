import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export interface CurrentLocationMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  accuracy?: number;
}

export default function CurrentLocationMarker({
  coordinate,
  accuracy,
}: CurrentLocationMarkerProps) {
  // アニメーション用の値
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  /**
   * パルスアニメーションを開始
   */
  useEffect(() => {
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulseAnimation();

    return () => {
      pulseAnimation.stopAnimation();
    };
  }, []);

  /**
   * 精度円の色を決定
   */
  const getAccuracyColor = (acc: number) => {
    if (acc <= 10) return { fill: 'rgba(52, 199, 89, 0.2)', stroke: 'rgba(52, 199, 89, 0.8)' }; // 緑：高精度
    if (acc <= 50) return { fill: 'rgba(255, 149, 0, 0.2)', stroke: 'rgba(255, 149, 0, 0.8)' }; // オレンジ：中精度
    return { fill: 'rgba(255, 59, 48, 0.2)', stroke: 'rgba(255, 59, 48, 0.8)' }; // 赤：低精度
  };

  const currentAccuracy = accuracy || coordinate.accuracy || 50;
  const accuracyColors = getAccuracyColor(currentAccuracy);

  return (
    <>
      {/* 精度範囲を示す円 */}
      <Circle
        center={coordinate}
        radius={currentAccuracy}
        fillColor={accuracyColors.fill}
        strokeColor={accuracyColors.stroke}
        strokeWidth={2}
      />

      {/* 現在位置マーカー */}
      <Marker
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={true}
      >
        <Animated.View
          style={[
            styles.markerContainer,
            {
              transform: [{ scale: pulseAnimation }],
            },
          ]}
        >
          {/* 外側の白い円 */}
          <View style={styles.outerCircle}>
            {/* 内側の青い円 */}
            <View style={styles.innerCircle}>
              <Ionicons name="navigation" size={12} color="white" />
            </View>
          </View>

          {/* パルス効果用の追加円 */}
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                opacity: pulseAnimation.interpolate({
                  inputRange: [1, 1.3],
                  outputRange: [0.7, 0],
                }),
                transform: [
                  {
                    scale: pulseAnimation.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  innerCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
});