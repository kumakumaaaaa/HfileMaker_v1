import { NursingAssessment, NURSING_STANDARDS, ITEM_DEFINITIONS } from '../types/nursing';

/**
 * 重症患者（看護必要度を満たす患者）かどうかを判定する
 * 
 * @param admissionFeeId 選択された入院料のID (例: 'acute_general_5')
 * @param assessment 患者の評価データ (各項目の入力値 items 等)
 * @returns 基準を満たす場合は true、満たさない場合は false
 */
export function evaluatePatient(admissionFeeId: string, assessment: NursingAssessment): boolean {
  // アイテムごとのスコア計算
  let calculatedScoreA = 0;
  let calculatedScoreB = 0;
  let calculatedScoreC = 0;

  const items = assessment.items || {};

  ITEM_DEFINITIONS.forEach(def => {
    const value = items[def.id];
    
    if (def.category === 'a') {
      // A項目: チェックされていれば定義された点数を加算
      if (value === true) {
        calculatedScoreA += def.points;
      }
    } else if (def.category === 'c') {
      // C項目: チェックされていれば定義された点数を加算
      if (value === true) {
        calculatedScoreC += def.points;
      }
    } else if (def.category === 'b') {
      // B項目
      // value は選択された状態(0, 1, 2)
      if (typeof value === 'number') {
        let points = value;

        // 介助実施の概念がある項目は、介助フラグ(1 or 0)を掛け合わせる
        if (def.hasAssistance) {
           const assistValue = items[`${def.id}_assist`];
           // 介助実施(1)でなければ0点になる
           const multiplier = (typeof assistValue === 'number') ? assistValue : 0;
           points = points * multiplier;
        }

        calculatedScoreB += points;
      }
    }
  });

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
