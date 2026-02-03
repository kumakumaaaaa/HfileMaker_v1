import { Patient, Admission, DailyAssessment, Ward, Room, UserAccount } from '../types/nursing';

const STORAGE_KEY_PATIENTS = 'nursing_patients_v7'; // Bump version for new masters
const STORAGE_KEY_ADMISSIONS = 'nursing_admissions_v7';
const STORAGE_KEY_WARDS = 'nursing_wards_v1';
const STORAGE_KEY_ROOMS = 'nursing_rooms_v1';
const STORAGE_KEY_USERS = 'nursing_users_v1';
const STORAGE_KEY_ASSESSMENTS_PREFIX = 'nursing_assessment_';

// --- Ward Master Data ---
const INITIAL_WARDS: Ward[] = [
    { code: 'W001', name: '一般病棟（東）', type: '一般病棟' },
    { code: 'W002', name: '一般病棟（西）', type: '一般病棟' },
    { code: 'W003', name: '精神科病棟', type: '精神病棟' },
    { code: 'W004', name: '療養病棟', type: 'その他' },
];

// --- Room Master Data ---
const INITIAL_ROOMS: Room[] = [
    { code: '101', name: '101' }, { code: '102', name: '102' }, { code: '103', name: '103' },
    { code: '201', name: '201' }, { code: '202', name: '202' }, { code: '203', name: '203' },
    { code: '205', name: '205' }, { code: '206', name: '206' },
    { code: '301', name: '301' }, { code: '302', name: '302' }, { code: '303', name: '303' },
    { code: 'N101', name: '西101' }, { code: 'N102', name: '西102' },
    { code: 'E101', name: '東101' }, { code: 'E102', name: '東102' },
];

// --- Master CRUD Operations ---
export const getWards = (): Ward[] => {
    if (typeof window === 'undefined') return INITIAL_WARDS;
    const stored = localStorage.getItem(STORAGE_KEY_WARDS);
    return stored ? JSON.parse(stored) : INITIAL_WARDS;
};

export const saveWard = (ward: Ward) => {
    const list = getWards();
    const idx = list.findIndex(w => w.code === ward.code);
    const newList = idx >= 0 ? list.map((w, i) => i === idx ? ward : w) : [...list, ward];
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_WARDS, JSON.stringify(newList));
    return newList;
}

export const deleteWard = (code: string) => {
    const list = getWards();
    const newList = list.filter(w => w.code !== code);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_WARDS, JSON.stringify(newList));
    return newList;
}

export const getRooms = (): Room[] => {
    if (typeof window === 'undefined') return INITIAL_ROOMS;
    const stored = localStorage.getItem(STORAGE_KEY_ROOMS);
    return stored ? JSON.parse(stored) : INITIAL_ROOMS;
};

export const saveRoom = (room: Room) => {
    const list = getRooms();
    const idx = list.findIndex(r => r.code === room.code);
    const newList = idx >= 0 ? list.map((r, i) => i === idx ? room : r) : [...list, room];
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(newList));
    return newList;
}

export const deleteRoom = (code: string) => {
    const list = getRooms();
    const newList = list.filter(r => r.code !== code);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(newList));
    return newList;
}

// --- User Master Logic ---
const INITIAL_USERS: UserAccount[] = [
    { id: 'u1', userId: 'admin', name: 'システム管理者', password: 'password', role: '管理者', authority: 'システム管理者アカウント' },
    { id: 'u2', userId: 'manager', name: '施設管理者', password: 'password', role: '管理者', authority: '施設管理者アカウント' },
    { id: 'u3', userId: 'staff1', name: '看護 太郎', password: 'password', role: '評価者', authority: '一般アカウント' },
    { id: 'u4', userId: 'staff2', name: '医療 花子', password: 'password', role: '入力者', authority: '一般アカウント' },
];

export const getUsers = (): UserAccount[] => {
    if (typeof window === 'undefined') return INITIAL_USERS;
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    return stored ? JSON.parse(stored) : INITIAL_USERS;
};

export const saveUser = (user: UserAccount) => {
    const list = getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    const newList = idx >= 0 ? list.map((u, i) => i === idx ? user : u) : [...list, user];
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newList));
    return newList;
}

export const deleteUser = (id: string) => {
    const list = getUsers();
    const newList = list.filter(u => u.id !== id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newList));
    return newList;
}

// --- CRUD Operations ---

// Save or Update Patient
export const savePatient = (patient: Patient) => {
    // Generate ID if missing (simple random for prototype)
    if (!patient.id) {
        patient.id = 'p' + Math.random().toString(36).substr(2, 9);
    }

    const patients = getPatients();
    const existingIndex = patients.findIndex(p => p.id === patient.id);
    
    let updatedPatients;
    if (existingIndex >= 0) {
        updatedPatients = [...patients];
        updatedPatients[existingIndex] = patient;
    } else {
        updatedPatients = [...patients, patient];
    }
    
    // Save
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(updatedPatients));
    }
    return patient;
};

// Save Admissions (Replace all for patient)
export const saveAdmissions = (patientId: string, admissions: Admission[]) => {
    const allAdmissions = getAdmissions(null); // Get ALL admissions
    
    // Remove existing for this patient
    const otherAdmissions = allAdmissions.filter(a => a.patientId !== patientId);
    
    // Clean up new admissions (ensure IDs and patientId)
    const newAdmissions = admissions.map(a => ({
        ...a,
        id: a.id.startsWith('temp_') ? 'adm' + Math.random().toString(36).substr(2, 9) : a.id,
        patientId: patientId
    }));
    
    const combined = [...otherAdmissions, ...newAdmissions];
    
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ADMISSIONS, JSON.stringify(combined));
    }
};

// ダミーデータ生成 (Patients + Admissions)
const generateDummyData = (): { patients: Patient[], admissions: Admission[] } => {

  const patients: Patient[] = [];
  const admissions: Admission[] = [];

  // Real names for generation
  const familyNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤'];
  const maleGivenNames = ['健太', '大輔', '誠', '直人', '翔太', '浩之', '剛', '一郎', '進', '明'];
  const femaleGivenNames = ['美咲', '愛', '陽子', '裕子', '恵子', '香織', '真由美', '直子', '千尋', '彩'];

  // Helper to add patient & admission
  const add = (id: string, name: string, gender: '1'|'2', birth: string, admDate: string, room: string, isDischarged: boolean = false, extraHistory: boolean = false, isExcluded: boolean = false, wardName: string) => {
      const pid = `p${id}`;
      patients.push({
          id: pid,
          identifier: `100${id}`,
          name: name,
          gender: gender,
          birthDate: birth,
          postalCode: '100-0001',
          address: '東京都千代田区千代田1-1',
          memo: extraHistory ? '入退院を繰り返しています' : (isDischarged ? '退院済み' : ''),
          excludeFromAssessment: isExcluded
      });

      // If extra history, add a past admission
      if (extraHistory) {
          admissions.push({
              id: `adm${id}_past`,
              patientId: pid,
              admissionDate: '2023-01-10',
              dischargeDate: '2023-02-15',
              initialWard: '一般病棟（東）',
              initialRoom: '201'
          });
      }

      admissions.push({
          id: `adm${id}`,
          patientId: pid,
          admissionDate: admDate,
          dischargeDate: isDischarged ? '2024-05-20' : undefined, // Set discharge date if discharged
          initialWard: wardName,
          initialRoom: room
      });
  };

  // Create many dummy patients for pagination test
  for(let i=1; i<=60; i++) {
      const num = String(i).padStart(3, '0');
      
      // Random generation
      const isFemale = i % 2 === 0;
      const fName = familyNames[i % 10];
      const gName = isFemale ? femaleGivenNames[(i % 10)] : maleGivenNames[(i % 10)];
      const fullName = `${fName} ${gName}`;
      
      const birthYear = 1940 + (i % 50); // 1940-1990
      const birthMonth = String((i % 12) + 1).padStart(2, '0');
      const birthDay = String((i % 28) + 1).padStart(2, '0');
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

      const admMonth = String(((i + 3) % 12) + 1).padStart(2, '0');
      const admDay = String(((i + 5) % 28) + 1).padStart(2, '0');
      const admDate = `2024-${admMonth}-${admDay}`;
      
      // Pick from master
      const ward = INITIAL_WARDS[i % INITIAL_WARDS.length].name;
      const room = INITIAL_ROOMS[i % INITIAL_ROOMS.length].name;

      // Logic for discharged, multiple admissions, and excluded
      const isDischarged = i % 5 === 0; // Every 5th
      const hasHistory = i % 7 === 0;   // Every 7th
      const isExcluded = i % 8 === 0;   // Every 8th is excluded

      add(num, fullName, isFemale ? '2' : '1', birthDate, admDate, room, isDischarged, hasHistory, isExcluded, ward);
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
    
    // Seed Masters if missing (or always on reset)
    if (!localStorage.getItem(STORAGE_KEY_WARDS)) {
        localStorage.setItem(STORAGE_KEY_WARDS, JSON.stringify(INITIAL_WARDS));
    }
    if (!localStorage.getItem(STORAGE_KEY_ROOMS)) {
        localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(INITIAL_ROOMS));
    }
    
    return patients;
  }
};

// 患者リスト取得
export const getPatients = (): Patient[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
  return stored ? JSON.parse(stored) : [];
};

// 入院歴取得 (nullの場合は全件)
export const getAdmissions = (patientId: string | null): Admission[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY_ADMISSIONS);
  const admissions: Admission[] = stored ? JSON.parse(stored) : [];
  
  if (patientId === null) return admissions;
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

// 評価データ保存キーの生成 (Admission IDベースに変更)
const getAssessmentKey = (admissionId: string, date: string) => {
  return `${STORAGE_KEY_ASSESSMENTS_PREFIX}${admissionId}_${date}`;
};

// 評価データ保存
export const saveAssessment = (assessment: DailyAssessment) => {
  if (typeof window === 'undefined') return;
  const key = getAssessmentKey(assessment.admissionId, assessment.date);
  localStorage.setItem(key, JSON.stringify(assessment));
};

// 評価データ削除
export const deleteAssessment = (admissionId: string, date: string) => {
  if (typeof window === 'undefined') return;
  const key = getAssessmentKey(admissionId, date);
  localStorage.removeItem(key);
};

// 評価データ取得
export const getAssessment = (admissionId: string, date: string): DailyAssessment | null => {
  if (typeof window === 'undefined') return null;
  const key = getAssessmentKey(admissionId, date);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};

// 前日のデータを取得
export const getPreviousDayAssessment = (admissionId: string, currentDate: string): DailyAssessment | null => {
  if (typeof window === 'undefined') return null;
  
  const date = new Date(currentDate);
  if (isNaN(date.getTime())) return null;

  // 1日前
  date.setDate(date.getDate() - 1);
  const prevDateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  
  return getAssessment(admissionId, prevDateStr);
};

// 月次データの取得 (指定月の全データを収集 - Admission単位)
export const getMonthlyAssessments = (admissionId: string, yearMonth: string): Record<string, DailyAssessment> => {
  if (typeof window === 'undefined') return {};

  const assessments: Record<string, DailyAssessment> = {};
  // Prefix: assessment_admissionId_YYYY-MM
  // Note: key format is prefix_admissionId_YYYY-MM-DD
  const prefix = `${STORAGE_KEY_ASSESSMENTS_PREFIX}${admissionId}_${yearMonth}`;

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
