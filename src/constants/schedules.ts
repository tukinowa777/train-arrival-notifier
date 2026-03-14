import { TimeTable, Train, DayType, TrainType } from '../types';

// 時刻を生成するヘルパー関数
function generateTrainTimes(
  baseId: string,
  startHour: number,
  endHour: number,
  interval: number,
  destination: string = '内回り',
  trainType: TrainType = 'local'
): Train[] {
  const trains: Train[] = [];
  let trainCounter = 1;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      trains.push({
        id: `${baseId}_${trainCounter}`,
        trainType,
        destination,
        departureTime: timeStr,
        track: 1,
        isLast: hour === 23 && minute >= 60 - interval,
      });
      trainCounter++;
    }
  }

  return trains;
}

// 山手線 新宿駅 内回り（平日）
export const shinjukuInboundWeekday: TimeTable = {
  stationId: 'shinjuku',
  lineId: 'yamanote',
  direction: 'inbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    // 早朝（5:00-7:00）5分間隔
    ...generateTrainTimes('sj_in_morning_local', 5, 7, 6, '大崎・品川方面', 'local'),
    ...generateTrainTimes('sj_in_morning_rapid', 5, 7, 12, '大崎・品川方面', 'rapid'),
    // 朝ラッシュ（7:00-10:00）2-3分間隔
    ...generateTrainTimes('sj_in_rush_rapid', 7, 10, 4, '大崎・品川方面', 'rapid'),
    ...generateTrainTimes('sj_in_rush_express', 7, 10, 8, '大崎・品川方面', 'express'),
    // 日中（10:00-16:00）4-5分間隔
    ...generateTrainTimes('sj_in_day_local', 10, 16, 5, '大崎・品川方面', 'local'),
    ...generateTrainTimes('sj_in_day_rapid', 10, 16, 10, '大崎・品川方面', 'rapid'),
    // 夕方（16:00-19:00）3分間隔
    ...generateTrainTimes('sj_in_evening_rapid', 16, 19, 4, '大崎・品川方面', 'rapid'),
    ...generateTrainTimes('sj_in_evening_express', 16, 19, 9, '大崎・品川方面', 'express'),
    // 夕ラッシュ（19:00-22:00）2-3分間隔
    ...generateTrainTimes('sj_in_night_rush_rapid', 19, 22, 4, '大崎・品川方面', 'rapid'),
    ...generateTrainTimes('sj_in_night_rush_express', 19, 22, 10, '大崎・品川方面', 'express'),
    // 夜間（22:00-24:00）4-6分間隔
    ...generateTrainTimes('sj_in_night_local', 22, 24, 6, '大崎・品川方面', 'local'),
  ],
};

// 山手線 新宿駅 外回り（平日）
export const shinjukuOutboundWeekday: TimeTable = {
  stationId: 'shinjuku',
  lineId: 'yamanote',
  direction: 'outbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    // 早朝（5:00-7:00）5分間隔
    ...generateTrainTimes('sj_out_morning_local', 5, 7, 6, '池袋・上野方面', 'local'),
    ...generateTrainTimes('sj_out_morning_rapid', 5, 7, 12, '池袋・上野方面', 'rapid'),
    // 朝ラッシュ（7:00-10:00）2-3分間隔
    ...generateTrainTimes('sj_out_rush_rapid', 7, 10, 4, '池袋・上野方面', 'rapid'),
    ...generateTrainTimes('sj_out_rush_express', 7, 10, 8, '池袋・上野方面', 'express'),
    // 日中（10:00-16:00）4-5分間隔
    ...generateTrainTimes('sj_out_day_local', 10, 16, 5, '池袋・上野方面', 'local'),
    ...generateTrainTimes('sj_out_day_rapid', 10, 16, 10, '池袋・上野方面', 'rapid'),
    // 夕方（16:00-19:00）3分間隔
    ...generateTrainTimes('sj_out_evening_rapid', 16, 19, 4, '池袋・上野方面', 'rapid'),
    ...generateTrainTimes('sj_out_evening_express', 16, 19, 9, '池袋・上野方面', 'express'),
    // 夕ラッシュ（19:00-22:00）2-3分間隔
    ...generateTrainTimes('sj_out_night_rush_rapid', 19, 22, 4, '池袋・上野方面', 'rapid'),
    ...generateTrainTimes('sj_out_night_rush_express', 19, 22, 10, '池袋・上野方面', 'express'),
    // 夜間（22:00-24:00）4-6分間隔
    ...generateTrainTimes('sj_out_night_local', 22, 24, 6, '池袋・上野方面', 'local'),
  ],
};

// 山手線 東京駅 内回り（平日）
export const tokyoInboundWeekday: TimeTable = {
  stationId: 'tokyo',
  lineId: 'yamanote',
  direction: 'inbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    // 早朝（5:00-7:00）5分間隔
    ...generateTrainTimes('ty_in_morning_local', 5, 7, 6, '新橋・品川方面', 'local'),
    ...generateTrainTimes('ty_in_morning_rapid', 5, 7, 12, '新橋・品川方面', 'rapid'),
    // 朝ラッシュ（7:00-10:00）2-3分間隔
    ...generateTrainTimes('ty_in_rush_rapid', 7, 10, 4, '新橋・品川方面', 'rapid'),
    ...generateTrainTimes('ty_in_rush_express', 7, 10, 9, '新橋・品川方面', 'express'),
    // 日中（10:00-16:00）4-5分間隔
    ...generateTrainTimes('ty_in_day_local', 10, 16, 5, '新橋・品川方面', 'local'),
    ...generateTrainTimes('ty_in_day_rapid', 10, 16, 10, '新橋・品川方面', 'rapid'),
    // 夕方（16:00-19:00）3分間隔
    ...generateTrainTimes('ty_in_evening_rapid', 16, 19, 4, '新橋・品川方面', 'rapid'),
    ...generateTrainTimes('ty_in_evening_express', 16, 19, 9, '新橋・品川方面', 'express'),
    // 夕ラッシュ（19:00-22:00）2-3分間隔
    ...generateTrainTimes('ty_in_night_rush_rapid', 19, 22, 4, '新橋・品川方面', 'rapid'),
    ...generateTrainTimes('ty_in_night_rush_express', 19, 22, 10, '新橋・品川方面', 'express'),
    // 夜間（22:00-24:00）4-6分間隔
    ...generateTrainTimes('ty_in_night_local', 22, 24, 6, '新橋・品川方面', 'local'),
  ],
};

// 山手線 渋谷駅 内回り（平日）
export const shibuyaInboundWeekday: TimeTable = {
  stationId: 'shibuya',
  lineId: 'yamanote',
  direction: 'inbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    ...generateTrainTimes('sb_in_morning_local', 5, 7, 6, '恵比寿・品川方面', 'local'),
    ...generateTrainTimes('sb_in_morning_rapid', 5, 7, 12, '恵比寿・品川方面', 'rapid'),
    ...generateTrainTimes('sb_in_rush_rapid', 7, 10, 4, '恵比寿・品川方面', 'rapid'),
    ...generateTrainTimes('sb_in_rush_express', 7, 10, 9, '恵比寿・品川方面', 'express'),
    ...generateTrainTimes('sb_in_day_local', 10, 16, 5, '恵比寿・品川方面', 'local'),
    ...generateTrainTimes('sb_in_day_rapid', 10, 16, 10, '恵比寿・品川方面', 'rapid'),
    ...generateTrainTimes('sb_in_evening_rapid', 16, 19, 4, '恵比寿・品川方面', 'rapid'),
    ...generateTrainTimes('sb_in_evening_express', 16, 19, 9, '恵比寿・品川方面', 'express'),
    ...generateTrainTimes('sb_in_night_rush_rapid', 19, 22, 4, '恵比寿・品川方面', 'rapid'),
    ...generateTrainTimes('sb_in_night_rush_express', 19, 22, 10, '恵比寿・品川方面', 'express'),
    ...generateTrainTimes('sb_in_night_local', 22, 24, 6, '恵比寿・品川方面', 'local'),
  ],
};

// 土曜日用の時刻表（間隔を少し調整）
export const shinjukuInboundSaturday: TimeTable = {
  ...shinjukuInboundWeekday,
  dayType: 'saturday',
  trains: [
    // 土曜日は全体的に少し間隔が長め
    ...generateTrainTimes('sj_in_sat_morning', 5, 9, 6, '大崎・品川方面'),
    ...generateTrainTimes('sj_in_sat_day', 9, 20, 5, '大崎・品川方面'),
    ...generateTrainTimes('sj_in_sat_night', 20, 24, 6, '大崎・品川方面'),
  ],
};

// 休日用の時刻表
export const shinjukuInboundHoliday: TimeTable = {
  ...shinjukuInboundWeekday,
  dayType: 'holiday',
  trains: [
    // 休日はさらに間隔が長め
    ...generateTrainTimes('sj_in_hol_morning', 6, 9, 7, '大崎・品川方面'),
    ...generateTrainTimes('sj_in_hol_day', 9, 20, 6, '大崎・品川方面'),
    ...generateTrainTimes('sj_in_hol_night', 20, 24, 7, '大崎・品川方面'),
  ],
};

// === 小田急線の時刻表 ===

// 小田急線 新宿駅 下り（小田原方面）平日
export const odakyuShinjukuDownWeekday: TimeTable = {
  stationId: 'shinjuku',
  lineId: 'odakyu',
  direction: 'outbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    // 早朝（5:00-7:00）各停中心、10分間隔
    ...generateTrainTimes('od_sj_down_morning_local', 5, 7, 10, '小田原・本厚木方面', 'local'),
    // 朝ラッシュ（7:00-9:00）急行・準急中心、5-7分間隔
    ...generateTrainTimes('od_sj_down_rush_express', 7, 9, 7, '小田原・新百合ヶ丘方面', 'express'),
    ...generateTrainTimes('od_sj_down_rush_semi', 7, 9, 6, '本厚木・町田方面', 'semi-express'),
    // 日中（9:00-17:00）急行・各停、7-10分間隔
    ...generateTrainTimes('od_sj_down_day_express', 9, 17, 10, '小田原・本厚木方面', 'express'),
    ...generateTrainTimes('od_sj_down_day_local', 9, 17, 8, '成城学園前・登戸方面', 'local'),
    // 夕ラッシュ（17:00-21:00）急行・準急中心、5-7分間隔
    ...generateTrainTimes('od_sj_down_evening_express', 17, 21, 6, '小田原・本厚木方面', 'express'),
    ...generateTrainTimes('od_sj_down_evening_semi', 17, 21, 7, '町田・新百合ヶ丘方面', 'semi-express'),
    // 夜間（21:00-24:00）各停中心、10-12分間隔
    ...generateTrainTimes('od_sj_down_night_local', 21, 24, 11, '本厚木・町田方面', 'local'),
  ],
};

// 小田急線 下北沢駅 下り（小田原方面）平日
export const odakyuShimokitazawaDownWeekday: TimeTable = {
  stationId: 'shimokitazawa',
  lineId: 'odakyu',
  direction: 'outbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    ...generateTrainTimes('od_sk_down_morning', 5, 7, 10, '小田原・町田方面', 'local'),
    ...generateTrainTimes('od_sk_down_rush_express', 7, 9, 8, '小田原・本厚木方面', 'express'),
    ...generateTrainTimes('od_sk_down_rush_local', 7, 9, 6, '成城学園前・登戸方面', 'local'),
    ...generateTrainTimes('od_sk_down_day_express', 9, 17, 10, '小田原・本厚木方面', 'express'),
    ...generateTrainTimes('od_sk_down_day_local', 9, 17, 8, '成城学園前・町田方面', 'local'),
    ...generateTrainTimes('od_sk_down_evening', 17, 21, 7, '小田原・町田方面', 'express'),
    ...generateTrainTimes('od_sk_down_night', 21, 24, 11, '本厚木・町田方面', 'local'),
  ],
};

// === 京王線の時刻表 ===

// 京王線 新宿駅 下り（八王子方面）平日
export const keioShinjukuDownWeekday: TimeTable = {
  stationId: 'shinjuku',
  lineId: 'keio',
  direction: 'outbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    // 早朝（5:00-7:00）各停中心、8-10分間隔
    ...generateTrainTimes('keio_sj_down_morning_local', 5, 7, 9, '調布・府中方面', 'local'),
    // 朝ラッシュ（7:00-9:00）特急・急行中心、4-6分間隔
    ...generateTrainTimes('keio_sj_down_rush_limited', 7, 9, 6, '八王子・高尾方面', 'limited'),
    ...generateTrainTimes('keio_sj_down_rush_express', 7, 9, 5, '調布・府中方面', 'express'),
    // 日中（9:00-17:00）特急・急行、6-8分間隔
    ...generateTrainTimes('keio_sj_down_day_limited', 9, 17, 8, '八王子・高尾方面', 'limited'),
    ...generateTrainTimes('keio_sj_down_day_express', 9, 17, 7, '調布・府中方面', 'express'),
    ...generateTrainTimes('keio_sj_down_day_local', 9, 17, 10, '明大前・調布方面', 'local'),
    // 夕ラッシュ（17:00-21:00）特急・急行中心、4-6分間隔
    ...generateTrainTimes('keio_sj_down_evening_limited', 17, 21, 6, '八王子・高尾方面', 'limited'),
    ...generateTrainTimes('keio_sj_down_evening_express', 17, 21, 5, '調布・府中方面', 'express'),
    // 夜間（21:00-24:00）各停中心、8-10分間隔
    ...generateTrainTimes('keio_sj_down_night_local', 21, 24, 9, '調布・府中方面', 'local'),
  ],
};

// 京王線 調布駅 上り（新宿方面）平日
export const keioChofuUpWeekday: TimeTable = {
  stationId: 'chofu',
  lineId: 'keio',
  direction: 'inbound',
  dayType: 'weekday',
  lastUpdated: '2024-03-01T00:00:00Z',
  trains: [
    ...generateTrainTimes('keio_cf_up_morning', 5, 7, 9, '新宿方面', 'local'),
    ...generateTrainTimes('keio_cf_up_rush_express', 7, 9, 5, '新宿方面', 'express'),
    ...generateTrainTimes('keio_cf_up_rush_limited', 7, 9, 6, '新宿方面', 'limited'),
    ...generateTrainTimes('keio_cf_up_day_express', 9, 17, 7, '新宿方面', 'express'),
    ...generateTrainTimes('keio_cf_up_day_local', 9, 17, 9, '新宿方面', 'local'),
    ...generateTrainTimes('keio_cf_up_evening', 17, 21, 6, '新宿方面', 'express'),
    ...generateTrainTimes('keio_cf_up_night', 21, 24, 9, '新宿方面', 'local'),
  ],
};

// 全時刻表のリスト
export const timeTables: TimeTable[] = [
  // JR山手線
  shinjukuInboundWeekday,
  shinjukuOutboundWeekday,
  tokyoInboundWeekday,
  shibuyaInboundWeekday,
  shinjukuInboundSaturday,
  shinjukuInboundHoliday,

  // 小田急線
  odakyuShinjukuDownWeekday,
  odakyuShimokitazawaDownWeekday,

  // 京王線
  keioShinjukuDownWeekday,
  keioChofuUpWeekday,
];

type FallbackPattern = {
  startHour: number;
  endHour: number;
  interval: number;
  destination: string;
  trainType?: TrainType;
};

const fallbackTimeTableCache = new Map<string, TimeTable>();

const fallbackPatternsByLine: Record<string, Record<'inbound' | 'outbound', FallbackPattern[]>> = {
  yamanote: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 6, destination: '内回り方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '内回り方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '内回り方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '内回り方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 5, destination: '内回り方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 10, destination: '内回り方面', trainType: 'rapid' },
      { startHour: 19, endHour: 24, interval: 6, destination: '内回り方面', trainType: 'local' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 6, destination: '外回り方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '外回り方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '外回り方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '外回り方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 5, destination: '外回り方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 10, destination: '外回り方面', trainType: 'rapid' },
      { startHour: 19, endHour: 24, interval: 6, destination: '外回り方面', trainType: 'local' },
    ],
  },
  ginza: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 5, destination: '浅草方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 11, destination: '浅草方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '浅草方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 10, destination: '浅草方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 5, destination: '浅草方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 10, destination: '浅草方面', trainType: 'rapid' },
      { startHour: 19, endHour: 24, interval: 5, destination: '浅草方面', trainType: 'local' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 5, destination: '渋谷方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 11, destination: '渋谷方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '渋谷方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 10, destination: '渋谷方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 5, destination: '渋谷方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 10, destination: '渋谷方面', trainType: 'rapid' },
      { startHour: 19, endHour: 24, interval: 5, destination: '渋谷方面', trainType: 'local' },
    ],
  },
  odakyu: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 8, destination: '新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 5, destination: '新宿方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 7, destination: '新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 8, destination: '新宿方面', trainType: 'local' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 8, destination: '町田・小田原方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 5, destination: '町田・小田原方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 7, destination: '町田・小田原方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 8, destination: '町田・小田原方面', trainType: 'local' },
    ],
  },
  keio: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 7, destination: '新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 5, destination: '新宿方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 7, destination: '新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 8, destination: '新宿方面', trainType: 'local' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 7, destination: '調布・橋本方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 5, destination: '調布・橋本方面', trainType: 'express' },
      { startHour: 10, endHour: 19, interval: 7, destination: '調布・橋本方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 8, destination: '調布・橋本方面', trainType: 'local' },
    ],
  },
  tokaido: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 12, destination: '東京方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 18, destination: '東京方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 7, destination: '東京方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 14, destination: '東京方面', trainType: 'limited' },
      { startHour: 10, endHour: 19, interval: 10, destination: '東京方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 18, destination: '東京方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 12, destination: '東京方面', trainType: 'rapid' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 12, destination: '横浜・熱海方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 18, destination: '横浜・熱海方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 7, destination: '横浜・熱海方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 14, destination: '横浜・熱海方面', trainType: 'limited' },
      { startHour: 10, endHour: 19, interval: 10, destination: '横浜・熱海方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 18, destination: '横浜・熱海方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 12, destination: '横浜・熱海方面', trainType: 'rapid' },
    ],
  },
  'keihin-tohoku': {
    inbound: [
      { startHour: 5, endHour: 7, interval: 7, destination: '大船方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '大船方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '大船方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '大船方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 5, destination: '大船方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 10, destination: '大船方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 6, destination: '大船方面', trainType: 'rapid' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 7, destination: '大宮方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '大宮方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '大宮方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '大宮方面', trainType: 'local' },
      { startHour: 10, endHour: 19, interval: 5, destination: '大宮方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 10, destination: '大宮方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 6, destination: '大宮方面', trainType: 'rapid' },
    ],
  },
  chuo: {
    inbound: [
      { startHour: 5, endHour: 7, interval: 8, destination: '東京方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '東京方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '東京方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '東京方面', trainType: 'commuter' },
      { startHour: 10, endHour: 19, interval: 6, destination: '東京方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 12, destination: '東京方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 7, destination: '東京方面', trainType: 'rapid' },
    ],
    outbound: [
      { startHour: 5, endHour: 7, interval: 8, destination: '立川・高尾方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '立川・高尾方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 4, destination: '立川・高尾方面', trainType: 'rapid' },
      { startHour: 7, endHour: 10, interval: 9, destination: '立川・高尾方面', trainType: 'commuter' },
      { startHour: 10, endHour: 19, interval: 6, destination: '立川・高尾方面', trainType: 'rapid' },
      { startHour: 10, endHour: 19, interval: 12, destination: '立川・高尾方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 7, destination: '立川・高尾方面', trainType: 'rapid' },
    ],
  },
};

function buildFallbackTimeTable(
  stationId: string,
  lineId: string,
  direction: 'inbound' | 'outbound',
  dayType: DayType
): TimeTable | undefined {
  const cacheKey = `${stationId}:${lineId}:${direction}:${dayType}`;
  const cachedTimeTable = fallbackTimeTableCache.get(cacheKey);

  if (cachedTimeTable) {
    return cachedTimeTable;
  }

  const patterns = fallbackPatternsByLine[lineId]?.[direction];

  if (!patterns) {
    return undefined;
  }

  const trains = patterns.flatMap((pattern, index) => {
    const intervalOffset = dayType === 'weekday' ? 0 : dayType === 'saturday' ? 1 : 2;
    return generateTrainTimes(
      `${stationId}_${lineId}_${direction}_${dayType}_${index}`,
      pattern.startHour,
      pattern.endHour,
      pattern.interval + intervalOffset,
      pattern.destination,
      pattern.trainType || 'local'
    );
  });

  const generatedTimeTable = {
    stationId,
    lineId,
    direction,
    dayType,
    lastUpdated: '2026-03-09T00:00:00Z',
    trains,
  };

  fallbackTimeTableCache.set(cacheKey, generatedTimeTable);

  return generatedTimeTable;
}

// 特定の駅・路線・方向・曜日の時刻表を取得する関数
export function getTimeTable(
  stationId: string,
  lineId: string,
  direction: 'inbound' | 'outbound',
  dayType: DayType
): TimeTable | undefined {
  const exactMatch = timeTables.find(
    table =>
      table.stationId === stationId &&
      table.lineId === lineId &&
      table.direction === direction &&
      table.dayType === dayType
  );

  if (exactMatch) {
    return exactMatch;
  }

  return buildFallbackTimeTable(stationId, lineId, direction, dayType);
}

// 現在時刻から次の電車を取得する関数
export function getNextTrain(timeTable: TimeTable, currentTime: Date): Train | null {
  const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  const nextTrain = timeTable.trains.find(train => train.departureTime > currentTimeStr);

  // 当日中に次の電車がない場合は翌日の最初の電車を返す
  if (!nextTrain && timeTable.trains.length > 0) {
    return timeTable.trains[0];
  }

  return nextTrain || null;
}
