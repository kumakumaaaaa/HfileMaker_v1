import { NursingAssessment, NURSING_STANDARDS, ITEM_DEFINITIONS } from '../types/nursing';

/**
 * 重症患者（看護必要度を満たす患者）かどうかを判定する
 * 
 * @param admissionFeeId 選択された入院料のID (例: 'acute_general_5')
 * @param assessment 患者の評価データ (各項目の入力値 items 等)
 * @returns 基準を満たす場合は true、満たさない場合は false
 */
/**
 * 各項目のスコアを計算する
 * @param items 入力項目
 * @returns { a: number, b: number, c: number }
 */
export function calculateScores(items: Record<string, boolean | number>) {
  let calculatedScoreA = 0;
  let calculatedScoreB = 0;
  let calculatedScoreC = 0;

  ITEM_DEFINITIONS.forEach(def => {
    const value = items[def.id];
    
    if (def.category === 'a') {
      if (value === true) calculatedScoreA += def.points;
    } else if (def.category === 'c') {
      if (value === true) calculatedScoreC += def.points;
    } else if (def.category === 'b') {
      if (typeof value === 'number') {
        let points = value;
        if (def.hasAssistance) {
           const assistValue = items[`${def.id}_assist`];
           const multiplier = (typeof assistValue === 'number') ? assistValue : 0;
           points = points * multiplier;
        }
        calculatedScoreB += points;
      }
    }
  });

  return { a: calculatedScoreA, b: calculatedScoreB, c: calculatedScoreC };
}

export function evaluatePatient(admissionFeeId: string, assessment: NursingAssessment): boolean {
  // アイテムごとのスコア計算
  const items = assessment.items || {};
  const { a: calculatedScoreA, b: calculatedScoreB, c: calculatedScoreC } = calculateScores(items);

  // assessmentオブジェクトに計算済みスコアがあればそれを優先（上書き等の場合）、なければ計算値を使用
  const scoreA = assessment.scoreA ?? calculatedScoreA;
  const scoreB = assessment.scoreB ?? calculatedScoreB;
  const scoreC = assessment.scoreC ?? calculatedScoreC;

  // 急性期一般入院料5 の判定ロジック
  if (admissionFeeId === NURSING_STANDARDS.ACUTE_GENERAL_5.id) {
    const thresholds = NURSING_STANDARDS.ACUTE_GENERAL_5.thresholds;
    
    // パターン1: A項目2点以上 かつ B項目3点以上
    const pattern1 = (scoreA >= (thresholds.pattern1.a ?? 0)) && (scoreB >= (thresholds.pattern1.b ?? 0));
    
    // パターン2: C項目1点以上
    const pattern2 = scoreC >= (thresholds.pattern2.c ?? 0);

    // いずれかのパターンを満たせば重症
    return pattern1 || pattern2;
  }

  // 未定義の入院料の場合は false (またはエラー) を返す
  console.warn(`Unknown admission fee ID: ${admissionFeeId}`);
  return false;
}
