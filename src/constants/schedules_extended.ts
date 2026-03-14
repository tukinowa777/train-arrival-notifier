import { TimeTable, Train, DayType, TrainType } from '../types';

// 時刻表生成ヘルパー関数
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
      // 最終電車をスキップしない
      if (hour === 23 && minute >= 50) {
        continue;
      }

      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      trains.push({
        id: `${baseId}_${trainCounter}`,
        trainType,
        destination,
        departureTime: timeStr,
        track: 1,
        isLast: hour >= 23 && minute >= 45,
      });
      trainCounter++;
    }
  }

  return trains;
}

// 複数時刻パターンを結合
function createComplexSchedule(
  patterns: Array<{
    startHour: number;
    endHour: number;
    interval: number;
    destination: string;
    trainType?: TrainType;
  }>,
  baseId: string
): Train[] {
  let allTrains: Train[] = [];

  patterns.forEach((pattern, index) => {
    const trains = generateTrainTimes(
      `${baseId}_${index}`,
      pattern.startHour,
      pattern.endHour,
      pattern.interval,
      pattern.destination,
      pattern.trainType || 'local'
    );
    allTrains = allTrains.concat(trains);
  });

  return allTrains.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

// 時刻表データ配列
export const schedules: TimeTable[] = [
  // ============ JR山手線 ============

  // 新宿駅 内回り（平日）
  {
    stationId: 'shinjuku',
    lineId: 'yamanote',
    direction: 'inbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '大崎・品川方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '大崎・品川方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '大崎・品川方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '大崎・品川方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '大崎・品川方面' },
    ], 'sj_in_wd'),
  },

  // 新宿駅 外回り（平日）
  {
    stationId: 'shinjuku',
    lineId: 'yamanote',
    direction: 'outbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '池袋・上野方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '池袋・上野方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '池袋・上野方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '池袋・上野方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '池袋・上野方面' },
    ], 'sj_out_wd'),
  },

  // 東京駅 内回り（平日）
  {
    stationId: 'tokyo',
    lineId: 'yamanote',
    direction: 'inbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '品川・新宿方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '品川・新宿方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '品川・新宿方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '品川・新宿方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '品川・新宿方面' },
    ], 'tk_in_wd'),
  },

  // 東京駅 外回り（平日）
  {
    stationId: 'tokyo',
    lineId: 'yamanote',
    direction: 'outbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '上野・池袋方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '上野・池袋方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '上野・池袋方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '上野・池袋方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '上野・池袋方面' },
    ], 'tk_out_wd'),
  },

  // 渋谷駅 内回り（平日）
  {
    stationId: 'shibuya',
    lineId: 'yamanote',
    direction: 'inbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '恵比寿・品川方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '恵比寿・品川方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '恵比寿・品川方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '恵比寿・品川方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '恵比寿・品川方面' },
    ], 'sb_in_wd'),
  },

  // 池袋駅 内回り（平日）
  {
    stationId: 'ikebukuro',
    lineId: 'yamanote',
    direction: 'inbound',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 5, destination: '新宿・渋谷方面' },
      { startHour: 7, endHour: 10, interval: 2, destination: '新宿・渋谷方面' },
      { startHour: 10, endHour: 16, interval: 4, destination: '新宿・渋谷方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '新宿・渋谷方面' },
      { startHour: 19, endHour: 24, interval: 3, destination: '新宿・渋谷方面' },
    ], 'ik_in_wd'),
  },

  // ============ 東京メトロ銀座線 ============

  // 銀座駅 上野方面（平日）
  {
    stationId: 'ginza',
    lineId: 'ginza',
    direction: 'ueno',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 4, destination: '日本橋・上野方面' },
      { startHour: 7, endHour: 10, interval: 3, destination: '日本橋・上野方面' },
      { startHour: 10, endHour: 16, interval: 5, destination: '日本橋・上野方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '日本橋・上野方面' },
      { startHour: 19, endHour: 24, interval: 4, destination: '日本橋・上野方面' },
    ], 'gz_ueno_wd'),
  },

  // 銀座駅 渋谷方面（平日）
  {
    stationId: 'ginza',
    lineId: 'ginza',
    direction: 'shibuya',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 4, destination: '新橋・渋谷方面' },
      { startHour: 7, endHour: 10, interval: 3, destination: '新橋・渋谷方面' },
      { startHour: 10, endHour: 16, interval: 5, destination: '新橋・渋谷方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '新橋・渋谷方面' },
      { startHour: 19, endHour: 24, interval: 4, destination: '新橋・渋谷方面' },
    ], 'gz_shibuya_wd'),
  },

  // 上野駅 渋谷方面（平日）
  {
    stationId: 'ueno',
    lineId: 'ginza',
    direction: 'shibuya',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 4, destination: '銀座・渋谷方面' },
      { startHour: 7, endHour: 10, interval: 3, destination: '銀座・渋谷方面' },
      { startHour: 10, endHour: 16, interval: 5, destination: '銀座・渋谷方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '銀座・渋谷方面' },
      { startHour: 19, endHour: 24, interval: 4, destination: '銀座・渋谷方面' },
    ], 'ueno_shibuya_wd'),
  },

  // 表参道駅 浅草方面（平日）
  {
    stationId: 'omotesando',
    lineId: 'ginza',
    direction: 'asakusa',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 4, destination: '銀座・浅草方面' },
      { startHour: 7, endHour: 10, interval: 3, destination: '銀座・浅草方面' },
      { startHour: 10, endHour: 16, interval: 5, destination: '銀座・浅草方面' },
      { startHour: 16, endHour: 19, interval: 3, destination: '銀座・浅草方面' },
      { startHour: 19, endHour: 24, interval: 4, destination: '銀座・浅草方面' },
    ], 'omo_asakusa_wd'),
  },

  // ============ 小田急小田原線 ============

  // 新宿駅 小田原方面（平日）
  {
    stationId: 'shinjuku',
    lineId: 'odakyu',
    direction: 'odawara',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 8, destination: '下北沢・成城学園前方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 15, destination: '町田・小田原方面', trainType: 'express' },
      { startHour: 7, endHour: 10, interval: 4, destination: '下北沢・成城学園前方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 8, destination: '町田・小田原方面', trainType: 'express' },
      { startHour: 10, endHour: 16, interval: 6, destination: '下北沢・成城学園前方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 12, destination: '町田・小田原方面', trainType: 'express' },
      { startHour: 16, endHour: 19, interval: 4, destination: '下北沢・成城学園前方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 8, destination: '町田・小田原方面', trainType: 'express' },
      { startHour: 19, endHour: 24, interval: 6, destination: '下北沢・成城学園前方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 12, destination: '町田・小田原方面', trainType: 'express' },
    ], 'sj_odakyu_wd'),
  },

  // 下北沢駅 新宿方面（平日）
  {
    stationId: 'shimokitazawa',
    lineId: 'odakyu',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 8, destination: '代々木上原・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 4, destination: '代々木上原・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 6, destination: '代々木上原・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 4, destination: '代々木上原・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 6, destination: '代々木上原・新宿方面', trainType: 'local' },
    ], 'sk_shinjuku_wd'),
  },

  // 成城学園前駅 新宿方面（平日）
  {
    stationId: 'seijo-gakuenmae',
    lineId: 'odakyu',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 8, destination: '下北沢・新宿方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 15, destination: '新宿方面', trainType: 'express' },
      { startHour: 7, endHour: 10, interval: 4, destination: '下北沢・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 10, endHour: 16, interval: 6, destination: '下北沢・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 12, destination: '新宿方面', trainType: 'express' },
      { startHour: 16, endHour: 19, interval: 4, destination: '下北沢・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 19, endHour: 24, interval: 6, destination: '下北沢・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 12, destination: '新宿方面', trainType: 'express' },
    ], 'sg_shinjuku_wd'),
  },

  // 町田駅 新宿方面（平日）
  {
    stationId: 'machida',
    lineId: 'odakyu',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 8, destination: '成城学園前・新宿方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 15, destination: '新宿方面', trainType: 'express' },
      { startHour: 7, endHour: 10, interval: 4, destination: '成城学園前・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 10, endHour: 16, interval: 6, destination: '成城学園前・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 12, destination: '新宿方面', trainType: 'express' },
      { startHour: 16, endHour: 19, interval: 4, destination: '成城学園前・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 19, endHour: 24, interval: 6, destination: '成城学園前・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 12, destination: '新宿方面', trainType: 'express' },
    ], 'mc_shinjuku_wd'),
  },

  // ============ 京王線 ============

  // 新宿駅 八王子方面（平日）
  {
    stationId: 'shinjuku',
    lineId: 'keio',
    direction: 'hachioji',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 6, destination: '明大前・調布方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '調布・橋本方面', trainType: 'express' },
      { startHour: 7, endHour: 10, interval: 4, destination: '明大前・調布方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 8, destination: '調布・橋本方面', trainType: 'express' },
      { startHour: 10, endHour: 16, interval: 6, destination: '明大前・調布方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 10, destination: '調布・橋本方面', trainType: 'express' },
      { startHour: 16, endHour: 19, interval: 4, destination: '明大前・調布方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 8, destination: '調布・橋本方面', trainType: 'express' },
      { startHour: 19, endHour: 24, interval: 6, destination: '明大前・調布方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 10, destination: '調布・橋本方面', trainType: 'express' },
    ], 'sj_keio_wd'),
  },

  // 明大前駅 新宿方面（平日）
  {
    stationId: 'meidaimae',
    lineId: 'keio',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 6, destination: '笹塚・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 4, destination: '笹塚・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 6, destination: '笹塚・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 4, destination: '笹塚・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 6, destination: '笹塚・新宿方面', trainType: 'local' },
    ], 'md_shinjuku_wd'),
  },

  // 調布駅 新宿方面（平日）
  {
    stationId: 'chofu',
    lineId: 'keio',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 6, destination: '明大前・新宿方面', trainType: 'local' },
      { startHour: 5, endHour: 7, interval: 12, destination: '新宿方面', trainType: 'express' },
      { startHour: 7, endHour: 10, interval: 4, destination: '明大前・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 10, endHour: 16, interval: 6, destination: '明大前・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 10, destination: '新宿方面', trainType: 'express' },
      { startHour: 16, endHour: 19, interval: 4, destination: '明大前・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 8, destination: '新宿方面', trainType: 'express' },
      { startHour: 19, endHour: 24, interval: 6, destination: '明大前・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 10, destination: '新宿方面', trainType: 'express' },
    ], 'cf_shinjuku_wd'),
  },

  // 仙川駅 新宿方面（平日）
  {
    stationId: 'sengawa',
    lineId: 'keio',
    direction: 'shinjuku',
    dayType: 'weekday',
    lastUpdated: '2026-03-05T00:00:00Z',
    trains: createComplexSchedule([
      { startHour: 5, endHour: 7, interval: 6, destination: '調布・新宿方面', trainType: 'local' },
      { startHour: 7, endHour: 10, interval: 4, destination: '調布・新宿方面', trainType: 'local' },
      { startHour: 10, endHour: 16, interval: 6, destination: '調布・新宿方面', trainType: 'local' },
      { startHour: 16, endHour: 19, interval: 4, destination: '調布・新宿方面', trainType: 'local' },
      { startHour: 19, endHour: 24, interval: 6, destination: '調布・新宿方面', trainType: 'local' },
    ], 'sg_shinjuku_wd'),
  },
];

// 土曜・休日ダイヤは平日の間隔を少し緩めたバージョン
export const weekendSchedules: TimeTable[] = schedules.map(schedule => ({
  ...schedule,
  dayType: 'saturday' as DayType,
  trains: schedule.trains.filter((_, index) => index % 2 === 0), // 本数を半減
}));

export const holidaySchedules: TimeTable[] = schedules.map(schedule => ({
  ...schedule,
  dayType: 'holiday' as DayType,
  trains: schedule.trains.filter((_, index) => index % 3 === 0), // 本数を1/3に
}));

// 全時刻表データを統合
export const allSchedules: TimeTable[] = [
  ...schedules,
  ...weekendSchedules,
  ...holidaySchedules,
];

// 時刻表検索ヘルパー
export const getSchedule = (
  stationId: string,
  lineId: string,
  direction: string,
  dayType: DayType
): TimeTable | undefined => {
  return allSchedules.find(
    schedule =>
      schedule.stationId === stationId &&
      schedule.lineId === lineId &&
      schedule.direction === direction &&
      schedule.dayType === dayType
  );
};

export const getStationSchedules = (
  stationId: string,
  lineId: string,
  dayType: DayType
): TimeTable[] => {
  return allSchedules.filter(
    schedule =>
      schedule.stationId === stationId &&
      schedule.lineId === lineId &&
      schedule.dayType === dayType
  );
};