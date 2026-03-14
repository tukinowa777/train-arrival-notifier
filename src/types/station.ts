// 駅の情報
export interface Station {
  id: string;
  name: string;
  nameKana: string;
  latitude: number;
  longitude: number;
  lines: Line[];
  isFavorite?: boolean;
}

// 路線の情報
export interface Line {
  id: string;
  name: string;
  color: string;
  operator: string;
}

// 駅と路線の関係
export interface StationLine {
  stationId: string;
  lineId: string;
  direction?: 'inbound' | 'outbound' | 'both'; // 上り・下り・両方向
}