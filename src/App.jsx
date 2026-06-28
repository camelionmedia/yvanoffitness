import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell, LogOut, Check, X, Video, History, Users, Flame, ChevronLeft,
} from 'lucide-react';
import { supabase } from './supabase';

const ADMIN_EMAIL = 'adrianyvanoff14@hotmail.com';

// ─── FONT INJECTION ────────────────────────────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0D0D0D; font-family: 'Inter', sans-serif; color: #fff; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #1a1a1a; }
    ::-webkit-scrollbar-thumb { background: #C8FF00; border-radius: 2px; }
    .bebas { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(200,255,0,0.15); } 50% { box-shadow: 0 0 35px rgba(200,255,0,0.35); } }
    @keyframes fire { 0%,100% { transform: scale(1) rotate(-2deg); } 50% { transform: scale(1.15) rotate(2deg); } }
    @keyframes check-pop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
    @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(300px) rotate(720deg); opacity: 0; } }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .animate-slide-up { animation: slide-up 0.3s ease forwards; }
    .animate-fade-in { animation: fade-in 0.3s ease forwards; }
    input, textarea, select { outline: none; font-family: 'Inter', sans-serif; }
    button { cursor: pointer; font-family: 'Inter', sans-serif; border: none; }
  `}</style>
);

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const ACCENT = '#C8FF00';
const BG = '#0D0D0D';
const CARD = '#161616';
const CARD2 = '#1E1E1E';
const BORDER = '#2A2A2A';
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ACHIEVEMENT_DEFS = [
  { id: 'first_week', icon: '🔥', label: 'Primera semana', desc: '7 días de racha' },
  { id: 'ten_sessions', icon: '💪', label: '10 entrenamientos', desc: 'Completar 10 sesiones' },
  { id: 'thirty_days', icon: '🏆', label: 'Consistente', desc: '30 días de racha' },
  { id: 'speed_runner', icon: '⚡', label: 'Velocista', desc: 'Entreno en menos de 40 min' },
];

function getToday() { return new Date().toISOString().split('T')[0]; }

// logs: array of { date: 'YYYY-MM-DD', completed, duration } sorted desc by date, completed-only
function calculateStreak(logs) {
  if (!logs?.length) return 0;
  const dates = new Set(logs.map(l => l.date));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().split('T')[0];
    if (dates.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else if (i === 0) { cursor.setDate(cursor.getDate() - 1); } // allow "no entrenaste todavía hoy" without breaking the streak
    else break;
  }
  return streak;
}

function unlockedAchievements(logs) {
  const streak = calculateStreak(logs);
  const sessions = logs.length;
  const fastest = Math.min(...logs.map(l => l.duration ?? Infinity), Infinity);
  const unlocked = [];
  if (streak >= 7) unlocked.push('first_week');
  if (sessions >= 10) unlocked.push('ten_sessions');
  if (streak >= 30) unlocked.push('thirty_days');
  if (fastest < 40) unlocked.push('speed_runner');
  return unlocked;
}

// A routine can be assigned to several clients at once (fit_routine_assignments).
// This resolves whichever routine is currently assigned to a given client.
async function getClientRoutine(clientId) {
  const { data } = await supabase
    .from('fit_routine_assignments')
    .select('created_at, fit_routines(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.fit_routines || null;
}

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
const s = {
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 },
  card2: { background: CARD2, borderRadius: 12, padding: 16 },
  label: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase' },
  input: { background: '#1A1A1A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 15, width: '100%' },
  btn: { background: ACCENT, color: BG, fontWeight: 700, fontSize: 15, borderRadius: 12, padding: '14px 24px', width: '100%', transition: 'opacity 0.15s', letterSpacing: '0.02em' },
  btnGhost: { background: 'transparent', color: ACCENT, border: `1px solid ${ACCENT}`, fontWeight: 600, fontSize: 14, borderRadius: 10, padding: '10px 20px', transition: 'all 0.15s' },
};

function Pill({ label, color = ACCENT }) {
  return <span style={{ background: color + '20', color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>;
}

function EmptyState({ icon: Icon = Dumbbell, title, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={32} color="#444" />
      </div>
      <div>
        <div className="bebas" style={{ fontSize: 22, color: '#555', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>{message}</div>
      </div>
    </div>
  );
}

// ─── CONFETTI ──────────────────────────────────────────────────────────────────
function Confetti() {
  const colors = [ACCENT, '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i, color: colors[i % colors.length],
    left: Math.random() * 100, delay: Math.random() * 1.5,
    size: Math.random() * 8 + 6,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: -20, left: `${p.left}%`,
          width: p.size, height: p.size, background: p.color, borderRadius: 2,
          animation: `confetti-fall ${1.5 + p.delay}s ease-in ${p.delay * 0.3}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── CELEBRATION MODAL ─────────────────────────────────────────────────────────
function CelebrationModal({ achievement, onClose }) {
  return (
    <>
      <Confetti />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ ...s.card, textAlign: 'center', maxWidth: 360, width: '100%', animation: 'slide-up 0.4s ease', boxShadow: `0 0 60px rgba(200,255,0,0.25)` }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{achievement ? achievement.icon : '🎉'}</div>
          <div className="bebas" style={{ fontSize: 32, color: ACCENT, marginBottom: 8 }}>
            {achievement ? '¡LOGRO DESBLOQUEADO!' : '¡ENTRENAMIENTO COMPLETADO!'}
          </div>
          {achievement && <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{achievement.label}</div>}
          {achievement && <div style={{ color: '#888', marginBottom: 20 }}>{achievement.desc}</div>}
          <button style={{ ...s.btn, marginTop: achievement ? 0 : 20 }} onClick={onClose}>Continuar 💪</button>
        </div>
      </div>
    </>
  );
}

// ─── COUNTDOWN TIMER ───────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  const pct = remaining / seconds;
  const r = 45, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0' }}>
      <div style={{ color: '#888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Descanso</div>
      <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke={BORDER} strokeWidth={6} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={ACCENT} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
        <text x={60} y={65} textAnchor="middle" fill="#fff" fontSize={28} fontWeight={700}
          style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fontFamily: 'Inter' }}>
          {remaining}
        </text>
      </svg>
      <button style={{ ...s.btnGhost, padding: '8px 20px' }} onClick={onDone}>Saltar</button>
    </div>
  );
}

// ─── EXERCISE CARD ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, index }) {
  return (
    <div style={{ ...s.card2, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="bebas" style={{ color: ACCENT, fontSize: 16 }}>{index + 1}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{exercise.name}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: exercise.notes ? 8 : 0 }}>
          <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{exercise.sets} × {exercise.reps}</span>
          <span style={{ fontSize: 13, color: '#666' }}>{exercise.rest}s descanso</span>
        </div>
        {exercise.notes && <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>{exercise.notes}</div>}
        {exercise.video && (
          <a href={exercise.video} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#FF4444', marginTop: 6, textDecoration: 'none' }}>
            <Video size={12} /> Ver video
          </a>
        )}
      </div>
    </div>
  );
}

// ─── WORKOUT SESSION (GAMIFICADO) ───────────────────────────────────────────
function WorkoutSession({ exercises, clientId, onComplete, onCancel }) {
  const [exIdx, setExIdx] = useState(0);
  const [phasesDone, setPhasesDone] = useState({}); // { ex.id: phasesCompleted }
  const [phaseWeights, setPhaseWeights] = useState({}); // { ex.id: [weight per phase] }
  const [weights, setWeights] = useState({}); // for logging (last weight used)
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [nextExScreen, setNextExScreen] = useState(false);
  const startTime = useRef(Date.now());

  const ex = exercises[exIdx];
  if (!ex) return null;

  // Support old format (sets/reps) or new format (phases)
  const phases = ex.phases && ex.phases.length > 0
    ? ex.phases.filter(p => p.peso || p.reps)
    : [{ peso: '', reps: ex.reps || '8-12', descanso: ex.rest || 60 }];

  const totalPhases = phases.length;
  const donePhases = phasesDone[ex.id] || 0;
  const currentPhase = phases[donePhases];
  const totalExercises = exercises.length;
  const exProgress = exIdx + 1;
  const progressPct = Math.round((exProgress / totalExercises) * 100);
  const allExDone = exercises.every(e => (phasesDone[e.id] || 0) >= (e.phases?.filter(p => p.peso || p.reps).length || 1));

  const getMotivationalMessage = () => {
    if (progressPct === 100) return '¡CASI LISTO! 🔥 Une última cosa...';
    if (progressPct >= 75) return '¡Vas imparable! 💪 Falta poco';
    if (progressPct >= 50) return '¡Mitad recorrida! 🚀 Dale, dale';
    if (progressPct >= 25) return '¡Vamos bien! 💥 Seguí así';
    return '¡Dale! 💪 Vamos a quemar';
  };

  const completePhase = () => {
    const nextPhases = donePhases + 1;
    setPhasesDone({ ...phasesDone, [ex.id]: nextPhases });

    // Check if superset and all phases done
    if (nextPhases >= totalPhases && ex.type === 'superset' && ex.linkedExerciseId) {
      // Find the linked exercise and jump to it
      const linkedIdx = exercises.findIndex(e => e.id === ex.linkedExerciseId);
      if (linkedIdx !== -1) {
        // Jump to linked exercise, no rest
        setExIdx(linkedIdx);
        setResting(false);
        return;
      }
    }

    if (nextPhases < totalPhases) {
      const nextRestTime = parseInt(phases[nextPhases].descanso) || 60;
      setRestTime(nextRestTime);
      setResting(true);
    } else if (exIdx < exercises.length - 1) {
      setNextExScreen(true);
      setTimeout(() => {
        setExIdx(i => i + 1);
        setNextExScreen(false);
        setResting(false);
      }, 2000);
    }
  };

  const finishWorkout = async () => {
    setSaving(true);
    const duration = Math.round((Date.now() - startTime.current) / 60000);
    await supabase.from('fit_logs').upsert({
      client_id: clientId,
      date: getToday(),
      completed: true,
      duration,
      exercises: weights,
    }, { onConflict: 'client_id,date' });
    setSaving(false);
    onComplete();
  };

  if (nextExScreen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '60px 20px', textAlign: 'center', animation: 'slide-up 0.3s ease' }}>
        <Confetti />
        <div style={{ fontSize: 80 }}>✅</div>
        <div className="bebas" style={{ fontSize: 36, color: ACCENT }}>¡EJERCICIO COMPLETADO!</div>
        <div style={{ fontSize: 18, color: '#888' }}>Muy bien, pasamos al siguiente...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barra de progreso visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={s.label}>Progreso</div>
            <div className="bebas" style={{ fontSize: 20, color: ACCENT }}>{progressPct}%</div>
          </div>
          <div style={{ width: '100%', height: 8, background: BORDER, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: ACCENT, transition: 'width 0.6s ease', boxShadow: `0 0 15px ${ACCENT}` }} />
          </div>
        </div>
        <button onClick={onCancel} style={{ background: 'none', color: '#666', padding: '8px' }}><X size={18} /></button>
      </div>

      {/* Mensaje motivacional */}
      <div style={{ background: ACCENT + '15', border: `1px solid ${ACCENT}30`, borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
        <div className="bebas" style={{ fontSize: 16, color: ACCENT }}>{getMotivationalMessage()}</div>
      </div>

      {/* Card del ejercicio */}
      <div style={{ ...s.card, boxShadow: `0 0 30px rgba(200,255,0,0.15)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ ...s.label, marginBottom: 4 }}>Ejercicio {exProgress} de {totalExercises}</div>
            <div>
              <div className="bebas" style={{ fontSize: 26, color: ACCENT }}>
                {ex.type === 'dropset' && '💧 '}
                {ex.type === 'superset' && '🔗 '}
                {ex.name}
              </div>
              {ex.type === 'superset' && ex.linkedExerciseId && (
                <div style={{ fontSize: 12, color: '#88CC00', marginTop: 4 }}>
                  + {exercises.find(e => e.id === ex.linkedExerciseId)?.name || 'Siguiente'} (sin descanso)
                </div>
              )}
            </div>
          </div>
          <div style={{ background: ACCENT + '20', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: ACCENT }}>
            {donePhases}/{totalPhases} serie{totalPhases > 1 ? 's' : ''}
          </div>
        </div>

        {currentPhase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.label }}>Peso (kg)</span>
                <input
                  type="number"
                  placeholder="20"
                  value={(phaseWeights[ex.id]?.[donePhases]) || ''}
                  onChange={e => {
                    const weights = phaseWeights[ex.id] ? [...phaseWeights[ex.id]] : [];
                    weights[donePhases] = e.target.value;
                    setPhaseWeights({ ...phaseWeights, [ex.id]: weights });
                    setWeights({ ...weights, [ex.id]: e.target.value });
                  }}
                  style={{ ...s.input, marginTop: 4, fontSize: 16, padding: '12px', fontWeight: 700 }}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.label }}>Reps</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: ACCENT, marginTop: 8, padding: '8px' }}>{currentPhase.reps}</div>
              </div>
            </div>
            <div>
              <span style={{ ...s.label }}>Descanso</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: parseInt(currentPhase.descanso) === 0 ? '#FF6666' : ACCENT, marginTop: 4 }}>
                {parseInt(currentPhase.descanso) === 0 ? '⚡ SIN DESCANSO' : `${currentPhase.descanso}s`}
              </div>
            </div>
          </div>
        )}

        {ex.notes && <div style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#888', marginBottom: 12 }}>💡 {ex.notes}</div>}
        {ex.video && (
          <a href={ex.video} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#FF4444', marginBottom: 12, textDecoration: 'none' }}>
            <Video size={14} /> Ver técnica
          </a>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Peso utilizado (kg)</label>
          <input style={{ ...s.input, marginTop: 6, fontSize: 18, fontWeight: 700, textAlign: 'center' }} type="number" placeholder="0" value={weights[ex.id] || ''}
            onChange={e => setWeights({ ...weights, [ex.id]: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
          {Array.from({ length: totalPhases }, (_, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${i < donePhases ? ACCENT : BORDER}`, background: i < donePhases ? ACCENT + '20' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: i < donePhases ? 'check-pop 0.4s ease' : 'none', lineHeight: 1 }}>
              {i < donePhases ? <Check size={20} color={ACCENT} /> : <span style={{ fontSize: 14, fontWeight: 600, color: '#555', lineHeight: 1 }}>{i + 1}</span>}
            </div>
          ))}
        </div>

        {/* Instruction based on exercise type */}
        {ex.type === 'dropset' && (
          <div style={{ background: '#2A2A1A', border: '1px solid #FF6666', borderRadius: 10, padding: '12px', fontSize: 12, color: '#FF8888', marginBottom: 16, fontWeight: 700 }}>
            ⚡ DROPSET: Completa esta serie y baja el peso para la siguiente SIN DESCANSO
          </div>
        )}
        {ex.type === 'superset' && ex.linkedExerciseId && (
          <div style={{ background: '#1A2A1A', border: `1px solid ${ACCENT}40`, borderRadius: 10, padding: '12px', fontSize: 12, color: '#88CC00', marginBottom: 16, fontWeight: 700 }}>
            🔗 SUPERSET: Completa esta serie y pasa INMEDIATAMENTE a <strong>{exercises.find(e => e.id === ex.linkedExerciseId)?.name}</strong> SIN DESCANSO
          </div>
        )}
        {ex.type === 'normal' && (
          <div style={{ background: '#1A2A1A', border: `1px solid ${ACCENT}40`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#88CC00' }}>
            💪 Controla el movimiento. Recorrido completo siempre.
          </div>
        )}

        {resting ? (
          <RestTimer seconds={restTime} onDone={() => { setResting(false); }} />
        ) : donePhases < totalPhases ? (
          <button style={{ ...s.btn, fontSize: 16, padding: '16px', boxShadow: `0 0 20px rgba(200,255,0,0.3)` }} onClick={completePhase}>
            {ex.type === 'dropset' ? '✓ serie ' + (donePhases + 1) + ' lista - Baja peso' : ex.type === 'superset' ? '✓ Pasa al siguiente' : '✓ serie ' + (donePhases + 1) + ' completada'}
          </button>
        ) : exIdx < exercises.length - 1 ? (
          <button style={{ ...s.btn, background: ACCENT, fontSize: 16, padding: '16px' }} onClick={() => setNextExScreen(true)}>
            ✅ Ejercicio listo → Siguiente
          </button>
        ) : null}
      </div>

      {allExDone && (
        <button style={{ ...s.btn, background: ACCENT, fontSize: 18, padding: '18px', boxShadow: `0 0 30px rgba(200,255,0,0.4)`, opacity: saving ? 0.7 : 1 }} onClick={finishWorkout} disabled={saving}>
          {saving ? 'Guardando…' : '🎉 ¡TERMINAR ENTRENAMIENTO!'}
        </button>
      )}
    </div>
  );
}

// ─── STUDENT HOME (today) ──────────────────────────────────────────────────────
function StudentHome({ client, routine, todayLog, allLogs, onStartWorkout }) {
  const today = DAYS[new Date().getDay()];
  // Filter out exercises that are linked as superset (they should only appear as part of superset)
  const allTodayExercises = routine?.days?.[today] || [];
  const linkedExerciseIds = new Set(
    allTodayExercises
      .filter(ex => ex.type === 'superset' && ex.linkedExerciseId)
      .map(ex => ex.linkedExerciseId)
  );
  const todayExercises = allTodayExercises.filter(ex => !linkedExerciseIds.has(ex.id));
  const streak = calculateStreak(allLogs);
  const points = allLogs.length * 50;
  const achievements = unlockedAchievements(allLogs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-up 0.3s ease' }}>
      <div className="bebas" style={{ fontSize: 30 }}>Hola, {client.name.split(' ')[0]} 👋</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...s.card, animation: streak >= 3 ? 'pulse-glow 3s ease infinite' : 'none' }}>
          <div style={s.label}>Racha actual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="bebas" style={{ fontSize: 44, color: streak >= 3 ? '#FF6B35' : '#fff', lineHeight: 1 }}>{streak}</span>
            <span style={{ fontSize: 24, animation: streak >= 3 ? 'fire 0.8s ease infinite' : 'none', display: 'inline-block' }}>🔥</span>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>días consecutivos</div>
        </div>
        <div style={s.card}>
          <div style={s.label}>Puntos</div>
          <div className="bebas" style={{ fontSize: 44, color: ACCENT, lineHeight: 1, marginTop: 6 }}>{points}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>XP acumulados</div>
        </div>
      </div>

      {achievements.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {achievements.map(id => {
            const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
            if (!def) return null;
            return (
              <div key={id} title={def.label} style={{ flexShrink: 0, background: ACCENT + '15', border: `1px solid ${ACCENT}30`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{def.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>{def.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {!routine ? (
        <div style={s.card}>
          <EmptyState icon={Dumbbell} title="Sin rutina asignada" message="Tu coach todavía no te asignó una rutina. Avisale por WhatsApp para empezar 💪" />
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ ...s.label, marginBottom: 12 }}>Entrenamiento de hoy — {today}</div>
          {todayLog?.completed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: ACCENT + '15', borderRadius: 10, padding: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={18} color={BG} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: ACCENT }}>¡Ya entrenaste hoy!</div>
                <div style={{ fontSize: 13, color: '#888' }}>{todayLog.duration} minutos</div>
              </div>
            </div>
          ) : todayExercises.length > 0 ? (
            <>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{todayExercises.length} ejercicios · {routine.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {todayExercises.slice(0, 3).map((ex, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <span>{ex.name}</span>
                    <span style={{ color: ACCENT, fontWeight: 600 }}>{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
                {todayExercises.length > 3 && <div style={{ fontSize: 13, color: '#666' }}>+{todayExercises.length - 3} más…</div>}
              </div>
              <button style={{ ...s.btn, boxShadow: `0 0 25px rgba(200,255,0,0.3)` }} onClick={onStartWorkout}>
                ⚡ Empezar entrenamiento de hoy
              </button>
            </>
          ) : (
            <div style={{ fontSize: 14, color: '#666', padding: '12px 0' }}>Hoy es día de descanso 😴</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STUDENT FULL WEEK ─────────────────────────────────────────────────────────
function StudentRoutine({ routine, todayLog }) {
  const today = DAYS[new Date().getDay()];

  if (!routine) return <EmptyState icon={Dumbbell} title="Sin rutina asignada" message="Tu coach aún no te asignó una rutina. Avisale para empezar 💪" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-up 0.3s ease' }}>
      <div style={s.card}>
        <div className="bebas" style={{ fontSize: 24 }}>{routine.name}</div>
        <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{routine.description}</div>
      </div>
      {Object.entries(routine.days).map(([day, exercises]) => {
        const isToday = day === today;
        const isDone = !!todayLog?.completed && isToday;
        return (
          <div key={day} style={{ ...s.card, border: `1px solid ${isToday ? ACCENT + '50' : BORDER}`, boxShadow: isToday ? `0 0 20px rgba(200,255,0,0.1)` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="bebas" style={{ fontSize: 20, color: isToday ? ACCENT : '#fff' }}>{day}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isToday && <Pill label="HOY" color={ACCENT} />}
                {isDone && <Pill label="✓ COMPLETADO" color="#4ECDC4" />}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {exercises.map((ex, i) => <ExerciseCard key={ex.id} exercise={ex} index={i} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function exerciseNameMap(routine) {
  const map = {};
  if (!routine?.days) return map;
  Object.values(routine.days).forEach(exs => exs.forEach(ex => { map[ex.id] = ex.name; }));
  return map;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── STUDENT HISTORY ────────────────────────────────────────────────────────────
function StudentHistory({ clientId, routine }) {
  const [logs, setLogs] = useState(null);
  const [photos, setPhotos] = useState(null);
  const nameMap = exerciseNameMap(routine);

  useEffect(() => {
    Promise.all([
      supabase.from('fit_logs').select('*').eq('client_id', clientId).eq('completed', true).order('date', { ascending: false }).limit(30).then(r => r.data || []),
      supabase.from('fit_workout_photos').select('*').eq('client_id', clientId).order('photo_date', { ascending: false }).limit(50).then(r => r.data || []),
    ]).then(([logsData, photosData]) => {
      setLogs(logsData);
      setPhotos(photosData);
    });
  }, [clientId]);

  if (logs === null) return <div style={{ color: '#666', padding: '24px 0' }}>Cargando…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-up 0.3s ease' }}>
      <div className="bebas" style={{ fontSize: 26 }}>Tu historial</div>

      {photos && photos.length > 0 && (
        <div style={s.card}>
          <div style={{ ...s.label, marginBottom: 12 }}>Tu progreso visual</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {photos.map(p => (
              <img key={p.id} src={p.photo_url} style={{ width: '100%', aspectRatio: '1', borderRadius: 8, objectFit: 'cover' }} />
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={History} title="Sin entrenamientos todavía" message="Cuando termines tu primer entrenamiento, vas a ver tu historial acá" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.map(log => (
            <div key={log.id} style={s.card2}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>{formatDate(log.date)}</div>
                <Pill label={`${log.duration ?? '–'} min`} />
              </div>
              {log.exercises && Object.keys(log.exercises).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(log.exercises).map(([exId, weight]) => (
                    <div key={exId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#999' }}>
                      <span>{nameMap[exId] || exId}</span>
                      <span style={{ color: ACCENT, fontWeight: 600 }}>{weight} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── POST-WORKOUT PHOTOS ───────────────────────────────────────────────────────
function PostWorkoutPhotos({ clientId, onClose, onSave }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 3) {
      alert('Máximo 3 fotos');
      return;
    }
    setUploading(true);

    for (const file of files) {
      const filename = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { data, error } = await supabase.storage.from('workout_photos').upload(filename, file);

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('workout_photos').getPublicUrl(filename);
        await supabase.from('fit_workout_photos').insert({
          client_id: clientId,
          photo_url: publicUrl,
          photo_date: getToday(),
          uploaded_by: null,
        });
        setPhotos([...photos, publicUrl]);
      }
    }
    setUploading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 32 }}>
      <Confetti />
      <div style={{ fontSize: 80, marginBottom: 8 }}>🔥</div>
      <div className="bebas" style={{ fontSize: 32, color: ACCENT, marginBottom: 16 }}>¡ENTRENAMIENTO COMPLETADO!</div>
      <div style={{ fontSize: 16, color: '#888', maxWidth: 300 }}>Sácate una foto de tu pump y guarda tu progreso 💪</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {photos.map((p, i) => (
          <img key={i} src={p} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
        ))}
      </div>

      {photos.length < 3 && (
        <button onClick={() => fileInputRef.current?.click()} style={{ ...s.btn, maxWidth: 300 }} disabled={uploading}>
          {uploading ? 'Subiendo…' : photos.length === 0 ? '📸 Sacar foto' : '➕ Otra foto'}
        </button>
      )}
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoCapture} style={{ display: 'none' }} />

      <button onClick={onSave} style={{ ...s.btnGhost, maxWidth: 300 }}>
        {photos.length > 0 ? '✅ Listo, continuar' : 'Saltar fotos'}
      </button>
    </div>
  );
}

// ─── QUICK COACH LOG (registrar entrenamientos presenciales) ─────────────────
function QuickCoachLog({ client, routine, onBack, onSave }) {
  const [today] = useState(getToday());
  const [setsDone, setSetsDone] = useState({});
  const [weights, setWeights] = useState({});
  const [saving, setSaving] = useState(false);
  const today_day = DAYS[new Date().getDay()];
  const todayExercises = routine?.days?.[today_day] || [];

  const saveLog = async () => {
    setSaving(true);
    await supabase.from('fit_logs').upsert({
      client_id: client.id,
      date: today,
      completed: true,
      duration: 0,
      exercises: weights,
    }, { onConflict: 'client_id,date' });
    setSaving(false);
    onSave();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        <ChevronLeft size={16} /> Volver
      </button>
      <div className="bebas" style={{ fontSize: 24 }}>⚡ Quick Log — {client.name}</div>
      <div style={{ ...s.label }}>Registra el entrenamiento de {today_day}</div>

      {todayExercises.length === 0 ? (
        <div style={{ color: '#666' }}>No hay ejercicios para {today_day}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {todayExercises.map(ex => (
            <div key={ex.id} style={s.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{ex.name}</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Peso (kg)</label>
                  <input style={{ ...s.input, marginTop: 4, fontSize: 14 }} type="number" placeholder="0" value={weights[ex.id] || ''}
                    onChange={e => setWeights({ ...weights, [ex.id]: e.target.value })} />
                </div>
                <div style={{ width: 100 }}>
                  <label style={s.label}>Series</label>
                  <select value={setsDone[ex.id] || ex.sets} onChange={e => setSetsDone({ ...setsDone, [ex.id]: e.target.value })} style={{ ...s.input, marginTop: 4, fontSize: 14 }}>
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button style={{ ...s.btn, marginTop: 8 }} onClick={saveLog} disabled={saving}>
            {saving ? 'Guardando…' : '✅ Guardar entrenamiento'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── UPLOAD PHOTOS PANEL ────────────────────────────────────────────────────
function UploadPhotosPanel({ client, onBack, onSave }) {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files.slice(0, 3)) {
      const filename = `${client.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { data, error } = await supabase.storage.from('workout_photos').upload(filename, file);

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('workout_photos').getPublicUrl(filename);
        await supabase.from('fit_workout_photos').insert({
          client_id: client.id,
          photo_url: publicUrl,
          photo_date: selectedDate,
          uploaded_by: null,
        });
      }
    }
    setUploading(false);
    onSave();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        <ChevronLeft size={16} /> Volver
      </button>
      <div className="bebas" style={{ fontSize: 24 }}>📸 Subir fotos — {client.name}</div>

      <div style={s.card}>
        <label style={{ ...s.label, display: 'block', marginBottom: 8 }}>Fecha de la foto</label>
        <input style={{ ...s.input, marginBottom: 16 }} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

        <label style={{ ...s.label, display: 'block', marginBottom: 8 }}>Selecciona fotos (máximo 3)</label>
        <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'block', marginBottom: 12 }} />
        <div style={{ fontSize: 12, color: '#666' }}>Soporta JPG, PNG. Máximo 3 fotos por subida.</div>
      </div>
    </div>
  );
}

// ─── ROUTINE BUILDER (coach) ─────────────────────────────────────────────────
function newExercise() {
  return {
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    type: 'normal', // 'normal', 'dropset', 'superset'
    video: '',
    notes: '',
    linkedExerciseId: null, // if type === 'superset', link to next exercise
    phases: [
      { reps: '', descanso: '' },
      { reps: '', descanso: '' },
      { reps: '', descanso: '' },
    ]
  };
}

// Validate exercise configuration (coach-side)
function validateExercise(ex, allExercises) {
  const errors = [];

  // Only validate essential fields
  if (!ex || !ex.name || !ex.name.trim()) errors.push('Nombre del ejercicio requerido');

  // Superset-only validation: must have linked exercise
  if (ex?.type === 'superset') {
    if (!ex.linkedExerciseId) errors.push('Superset: Selecciona un ejercicio vinculado');
  }

  return errors;
}

function RoutineBuilder({ clients, onBack }) {
  const [routines, setRoutines] = useState(null);
  const [assignments, setAssignments] = useState([]); // { routine_id, client_id }
  const [editing, setEditing] = useState(null); // null | { id?, name, description, days, assignedIds:[] }
  const [activeDay, setActiveDay] = useState('Lunes');
  const [saving, setSaving] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null); // null | { sourceDay, selected: {day: bool} }
  const weekDays = DAYS.slice(1).concat(DAYS[0]); // Lunes..Sábado, Domingo

  const load = async () => {
    const [{ data: rts }, { data: asg }] = await Promise.all([
      supabase.from('fit_routines').select('*').order('created_at', { ascending: false }),
      supabase.from('fit_routine_assignments').select('routine_id, client_id'),
    ]);
    setRoutines(rts || []);
    setAssignments(asg || []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ name: '', description: '', days: {}, assignedIds: [] });
    setActiveDay('Lunes');
  };

  const startEdit = (r) => {
    const assignedIds = assignments.filter(a => a.routine_id === r.id).map(a => a.client_id);
    setEditing({ id: r.id, name: r.name, description: r.description || '', days: r.days || {}, assignedIds });
    setActiveDay('Lunes');
  };

  const exercisesFor = (day) => editing.days[day] || [];
  const setExercisesFor = (day, list) => setEditing({ ...editing, days: { ...editing.days, [day]: list } });

  const addExercise = (day) => setExercisesFor(day, [...exercisesFor(day), newExercise()]);
  const updateExercise = (day, idx, field, value) => {
    const list = [...exercisesFor(day)];
    list[idx] = { ...list[idx], [field]: value };
    setExercisesFor(day, list);
  };
  const removeExercise = (day, idx) => setExercisesFor(day, exercisesFor(day).filter((_, i) => i !== idx));
  const moveExercise = (day, idx, direction) => {
    const list = [...exercisesFor(day)];
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    setExercisesFor(day, list);
  };

  const toggleAssign = (clientId) => {
    const has = editing.assignedIds.includes(clientId);
    setEditing({ ...editing, assignedIds: has ? editing.assignedIds.filter(id => id !== clientId) : [...editing.assignedIds, clientId] });
  };

  const deleteRoutine = async (r) => {
    if (!confirm(`¿Borrar la rutina "${r.name}"? Esto la quita de todos los clientes asignados.`)) return;
    await supabase.from('fit_routines').delete().eq('id', r.id);
    await load();
  };

  const save = async () => {
    if (!editing.name.trim()) { alert('Ponele un nombre a la rutina'); return; }
    setSaving(true);
    // clean empty exercises (no name)
    const cleanDays = {};
    for (const [day, list] of Object.entries(editing.days)) {
      const kept = (list || []).filter(ex => ex.name.trim());
      if (kept.length) cleanDays[day] = kept;
    }
    let routineId = editing.id;
    if (routineId) {
      await supabase.from('fit_routines').update({ name: editing.name.trim(), description: editing.description, days: cleanDays }).eq('id', routineId);
    } else {
      const { data } = await supabase.from('fit_routines').insert({ name: editing.name.trim(), description: editing.description, days: cleanDays }).select().single();
      routineId = data?.id;
    }
    // sync assignments: delete all, re-insert selected
    if (routineId) {
      await supabase.from('fit_routine_assignments').delete().eq('routine_id', routineId);
      if (editing.assignedIds.length) {
        await supabase.from('fit_routine_assignments').insert(editing.assignedIds.map(client_id => ({ routine_id: routineId, client_id })));
      }
    }
    setSaving(false);
    setEditing(null);
    await load();
  };

  // ── EDIT VIEW ──
  if (editing) {
    const dayExercises = exercisesFor(activeDay);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={() => setEditing(null)} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <ChevronLeft size={16} /> Cancelar
        </button>
        <div className="bebas" style={{ fontSize: 26 }}>{editing.id ? 'Editar rutina' : 'Nueva rutina'}</div>

        <div style={s.card}>
          <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Nombre de la rutina</label>
          <input style={{ ...s.input, marginBottom: 14 }} placeholder="Ej: Full Body Grupo 1" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
          <input style={s.input} placeholder="Ej: 3 días, fuerza e hipertrofia" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
        </div>

        {/* Asignar clientes */}
        <div style={s.card}>
          <div style={{ ...s.label, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Asignar a clientes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(clients || []).map(c => {
              const on = editing.assignedIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleAssign(c.id)} style={{ background: on ? ACCENT : '#1A1A1A', color: on ? BG : '#aaa', border: `1px solid ${on ? ACCENT : BORDER}`, borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
                  {on ? '✓ ' : ''}{c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day tabs + duplicate button */}
        <div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
            {weekDays.map(d => {
              const count = (editing.days[d] || []).filter(e => e.name.trim()).length;
              return (
                <button key={d} onClick={() => setActiveDay(d)} style={{ flexShrink: 0, background: activeDay === d ? ACCENT + '20' : '#1A1A1A', color: activeDay === d ? ACCENT : '#888', border: `1px solid ${activeDay === d ? ACCENT : BORDER}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
                  {d.slice(0, 3)}{count > 0 ? ` · ${count}` : ''}
                </button>
              );
            })}
          </div>
          {exercisesFor(activeDay).filter(e => e.name.trim()).length > 0 && (
            <button
              onClick={() => {
                const selected = {};
                weekDays.forEach(d => {
                  selected[d] = d !== activeDay; // pre-select all except source day
                });
                setDuplicateModal({ sourceDay: activeDay, selected });
              }}
              style={{ ...s.btnGhost, width: '100%', fontSize: 12 }}
            >
              🔄 Duplicar {activeDay} a otros días
            </button>
          )}
        </div>

        {/* Exercises for active day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dayExercises.length === 0 && (
            <div style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Sin ejercicios para {activeDay}. Agregá el primero 👇</div>
          )}
          {dayExercises.map((ex, idx) => (
            <div key={ex.id} style={s.card}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <input style={{ ...s.input, fontWeight: 700 }} placeholder="Nombre del ejercicio" value={ex.name} onChange={e => updateExercise(activeDay, idx, 'name', e.target.value)} />
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => moveExercise(activeDay, idx, 'up')}
                    disabled={idx === 0}
                    style={{ background: idx === 0 ? '#1A1A1A' : '#1A3A1A', border: '1px solid #2A4A2A', borderRadius: 8, padding: '8px 10px', color: idx === 0 ? '#555' : ACCENT, opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? 'default' : 'pointer' }}
                  >↑</button>
                  <button
                    onClick={() => moveExercise(activeDay, idx, 'down')}
                    disabled={idx === dayExercises.length - 1}
                    style={{ background: idx === dayExercises.length - 1 ? '#1A1A1A' : '#1A3A1A', border: '1px solid #2A4A2A', borderRadius: 8, padding: '8px 10px', color: idx === dayExercises.length - 1 ? '#555' : ACCENT, opacity: idx === dayExercises.length - 1 ? 0.4 : 1, cursor: idx === dayExercises.length - 1 ? 'default' : 'pointer' }}
                  >↓</button>
                </div>
                <button onClick={() => removeExercise(activeDay, idx)} style={{ background: '#2A1A1A', border: '1px solid #4A2A2A', borderRadius: 10, padding: '0 12px', color: '#FF6666', flexShrink: 0 }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Tipo de técnica</label>
                  <select value={ex.type || 'normal'} onChange={e => updateExercise(activeDay, idx, 'type', e.target.value)} style={{ ...s.input, marginTop: 4, fontSize: 14 }}>
                    <option value="normal">Normal</option>
                    <option value="dropset">💧 Dropset</option>
                    <option value="superset">🔗 Superset</option>
                  </select>
                </div>
              </div>

              {/* Tooltips */}
              {ex.type === 'dropset' && (
                <div style={{ background: '#1A2A1A', border: `1px solid ${ACCENT}40`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#88CC00', marginBottom: 12 }}>
                  💧 <strong>Dropset:</strong> Mismo ejercicio, bajas peso entre series, SIN descanso entre ellas. Ej: 20kg × 10 → 15kg × 15 → 10kg × 20
                </div>
              )}
              {ex.type === 'superset' && (
                <div style={{ background: '#1A2A1A', border: `1px solid ${ACCENT}40`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#88CC00', marginBottom: 12 }}>
                  🔗 <strong>Superset:</strong> DOS ejercicios diferentes, uno tras otro SIN descanso. Selecciona el próximo ejercicio abajo.
                </div>
              )}

              {/* Superset: Select linked exercise */}
              {ex.type === 'superset' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={s.label}>Ejercicio siguiente (vinculado)</label>
                  <select
                    value={ex.linkedExerciseId || ''}
                    onChange={e => updateExercise(activeDay, idx, 'linkedExerciseId', e.target.value)}
                    style={{ ...s.input, marginTop: 4, fontSize: 14 }}
                  >
                    <option value="">-- Selecciona un ejercicio --</option>
                    {dayExercises.map((e, i) => (
                      i !== idx && e.name && (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      )
                    ))}
                  </select>
                  {!ex.linkedExerciseId && <div style={{ fontSize: 12, color: '#FF6666', marginTop: 6 }}>⚠️ Debes seleccionar un ejercicio para que el superset funcione</div>}
                </div>
              )}

              {/* Validation errors (real-time) */}
              {(() => {
                const errors = validateExercise(ex, dayExercises);
                return errors.length > 0 ? (
                  <div style={{ background: '#2A1A1A', border: '1px solid #FF6666', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
                    <div style={{ color: '#FF6666', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⚠️ Errores:</div>
                    {errors.map((err, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#FF8888', marginBottom: i < errors.length - 1 ? 4 : 0 }}>
                        • {err}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* For Superset: show linked exercise info + shared phase count */}
              {ex.type === 'superset' && ex.linkedExerciseId && (() => {
                const linked = dayExercises.find(e => e.id === ex.linkedExerciseId);
                return linked ? (
                  <div style={{ background: '#1A2A1A', border: `1px solid ${ACCENT}40`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#88CC00' }}>
                    🔗 Superset vinculado: <strong>{linked.name}</strong> ({linked.phases?.length || 0} series)
                  </div>
                ) : null;
              })()}

              {/* Number of phases selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>
                  ¿Cuántas series?
                  {ex.type === 'superset' && ' (ambos ejercicios)'}
                </label>
                <select
                  value={ex.phases?.length || 3}
                  onChange={e => {
                    const newCount = parseInt(e.target.value);
                    const phases = [...(ex.phases || [])];
                    while (phases.length < newCount) phases.push({ reps: '', descanso: '' });
                    phases.splice(newCount);
                    updateExercise(activeDay, idx, 'phases', phases);

                    // If this is a superset, also update linked exercise's phase count
                    if (ex.type === 'superset' && ex.linkedExerciseId) {
                      const linkedIdx = dayExercises.findIndex(e => e.id === ex.linkedExerciseId);
                      if (linkedIdx !== -1) {
                        const linkedPhases = [...(dayExercises[linkedIdx].phases || [])];
                        while (linkedPhases.length < newCount) linkedPhases.push({ reps: '', descanso: '' });
                        linkedPhases.splice(newCount);
                        updateExercise(activeDay, linkedIdx, 'phases', linkedPhases);
                      }
                    }
                  }}
                  style={{ ...s.input, marginTop: 4, fontSize: 14 }}
                >
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'serie' : 'series'}</option>)}
                </select>
              </div>

              {/* series table (reps and descanso only) */}
              <label style={s.label}>
                Detalles de cada serie
                {ex.type === 'dropset' && ' ⚡ (SIN descanso)'}
              </label>
              <div style={{ marginBottom: 12, overflowX: 'auto', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#1A1A1A' }}>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#888', fontWeight: 600, borderRight: `1px solid ${BORDER}` }}>serie</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#888', fontWeight: 600, borderRight: `1px solid ${BORDER}` }}>Reps</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#888', fontWeight: 600 }}>
                        {ex.type === 'dropset' ? '⚡ Descanso' : 'Descanso (s)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ex.phases || []).map((phase, pIdx) => {
                      // For dropset: force descanso = 0
                      const descanso = ex.type === 'dropset' ? 0 : phase.descanso;
                      return (
                        <tr key={pIdx} style={{ borderTop: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#aaa' }}>{pIdx + 1}</td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="text"
                              placeholder="8-10"
                              value={phase.reps}
                              onChange={e => {
                                const phases = [...ex.phases];
                                phases[pIdx] = { ...phases[pIdx], reps: e.target.value };
                                updateExercise(activeDay, idx, 'phases', phases);
                              }}
                              style={{ ...s.input, fontSize: 12, padding: '6px', width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            {ex.type === 'dropset' ? (
                              <div style={{ padding: '6px', textAlign: 'center', color: '#88CC00', fontWeight: 700 }}>⚡ 0s</div>
                            ) : (
                              <input
                                type="number"
                                placeholder="90"
                                value={descanso}
                                onChange={e => {
                                  const phases = [...ex.phases];
                                  phases[pIdx] = { ...phases[pIdx], descanso: e.target.value };
                                  updateExercise(activeDay, idx, 'phases', phases);
                                }}
                                style={{ ...s.input, fontSize: 12, padding: '6px', width: '100%' }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <label style={s.label}>Video técnica (URL opcional)</label>
              <input style={{ ...s.input, marginTop: 4, marginBottom: 8, fontSize: 14 }} placeholder="https://youtube.com/..." value={ex.video} onChange={e => updateExercise(activeDay, idx, 'video', e.target.value)} />
              <label style={s.label}>Notas (opcional)</label>
              <input style={{ ...s.input, marginTop: 4, fontSize: 14 }} placeholder="Ej: bajada controlada 3 seg" value={ex.notes} onChange={e => updateExercise(activeDay, idx, 'notes', e.target.value)} />
            </div>
          ))}
          <button onClick={() => addExercise(activeDay)} style={{ ...s.btnGhost, width: '100%' }}>+ Agregar ejercicio a {activeDay}</button>
        </div>

        {(() => {
          // Validate ALL exercises in ALL days
          const allExercises = Object.values(editing.days).flat();
          const allErrors = allExercises.flatMap(ex => validateExercise(ex, allExercises));
          const hasErrors = allErrors.length > 0;

          return (
            <>
              {hasErrors && (
                <div style={{ background: '#2A1A1A', border: '1px solid #FF6666', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
                  <div style={{ color: '#FF6666', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>❌ No se puede guardar: hay {allErrors.length} error{allErrors.length > 1 ? 'es' : ''}</div>
                  <div style={{ fontSize: 11, color: '#FF8888', maxHeight: 120, overflowY: 'auto' }}>
                    {allErrors.map((err, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={save} disabled={saving || hasErrors} style={{ ...s.btn, marginTop: 8, opacity: hasErrors ? 0.4 : 1 }}>
                {saving ? 'Guardando…' : hasErrors ? '❌ Corregí los errores' : '✅ Guardar rutina'}
              </button>
            </>
          );
        })()}

        {/* Modal: Duplicate to selected days */}
        {duplicateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}>
            <div style={{ ...s.card, maxWidth: 400, width: '100%' }}>
              <div className="bebas" style={{ fontSize: 20, marginBottom: 16 }}>Duplicar {duplicateModal.sourceDay}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {weekDays.map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={duplicateModal.selected[d] || false}
                      onChange={e => setDuplicateModal({
                        ...duplicateModal,
                        selected: { ...duplicateModal.selected, [d]: e.target.checked }
                      })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 14, color: '#fff' }}>{d}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDuplicateModal(null)}
                  style={{ ...s.btnGhost, flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const exercises = exercisesFor(duplicateModal.sourceDay);
                    const newDays = { ...editing.days };
                    weekDays.forEach(d => {
                      if (duplicateModal.selected[d]) {
                        newDays[d] = exercises.map(ex => ({ ...ex, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }));
                      }
                    });
                    setEditing({ ...editing, days: newDays });
                    setDuplicateModal(null);
                  }}
                  style={{ ...s.btn, flex: 1 }}
                >
                  ✅ Duplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        <ChevronLeft size={16} /> Volver
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="bebas" style={{ fontSize: 26 }}>Mis rutinas</div>
        <button onClick={startNew} style={{ ...s.btnGhost, padding: '8px 14px', fontSize: 13 }}>+ Nueva</button>
      </div>

      {routines === null ? (
        <div style={{ color: '#666' }}>Cargando…</div>
      ) : routines.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sin rutinas todavía" message="Creá tu primera rutina y asignala a tus clientes" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {routines.map(r => {
            const assignedNames = assignments.filter(a => a.routine_id === r.id)
              .map(a => (clients || []).find(c => c.id === a.client_id)?.name).filter(Boolean);
            const dayCount = Object.values(r.days || {}).filter(l => (l || []).length).length;
            return (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{r.description}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <Pill label={`${dayCount} días`} />
                      {assignedNames.length > 0
                        ? <Pill label={assignedNames.join(', ')} color="#4ECDC4" />
                        : <Pill label="Sin asignar" color="#FF6B6B" />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(r)} style={{ ...s.btnGhost, padding: '8px 12px', fontSize: 12 }}>Editar</button>
                    <button onClick={() => deleteRoutine(r)} style={{ background: '#2A1A1A', border: '1px solid #4A2A2A', borderRadius: 10, padding: '8px 10px', color: '#FF6666' }}><X size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL (coach) ───────────────────────────────────────────────────────
const GROUPS = {
  '1': { name: 'Grupo 1 (6-7 AM)', clients: ['01b2d8eb-479c-413b-a32b-d0071c8531c5', '390f8357-0b79-42ce-b086-431c1ddc0798', '31c6e03c-81e2-49d5-b315-83e72628c6b3'] }, // Vero, Ale, Albert
  '2': { name: 'Grupo 2 (5-6 AM)', clients: ['be4a6986-ae74-47a0-931c-11e91dcdfb32', 'ef30aeef-f16e-46d7-9feb-a32e51636a79'] }, // Rodri, Diego
};

function AdminPanel({ onLogout, onSwitchToTraining }) {
  const [view, setView] = useState('groups'); // 'groups' | 'group-clients' | 'client' | 'quick-log' | 'upload-photos'
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState(null);
  const [groupClients, setGroupClients] = useState(null);
  const [logs, setLogs] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    supabase.from('fit_clients').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setClients(data || []));
  }, []);

  const openGroup = async (groupId) => {
    setSelectedGroup(groupId);
    setView('group-clients');
    const clientIds = GROUPS[groupId].clients;
    const { data } = await supabase.from('fit_clients').select('*').in('id', clientIds);
    setGroupClients(data || []);
  };

  const openClient = async (client) => {
    setSelectedClient(client);
    setView('client');
    setLogs(null);
    setPhotos(null);
    setRoutine(null);
    const [{ data: logRows }, { data: photoRows }, routineRow] = await Promise.all([
      supabase.from('fit_logs').select('*').eq('client_id', client.id).eq('completed', true).order('date', { ascending: false }).limit(30),
      supabase.from('fit_workout_photos').select('*').eq('client_id', client.id).order('photo_date', { ascending: false }).limit(20),
      getClientRoutine(client.id),
    ]);
    setLogs(logRows || []);
    setPhotos(photoRows || []);
    setRoutine(routineRow);
  };

  const sessionsThisWeek = (clientLogs) => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return (clientLogs || []).filter(l => new Date(l.date) >= weekAgo).length;
  };

  const avgWeight = (clientLogs, exerciseId) => {
    const weights = clientLogs.filter(l => l.exercises?.[exerciseId]).map(l => parseFloat(l.exercises[exerciseId]));
    return weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : '–';
  };

  const memberNames = (group) => group.clients.map(id => (clients || []).find(c => c.id === id)?.name).filter(Boolean).join(' · ');

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      {/* Sticky top bar — respeta el notch del celular */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '12px 16px' : '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div className="bebas" style={{ fontSize: isMobile ? 22 : 26, color: ACCENT, letterSpacing: '0.08em' }}>YVANOFF</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onSwitchToTraining && (
              <button onClick={onSwitchToTraining} style={{ ...s.btnGhost, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Dumbbell size={16} /> {!isMobile && 'Mi entrenamiento'}
              </button>
            )}
            <button onClick={onLogout} style={{ background: '#1A1A1A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
              <LogOut size={16} /> {!isMobile && 'Salir'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '20px 16px 80px' : '28px 32px' }}>

        {/* VISTA: Grupos (dashboard) */}
        {view === 'groups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'slide-up 0.3s ease' }}>
            <div>
              <div style={s.label}>Panel del coach</div>
              <div className="bebas" style={{ fontSize: 32, marginTop: 2 }}>Hola, Adrián 👋</div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Gestioná tus rutinas y seguí el progreso de cada cliente.</div>
            </div>

            {/* Sección: Entrenamiento */}
            <div>
              <div style={{ ...s.label, marginBottom: 10 }}>Entrenamiento</div>
              <button onClick={() => setView('routines')} style={{ ...s.card, width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: '#fff', background: `linear-gradient(135deg, ${ACCENT}18, ${CARD})`, borderColor: ACCENT + '40' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Dumbbell size={22} color={BG} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Rutinas</div>
                  <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Creá y asigná planes a tus clientes</div>
                </div>
                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)', color: '#666' }} />
              </button>
            </div>

            {/* Sección: Mis clientes */}
            <div>
              <div style={{ ...s.label, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Mis clientes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(GROUPS).map(([id, group]) => (
                  <button key={id} onClick={() => openGroup(id)} style={{ ...s.card, width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', color: '#fff' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1A1A1A', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>{id === '1' ? '🌅' : '⏰'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{group.name}</div>
                      <div style={{ fontSize: 13, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberNames(group) || `${group.clients.length} clientes`}</div>
                    </div>
                    <ChevronLeft size={18} style={{ transform: 'rotate(180deg)', color: '#666' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA: Rutinas */}
        {view === 'routines' && (
          <RoutineBuilder clients={clients} onBack={() => setView('groups')} />
        )}

        {/* VISTA: Clientes del grupo */}
        {view === 'group-clients' && selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setView('groups')} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 8 }}>
              <ChevronLeft size={16} /> Volver
            </button>
            <div style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> {GROUPS[selectedGroup].name}</div>
            {groupClients?.map(c => (
              <button key={c.id} onClick={() => openClient(c)} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', color: '#fff' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: '#666' }} />
              </button>
            ))}
          </div>
        )}

        {/* VISTA: Cliente detail + Quick Log */}
        {view === 'client' && selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => { setView('group-clients'); setSelectedClient(null); }} style={{ background: 'none', color: '#888', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <ChevronLeft size={16} /> Volver
            </button>

            <div className="bebas" style={{ fontSize: 28 }}>{selectedClient.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setView('quick-log')} style={{ ...s.card, padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left', color: '#fff' }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Registrar entreno</span>
                <span style={{ fontSize: 12, color: '#888' }}>Cargar pesos de hoy</span>
              </button>
              <button onClick={() => setView('upload-photos')} style={{ ...s.card, padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left', color: '#fff' }}>
                <span style={{ fontSize: 20 }}>📸</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Subir fotos</span>
                <span style={{ fontSize: 12, color: '#888' }}>Progreso del cliente</span>
              </button>
            </div>

            {logs && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={s.card}>
                    <div style={s.label}>Entrenos/semana</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <span className="bebas" style={{ fontSize: 40, color: ACCENT }}>{sessionsThisWeek(logs)}</span>
                      <Flame size={20} color="#FF6B35" />
                    </div>
                  </div>
                  <div style={s.card}>
                    <div style={s.label}>Rutina asignada</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10 }}>{routine?.name || 'Sin asignar'}</div>
                  </div>
                </div>

                {photos && photos.length > 0 && (
                  <div style={s.card}>
                    <div style={{ ...s.label, marginBottom: 10 }}>Últimas fotos ({photos.length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {photos.slice(0, 6).map(p => (
                        <img key={p.id} src={p.photo_url} style={{ width: '100%', aspectRatio: '1', borderRadius: 8, objectFit: 'cover' }} />
                      ))}
                    </div>
                  </div>
                )}

                <div style={s.card}>
                  <div style={{ ...s.label, marginBottom: 12 }}>Historial de entrenamientos</div>
                  {logs.length === 0 ? (
                    <div style={{ fontSize: 14, color: '#666' }}>Todavía no entrenó.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {logs.map(log => {
                        const nameMap = exerciseNameMap(routine);
                        return (
                          <div key={log.id} style={s.card2}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{formatDate(log.date)}</span>
                              <Pill label={`${log.duration ?? '–'} min`} />
                            </div>
                            {log.exercises && Object.entries(log.exercises).map(([exId, weight]) => (
                              <div key={exId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#999' }}>
                                <span>{nameMap[exId] || exId}</span>
                                <span style={{ color: ACCENT, fontWeight: 600 }}>{weight} kg</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* VISTA: Quick Log */}
        {view === 'quick-log' && selectedClient && routine && (
          <QuickCoachLog client={selectedClient} routine={routine} onBack={() => { setView('client'); }} onSave={() => { openClient(selectedClient); }} />
        )}

        {/* VISTA: Upload Fotos */}
        {view === 'upload-photos' && selectedClient && (
          <UploadPhotosPanel client={selectedClient} onBack={() => { setView('client'); }} onSave={() => { openClient(selectedClient); }} />
        )}
      </div>
    </div>
  );
}

// ─── TAB BAR ───────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: `1px solid ${BORDER}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px 10px', color: active === t.id ? ACCENT : '#555', transition: 'color 0.2s' }}>
            {React.createElement(t.icon, { size: 22 })}
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>{t.label}</span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div style={{ width: 200, background: '#111', borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, flexShrink: 0 }}>
      <div className="bebas" style={{ fontSize: 22, color: ACCENT, padding: '0 12px', marginBottom: 24, letterSpacing: '0.1em' }}>FITTRACK</div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: active === t.id ? ACCENT + '15' : 'transparent', color: active === t.id ? ACCENT : '#666', fontWeight: 600, fontSize: 14, transition: 'all 0.2s', textAlign: 'left' }}>
          {React.createElement(t.icon, { size: 18 })}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── SIGNUP SCREEN ─────────────────────────────────────────────────────────
function SignupScreen({ onSignupComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('signup'); // 'signup' | 'login'

  const handleSignup = async () => {
    if (!email || !password || !nombre.trim()) {
      setError('Completá todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) {
      setError(signupError.message || 'Error al crear la cuenta');
      setLoading(false);
      return;
    }
    onSignupComplete({ email, nombre });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError('Email o contraseña incorrectos');
    }
    setLoading(false);
  };

  if (view === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="bebas" style={{ fontSize: 52, color: ACCENT, letterSpacing: '0.1em', lineHeight: 1 }}>FITTRACK</div>
            <div style={{ fontSize: 15, color: '#555', marginTop: 8 }}>Yvanoff Fitness — tu entrenamiento, digitalizado.</div>
          </div>
          <div style={{ ...s.card, boxShadow: `0 0 40px rgba(200,255,0,0.08)` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Email</label>
                <input style={s.input} type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoCapitalize="none" />
              </div>
              <div>
                <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Contraseña</label>
                <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              {error && <div style={{ background: '#FF444415', border: '1px solid #FF444430', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF6666' }}>{error}</div>}
              <button style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop: 4 }} onClick={handleLogin} disabled={loading}>
                {loading ? 'Iniciando sesión…' : 'Entrar'}
              </button>
              <button style={{ background: 'none', color: ACCENT, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => { setView('signup'); setError(''); setEmail(''); setPassword(''); setNombre(''); }}>
                ¿No tenés cuenta? Registrate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="bebas" style={{ fontSize: 52, color: ACCENT, letterSpacing: '0.1em', lineHeight: 1 }}>FITTRACK</div>
          <div style={{ fontSize: 15, color: '#555', marginTop: 8 }}>Entrená conmigo. Sin excusas.</div>
        </div>
        <div style={{ ...s.card, boxShadow: `0 0 40px rgba(200,255,0,0.08)` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Nombre</label>
              <input style={s.input} type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Email</label>
              <input style={s.input} type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
            </div>
            <div>
              <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>Contraseña</label>
              <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
            </div>
            {error && <div style={{ background: '#FF444415', border: '1px solid #FF444430', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF6666' }}>{error}</div>}
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop: 4 }} onClick={handleSignup} disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Registrarse'}
            </button>
            <button style={{ background: 'none', color: ACCENT, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => { setView('login'); setError(''); setEmail(''); setPassword(''); setNombre(''); }}>
              ¿Ya tenés cuenta? Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING SCREEN ────────────────────────────────────────────────────────
function OnboardingScreen({ email, nombre, onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    experiencia: '',
    lesiones: '',
    edad: '',
    peso_actual: '',
    dias_semana: '',
    objetivo: '',
  });
  const [saving, setSaving] = useState(false);

  const questions = [
    {
      title: '¿Entrenás actualmente?',
      key: 'experiencia',
      options: [
        { label: 'Nunca entrené', value: 'nunca' },
        { label: 'Hace años que no', value: 'hace_anos' },
        { label: 'Entreno actualmente', value: 'entrena_ahora' },
      ],
    },
    {
      title: '¿Tenés lesiones o limitaciones?',
      key: 'lesiones',
      type: 'text',
      placeholder: 'Ej: rodilla izquierda, o "ninguna"',
    },
    {
      title: '¿Cuántos años tenés?',
      key: 'edad',
      type: 'number',
      placeholder: '30',
    },
    {
      title: '¿Cuál es tu peso actual? (kg)',
      key: 'peso_actual',
      type: 'number',
      placeholder: '75',
    },
    {
      title: '¿Cuántos días por semana podés entrenar?',
      key: 'dias_semana',
      options: [
        { label: '3 días', value: '3' },
        { label: '4 días', value: '4' },
        { label: '5 días', value: '5' },
        { label: '6 días', value: '6' },
      ],
    },
    {
      title: '¿Cuál es tu objetivo?',
      key: 'objetivo',
      options: [
        { label: 'Fuerza pura', value: 'fuerza' },
        { label: 'Hipertrofia (músculo)', value: 'hipertrofia' },
        { label: 'Resistencia', value: 'resistencia' },
      ],
    },
  ];

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const handleNext = () => {
    if (!data[q.key]) {
      alert(`Por favor respondé la pregunta`);
      return;
    }
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No user');
      await supabase.from('fit_clients').insert({
        id: user.user.id,
        name: nombre,
        experiencia: data.experiencia,
        lesiones: data.lesiones || null,
        edad: parseInt(data.edad) || null,
        peso_actual: parseFloat(data.peso_actual) || null,
        dias_semana: parseInt(data.dias_semana) || null,
        objetivo: data.objetivo,
        onboarding_completado: true,
        video_bienvenida_visto: true,
      });
      // Auto-asignar rutina por defecto (primera disponible por ahora)
      const { data: routines } = await supabase.from('fit_routines').select('id').limit(1);
      if (routines?.length) {
        await supabase.from('fit_routine_assignments').insert({
          routine_id: routines[0].id,
          client_id: user.user.id,
        });
      }
      onComplete();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: '100%', height: 3, background: '#1A1A1A', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: ACCENT, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Pregunta {step + 1} de {questions.length}</div>
        </div>

        <div style={{ ...s.card, boxShadow: `0 0 40px rgba(200,255,0,0.08)` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="bebas" style={{ fontSize: 28, color: '#fff' }}>{q.title}</div>

            {q.options ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setData({ ...data, [q.key]: opt.value })}
                    style={{
                      background: data[q.key] === opt.value ? ACCENT : '#1A1A1A',
                      color: data[q.key] === opt.value ? BG : '#fff',
                      border: `1px solid ${data[q.key] === opt.value ? ACCENT : BORDER}`,
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={q.type || 'text'}
                placeholder={q.placeholder}
                value={data[q.key]}
                onChange={e => setData({ ...data, [q.key]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                style={{ ...s.input, fontSize: 16, padding: '14px 16px' }}
              />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                style={{ ...s.btnGhost, flex: 1, opacity: step === 0 ? 0.3 : 1 }}
              >
                ← Anterior
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                style={{ ...s.btn, flex: 1 }}
              >
                {saving ? 'Guardando…' : step === questions.length - 1 ? '✅ Listo' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WELCOME VIDEO SCREEN (Interactive Tour) ──────────────────────────────────
function WelcomeVideoScreen({ nombre, onComplete }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: `Hola ${nombre} 👋`,
      subtitle: 'Acá entrenaremos juntos.',
      text: 'Mira cómo funciona todo.',
      icon: '👋',
    },
    {
      title: 'Esto es tu RACHA 🔥',
      subtitle: 'Cada día que entrenes suma 1.',
      text: 'Tu meta: no romperla.',
      icon: '🔥',
    },
    {
      title: 'Estos son tus PUNTOS 💪',
      subtitle: '50 XP por cada entreno.',
      text: 'Desbloquea logros con ellos.',
      icon: '⭐',
    },
    {
      title: 'Tus LOGROS 🏆',
      subtitle: '7 días racha, 10 entrenamientos, etc.',
      text: 'Yo voy a estar mirando cada paso tuyo.',
      icon: '🏆',
    },
    {
      title: '¿Listo?',
      subtitle: 'Ahora vas a tu primer entreno.',
      text: 'Yo me encargo del resto.',
      icon: '💪',
    },
  ];

  const s_step = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 24, animation: 'pulse-glow 2s infinite' }}>{s_step.icon}</div>
        <div className="bebas" style={{ fontSize: 36, color: ACCENT, marginBottom: 8 }}>{s_step.title}</div>
        <div style={{ fontSize: 18, color: '#ccc', marginBottom: 16 }}>{s_step.subtitle}</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 40, lineHeight: 1.6 }}>{s_step.text}</div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                background: i <= step ? ACCENT : '#1A1A1A',
                borderRadius: 2,
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            style={{ ...s.btnGhost, flex: 1, opacity: step === 0 ? 0.3 : 1 }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            style={{ ...s.btn, flex: 1 }}
          >
            {isLast ? '✅ Entrar a entrenar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen() {
  return <SignupScreen onSignupComplete={() => {}} />;
}

// ─── STUDENT APP (post-login) ──────────────────────────────────────────────────
function StudentApp({ session, onLogout, headerExtra }) {
  const [client, setClient] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [inWorkout, setInWorkout] = useState(false);
  const [photoCapture, setPhotoCapture] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const reloadLogs = async (clientId) => {
    const [{ data: logRow }, { data: logRows }] = await Promise.all([
      supabase.from('fit_logs').select('*').eq('client_id', clientId).eq('date', getToday()).maybeSingle(),
      supabase.from('fit_logs').select('date,duration').eq('client_id', clientId).eq('completed', true).order('date', { ascending: false }).limit(365),
    ]);
    setTodayLog(logRow || null);
    setAllLogs(logRows || []);
    return logRows || [];
  };

  useEffect(() => {
    const load = async () => {
      const clientId = session.user.id;
      const [{ data: clientRow }, routineRow] = await Promise.all([
        supabase.from('fit_clients').select('*').eq('id', clientId).single(),
        getClientRoutine(clientId),
      ]);
      setClient(clientRow || { name: session.user.email.split('@')[0] });
      setRoutine(routineRow);
      await reloadLogs(clientId);
      setLoading(false);
    };
    load();
  }, [session]);

  const today = DAYS[new Date().getDay()];
  // Filter out exercises that are linked as superset (they should only appear as part of superset)
  const allTodayExercises = routine?.days?.[today] || [];
  const linkedExerciseIds = new Set(
    allTodayExercises
      .filter(ex => ex.type === 'superset' && ex.linkedExerciseId)
      .map(ex => ex.linkedExerciseId)
  );
  const todayExercises = allTodayExercises.filter(ex => !linkedExerciseIds.has(ex.id));

  const tabs = [
    { id: 'home', label: 'Hoy', icon: Dumbbell },
    { id: 'routine', label: 'Mi semana', icon: Dumbbell },
    { id: 'history', label: 'Historial', icon: History },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bebas" style={{ fontSize: 24, color: ACCENT }}>Cargando…</div>
      </div>
    );
  }

  if (photoCapture) {
    return (
      <PostWorkoutPhotos
        clientId={session.user.id}
        onClose={() => setPhotoCapture(false)}
        onSave={() => {
          setPhotoCapture(false);
          setInWorkout(false);
        }}
      />
    );
  }

  if (inWorkout) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 16px 40px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="bebas" style={{ fontSize: 28, marginBottom: 20, color: ACCENT }}>⚡ {today} — En curso</div>
          {todayExercises.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Día de descanso" message="No hay ejercicios asignados para hoy" />
          ) : (
            <WorkoutSession
              exercises={todayExercises}
              clientId={session.user.id}
              onCancel={() => setInWorkout(false)}
              onComplete={async () => {
                const before = unlockedAchievements(allLogs);
                const freshLogs = await reloadLogs(session.user.id);
                const after = unlockedAchievements(freshLogs);
                const newId = after.find(id => !before.includes(id));
                setCelebration({ achievement: ACHIEVEMENT_DEFS.find(a => a.id === newId) || null });
                setPhotoCapture(true);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, flexDirection: isMobile ? 'column' : 'row' }}>
      {celebration && <CelebrationModal achievement={celebration.achievement} onClose={() => { setCelebration(null); setTab('home'); }} />}
      {!isMobile && <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={false} />}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: isMobile ? 80 : 0 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '0 16px' : '32px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, paddingTop: isMobile ? 'max(16px, calc(env(safe-area-inset-top) + 8px))' : 0 }}>
            {headerExtra}
            <button onClick={onLogout} style={{ background: '#1A1A1A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13, marginLeft: 'auto' }}>
              <LogOut size={15} /> Salir
            </button>
          </div>
          {tab === 'home' && (
            <StudentHome client={client} routine={routine} todayLog={todayLog} allLogs={allLogs} onStartWorkout={() => setInWorkout(true)} />
          )}
          {tab === 'routine' && <StudentRoutine routine={routine} todayLog={todayLog} />}
          {tab === 'history' && <StudentHistory clientId={session.user.id} routine={routine} />}
        </div>
      </div>
      {isMobile && <TabBar tabs={tabs} active={tab} onChange={setTab} isMobile={true} />}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [booted, setBooted] = useState(false);
  const [adminView, setAdminView] = useState('panel');
  const [clientData, setClientData] = useState(null);
  const [signupData, setSignupData] = useState(null); // { email, nombre } after signup

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooted(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('fit_clients').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setClientData(data || null))
      .catch(() => setClientData(null));
  }, [session?.user?.id]);

  const handleLogout = () => supabase.auth.signOut();

  if (!booted) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bebas" style={{ fontSize: 24, color: ACCENT }}>Cargando…</div>
    </div>
  );

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  // Flow: SignupScreen → OnboardingScreen → WelcomeVideoScreen → App
  if (!session) {
    return (
      <>
        <FontStyle />
        <SignupScreen onSignupComplete={(data) => setSignupData(data)} />
      </>
    );
  }

  if (signupData && !clientData) {
    return (
      <>
        <FontStyle />
        <OnboardingScreen
          email={signupData.email}
          nombre={signupData.nombre}
          onComplete={() => {
            setSignupData(null);
            // Reload clientData
            supabase.from('fit_clients').select('*').eq('id', session.user.id).single()
              .then(({ data }) => setClientData(data || null));
          }}
        />
      </>
    );
  }

  // Welcome screen is now shown once during onboarding and marked as viewed
  // No need to show it again after signup

  return (
    <>
      <FontStyle />
      {isAdmin && adminView === 'panel' ? (
        <AdminPanel onLogout={handleLogout} onSwitchToTraining={() => setAdminView('training')} />
      ) : (
        <StudentApp
          session={session}
          onLogout={handleLogout}
          headerExtra={isAdmin && (
            <button onClick={() => setAdminView('panel')} style={{ ...s.btnGhost, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <ChevronLeft size={15} /> Panel coach
            </button>
          )}
        />
      )}
    </>
  );
}
