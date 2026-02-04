import { Admission } from '../types/nursing';

/**
 * 指定された日付に該当する入院情報を取得する
 */
export const getActiveAdmission = (admissions: Admission[], date: string): Admission | undefined => {
    return admissions.find(adm => {
      const start = adm.admissionDate;
      const end = adm.dischargeDate;
      return date >= start && (!end || date <= end);
    });
};

/**
 * 指定された日付の患者の所在（病棟・病室）とステータスを取得する
 */
export const getPatientLocationAndStatus = (admissions: Admission[], date: string) => {
    const admission = getActiveAdmission(admissions, date);
    if (!admission) return { ward: null, room: null, status: null };

    let currentWard = admission.initialWard || '-';
    let currentRoom = admission.initialRoom || '-';
    let status = '入院中';

    // Check for specific events on this day
    if (admission.admissionDate === date) status = '入院';
    if (admission.dischargeDate === date) status = '退院';

    // Apply movements chronologically up to this date
    const validMovements = (admission.movements || [])
        .filter(m => m.date <= date)
        .sort((a,b) => a.date.localeCompare(b.date));

    for (const m of validMovements) {
        if (m.type === 'transfer_ward') {
            if (m.ward) currentWard = m.ward;
            if (m.room) currentRoom = m.room;
            if (m.date === date) status = '転棟';
        } else if (m.type === 'transfer_room') {
            if (m.room) currentRoom = m.room;
            if (m.date === date) status = '転床';
        } else if (m.type === 'overnight') {
            if (m.date === date) status = '外泊'; 
            else if (m.endDate && date > m.date && date <= m.endDate) status = '外泊';
        }
    }
    
    // Override status priority: Discharge > Transfer/Overnight > Admission > Normal
    if (admission.dischargeDate === date) status = '退院';
    
    return { ward: currentWard, room: currentRoom, status };
};
