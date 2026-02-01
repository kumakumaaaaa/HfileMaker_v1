/**
 * 看護必要度に関連する型定義
 */

// 項目の定義情報
export interface NursingItemDefinition {
  id: string;
  category: 'a' | 'b' | 'c';
  label: string;
  points: number; // A/C項目の点数、あるいはB項目の最大点数等の参考値
  description?: string;
  inputType: 'checkbox' | 'radio' | 'select'; // 入力UIタイプ
  options?: { label: string; value: number; explanation?: string }[]; // 選択肢がある場合 (B項目など)
  hasAssistance?: boolean; // B項目: 介助の実施有無を掛け合わせるか
}

// 項目定義リスト (令和6年度診療報酬改定を参考にした代表的な項目)
export const ITEM_DEFINITIONS: NursingItemDefinition[] = [
  // --- A項目 (モニタリング及び処置等) ---
  { id: 'a_wounds', category: 'a', label: '創傷処置', points: 1, inputType: 'checkbox' }, // 創傷処置 (褥瘡処置を除く)
  { id: 'a_respiratory', category: 'a', label: '呼吸ケア', points: 1, inputType: 'checkbox' }, // 呼吸ケア（喀痰吸引、人工呼吸器等）
  { id: 'a_infusion', category: 'a', label: '点滴ライン同時3本以上の管理', points: 1, inputType: 'checkbox' },
  { id: 'a_ecg', category: 'a', label: '心電図モニターの管理', points: 1, inputType: 'checkbox' },
  { id: 'a_syringe_driver', category: 'a', label: 'シリンジポンプの管理', points: 1, inputType: 'checkbox' },
  { id: 'a_emergency', category: 'a', label: '救急搬送後の入院/緊急入院(2日間)', points: 2, inputType: 'checkbox' }, // 令和6年改定で5日->2日
  { id: 'a_special', category: 'a', label: '専門的な治療・処置(抗悪性腫瘍剤等)', points: 3, inputType: 'checkbox' }, // 一部3点へ引き上げ

  // --- B項目 (患者の状況等) ---
  // 寝返り: 介助有無の概念なし (状態スコアのみ)
  { 
    id: 'b_bed_mobility', category: 'b', label: '寝返り', points: 2, inputType: 'select', 
    hasAssistance: false,
    options: [
      { label: 'できる(0点)', value: 0, explanation: '手すり等を使わずに自力で寝返りができる' },
      { label: '何かにつかまればできる(1点)', value: 1, explanation: '柵や介助バーを使用すれば可能' },
      { label: 'できない(2点)', value: 2, explanation: '自力では全くできない、または医学的安静で禁止されている' }
    ]
  },
  // 移乗: 介助実施との掛け算
  { 
    id: 'b_transfer', category: 'b', label: '移乗', points: 2, inputType: 'select',
    hasAssistance: true,
    options: [
      { label: '自立(0点)', value: 0, explanation: '乗り移り動作が自力で可能、または介助不要' },
      { label: '一部介助(1点)', value: 1, explanation: '見守りや手を添える程度の介助が必要' },
      { label: '全介助(2点)', value: 2, explanation: '抱え上げなど、人的な力が全面的に必要' }
    ]
  },
  // 口腔清潔: 介助実施との掛け算 (0, 1点のみ)
  {
    id: 'b_oral_care', category: 'b', label: '口腔清潔', points: 1, inputType: 'select',
    hasAssistance: true,
    options: [
      { label: '自立(0点)', value: 0, explanation: '準備から実施まで一人で完結できる' },
      { label: '要介助(1点)', value: 1, explanation: '物品の準備や仕上げ磨きなどに介助が必要' }
    ]
  },
  // 食事摂取: 介助実施との掛け算
  {
    id: 'b_eating', category: 'b', label: '食事摂取', points: 2, inputType: 'select',
    hasAssistance: true,
    options: [
      { label: '自立(0点)', value: 0, explanation: '配膳された食事を自力で摂取できる' },
      { label: '一部介助(1点)', value: 1, explanation: '小さく刻む、蓋を開ける、一部介助などが必要' },
      { label: '全介助(2点)', value: 2, explanation: '経管栄養を含む、全ての摂取に介助が必要' }
    ]
  },
  // 衣服の着脱: 介助実施との掛け算
  {
    id: 'b_clothes', category: 'b', label: '衣服の着脱', points: 2, inputType: 'select',
    hasAssistance: true,
    options: [
      { label: '自立(0点)', value: 0, explanation: 'ボタン留め等含め、全て一人で可能' },
      { label: '一部介助(1点)', value: 1, explanation: '背中を整える、靴下を履くなどに介助が必要' },
      { label: '全介助(2点)', value: 2, explanation: '自分では着脱がほとんどできない' }
    ]
  },
  // 指示が通じる: 介助有無なし
  {
    id: 'b_instruction', category: 'b', label: '診療・療養上の指示が通じる', points: 1, inputType: 'select',
    hasAssistance: false,
    options: [
      { label: 'はい(0点)', value: 0 },
      { label: 'いいえ(1点)', value: 1 }
    ]
  },
  // 危険行動: 介助有無なし (0か2)
  {
    id: 'b_danger', category: 'b', label: '危険行動', points: 2, inputType: 'select',
    hasAssistance: false,
    options: [
      { label: 'ない(0点)', value: 0 },
      { label: 'ある(2点)', value: 2 }
    ]
  },

  // --- C項目 (手術等の医学的状況) ---
  { id: 'c_thoraco', category: 'c', label: '開胸手術(9日間)', points: 1, inputType: 'checkbox' },
  { id: 'c_laparo', category: 'c', label: '開腹手術(6日間)', points: 1, inputType: 'checkbox' },
  { id: 'c_craniotomy', category: 'c', label: '開頭手術(11日間)', points: 1, inputType: 'checkbox' },
  { id: 'c_other_surgery', category: 'c', label: 'その他手術(5日間)', points: 1, inputType: 'checkbox' },
];

/**
 * 患者情報
 */
export type Patient = {
  id: string;         // データ識別番号
  name: string;       // データ識別名
  gender: '1' | '2';  // 性別 (1:男, 2:女)
  birthday: string;   // 生年月日 (YYYY-MM-DD)
  admissionDate: string; // 入院年月日 (YYYY-MM-DD)
};

/**
 * 日次評価データ
 */
export type DailyAssessment = {
  patientId: string;
  date: string;       // 実施日 (YYYY-MM-DD)
  items: Record<string, boolean | number>; // 評価項目の値 (入力状態)
  admissionFeeId: string; // 選択された入院料ID
  scores: { a: number; b: number; c: number }; // 計算されたスコア
  isSevere: boolean;     // 判定結果（重症該当か）
};

// 看護必要度評価（日々の評価レコードなど）
export interface NursingAssessment {
  // scoreA, scoreB, scoreC は計算結果として保持してもよいが、入力そのものは items に保持
  
  /**
   * 各項目の入力値
   * key: itemId
   * value: boolean (checkbox) | number (select/points)
   */
  items: Record<string, boolean | number>;

  // 計算済みスコア (オプション)
  scoreA?: number;
  scoreB?: number;
  scoreC?: number;
}

/**
 * 看護必要度の判定基準定数
 */
export const NURSING_STANDARDS = {
  ACUTE_GENERAL_5: {
    id: 'acute_general_5',
    name: '急性期一般入院料5',
    // 必要度Iの場合の例（具体的な点数は改定ごとに変動するため、定数化しておく）
    thresholds: {
      pattern1: { a: 2, b: 3 }, // A項目2点以上 かつ B項目3点以上
      pattern2: { c: 1 },       // または C項目1点以上
    }
  }
} as const;
