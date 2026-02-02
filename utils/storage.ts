import { Patient, Admission, DailyAssessment } from '../types/nursing';


const STORAGE_KEY_PATIENTS = 'nursing_patients_v3';
const STORAGE_KEY_ADMISSIONS = 'nursing_admissions_v3'; // New
const STORAGE_KEY_ASSESSMENTS_PREFIX = 'nursing_assessment_';

// ダミーデータ生成 (Patients + Admissions)
const generateDummyData = (): { patients: Patient[], admissions: Admission[] } => {
  const patients: Patient[] = [];
  const admissions: Admission[] = [];

  // Helper to add patient & admission
  const add = (id: string, name: string, gender: '1'|'2', birth: string, admDate: string, room: string, isDischarged: boolean = false, extraHistory: boolean = false) => {
      const pid = `p${id}`;
      patients.push({
          id: pid,
          identifier: `100${id}`,
          name: name,
          gender: gender,
          birthDate: birth,
          postalCode: '100-0001',
          address: '東京都千代田区千代田1-1',
          memo: extraHistory ? '入退院を繰り返しています' : (isDischarged ? '退院済み' : '特記事項なし')
      });

      // If extra history, add a past admission
      if (extraHistory) {
          admissions.push({
              id: `adm${id}_past`,
              patientId: pid,
              admissionDate: '2023-01-10',
              dischargeDate: '2023-02-15',
              initialWard: '東病棟',
              initialRoom: '201'
          });
      }

      admissions.push({
          id: `adm${id}`,
          patientId: pid,
          admissionDate: admDate,
          dischargeDate: isDischarged ? '2024-05-20' : undefined, // Set discharge date if discharged
          initialWard: '一般病棟',
          initialRoom: room
      });
  };

  // Create many dummy patients for pagination test
  for(let i=1; i<=60; i++) {
      const num = String(i).padStart(3, '0');
      // Random generation
      const isFemale = i % 2 === 0;
      const birthYear = 1940 + (i % 50); // 1940-1990
      const birthMonth = String((i % 12) + 1).padStart(2, '0');
      const birthDay = String((i % 28) + 1).padStart(2, '0');
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

      const admMonth = String(((i + 3) % 12) + 1).padStart(2, '0');
      const admDay = String(((i + 5) % 28) + 1).padStart(2, '0');
      const admDate = `2024-${admMonth}-${admDay}`;
      
      const wards = ['西病棟', '東病棟', '南病棟'];
      const ward = wards[i % 3];
      const room = `${(i % 5) + 1}0${(i % 10)}`;

      // Logic for discharged and multiple admissions
      const isDischarged = i % 5 === 0; // Every 5th patient is discharged
      const hasHistory = i % 7 === 0;   // Every 7th patient has past history

      add(num, `ダミー 患者${i}`, isFemale ? '2' : '1', birthDate, admDate, room, isDischarged, hasHistory);
      
      // Update ward for the latest admission
      if (admissions.length > 0) {
          admissions[admissions.length - 1].initialWard = ward;
      }
  }

  return { patients, admissions };
};

// データの初期化 (なければダミー作成)
export const initializeStorage = (): Patient[] => {
  if (typeof window === 'undefined') return [];
  
  const storedPatients = localStorage.getItem(STORAGE_KEY_PATIENTS);
  if (storedPatients) {
    return JSON.parse(storedPatients);
  } else {
    const { patients, admissions } = generateDummyData();
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    localStorage.setItem(STORAGE_KEY_ADMISSIONS, JSON.stringify(admissions));
    return patients;
  }
};

// 患者リスト取得
export const getPatients = (): Patient[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
  return stored ? JSON.parse(stored) : [];
};

// 患者保存 (新規・更新)
export const savePatient = (patient: Patient) => {
  if (typeof window === 'undefined') return;
  const patients = getPatients();
  const index = patients.findIndex(p => p.id === patient.id);
  
  if (index >= 0) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
};

// 入院歴取得
export const getAdmissions = (patientId: string): Admission[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_ADMISSIONS);
  const admissions: Admission[] = stored ? JSON.parse(stored) : [];
  return admissions.filter(a => a.patientId === patientId);
};

// 入院歴保存
export const saveAdmission = (admission: Admission) => {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY_ADMISSIONS);
  const admissions: Admission[] = stored ? JSON.parse(stored) : [];
  
  const index = admissions.findIndex(a => a.id === admission.id);
  if (index >= 0) {
    admissions[index] = admission;
  } else {
    admissions.push(admission);
  }
  localStorage.setItem(STORAGE_KEY_ADMISSIONS, JSON.stringify(admissions));
};

// 指定日の入院情報を取得
export const getCurrentAdmission = (patientId: string, date: string): Admission | undefined => {
  const admissions = getAdmissions(patientId);
  return admissions.find(adm => {
    return adm.admissionDate <= date && (!adm.dischargeDate || adm.dischargeDate >= date);
  });
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

// 評価データ削除
export const deleteAssessment = (patientId: string, date: string) => {
  if (typeof window === 'undefined') return;
  const key = getAssessmentKey(patientId, date);
  localStorage.removeItem(key);
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
  const prevDateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  
  return getAssessment(patientId, prevDateStr);
};

// 月次データの取得 (指定月の全データを収集)
export const getMonthlyAssessments = (patientId: string, yearMonth: string): Record<string, DailyAssessment> => {
  if (typeof window === 'undefined') return {};

  const assessments: Record<string, DailyAssessment> = {};
  const prefix = `${STORAGE_KEY_ASSESSMENTS_PREFIX}${patientId}_${yearMonth}`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const assessment = JSON.parse(stored) as DailyAssessment;
        assessments[assessment.date] = assessment;
      }
    }
  }
  return assessments;
};
