import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';
const CITIES_BMS = [
  { name: 'Chennai', code: 'CHEN' }, { name: 'Mumbai', code: 'MUMB' },
  { name: 'Delhi', code: 'NDLS' }, { name: 'Bangalore', code: 'BANG' },
  { name: 'Hyderabad', code: 'HYD' }, { name: 'Kolkata', code: 'KOLK' },
  { name: 'Pune', code: 'PUNE' }, { name: 'Ahmedabad', code: 'AHMD' },
  { name: 'Kochi', code: 'KOCH' },
];
const SEAT_CATEGORIES = ['Any', 'Gold', 'Silver', 'Platinum', 'Recliner', 'Premium', 'IMAX', '4DX'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusDot({ status, active }) {
  const color = !active ? '#888' : status === 'notified' ? '#22c55e' : '#f59e0b';
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:color, marginRight:6 }} />;
}

function TrackerCard({ tracker, onToggle, onDelete, onTest, onEdit }) {
  return (
    <div className={`tracker-card ${!tracker.active ? 'inactive' : ''}`}>
      <div className="tracker-header">
        <div className="tracker-title">
          <StatusDot status={tracker.status} active={tracker.active} />
          <span className="movie-name">{tracker.movieName}</span>
        </div>
        <div className="tracker-actions">
          <button className="btn-icon" title="Test Telegram" onClick={() => onTest(tracker.id)}>↗</button>
          <button className="btn-icon" title="Edit" onClick={() => onEdit(tracker)}>✎</button>
          <button className="btn-icon toggle" onClick={() => onToggle(tracker.id)}>{tracker.active ? '⏸' : '▶'}</button>
          <button className="btn-icon danger" onClick={() => onDelete(tracker.id)}>×</button>
        </div>
      </div>
      <div className="tracker-meta">
        <span className="meta-chip">📍 {tracker.theaterName || 'Any theater'}</span>
        <span className="meta-chip">📅 {tracker.showDate}</span>
        {tracker.showTime && <span className="meta-chip">⏰ {tracker.showTime}</span>}
        {tracker.seatCategory && tracker.seatCategory !== 'Any' && <span className="meta-chip">💺 {tracker.seatCategory}</span>}
        <span className={`meta-chip platform ${tracker.platform}`}>
          {tracker.platform === 'both' ? 'BMS + District' : tracker.platform === 'bookmyshow' ? 'BookMyShow' : 'District'}
        </span>
      </div>
      <div className="tracker-footer">
        <span className="status-text">
          <StatusDot status={tracker.status} active={tracker.active} />
          {!tracker.active ? 'Paused' : tracker.status === 'notified' ? `Notified • ${formatDate(tracker.lastFound)}` : 'Watching for tickets...'}
        </span>
        <span className="created-at">Added {formatDate(tracker.createdAt)}</span>
      </div>
    </div>
  );
}

function TrackerModal({ onClose, onSave, editData }) {
  const isEdit = !!editData;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(editData || {
    movieName: '', city: 'Chennai', cityCode: 'CHEN', theaterName: '',
    showDate: '', showTime: '', seatCategory: 'Any', platform: 'both',
    districtUrl: '', bmsEventCode: '', telegramToken: '', telegramChatId: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const testTelegram = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${API}/api/test-telegram`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: form.telegramToken, chatId: form.telegramChatId }),
      });
      const data = await res.json();
      setTestResult(data.success ? 'success' : 'error');
    } catch { setTestResult('error'); }
    setTesting(false);
  };

  const isStep1Valid = form.movieName && form.showDate;
  const isStep2Valid = form.telegramToken && form.telegramChatId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-steps">
            <span className={`step ${step >= 1 ? 'active' : ''}`}>1 Movie</span>
            <span className="step-sep">→</span>
            <span className={`step ${step >= 2 ? 'active' : ''}`}>2 Notify</span>
            {isEdit && <span className="edit-badge">Editing</span>}
          </div>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div className="modal-body">
            <div className="field">
              <label>Movie name</label>
              <input placeholder="e.g. Project Hail Mary" value={form.movieName} onChange={e => set('movieName', e.target.value)} autoFocus />
            </div>
            <div className="field-row">
              <div className="field">
                <label>City</label>
                <select value={form.city} onChange={e => { const c = CITIES_BMS.find(c => c.name === e.target.value); set('city', c.name); set('cityCode', c.code); }}>
                  {CITIES_BMS.map(c => <option key={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Platform</label>
                <select value={form.platform} onChange={e => set('platform', e.target.value)}>
                  <option value="both">Both</option>
                  <option value="bookmyshow">BookMyShow</option>
                  <option value="district">District</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Theater name <span className="optional">(optional — leave blank for any)</span></label>
              <input placeholder="e.g. PVR Phoenix, INOX VR Mall" value={form.theaterName} onChange={e => set('theaterName', e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Show date</label>
                <input type="date" value={form.showDate} onChange={e => set('showDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Show time <span className="optional">(optional)</span></label>
                <input type="time" value={form.showTime} onChange={e => set('showTime', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Seat category</label>
              <div className="chip-select">
                {SEAT_CATEGORIES.map(c => (
                  <button key={c} className={`chip ${form.seatCategory === c ? 'selected' : ''}`} onClick={() => set('seatCategory', c)}>{c}</button>
                ))}
              </div>
            </div>
            {(form.platform === 'district' || form.platform === 'both') && (
              <div className="field">
                <label>District URL <span className="optional">(paste from district.in)</span></label>
                <input placeholder="https://www.district.in/movies/..." value={form.districtUrl} onChange={e => set('districtUrl', e.target.value)} />
              </div>
            )}
            {(form.platform === 'bookmyshow' || form.platform === 'both') && (
              <div className="field">
                <label>BMS Event Code <span className="optional">(e.g. ET00451760 from BMS URL)</span></label>
                <input placeholder="ET00451760" value={form.bmsEventCode} onChange={e => set('bmsEventCode', e.target.value)} />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="modal-body">
            <p className="step-hint">We'll send Telegram alerts when tickets open.</p>
            <div className="field">
              <label>Telegram Bot Token</label>
              <input type="password" placeholder={isEdit ? '(leave blank to keep existing)' : '1234567890:AAH...'} value={form.telegramToken === '***' ? '' : form.telegramToken} onChange={e => set('telegramToken', e.target.value)} />
            </div>
            <div className="field">
              <label>Your Telegram Chat ID</label>
              <input placeholder="944001862" value={form.telegramChatId} onChange={e => set('telegramChatId', e.target.value)} />
            </div>
            <button className="btn-test" onClick={testTelegram} disabled={testing || !form.telegramToken || !form.telegramChatId}>
              {testing ? 'Sending...' : 'Send test message →'}
            </button>
            {testResult === 'success' && <p className="test-success">✓ Message sent! Check your Telegram.</p>}
            {testResult === 'error' && <p className="test-error">✗ Failed. Check your token and chat ID.</p>}
          </div>
        )}

        <div className="modal-footer">
          {step === 2 && <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>}
          {step === 1 && <button className="btn-secondary" onClick={onClose}>Cancel</button>}
          {step === 1 && <button className="btn-primary" onClick={() => setStep(2)} disabled={!isStep1Valid}>Next →</button>}
          {step === 2 && <button className="btn-primary" onClick={() => { onSave(form); onClose(); }} disabled={!isEdit && !isStep2Valid}>
            {isEdit ? 'Save changes' : 'Start Tracking'}
          </button>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [trackers, setTrackers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTracker, setEditTracker] = useState(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchTrackers = useCallback(async () => {
    try { const res = await fetch(`${API}/api/trackers`); setTrackers(await res.json()); } catch {}
  }, []);

  useEffect(() => { fetchTrackers(); const iv = setInterval(fetchTrackers, 30000); return () => clearInterval(iv); }, [fetchTrackers]);

  const addTracker = async (form) => {
    try {
      const res = await fetch(`${API}/api/trackers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      setTrackers(t => [data.tracker, ...t]);
      showToast('Tracker started!');
    } catch { showToast('Failed to add tracker', 'error'); }
  };

  const saveEdit = async (form) => {
    try {
      const res = await fetch(`${API}/api/trackers/${editTracker.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTrackers(t => t.map(tr => tr.id === editTracker.id ? data.tracker : tr));
      showToast('Tracker updated!');
    } catch { showToast('Update failed', 'error'); }
    setEditTracker(null);
  };

  const toggleTracker = async (id) => {
    try {
      const res = await fetch(`${API}/api/trackers/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      setTrackers(t => t.map(tr => tr.id === id ? { ...tr, active: data.active } : tr));
    } catch {}
  };

  const deleteTracker = async (id) => {
    try { await fetch(`${API}/api/trackers/${id}`, { method: 'DELETE' }); setTrackers(t => t.filter(tr => tr.id !== id)); showToast('Tracker removed'); } catch {}
  };

  const testTracker = async (id) => {
    try { await fetch(`${API}/api/trackers/${id}/test`, { method: 'POST' }); showToast('Test message sent!'); } catch { showToast('Test failed', 'error'); }
  };

  const runNow = async () => {
    setRunning(true);
    try { await fetch(`${API}/api/run-now`, { method: 'POST' }); showToast('Check complete!'); await fetchTrackers(); } catch { showToast('Check failed', 'error'); }
    setRunning(false);
  };

  const active = trackers.filter(t => t.active).length;
  const notified = trackers.filter(t => t.status === 'notified').length;

  return (
    <div className="app">
      <div className="noise" />
      <header className="header">
        <div className="header-left">
          <div className="logo"><span className="logo-icon">◉</span><span className="logo-text">CineAlert</span></div>
          <p className="tagline">Ticket availability tracker</p>
        </div>
        <div className="header-right">
          <div className="stat"><span className="stat-num">{active}</span><span className="stat-label">active</span></div>
          <div className="stat"><span className="stat-num">{notified}</span><span className="stat-label">notified</span></div>
          <button className="btn-run" onClick={runNow} disabled={running}>
            {running ? <span className="spinner" /> : '⟳'} Check now
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>+ New tracker</button>
        </div>
      </header>

      <main className="main">
        {trackers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎬</div>
            <h2>No trackers yet</h2>
            <p>Add a tracker and get notified the moment tickets open on BookMyShow or District.</p>
            <button className="btn-add large" onClick={() => setShowModal(true)}>+ Add your first tracker</button>
          </div>
        ) : (
          <div className="tracker-grid">
            {trackers.map(t => (
              <TrackerCard key={t.id} tracker={t} onToggle={toggleTracker} onDelete={deleteTracker} onTest={testTracker} onEdit={(tr) => setEditTracker(tr)} />
            ))}
          </div>
        )}
      </main>

      {showModal && <TrackerModal onClose={() => setShowModal(false)} onSave={addTracker} />}
      {editTracker && <TrackerModal onClose={() => setEditTracker(null)} onSave={saveEdit} editData={editTracker} />}

      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}
    </div>
  );
}
