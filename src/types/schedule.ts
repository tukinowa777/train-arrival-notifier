// 列車の情報
export interface Train {
  id: string;
  trainType: TrainType;
  destination: string;
  departureTime: string; // HH:MM形式
  track?: number; // 番線
  isLast?: boolean; // 最終電車フラグ
}

// 列車種別
export type TrainType =
  | 'local'          // 各駅停車・普通
  | 'rapid'          // 快速
  | 'express'        // 急行
  | 'limited'        // 特急
  | 'commuter'       // 通勤快速・通勤急行
  | 'semi-express';  // 準急

// 時刻表
export interface TimeTable {
  stationId: string;
  lineId: string;
  direction: 'inbound' | 'outbound';
  dayType: DayType;
  trains: Train[];
  lastUpdated: string;
}

// 曜日タイプ
export type DayType = 'weekday' | 'saturday' | 'holiday';

// 次の電車情報
export interface NextTrainInfo {
  train: Train;
  remainingMinutes: number;
  arrivalTime: Date;
  station: string;
  line: string;
  direction: string;
}