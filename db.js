const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'clinic.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    qualification TEXT NOT NULL,
    department TEXT NOT NULL,
    room_number TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    available_days TEXT NOT NULL,
    available_time TEXT NOT NULL,
    consultation_fee INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    avatar_color TEXT NOT NULL DEFAULT 'emerald'
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT UNIQUE NOT NULL,
    token_number TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT,
    patient_age INTEGER NOT NULL,
    patient_gender TEXT NOT NULL,
    doctor_id INTEGER NOT NULL,
    department TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    visit_reason TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Routine',
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doctor_id) REFERENCES doctors(id)
  );

  CREATE TABLE IF NOT EXISTS ambulance_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispatch_ref TEXT UNIQUE NOT NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    patient_name TEXT,
    emergency_type TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    landmark TEXT,
    urgency_level TEXT NOT NULL,
    ambulance_unit TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_contact TEXT NOT NULL,
    assigned_paramedic TEXT NOT NULL,
    hospital_destination TEXT NOT NULL DEFAULT 'HealthNexus Central Trauma Center',
    eta_minutes INTEGER NOT NULL DEFAULT 12,
    status TEXT NOT NULL DEFAULT 'Dispatched',
    notes TEXT,
    dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blood_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blood_group TEXT NOT NULL,
    component_type TEXT NOT NULL,
    units_available INTEGER NOT NULL DEFAULT 0,
    hospital_wing TEXT NOT NULL DEFAULT 'Main Blood Bank Wing A',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    contact_extension TEXT NOT NULL DEFAULT 'Ext. 401/402'
  );

  CREATE TABLE IF NOT EXISTS blood_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_ref TEXT UNIQUE NOT NULL,
    requester_name TEXT NOT NULL,
    requester_phone TEXT NOT NULL,
    patient_case_ref TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    component_type TEXT NOT NULL,
    units_needed INTEGER NOT NULL,
    urgency TEXT NOT NULL,
    hospital_ward TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data if tables are empty
const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get().count;

if (doctorCount === 0) {
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (name, specialty, qualification, department, room_number, experience_years, available_days, available_time, consultation_fee, status, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedDoctors = [
    ['Dr. Rajesh Sharma', 'Cardiology & Heart Care', 'MBBS, MD, DM (Cardiology) - AIIMS New Delhi', 'Cardiology', 'Room 301', 15, 'Mon - Fri', '09:00 AM - 02:00 PM', 800, 'Available', 'rose'],
    ['Dr. Ananya Iyer', 'General Medicine & Preventive Health', 'MBBS, MD (General Medicine) - CMC Vellore', 'General Medicine', 'Room 102', 12, 'Mon - Sat', '08:30 AM - 04:30 PM', 500, 'Available', 'emerald'],
    ['Dr. Priya Patel', 'Pediatric Care & Child Health', 'MBBS, MD (Pediatrics), DNB - PGIMER', 'Pediatrics', 'Room 205', 10, 'Mon - Fri', '10:00 AM - 03:00 PM', 600, 'Available', 'cyan'],
    ['Dr. Vikram Malhotra', 'Orthopedic Surgery & Joint Replacement', 'MBBS, MS (Ortho), MCh - MAMC', 'Orthopedics', 'Room 410', 18, 'Tue, Thu, Sat', '11:00 AM - 05:00 PM', 900, 'Available', 'amber'],
    ['Dr. Sunita Rao', 'Obstetrics & Gynecology', 'MBBS, MD (OB-GYN), DGO - KEM Mumbai', 'Gynecology', 'Room 212', 14, 'Mon, Wed, Fri', '09:30 AM - 03:30 PM', 750, 'Available', 'violet'],
    ['Dr. Amit Sen', 'Pulmonology & Chest Medicine', 'MBBS, MD (Pulmonary Med), FCCP', 'Pulmonology', 'Room 315', 16, 'Mon - Thu', '08:00 AM - 01:00 PM', 700, 'Available', 'blue'],
    ['Dr. Neha Agarwal', 'Dermatology & Cosmetology', 'MBBS, MD (DVL) - Safdarjung Hospital', 'Dermatology', 'Room 118', 9, 'Wed - Sun', '10:00 AM - 04:00 PM', 650, 'Available', 'pink'],
    ['Dr. Arvind Swaminathan', 'Neurology & Stroke Intervention', 'MBBS, MD, DM (Neuro) - NIMHANS', 'Neurology', 'Room 504', 17, 'Mon, Wed, Sat', '09:00 AM - 02:00 PM', 1000, 'Available', 'indigo']
  ];

  for (const doc of seedDoctors) {
    insertDoctor.run(...doc);
  }

  // Seed blood bank inventory across all 8 groups and key components
  const insertBlood = db.prepare(`
    INSERT INTO blood_inventory (blood_group, component_type, units_available, hospital_wing, contact_extension)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedBlood = [
    ['O+', 'Packed Red Blood Cells (PRBC)', 38, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['O+', 'Platelet Concentrate', 14, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['O+', 'Fresh Frozen Plasma (FFP)', 22, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['O-', 'Packed Red Blood Cells (PRBC)', 8, 'Critical Trauma Reserve Wing A', 'Ext. 402'],
    ['O-', 'Fresh Frozen Plasma (FFP)', 6, 'Critical Trauma Reserve Wing A', 'Ext. 402'],
    ['A+', 'Packed Red Blood Cells (PRBC)', 29, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['A+', 'Platelet Concentrate', 11, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['A+', 'Fresh Frozen Plasma (FFP)', 18, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 401'],
    ['A-', 'Packed Red Blood Cells (PRBC)', 6, 'Main Blood Bank Wing A (Red Cross Wing)', 'Ext. 402'],
    ['B+', 'Packed Red Blood Cells (PRBC)', 25, 'Main Blood Bank Wing B (Rotary Center)', 'Ext. 403'],
    ['B+', 'Platelet Concentrate', 9, 'Main Blood Bank Wing B (Rotary Center)', 'Ext. 403'],
    ['B+', 'Fresh Frozen Plasma (FFP)', 16, 'Main Blood Bank Wing B (Rotary Center)', 'Ext. 403'],
    ['B-', 'Packed Red Blood Cells (PRBC)', 5, 'Critical Trauma Reserve Wing A', 'Ext. 402'],
    ['AB+', 'Packed Red Blood Cells (PRBC)', 15, 'Main Blood Bank Wing B (Rotary Center)', 'Ext. 403'],
    ['AB+', 'Fresh Frozen Plasma (FFP)', 12, 'Main Blood Bank Wing B (Rotary Center)', 'Ext. 403'],
    ['AB-', 'Packed Red Blood Cells (PRBC)', 4, 'Emergency Rare Vault Wing B', 'Ext. 404']
  ];

  for (const b of seedBlood) {
    insertBlood.run(...b);
  }

  // Seed sample appointments for today
  const insertApt = db.prepare(`
    INSERT INTO appointments (booking_ref, token_number, patient_name, patient_phone, patient_email, patient_age, patient_gender, doctor_id, department, appointment_date, time_slot, visit_reason, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const todayStr = new Date().toISOString().split('T')[0];

  const seedAppointments = [
    ['MC-APT-4901', 'Q-01', 'Rohan Verma', '+91 98112 34567', 'rohan.verma@example.in', 48, 'Male', 2, 'General Medicine', todayStr, '09:00 AM', 'Annual routine executive physical & diabetic screening', 'Routine', 'Completed', '-180 minutes'],
    ['MC-APT-4902', 'Q-02', 'Ananya Deshmukh', '+91 98220 89123', 'ananya.d@example.in', 32, 'Female', 1, 'Cardiology', todayStr, '09:30 AM', 'Scheduled blood pressure and Holter monitor review', 'Routine', 'In Consultation', '-90 minutes'],
    ['MC-APT-4903', 'Q-03', 'Aarav Mehta', '+91 98331 45678', 'aarav.m@example.in', 9, 'Male', 3, 'Pediatrics', todayStr, '10:15 AM', 'Scheduled seasonal immunization booster and wellness check', 'Routine', 'Checked-In', '-45 minutes'],
    ['MC-APT-4904', 'Q-04', 'Meenakshi Sundaram', '+91 98442 56789', 'meenakshi.s@example.in', 67, 'Female', 4, 'Orthopedics', todayStr, '11:00 AM', 'Post-operative knee rehabilitation progress review', 'Priority', 'Checked-In', '-20 minutes'],
    ['MC-APT-4905', 'Q-05', 'Rajesh Gupta', '+91 98553 67890', 'rajesh.gupta@example.in', 41, 'Male', 2, 'General Medicine', todayStr, '11:30 AM', 'Pre-employment health fitness clearance documentation', 'Routine', 'Scheduled', '-10 minutes'],
    ['MC-APT-4906', 'Q-06', 'Pooja Kulkarni', '+91 98664 78901', 'pooja.k@example.in', 28, 'Female', 5, 'Gynecology', todayStr, '01:30 PM', 'Routine prenatal second-trimester scheduled checkup', 'Routine', 'Scheduled', '-5 minutes']
  ];

  for (const apt of seedAppointments) {
    insertApt.run(...apt);
  }

  // Seed sample emergency ambulance dispatches (108 / 102 EMS Network)
  const insertAmb = db.prepare(`
    INSERT INTO ambulance_dispatches (dispatch_ref, caller_name, caller_phone, patient_name, emergency_type, pickup_address, landmark, urgency_level, ambulance_unit, driver_name, driver_contact, assigned_paramedic, hospital_destination, eta_minutes, status, notes, dispatched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const seedDispatches = [
    ['AMB-8801', 'Traffic Sub-Inspector R. Yadav', '+91 98101 01081', 'Unidentified Commuter', 'Trauma & Road Accident', 'Connaught Place Outer Circle, Radial Road 3, New Delhi', 'Near Shivaji Stadium Metro Station', 'Critical (Immediate ALS)', 'Unit-101 (ALS Mobile ICU 108 Emergency)', 'Ramesh Kumar', '+91 98101 24590', 'Paramedic Suresh Verma', 'HealthNexus Central Trauma Center & AIIMS Corridor', 4, 'En Route', 'Multiple vehicle collision; rapid ALS team mobilized with hydraulic extraction support.', '-12 minutes'],
    ['AMB-8802', 'Sunita Mehra', '+91 98210 21082', 'Kailash Mehra (Age 72)', 'Cardiac & Chest Pain Transit', 'Flat 402, Shanti Kunj Apartments, Indiranagar, Bengaluru', 'Near CMH Road Metro Pillar 42', 'Critical (Immediate ALS)', 'Unit-305 (Cardiac Mobile ICU - 108)', 'Anil Deshmukh', '+91 98303 77812', 'Paramedic Rohit Sharma', 'HealthNexus Central Trauma Center', 2, 'On Scene', 'Patient stabilized on 12-lead ECG; telemetry transmitting vitals directly to ER triage desk.', '-22 minutes'],
    ['AMB-8803', 'Dr. Kavita Reddy', '+91 98320 31083', 'Deepika Nair (Age 26)', 'Obstetric / Maternity Emergency', 'House 14, Sector 15, Vashi, Navi Mumbai', 'Behind Blue Diamond Plaza', 'High Priority (BLS)', 'Unit-512 (Pediatric & Maternity ALS - 102)', 'Manoj Yadav', '+91 98505 66201', 'Paramedic Anjali Joshi', 'HealthNexus Mother & Child Emergency Wing', 0, 'Arrived at Hospital', 'Active high-priority 102 transit safely concluded; patient admitted to Labor & Delivery ward.', '-50 minutes']
  ];

  for (const amb of seedDispatches) {
    insertAmb.run(...amb);
  }

  // Seed sample urgent blood requests
  const insertBloodReq = db.prepare(`
    INSERT INTO blood_requests (request_ref, requester_name, requester_phone, patient_case_ref, blood_group, component_type, units_needed, urgency, hospital_ward, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const seedRequests = [
    ['BLD-REQ-701', 'Dr. Vikram Malhotra', '+91 98110 01101', 'CASE-ORTHO-98', 'O-', 'Packed Red Blood Cells (PRBC)', 3, 'Emergency Stat (Under 30 min)', 'Trauma OT Suite 2', 'Active', '-35 minutes'],
    ['BLD-REQ-702', 'Dr. Rajesh Sharma', '+91 98110 01102', 'CASE-CARD-112', 'A+', 'Platelet Concentrate', 2, 'Urgent (Under 4 hours)', 'Cardiac ICU Bed 7', 'Active', '-70 minutes']
  ];

  for (const req of seedRequests) {
    insertBloodReq.run(...req);
  }

  // Seed initial activity logs
  const insertLog = db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)');
  insertLog.run('SYSTEM_INIT', 'HealthNexus database schema initialized with baseline Indian clinical records.');
  insertLog.run('AMBULANCE_DISPATCH', 'Unit-101 (ALS Mobile ICU 108 Emergency) dispatched to Connaught Place Outer Circle, New Delhi.');
  insertLog.run('BLOOD_BANK_ALERT', 'Urgent blood requisition BLD-REQ-701 logged for O- Negative PRBC in Trauma OT Suite 2.');
}

module.exports = {
  db,

  // Doctor queries
  getDoctors: () => db.prepare('SELECT * FROM doctors ORDER BY department, name').all(),
  getDoctorById: (id) => db.prepare('SELECT * FROM doctors WHERE id = ?').get(id),
  getDoctorsByDepartment: (dept) => db.prepare('SELECT * FROM doctors WHERE department = ? ORDER BY name').all(dept),

  // Appointment queries
  createAppointment: (data) => {
    const stmt = db.prepare(`
      INSERT INTO appointments (
        booking_ref, token_number, patient_name, patient_phone, patient_email,
        patient_age, patient_gender, doctor_id, department, appointment_date,
        time_slot, visit_reason, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.booking_ref,
      data.token_number,
      data.patient_name,
      data.patient_phone,
      data.patient_email || null,
      data.patient_age,
      data.patient_gender,
      data.doctor_id,
      data.department,
      data.appointment_date,
      data.time_slot,
      data.visit_reason,
      data.priority || 'Routine',
      data.status || 'Scheduled'
    );

    // Log activity
    db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
      'APPOINTMENT_BOOKED',
      `New appointment ${data.booking_ref} (${data.token_number}) registered for ${data.patient_name} with Doctor ID ${data.doctor_id}.`
    );

    return result;
  },

  getAppointments: (filterDate) => {
    if (filterDate) {
      return db.prepare(`
        SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, d.room_number
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.appointment_date = ?
        ORDER BY a.id DESC
      `).all(filterDate);
    }
    return db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, d.room_number
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.id DESC
    `).all();
  },

  getAppointmentByRef: (ref) => {
    return db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, d.room_number, d.qualification
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.booking_ref = ?
    `).get(ref.trim().toUpperCase());
  },

  updateAppointmentStatus: (id, status) => {
    const result = db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    const apt = db.prepare('SELECT booking_ref, patient_name FROM appointments WHERE id = ?').get(id);
    if (apt) {
      db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
        'QUEUE_STATUS_CHANGE',
        `Appointment ${apt.booking_ref} (${apt.patient_name}) status updated to "${status}".`
      );
    }
    return result;
  },

  cancelAppointment: (bookingRef) => {
    const result = db.prepare("UPDATE appointments SET status = 'Cancelled' WHERE booking_ref = ?").run(bookingRef);
    db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
      'APPOINTMENT_CANCELLED',
      `Appointment ${bookingRef} cancelled by patient/administrator.`
    );
    return result;
  },

  getNextQueueToken: (dateStr) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(dateStr).count;
    const num = count + 1;
    return `Q-${num < 10 ? '0' + num : num}`;
  },

  // Ambulance Dispatch queries
  createAmbulanceDispatch: (data) => {
    const stmt = db.prepare(`
      INSERT INTO ambulance_dispatches (
        dispatch_ref, caller_name, caller_phone, patient_name, emergency_type,
        pickup_address, landmark, urgency_level, ambulance_unit, driver_name,
        driver_contact, assigned_paramedic, hospital_destination, eta_minutes, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.dispatch_ref,
      data.caller_name,
      data.caller_phone,
      data.patient_name || 'Emergency Patient',
      data.emergency_type,
      data.pickup_address,
      data.landmark || '',
      data.urgency_level,
      data.ambulance_unit,
      data.driver_name,
      data.driver_contact,
      data.assigned_paramedic,
      data.hospital_destination || 'HealthNexus Central Trauma Center',
      data.eta_minutes || 10,
      data.status || 'Dispatched',
      data.notes || ''
    );

    db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
      'EMERGENCY_DISPATCH',
      `SOS Ambulance Dispatched: ${data.dispatch_ref} [${data.ambulance_unit}] to ${data.pickup_address} (${data.emergency_type}).`
    );

    return result;
  },

  getAmbulanceDispatches: () => {
    return db.prepare('SELECT * FROM ambulance_dispatches ORDER BY id DESC').all();
  },

  getAmbulanceDispatchByRef: (ref) => {
    return db.prepare('SELECT * FROM ambulance_dispatches WHERE dispatch_ref = ?').get(ref.trim().toUpperCase());
  },

  updateAmbulanceStatus: (id, status, eta) => {
    let result;
    if (eta !== undefined && eta !== null && eta !== '') {
      result = db.prepare('UPDATE ambulance_dispatches SET status = ?, eta_minutes = ? WHERE id = ?').run(status, Number(eta), id);
    } else {
      result = db.prepare('UPDATE ambulance_dispatches SET status = ? WHERE id = ?').run(status, id);
    }
    const amb = db.prepare('SELECT dispatch_ref, ambulance_unit FROM ambulance_dispatches WHERE id = ?').get(id);
    if (amb) {
      db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
        'AMBULANCE_STATUS_UPDATE',
        `Ambulance ${amb.dispatch_ref} (${amb.ambulance_unit}) transitioned to "${status}".`
      );
    }
    return result;
  },

  // Blood Inventory queries
  getBloodInventory: (bloodGroup, componentType) => {
    let query = 'SELECT * FROM blood_inventory WHERE 1=1';
    const params = [];

    if (bloodGroup && bloodGroup !== 'ALL') {
      query += ' AND blood_group = ?';
      params.push(bloodGroup);
    }
    if (componentType && componentType !== 'ALL') {
      query += ' AND component_type = ?';
      params.push(componentType);
    }

    query += ' ORDER BY blood_group, component_type';
    return db.prepare(query).all(...params);
  },

  updateBloodUnits: (id, delta) => {
    const current = db.prepare('SELECT units_available, blood_group, component_type FROM blood_inventory WHERE id = ?').get(id);
    if (!current) return null;
    const newCount = Math.max(0, current.units_available + delta);
    db.prepare('UPDATE blood_inventory SET units_available = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?').run(newCount, id);

    db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
      'BLOOD_STOCK_UPDATE',
      `Blood inventory updated: ${current.blood_group} ${current.component_type} adjusted from ${current.units_available} to ${newCount} units.`
    );
    return newCount;
  },

  createBloodRequest: (data) => {
    const stmt = db.prepare(`
      INSERT INTO blood_requests (
        request_ref, requester_name, requester_phone, patient_case_ref,
        blood_group, component_type, units_needed, urgency, hospital_ward, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.request_ref,
      data.requester_name,
      data.requester_phone,
      data.patient_case_ref,
      data.blood_group,
      data.component_type,
      data.units_needed,
      data.urgency,
      data.hospital_ward,
      'Active'
    );

    db.prepare('INSERT INTO activity_logs (event_type, description) VALUES (?, ?)').run(
      'BLOOD_REQUEST_SUBMITTED',
      `Urgent Blood Request ${data.request_ref}: ${data.units_needed} units of ${data.blood_group} (${data.component_type}) for ward ${data.hospital_ward}.`
    );

    return result;
  },

  getBloodRequests: () => {
    return db.prepare('SELECT * FROM blood_requests ORDER BY id DESC').all();
  },

  updateBloodRequestStatus: (id, status) => {
    return db.prepare('UPDATE blood_requests SET status = ? WHERE id = ?').run(status, id);
  },

  // Clinic Statistics & Metrics
  getDashboardStats: () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?').get(todayStr).count;
    const waitingQueue = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status IN ('Scheduled', 'Checked-In', 'In Consultation')").get(todayStr).count;
    const completedToday = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status = 'Completed'").get(todayStr).count;
    const activeAmbulances = db.prepare("SELECT COUNT(*) as count FROM ambulance_dispatches WHERE status IN ('Dispatched', 'En Route', 'On Scene', 'Patient Onboard')").get().count;
    const totalBloodUnits = db.prepare('SELECT SUM(units_available) as sum FROM blood_inventory').get().sum || 0;
    const criticalBloodShortages = db.prepare('SELECT COUNT(*) as count FROM blood_inventory WHERE units_available <= 5').get().count;
    const activeBloodRequests = db.prepare("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'Active'").get().count;

    return {
      todayAppointments,
      waitingQueue,
      completedToday,
      activeAmbulances,
      totalBloodUnits,
      criticalBloodShortages,
      activeBloodRequests
    };
  },

  getRecentLogs: (limit = 12) => {
    return db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?').all(limit);
  }
};
