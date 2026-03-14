import { useEffect, useRef } from 'react';
import { useLocation } from './useLocation';
import { useNotifications } from './useNotifications';
import { useStorage } from './useStorage';
import { calculateDistance } from '../services/stationService';
import { Station } from '../types';

const DEFAULT_NOTIFY_BEFORE_MINUTES = 3;
const DEFAULT_TARGET_DISTANCE = 1500;
const DEFAULT_APPROACH_SPEED_METERS_PER_SECOND = 8.33;

export function getEstimatedArrivalMinutes(
  distanceMeters: number,
  speedMetersPerSecond: number | null | undefined
): number {
  const safeSpeed = speedMetersPerSecond && speedMetersPerSecond > 0.5
    ? speedMetersPerSecond
    : DEFAULT_APPROACH_SPEED_METERS_PER_SECOND;

  return distanceMeters / safeSpeed / 60;
}

export function shouldNotifyDropoff(params: {
  distanceMeters: number;
  speedMetersPerSecond: number | null | undefined;
  notifyBeforeMinutes: number;
  targetDistance: number;
}): boolean {
  const estimatedArrivalMinutes = getEstimatedArrivalMinutes(
    params.distanceMeters,
    params.speedMetersPerSecond
  );

  return (
    params.distanceMeters <= params.targetDistance &&
    estimatedArrivalMinutes <= params.notifyBeforeMinutes
  );
}

/**
 * 降車駅に近づいたら一度だけ通知する
 */
export function useDropoffNotifier(): void {
  const { state: locationState } = useLocation({
    watchPosition: true,
    maxDistance: 5000,
    updateInterval: 15000,
  });
  const { actions: notificationActions } = useNotifications();
  const { state: storageState, actions: storageActions } = useStorage();
  const isSendingRef = useRef(false);

  useEffect(() => {
    const notifyDropoff = async () => {
      const target = storageState.dropoffTarget;
      const currentLocation = locationState.currentLocation;

      if (!target || !target.enabled || target.notified || !currentLocation || isSendingRef.current) {
        return;
      }

      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        target.station.latitude,
        target.station.longitude
      );

      if (!shouldNotifyDropoff({
        distanceMeters: distance,
        speedMetersPerSecond: currentLocation.coords.speed,
        notifyBeforeMinutes: target.notifyBeforeMinutes,
        targetDistance: target.targetDistance,
      })) {
        return;
      }

      isSendingRef.current = true;

      try {
        await notificationActions.sendStationAlert(target.station.name, Math.round(distance));
        await storageActions.setDropoffTarget({
          ...target,
          notified: true,
          notifiedAt: new Date().toISOString(),
        });
      } finally {
        isSendingRef.current = false;
      }
    };

    notifyDropoff();
  }, [
    locationState.currentLocation,
    notificationActions,
    storageActions,
    storageState.dropoffTarget,
  ]);
}

export function createDropoffTarget(station: Station) {
  return {
    station,
    enabled: true,
    notified: false,
    notifyBeforeMinutes: DEFAULT_NOTIFY_BEFORE_MINUTES,
    targetDistance: DEFAULT_TARGET_DISTANCE,
    setAt: new Date().toISOString(),
  };
}
