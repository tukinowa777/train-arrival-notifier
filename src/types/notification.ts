// 通知アラート設定
export interface Alert {
  id: string;
  stationId: string;
  lineId: string;
  direction: 'inbound' | 'outbound';
  enabled: boolean;
  notifyMinutesBefore: number; // 何分前に通知するか
  radius: number; // 駅からの距離（メートル）
  repeatDays: DayOfWeek[];
  startTime?: string; // HH:MM形式
  endTime?: string;   // HH:MM形式
}

// 曜日
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// 通知設定
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultNotifyMinutesBefore: number;
  defaultRadius: number;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:MM形式
  quietHoursEnd?: string;   // HH:MM形式
}

// 通知履歴
export interface NotificationHistory {
  id: string;
  alertId: string;
  sentAt: Date;
  trainInfo: {
    destination: string;
    departureTime: string;
    trainType: string;
  };
  station: string;
  line: string;
}