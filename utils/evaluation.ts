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
// Update parameter type from `boolean | number` to `number | null` (or just `any` to be safe during migration but prefer strict)
export function calculateScores(items: Record<string, number | null>) {
  let calculatedScoreA = 0;
  let calculatedScoreB = 0;
  let calculatedScoreC = 0;

  ITEM_DEFINITIONS.forEach(def => {
    const value = items[def.id];
    
    if (def.category === 'a') {
      // Changed from `value === true` to `typeof value === 'number' && value > 0`
      // Assumes 1=Yes, 0=No. 
      if (typeof value === 'number' && value > 0) calculatedScoreA += def.points;
    } else if (def.category === 'c') {
      if (typeof value === 'number' && value > 0) calculatedScoreC += def.points;
    } else if (def.category === 'b') {
      if (typeof value === 'number') {
        let points = value;
        if (def.hasAssistance) {
           const assistValue = items[`${def.id}_assist`];
           // Assist Value: 1=Mediated, 0=None? Or 1=Yes? 
           // In B item options, distinct from assistance. 
           // Assistance is strictly "Implemented". 
           // If assistance is toggled ON, usually it's 1. 
           // Current logic: `multiplier = assistValue`. If 1, score remains. If 0?
           // Actually `hasAssistance`: 
           //   - Transfer/Eating/Clothes: Points * Assistance?
           //   - Let's check `ITEM_DEFINITIONS`.
           //   - E.g. Transfer: 
           //       0 (Independent)
           //       1 (Partial)
           //       2 (Full)
           // If Assistance is YES? 
           // Logic says: "介助の実施有無を掛け合わせる".
           // If assistance is implemented, score counts? Or doubled?
           // Actually, `assistance` usually means "Was assistance provided?". 
           // If patient is Independent (0), assistance should be No.
           // If Dependent (1 or 2), assistance Yes.
           // The "score" is the value selected (0, 1, 2).
           // The "assistance" might multiply it?
           // Wait, previous code was: `points = points * multiplier`.
           // If assistValue starts as undefined, multiplier=0 => points=0.
           // This implies that if you don't check "Assistance provided", you get 0 points even if you selected "Full Help"?
           // That sounds wrong. "Full Help" implies you MUST provide assistance.
           // But maybe the rule is: "If you didn't provide assistance, you don't get points".
           // Let's keep logic same as before but safe check number.
           const multiplier = (typeof assistValue === 'number') ? assistValue : 0; // Default to 0?
           // Current code used 0 default. So if assist is unset, score is 0. 
           // But now we allow explicit 0.
           // If explicit 0 (No Assitance), score 0.
           // If null (Unset), score 0.
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
