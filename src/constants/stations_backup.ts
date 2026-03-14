import { Station, Line } from '../types';

// 山手線の路線情報
export const yamanoteLine: Line = {
  id: 'yamanote',
  name: '山手線',
  color: '#9ACD32', // 黄緑色（山手線の路線色）
  operator: 'JR東日本',
};

// 小田急線の路線情報
export const odakyuLine: Line = {
  id: 'odakyu',
  name: '小田急小田原線',
  color: '#0066CC', // 小田急の路線色（青）
  operator: '小田急電鉄',
};

// 京王線の路線情報
export const keioLine: Line = {
  id: 'keio',
  name: '京王線',
  color: '#DD0077', // 京王の路線色（マゼンタ）
  operator: '京王電鉄',
};

// その他の主要路線
export const lines: Line[] = [
  yamanoteLine,
  {
    id: 'tokaido',
    name: '東海道線',
    color: '#FF6600',
    operator: 'JR東日本',
  },
  {
    id: 'keihin-tohoku',
    name: '京浜東北線',
    color: '#0088FF',
    operator: 'JR東日本',
  },
  {
    id: 'chuo',
    name: '中央線',
    color: '#FF6600',
    operator: 'JR東日本',
  },
  odakyuLine,
  keioLine,
];

// 山手線主要駅のサンプルデータ
export const stations: Station[] = [
  {
    id: 'tokyo',
    name: '東京',
    nameKana: 'とうきょう',
    latitude: 35.6812405,
    longitude: 139.7671248,
    lines: [yamanoteLine, lines[1], lines[2]], // 山手線、東海道線、京浜東北線
  },
  {
    id: 'shimbashi',
    name: '新橋',
    nameKana: 'しんばし',
    latitude: 35.6664069,
    longitude: 139.7582825,
    lines: [yamanoteLine, lines[1], lines[2]],
  },
  {
    id: 'shinagawa',
    name: '品川',
    nameKana: 'しながわ',
    latitude: 35.6284935,
    longitude: 139.7387413,
    lines: [yamanoteLine, lines[1], lines[2]],
  },
  {
    id: 'osaki',
    name: '大崎',
    nameKana: 'おおさき',
    latitude: 35.6197068,
    longitude: 139.7289901,
    lines: [yamanoteLine],
  },
  {
    id: 'gotanda',
    name: '五反田',
    nameKana: 'ごたんだ',
    latitude: 35.6258688,
    longitude: 139.7238068,
    lines: [yamanoteLine],
  },
  {
    id: 'meguro',
    name: '目黒',
    nameKana: 'めぐろ',
    latitude: 35.6333158,
    longitude: 139.7155073,
    lines: [yamanoteLine],
  },
  {
    id: 'ebisu',
    name: '恵比寿',
    nameKana: 'えびす',
    latitude: 35.6462915,
    longitude: 139.7101629,
    lines: [yamanoteLine],
  },
  {
    id: 'shibuya',
    name: '渋谷',
    nameKana: 'しぶや',
    latitude: 35.6580339,
    longitude: 139.7016358,
    lines: [yamanoteLine],
  },
  {
    id: 'harajuku',
    name: '原宿',
    nameKana: 'はらじゅく',
    latitude: 35.6702242,
    longitude: 139.7026357,
    lines: [yamanoteLine],
  },
  {
    id: 'yoyogi',
    name: '代々木',
    nameKana: 'よよぎ',
    latitude: 35.6833195,
    longitude: 139.7020304,
    lines: [yamanoteLine],
  },
  {
    id: 'shinjuku',
    name: '新宿',
    nameKana: 'しんじゅく',
    latitude: 35.6896067,
    longitude: 139.7005713,
    lines: [yamanoteLine, lines[3], odakyuLine, keioLine], // 山手線、中央線、小田急線、京王線
  },
  {
    id: 'shinokubo',
    name: '新大久保',
    nameKana: 'しんおおくぼ',
    latitude: 35.7016017,
    longitude: 139.7005935,
    lines: [yamanoteLine],
  },
  {
    id: 'takadanobaba',
    name: '高田馬場',
    nameKana: 'たかだのばば',
    latitude: 35.7126804,
    longitude: 139.7038242,
    lines: [yamanoteLine],
  },
  {
    id: 'ikebukuro',
    name: '池袋',
    nameKana: 'いけぶくろ',
    latitude: 35.7300627,
    longitude: 139.7108067,
    lines: [yamanoteLine],
  },
  {
    id: 'otsuka',
    name: '大塚',
    nameKana: 'おおつか',
    latitude: 35.7317788,
    longitude: 139.7289901,
    lines: [yamanoteLine],
  },
  {
    id: 'sugamo',
    name: '巣鴨',
    nameKana: 'すがも',
    latitude: 35.7333158,
    longitude: 139.7386112,
    lines: [yamanoteLine],
  },
  {
    id: 'komagome',
    name: '駒込',
    nameKana: 'こまごめ',
    latitude: 35.7362358,
    longitude: 139.7464682,
    lines: [yamanoteLine],
  },
  {
    id: 'tabata',
    name: '田端',
    nameKana: 'たばた',
    latitude: 35.7378067,
    longitude: 139.7608957,
    lines: [yamanoteLine, lines[2]], // 山手線、京浜東北線
  },
  {
    id: 'nippori',
    name: '日暮里',
    nameKana: 'にっぽり',
    latitude: 35.7281026,
    longitude: 139.7713012,
    lines: [yamanoteLine, lines[2]],
  },
  {
    id: 'uguisudani',
    name: '鶯谷',
    nameKana: 'うぐいすだに',
    latitude: 35.7210068,
    longitude: 139.7776357,
    lines: [yamanoteLine],
  },
  {
    id: 'ueno',
    name: '上野',
    nameKana: 'うえの',
    latitude: 35.7137917,
    longitude: 139.7773972,
    lines: [yamanoteLine, lines[1], lines[2]], // 山手線、東海道線、京浜東北線
  },
  {
    id: 'okachimachi',
    name: '御徒町',
    nameKana: 'おかちまち',
    latitude: 35.7077242,
    longitude: 139.7743972,
    lines: [yamanoteLine, lines[2]],
  },
  {
    id: 'akihabara',
    name: '秋葉原',
    nameKana: 'あきはばら',
    latitude: 35.7020304,
    longitude: 139.7743972,
    lines: [yamanoteLine, lines[2]],
  },
  {
    id: 'kanda',
    name: '神田',
    nameKana: 'かんだ',
    latitude: 35.6913842,
    longitude: 139.7710435,
    lines: [yamanoteLine, lines[2]],
  },

  // === 小田急線の駅 ===
  {
    id: 'yoyogi-uehara',
    name: '代々木上原',
    nameKana: 'よよぎうえはら',
    latitude: 35.6699642,
    longitude: 139.6822201,
    lines: [odakyuLine],
  },
  {
    id: 'shimokitazawa',
    name: '下北沢',
    nameKana: 'しもきたざわ',
    latitude: 35.6613067,
    longitude: 139.6681825,
    lines: [odakyuLine],
  },
  {
    id: 'seijogakuen-mae',
    name: '成城学園前',
    nameKana: 'せいじょうがくえんまえ',
    latitude: 35.6372201,
    longitude: 139.6044825,
    lines: [odakyuLine],
  },
  {
    id: 'noborito',
    name: '登戸',
    nameKana: 'のぼりと',
    latitude: 35.6208358,
    longitude: 139.5582012,
    lines: [odakyuLine],
  },
  {
    id: 'shin-yurigaoka',
    name: '新百合ヶ丘',
    nameKana: 'しんゆりがおか',
    latitude: 35.6008358,
    longitude: 139.5082012,
    lines: [odakyuLine],
  },
  {
    id: 'machida',
    name: '町田',
    nameKana: 'まちだ',
    latitude: 35.5408358,
    longitude: 139.4482012,
    lines: [odakyuLine],
  },
  {
    id: 'hon-atsugi',
    name: '本厚木',
    nameKana: 'ほんあつぎ',
    latitude: 35.4448358,
    longitude: 139.3682012,
    lines: [odakyuLine],
  },
  {
    id: 'odawara',
    name: '小田原',
    nameKana: 'おだわら',
    latitude: 35.2565201,
    longitude: 139.1560825,
    lines: [odakyuLine],
  },

  // === 京王線の駅 ===
  {
    id: 'sasazuka',
    name: '笹塚',
    nameKana: 'ささづか',
    latitude: 35.6725067,
    longitude: 139.6865713,
    lines: [keioLine],
  },
  {
    id: 'meidai-mae',
    name: '明大前',
    nameKana: 'めいだいまえ',
    latitude: 35.6585067,
    longitude: 139.6365713,
    lines: [keioLine],
  },
  {
    id: 'shimo-takaido',
    name: '下高井戸',
    nameKana: 'しもたかいど',
    latitude: 35.6485067,
    longitude: 139.6165713,
    lines: [keioLine],
  },
  {
    id: 'chitose-karasuyama',
    name: '千歳烏山',
    nameKana: 'ちとせからすやま',
    latitude: 35.6625067,
    longitude: 139.5965713,
    lines: [keioLine],
  },
  {
    id: 'chofu',
    name: '調布',
    nameKana: 'ちょうふ',
    latitude: 35.6515068,
    longitude: 139.5417825,
    lines: [keioLine],
  },
  {
    id: 'bubaigawara',
    name: '分倍河原',
    nameKana: 'ぶばいがわら',
    latitude: 35.6695068,
    longitude: 139.4817825,
    lines: [keioLine],
  },
  {
    id: 'fuchu',
    name: '府中',
    nameKana: 'ふちゅう',
    latitude: 35.6695068,
    longitude: 139.4617825,
    lines: [keioLine],
  },
  {
    id: 'seiseki-sakuragaoka',
    name: '聖蹟桜ヶ丘',
    nameKana: 'せいせきさくらがおか',
    latitude: 35.6545068,
    longitude: 139.4417825,
    lines: [keioLine],
  },
  {
    id: 'takahata-fudo',
    name: '高幡不動',
    nameKana: 'たかはたふどう',
    latitude: 35.6595068,
    longitude: 139.4117825,
    lines: [keioLine],
  },
  {
    id: 'tama-center',
    name: '多摩センター',
    nameKana: 'たまセンター',
    latitude: 35.6245068,
    longitude: 139.3917825,
    lines: [keioLine],
  },
];

// 駅をIDで検索するためのマップ
export const stationMap = new Map<string, Station>(
  stations.map(station => [station.id, station])
);

// 路線をIDで検索するためのマップ
export const lineMap = new Map<string, Line>(
  lines.map(line => [line.id, line])
);