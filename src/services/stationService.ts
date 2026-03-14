import { Station, NextTrainInfo, DayType } from '../types';
import { stations, stationMap, lineMap } from '../constants/stations';
import { getTimeTable, getNextTrain } from '../constants/schedules';

export interface SurroundingTrainInfo {
  previousTrain: NextTrainInfo | null;
  nextTrain: NextTrainInfo | null;
}

/**
 * 2点間の距離を計算（ハーバサイン距離）
 * @param lat1 緯度1
 * @param lon1 経度1
 * @param lat2 緯度2
 * @param lon2 経度2
 * @returns 距離（メートル）
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 駅名またはかな名で駅を検索
 * @param query 検索クエリ
 * @returns 検索結果の駅リスト
 */
export function searchStations(query: string): Station[] {
  if (!query.trim()) {
    return stations;
  }

  const searchQuery = query.toLowerCase().trim();

  return stations.filter(station =>
    station.name.toLowerCase().includes(searchQuery) ||
    station.nameKana.includes(searchQuery)
  );
}

/**
 * 駅IDから駅情報を取得
 * @param stationId 駅ID
 * @returns 駅情報（存在しない場合はundefined）
 */
export function getStationById(stationId: string): Station | undefined {
  return stationMap.get(stationId);
}

/**
 * 現在位置から最寄りの駅を取得
 * @param latitude 緯度
 * @param longitude 経度
 * @param maxDistance 最大距離（メートル、デフォルト: 2000m）
 * @returns 最寄り駅のリスト（距離順）
 */
export function getNearbyStations(
  latitude: number,
  longitude: number,
  maxDistance: number = 2000
): Array<Station & { distance: number }> {
  const stationsWithDistance = stations
    .map(station => ({
      ...station,
      distance: calculateDistance(latitude, longitude, station.latitude, station.longitude),
    }))
    .filter(station => station.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return stationsWithDistance;
}

/**
 * 最寄りの駅を1つ取得
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 最寄り駅（500m以内に駅がない場合はundefined）
 */
export function getClosestStation(
  latitude: number,
  longitude: number
): (Station & { distance: number }) | undefined {
  const nearbyStations = getNearbyStations(latitude, longitude, 500);
  return nearbyStations[0];
}

/**
 * 現在時刻に基づいて曜日タイプを取得
 * @param date 日付（デフォルト: 現在日時）
 * @returns 曜日タイプ
 */
export function getDayType(date: Date = new Date()): DayType {
  const day = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜

  if (day === 0) {
    return 'holiday'; // 日曜日
  } else if (day === 6) {
    return 'saturday'; // 土曜日
  } else {
    return 'weekday'; // 平日
  }
}

/**
 * 駅の次の電車情報を取得
 * @param stationId 駅ID
 * @param lineId 路線ID
 * @param direction 方向
 * @param currentTime 現在時刻（デフォルト: 現在日時）
 * @returns 次の電車情報（時刻表がない場合はnull）
 */
export function getNextTrainInfo(
  stationId: string,
  lineId: string,
  direction: 'inbound' | 'outbound',
  currentTime: Date = new Date()
): NextTrainInfo | null {
  const station = getStationById(stationId);
  const line = lineMap.get(lineId);

  if (!station || !line) {
    return null;
  }

  const dayType = getDayType(currentTime);
  const timeTable = getTimeTable(stationId, lineId, direction, dayType);

  if (!timeTable) {
    return null;
  }

  const nextTrain = getNextTrain(timeTable, currentTime);

  if (!nextTrain) {
    return null;
  }

  // 次の電車の到着時刻を計算
  const [hours, minutes] = nextTrain.departureTime.split(':').map(Number);
  const arrivalTime = new Date(currentTime);
  arrivalTime.setHours(hours, minutes, 0, 0);

  // 翌日の電車の場合
  if (arrivalTime <= currentTime) {
    arrivalTime.setDate(arrivalTime.getDate() + 1);
  }

  const remainingMinutes = Math.ceil((arrivalTime.getTime() - currentTime.getTime()) / (1000 * 60));

  return {
    train: nextTrain,
    remainingMinutes,
    arrivalTime,
    station: station.name,
    line: line.name,
    direction: direction === 'inbound' ? '内回り' : '外回り',
  };
}

/**
 * 駅の全路線・全方向の次の電車情報を取得
 * @param stationId 駅ID
 * @param currentTime 現在時刻（デフォルト: 現在日時）
 * @returns 次の電車情報のリスト
 */
export function getAllNextTrains(
  stationId: string,
  currentTime: Date = new Date()
): NextTrainInfo[] {
  const station = getStationById(stationId);
  if (!station) {
    return [];
  }

  const nextTrains: NextTrainInfo[] = [];

  for (const line of station.lines) {
    // 内回り・外回り両方向をチェック
    const directions: Array<'inbound' | 'outbound'> = ['inbound', 'outbound'];

    for (const direction of directions) {
      const nextTrain = getNextTrainInfo(stationId, line.id, direction, currentTime);
      if (nextTrain) {
        nextTrains.push(nextTrain);
      }
    }
  }

  // 到着時刻順にソート
  return nextTrains.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
}

/**
 * 駅の前後の電車情報を取得
 * @param stationId 駅ID
 * @param currentTime 現在時刻
 * @returns 全路線・全方向の直前/直後の電車情報
 */
export function getSurroundingTrains(
  stationId: string,
  currentTime: Date = new Date()
): SurroundingTrainInfo[] {
  const station = getStationById(stationId);
  if (!station) {
    return [];
  }

  const dayType = getDayType(currentTime);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const surroundingTrains: SurroundingTrainInfo[] = [];

  for (const line of station.lines) {
    const directions: Array<'inbound' | 'outbound'> = ['inbound', 'outbound'];

    for (const direction of directions) {
      const timeTable = getTimeTable(stationId, line.id, direction, dayType);
      if (!timeTable || timeTable.trains.length === 0) {
        continue;
      }

      let previousTrain = null;
      let nextTrain = null;

      for (const train of timeTable.trains) {
        const [hours, minutes] = train.departureTime.split(':').map(Number);
        const departureMinutes = hours * 60 + minutes;

        if (departureMinutes <= currentMinutes) {
          previousTrain = train;
        }

        if (departureMinutes > currentMinutes) {
          nextTrain = train;
          break;
        }
      }

      const createTrainInfo = (train: typeof timeTable.trains[number] | null): NextTrainInfo | null => {
        if (!train) {
          return null;
        }

        const [hours, minutes] = train.departureTime.split(':').map(Number);
        const departureTime = new Date(currentTime);
        departureTime.setHours(hours, minutes, 0, 0);

        const remainingMinutes = Math.ceil((departureTime.getTime() - currentTime.getTime()) / (1000 * 60));

        return {
          train,
          remainingMinutes,
          arrivalTime: departureTime,
          station: station.name,
          line: line.name,
          direction: direction === 'inbound' ? '内回り' : '外回り',
        };
      };

      surroundingTrains.push({
        previousTrain: createTrainInfo(previousTrain),
        nextTrain: createTrainInfo(nextTrain),
      });
    }
  }

  return surroundingTrains;
}

/**
 * 駅をお気に入りに追加/削除
 * @param stationId 駅ID
 * @param isFavorite お気に入りフラグ
 */
export function setStationFavorite(stationId: string, isFavorite: boolean): void {
  const station = stationMap.get(stationId);
  if (station) {
    station.isFavorite = isFavorite;
  }
}

/**
 * お気に入り駅のリストを取得
 * @returns お気に入り駅のリスト
 */
export function getFavoriteStations(): Station[] {
  return stations.filter(station => station.isFavorite === true);
}

/**
 * 指定された駅・路線・方向・運行日の時刻表を取得
 * @param stationId 駅ID
 * @param lineId 路線ID
 * @param dayType 運行日タイプ
 * @param direction 方向
 * @returns 時刻表（電車スケジュールの配列）
 */
export function getStationSchedules(
  stationId: string,
  lineId: string,
  dayType: DayType,
  direction: 'inbound' | 'outbound'
): import('../types').Train[] {
  const station = getStationById(stationId);
  const line = lineMap.get(lineId);

  if (!station || !line) {
    return [];
  }

  // 駅が指定された路線に属するかチェック
  const hasLine = station.lines.some(stationLine => stationLine.id === lineId);
  if (!hasLine) {
    return [];
  }

  try {
    const timeTable = getTimeTable(stationId, lineId, direction, dayType);
    return timeTable?.trains || [];
  } catch (error) {
    console.error('時刻表の取得に失敗:', error);
    return [];
  }
}
