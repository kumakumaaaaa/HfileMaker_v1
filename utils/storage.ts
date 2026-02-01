import { Patient, DailyAssessment } from '../types/nursing';

const STORAGE_KEY_PATIENTS = 'nursing_patients';
const STORAGE_KEY_ASSESSMENTS_PREFIX = 'nursing_assessment_';

// ダミーデータ生成
const generateDummyPatients = (): Patient[] => {
  return [
    { id: 'p001', name: '佐藤 太郎', gender: '1', birthday: '1950-01-01', admissionDate: '2024-04-01' },
    { id: 'p002', name: '鈴木 花子', gender: '2', birthday: '1945-05-15', admissionDate: '2024-04-10' },
    { id: 'p003', name: '田中 一郎', gender: '1', birthday: '1960-11-20', admissionDate: '2024-04-05' },
  ];
};

// データの初期化 (なければダミー作成)
export const initializeStorage = (): Patient[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
  if (stored) {
    return JSON.parse(stored);
  } else {
    const dummy = generateDummyPatients();
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(dummy));
    return dummy;
  }
};

// 患者リスト取得
export const getPatients = (): Patient[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
  return stored ? JSON.parse(stored) : [];
};

// 評価データ保存キーの生成
const getAssessmentKey = (patientId: string, date: string) => {
  return `${STORAGE_KEY_ASSESSMENTS_PREFIX}${patientId}_${date}`;
};

// 評価データ保存
export const saveAssessment = (assessment: DailyAssessment) => {
  if (typeof window === 'undefined') return;
  const key = getAssessmentKey(assessment.patientId, assessment.date);
  localStorage.setItem(key, JSON.stringify(assessment));
};

// 評価データ取得
export const getAssessment = (patientId: string, date: string): DailyAssessment | null => {
  if (typeof window === 'undefined') return null;
  const key = getAssessmentKey(patientId, date);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};

// 前日のデータを取得 (日付文字列操作)
export const getPreviousDayAssessment = (patientId: string, currentDate: string): DailyAssessment | null => {
  if (typeof window === 'undefined') return null;
  
  const date = new Date(currentDate);
  if (isNaN(date.getTime())) return null;

  // 1日前
  date.setDate(date.getDate() - 1);
  const prevDateStr = date.toISOString().split('T')[0];
  
  return getAssessment(patientId, prevDateStr);
};

// 月次データの取得 (指定月の全データを収集)
export const getMonthlyAssessments = (patientId: string, yearMonth: string): Record<string, DailyAssessment> => {
  if (typeof window === 'undefined') return {};

  const assessments: Record<string, DailyAssessment> = {};
  const prefix = `${STORAGE_KEY_ASSESSMENTS_PREFIX}${patientId}_${yearMonth}`;

  // localStorageの全キーを走査して、prefixに一致するもの(つまり該当月の日付データ)を探す
  // 日付キー形式: nursing_assessment_{patientId}_{YYYY-MM-DD}
  // ただし prefix が {YYYY-MM} まで含んでいると、前方一致でフィルタ可能
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const assessment = JSON.parse(stored) as DailyAssessment;
        // 日付をキーにして格納
        assessments[assessment.date] = assessment;
      }
    }
  }
  return assessments;
};
