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
  inputType: 'checkbox' | 'radio' | 'select'; // 入力UIタイプ (checkbox should be treated as tri-state: 1/0/null)
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
export interface Patient {
  id: string; // System ID
  identifier: string; // 患者識別番号
  name: string; // 氏名
  gender: '1' | '2' | '3'; // 1:男性, 2:女性, 3:その他
  birthDate: string; // YYYY-MM-DD
  postalCode?: string;
  address?: string;
  excludeFromAssessment?: boolean;
  memo?: string;
}

// 病棟マスタ
export type WardType = '一般病棟' | '精神病棟' | 'その他';

export interface Ward {
  code: string;
  name: string;
  type: WardType;
  startDate?: string;
  endDate?: string;
}

// 病室マスタ
export interface Room {
  code: string;
  wardCode: string; // Link to Ward
  name: string;
  startDate?: string;
  endDate?: string;
}

// 異動履歴（転棟・転床・外泊）
export type MovementType = 'transfer_ward' | 'transfer_room' | 'overnight'; // transfer_ward=転棟, transfer_room=転床, overnight=外泊

export interface Movement {
  id: string;
  type: MovementType;
  date: string; // 発生日 (転棟・転床日または外泊開始日)
  endDate?: string; // 外泊終了日 (外泊のみ使用、転棟・転床は次回異動まで継続とみなす)
  
  // 転棟・転床先
  ward?: string;
  room?: string;
  
  // 外泊などのメモ
  note?: string;
}

// 入院歴
export interface Admission {
  id: string;
  patientId: string;
  admissionDate: string; // YYYY-MM-DD
  dischargeDate?: string | null; // YYYY-MM-DD or null
  initialWard?: string;
  initialRoom?: string;
  movements?: Movement[];
}

/**
 * 日次評価データ
 */
export interface DailyAssessment {
  id: string; // YYYY-MM-DD_admissionId
  admissionId: string;
  date: string; // YYYY-MM-DD
  admissionFeeId: string; // 選択された入院料ID (評価基準)
  
  // 評価内容
  // 評価内容
  items: Record<string, number | null>; 

  // 自動計算結果
  scores: {
    a: number;
    b: number;
    c: number;
  };
  
  // 重症度判定
  isSevere: boolean;

  // 評価時点の場所 (Phase 2 Additions)
  ward?: string;
  room?: string;
}

// 看護必要度評価（日々の評価レコードなど）
export interface NursingAssessment {
  // scoreA, scoreB, scoreC は計算結果として保持してもよいが、入力そのものは items に保持
  
  /**
   * key: itemId
   * value: number (1=Yes, 0=No, select value) | null (Unset)
   * (Previous boolean support deprecated, migrate to 1/0)
   */
  items: Record<string, number | null>;

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

// --- Account Master ---
export type UserRole = '入力者' | '評価者' | '管理者';
export type AccountAuthority = '一般アカウント' | '施設管理者アカウント' | 'システム管理者アカウント';

export interface UserAccount {
  id: string; // Internal UUID
  userId: string; // Login ID
  name: string; // User Name
  password: string; 
  role: UserRole; // ユーザータイプ
  authority: AccountAuthority; // アカウントタイプ
  startDate?: string;
  endDate?: string;
}
