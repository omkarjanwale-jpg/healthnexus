const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Available emergency ambulance units for round-robin / automated dispatch (108 National EMS Network)
const AMBULANCE_FLEET = [
  { unit: 'Unit-101 (ALS Mobile ICU 108 Emergency)', driver: 'Ramesh Kumar', phone: '+91 98101 24590', paramedic: 'Paramedic Suresh Verma' },
  { unit: 'Unit-204 (Rapid Response BLS - 108)', driver: 'Vikram Singh', phone: '+91 98202 33411', paramedic: 'Paramedic Priya Nair' },
  { unit: 'Unit-305 (Cardiac Mobile ICU - 108)', driver: 'Anil Deshmukh', phone: '+91 98303 77812', paramedic: 'Paramedic Rohit Sharma' },
  { unit: 'Unit-408 (Trauma Heavy Transit - 108)', driver: 'Gurpreet Singh', phone: '+91 98404 88129', paramedic: 'Paramedic Deepa Menon' },
  { unit: 'Unit-512 (Pediatric & Maternity ALS - 102)', driver: 'Manoj Yadav', phone: '+91 98505 66201', paramedic: 'Paramedic Anjali Joshi' }
];

// Helper to generate unique reference codes
function generateRef(prefix) {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

// Helper to parse cookies
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      if (name) list[name] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

// Global Auth State Middleware
app.use((req, res, next) => {
  const cookies = parseCookies(req);
  req.isAdmin = (cookies.healthnexus_admin_session === 'authorized_staff_token' || cookies.mediconnect_admin_session === 'authorized_staff_token');
  res.locals.isAdmin = req.isAdmin;
  next();
});

// Guard middleware for Admin routes
function requireAdmin(req, res, next) {
  if (req.isAdmin) {
    return next();
  }
  return res.redirect('/login?error=Authentication%20required.%20Please%20log%20in%20with%20staff%20credentials.');
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check endpoint for Cloud Run container monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'HealthNexus Clinic & Emergency Management',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Staff Authentication & Showcase Routes
app.get('/login', (req, res) => {
  if (req.isAdmin) {
    return res.redirect('/admin');
  }
  const errorMsg = req.query.error || null;
  const logoutMsg = req.query.logout === 'success';
  res.render('login', {
    title: 'Staff Login | HealthNexus Operations',
    page: 'login',
    error: errorMsg,
    logoutMsg
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = username ? username.trim().toLowerCase() : '';
  const pass = password ? password.trim() : '';

  const isValidUser = (user === 'admin@healthnexus.org' || user === 'admin@mediconnect.org' || user === 'admin');
  const isValidPass = (pass === 'healthnexus2026' || pass === 'mediconnect2026' || pass === 'admin123');

  if (isValidUser && isValidPass) {
    res.setHeader('Set-Cookie', [
      'healthnexus_admin_session=authorized_staff_token; Path=/; HttpOnly; SameSite=Lax',
      'mediconnect_admin_session=authorized_staff_token; Path=/; HttpOnly; SameSite=Lax'
    ]);
    return res.redirect('/admin');
  }

  res.render('login', {
    title: 'Staff Login | HealthNexus Operations',
    page: 'login',
    error: 'Invalid staff ID or authorization passcode. Click "Auto-Fill" for quick demo credentials.',
    logoutMsg: false
  });
});

app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    'healthnexus_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'mediconnect_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  res.redirect('/login?logout=success');
});

// Project Showcase & Poster Route
app.get('/poster', (req, res) => {
  res.sendFile(path.join(__dirname, 'POSTER.html'));
});

// 1. PUBLIC HOMEPAGE (Appointment Booking & Clinic Overview)
app.get('/', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const doctors = db.getDoctors();
    const stats = db.getDashboardStats();
    const todayAppointments = db.getAppointments(todayStr);

    // Collect unique departments
    const departments = [...new Set(doctors.map(d => d.department))];

    // Check for query parameters (booked reference or lookup reference)
    const bookedRef = req.query.booked;
    let bookedDetails = null;
    if (bookedRef) {
      bookedDetails = db.getAppointmentByRef(bookedRef);
    }

    const lookupRef = req.query.lookup;
    let lookupResult = null;
    let lookupSearched = false;
    if (lookupRef) {
      lookupSearched = true;
      lookupResult = db.getAppointmentByRef(lookupRef);
    }

    res.render('index', {
      title: 'HealthNexus | Modern Clinic & Emergency Care',
      page: 'home',
      doctors,
      departments,
      stats,
      todayAppointments,
      bookedDetails,
      lookupResult,
      lookupSearched,
      lookupRef: lookupRef || '',
      todayStr
    });
  } catch (error) {
    console.error('Error rendering homepage:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Create Public Appointment
app.post('/appointments', (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_email,
      patient_age,
      patient_gender,
      doctor_id,
      department,
      appointment_date,
      time_slot,
      visit_reason,
      priority
    } = req.body;

    if (!patient_name || !patient_phone || !doctor_id || !appointment_date || !time_slot) {
      return res.status(400).send('Missing required appointment booking fields.');
    }

    const bookingRef = generateRef('MC-APT');
    const tokenNumber = db.getNextQueueToken(appointment_date);

    db.createAppointment({
      booking_ref: bookingRef,
      token_number: tokenNumber,
      patient_name,
      patient_phone,
      patient_email: patient_email || '',
      patient_age: parseInt(patient_age, 10) || 30,
      patient_gender: patient_gender || 'Other',
      doctor_id: parseInt(doctor_id, 10),
      department: department || 'General Medicine',
      appointment_date,
      time_slot,
      visit_reason: visit_reason || 'Routine consultation and checkup',
      priority: priority || 'Routine',
      status: 'Scheduled'
    });

    res.redirect(`/?booked=${bookingRef}#booking-confirmation`);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).send('Error booking appointment.');
  }
});

// Cancel Appointment
app.post('/appointments/cancel', (req, res) => {
  try {
    const { booking_ref, redirect_to } = req.body;
    if (booking_ref) {
      db.cancelAppointment(booking_ref);
    }
    if (redirect_to === 'admin') {
      return res.redirect('/admin');
    }
    res.redirect(`/?lookup=${encodeURIComponent(booking_ref)}#appointment-tracker`);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).send('Error cancelling appointment.');
  }
});

// 2. EMERGENCY PORTAL (Ambulance SOS & Blood Bank)
app.get('/emergency', (req, res) => {
  try {
    const bloodGroupFilter = req.query.blood_group || 'ALL';
    const componentFilter = req.query.component_type || 'ALL';

    const dispatches = db.getAmbulanceDispatches();
    const bloodInventory = db.getBloodInventory(bloodGroupFilter, componentFilter);
    const bloodRequests = db.getBloodRequests();
    const stats = db.getDashboardStats();

    const dispatchedRef = req.query.dispatched;
    let dispatchedDetails = null;
    if (dispatchedRef) {
      dispatchedDetails = db.getAmbulanceDispatchByRef(dispatchedRef);
    }

    const bloodReqRef = req.query.bloodReq;

    res.render('emergency', {
      title: 'Emergency SOS & Blood Bank | HealthNexus',
      page: 'emergency',
      dispatches,
      bloodInventory,
      bloodRequests,
      stats,
      dispatchedDetails,
      bloodReqRef,
      selectedBloodGroup: bloodGroupFilter,
      selectedComponent: componentFilter
    });
  } catch (error) {
    console.error('Error rendering emergency page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Submit SOS Ambulance Dispatch
app.post('/emergency/ambulance', (req, res) => {
  try {
    const {
      caller_name,
      caller_phone,
      patient_name,
      emergency_type,
      pickup_address,
      landmark,
      urgency_level,
      notes
    } = req.body;

    if (!caller_name || !caller_phone || !pickup_address || !emergency_type) {
      return res.status(400).send('Missing required SOS dispatch details.');
    }

    const dispatchRef = generateRef('AMB');
    // Select an ambulance from fleet dynamically
    const assignedFleet = AMBULANCE_FLEET[Math.floor(Math.random() * AMBULANCE_FLEET.length)];
    const etaMinutes = urgency_level && urgency_level.includes('Critical') ? Math.floor(6 + Math.random() * 4) : Math.floor(10 + Math.random() * 8);

    db.createAmbulanceDispatch({
      dispatch_ref: dispatchRef,
      caller_name,
      caller_phone,
      patient_name: patient_name || 'Emergency Patient',
      emergency_type,
      pickup_address,
      landmark: landmark || '',
      urgency_level: urgency_level || 'Critical (Immediate ALS)',
      ambulance_unit: assignedFleet.unit,
      driver_name: assignedFleet.driver,
      driver_contact: assignedFleet.phone,
      assigned_paramedic: assignedFleet.paramedic,
      hospital_destination: 'HealthNexus Central Trauma Center & AIIMS Corridor',
      eta_minutes: etaMinutes,
      status: 'Dispatched',
      notes: notes || 'Emergency ambulance SOS alert initiated via portal.'
    });

    res.redirect(`/emergency?dispatched=${dispatchRef}#dispatch-tracking`);
  } catch (error) {
    console.error('Error dispatching ambulance:', error);
    res.status(500).send('Error initiating emergency dispatch.');
  }
});

// Submit Blood Request
app.post('/emergency/blood-request', (req, res) => {
  try {
    const {
      requester_name,
      requester_phone,
      patient_case_ref,
      blood_group,
      component_type,
      units_needed,
      urgency,
      hospital_ward
    } = req.body;

    if (!requester_name || !requester_phone || !blood_group || !units_needed) {
      return res.status(400).send('Missing required blood requisition details.');
    }

    const requestRef = generateRef('BLD-REQ');

    db.createBloodRequest({
      request_ref: requestRef,
      requester_name,
      requester_phone,
      patient_case_ref: patient_case_ref || 'EMERGENCY-WALKIN',
      blood_group,
      component_type: component_type || 'Packed Red Blood Cells (PRBC)',
      units_needed: parseInt(units_needed, 10) || 1,
      urgency: urgency || 'Emergency Stat (Under 30 min)',
      hospital_ward: hospital_ward || 'Trauma Resuscitation Room'
    });

    res.redirect(`/emergency?bloodReq=${requestRef}#blood-requests-section`);
  } catch (error) {
    console.error('Error submitting blood request:', error);
    res.status(500).send('Error creating blood request.');
  }
});

// 3. ADMIN PORTAL (Clinic Operations, Queue Manager & Inventory)
app.get('/admin', requireAdmin, (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const filterDate = req.query.date || todayStr;

    const stats = db.getDashboardStats();
    const appointments = db.getAppointments(filterDate === 'ALL' ? null : filterDate);
    const doctors = db.getDoctors();
    const ambulanceDispatches = db.getAmbulanceDispatches();
    const bloodInventory = db.getBloodInventory('ALL', 'ALL');
    const bloodRequests = db.getBloodRequests();
    const logs = db.getRecentLogs(15);

    res.render('admin', {
      title: 'Command Center & Operations | HealthNexus Admin',
      page: 'admin',
      stats: stats,
      appointments: appointments,
      doctors: doctors,
      ambulanceDispatches: ambulanceDispatches,
      bloodInventory: bloodInventory,
      bloodRequests: bloodRequests,
      logs: logs,
      filterDate: filterDate,
      todayStr: todayStr
    });
  } catch (error) {
    console.error('Error rendering admin portal:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Admin: Update Appointment Status
app.post('/admin/appointment/update-status', requireAdmin, (req, res) => {
  try {
    const { id, status, redirect_date } = req.body;
    if (id && status) {
      db.updateAppointmentStatus(parseInt(id, 10), status);
    }
    res.redirect(`/admin?date=${redirect_date || ''}`);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).send('Error updating appointment.');
  }
});

// Admin: Quick Walk-in Patient Queue Entry
app.post('/admin/appointment/walk-in', requireAdmin, (req, res) => {
  try {
    const {
      patient_name,
      patient_phone,
      patient_age,
      patient_gender,
      doctor_id,
      priority,
      visit_reason
    } = req.body;

    const todayStr = new Date().toISOString().split('T')[0];
    const doc = db.getDoctorById(doctor_id);
    const tokenNumber = db.getNextQueueToken(todayStr);
    const bookingRef = generateRef('MC-WALK');

    db.createAppointment({
      booking_ref: bookingRef,
      token_number: tokenNumber,
      patient_name,
      patient_phone,
      patient_email: 'walkin@reception.internal',
      patient_age: parseInt(patient_age, 10) || 35,
      patient_gender: patient_gender || 'Other',
      doctor_id: parseInt(doctor_id, 10),
      department: doc ? doc.department : 'General Medicine',
      appointment_date: todayStr,
      time_slot: 'Immediate Walk-in',
      visit_reason: visit_reason || 'Urgent walk-in triage consultation',
      priority: priority || 'Priority',
      status: 'Checked-In'
    });

    res.redirect('/admin');
  } catch (error) {
    console.error('Error registering walk-in patient:', error);
    res.status(500).send('Error registering walk-in.');
  }
});

// Admin: Update Ambulance Dispatch Status
app.post('/admin/ambulance/update-status', requireAdmin, (req, res) => {
  try {
    const { id, status, eta_minutes } = req.body;
    if (id && status) {
      db.updateAmbulanceStatus(parseInt(id, 10), status, eta_minutes);
    }
    res.redirect('/admin#ambulance-section');
  } catch (error) {
    console.error('Error updating ambulance status:', error);
    res.status(500).send('Error updating ambulance status.');
  }
});

// Admin: Update Blood Inventory Units
app.post('/admin/blood/update-stock', requireAdmin, (req, res) => {
  try {
    const { id, delta } = req.body;
    if (id && delta) {
      db.updateBloodUnits(parseInt(id, 10), parseInt(delta, 10));
    }
    res.redirect('/admin#blood-section');
  } catch (error) {
    console.error('Error adjusting blood inventory:', error);
    res.status(500).send('Error updating stock.');
  }
});

// Admin: Update Blood Request Status
app.post('/admin/blood-request/status', requireAdmin, (req, res) => {
  try {
    const { id, status } = req.body;
    if (id && status) {
      db.updateBloodRequestStatus(parseInt(id, 10), status);
    }
    res.redirect('/admin#blood-requests-management');
  } catch (error) {
    console.error('Error updating blood request status:', error);
    res.status(500).send('Error updating request.');
  }
});

// -------------------------------------------------------------
// JSON API ENDPOINTS (For dynamic interactions & live dashboards)
// -------------------------------------------------------------

app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/doctors', (req, res) => {
  try {
    const dept = req.query.department;
    const docs = dept ? db.getDoctorsByDepartment(dept) : db.getDoctors();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/blood-search', (req, res) => {
  try {
    const { blood_group, component_type } = req.query;
    const results = db.getBloodInventory(blood_group, component_type);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('partials/header', { title: '404 - Not Found | HealthNexus', page: '' });
});

// Start Server (Dual-stack IPv4 & IPv6 support)
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`HealthNexus Clinic & Emergency System active!`);
  console.log(`Listening on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`Environment PORT: ${PORT}`);
  console.log(`====================================================`);
});
