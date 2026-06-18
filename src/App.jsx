import { useState, useEffect, useCallback } from 'react';
import Globe from './components/Globe.jsx';
import providers from './providers.json';
import {
  getTodayKey,
  getDailyProviders,
  distanceKm,
  scoreForDistance,
  emojiForDistance,
  formatDistance,
  formatMiles,
  loadSavedGame,
  saveGame,
  buildShareText,
} from './gameLogic.js';

const TOTAL_ROUNDS = 5;

function ScoreDots({ current, rounds }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0' }}>
      {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
        const done = rounds[i];
        const active = i === current && !done;
        return (
          <div
            key={i}
            style={{
              width: 12, height: 12, borderRadius: '50%',
              background: done
                ? (done.emoji === '🟩' ? 'var(--green)' : done.emoji === '🟨' ? 'var(--yellow)' : 'var(--red)')
                : active ? 'var(--teal)' : 'var(--surface2)',
              border: active ? '2px solid var(--teal-light)' : '2px solid transparent',
              transition: 'background 0.3s',
            }}
          />
        );
      })}
    </div>
  );
}


function ResultsScreen({ rounds, dailyProviders, dateStr, onReset }) {
  const [copied, setCopied] = useState(false);
  const total = rounds.reduce((s, r) => s + r.score, 0);
  const shareText = buildShareText(dateStr, rounds);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ ...styles.overlay, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase' }}>
          Beaming Geo
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{dateStr}</div>

        <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--teal-light)', marginBottom: 4 }}>
          {total}
          <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 400 }}>/500</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Total Score</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {rounds.map((r, i) => (
            <div key={i} style={styles.resultRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{r.emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{dailyProviders[i].name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dailyProviders[i].city} · {formatMiles(r.distance)}</div>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal-light)' }}>+{r.score}</div>
            </div>
          ))}
        </div>

        <div style={styles.shareBox}>
          <pre style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {shareText}
          </pre>
        </div>

        <button style={styles.btn} onClick={handleCopy}>
          {copied ? '✓ Copied!' : 'Copy Result'}
        </button>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Come back tomorrow for new providers!
        </div>
        {/* DEV ONLY — remove before launch */}
        <button
          style={{ ...styles.btnGhost, marginTop: 12, fontSize: 12 }}
          onClick={() => {
            const next = (parseInt(localStorage.getItem('beaming-geo-offset') || '0', 10) + 1) * 99991;
            localStorage.setItem('beaming-geo-offset', String(next));
            localStorage.removeItem('beaming-geo-' + dateStr);
            window.location.reload();
          }}
        >
          ↺ Play again (testing)
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const dateStr = getTodayKey();
  const [dailyProviders] = useState(() => {
    const offset = parseInt(localStorage.getItem('beaming-geo-offset') || '0', 10);
    return getDailyProviders(providers, dateStr, TOTAL_ROUNDS, offset);
  });
  const [currentRound, setCurrentRound] = useState(0);
  const [guessLatLng, setGuessLatLng] = useState(null);
  const [pendingGuess, setPendingGuess] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [phase, setPhase] = useState('guessing'); // 'guessing' | 'result' | 'done'
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Load saved game
  useEffect(() => {
    const saved = loadSavedGame(dateStr);
    if (saved && saved.rounds && saved.rounds.length === TOTAL_ROUNDS) {
      setRounds(saved.rounds);
      setPhase('done');
      setAlreadyDone(true);
    }
  }, [dateStr]);

  const handleGuess = useCallback((latlng) => {
    if (phase !== 'guessing' || pendingGuess) return;
    setGuessLatLng(latlng);
    setPendingGuess(latlng);
  }, [phase, pendingGuess]);

  const handleConfirmGuess = () => {
    if (!pendingGuess) return;
    const provider = dailyProviders[currentRound];
    const km = distanceKm(pendingGuess.lat, pendingGuess.lng, provider.lat, provider.lng);
    const score = scoreForDistance(km);
    const emoji = emojiForDistance(km);
    const roundResult = { score, distance: km, emoji, guess: pendingGuess };
    const newRounds = [...rounds, roundResult];
    setRounds(newRounds);
    setPhase('result');

    if (newRounds.length === TOTAL_ROUNDS) {
      saveGame(dateStr, { rounds: newRounds });
    }
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setCurrentRound(r => r + 1);
      setGuessLatLng(null);
      setPendingGuess(null);
      setPhase('guessing');
    }
  };

  const provider = dailyProviders[currentRound];
  const currentRoundResult = rounds[currentRound];

  const guessMarkerColor = currentRoundResult
    ? (currentRoundResult.emoji === '🟩' ? '#4ade80' : currentRoundResult.emoji === '🟨' ? '#facc15' : '#f87171')
    : '#ffffff';

  if (phase === 'done') {
    return <ResultsScreen rounds={rounds} dailyProviders={dailyProviders} dateStr={dateStr} />;
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>Beaming Geo</div>
        <ScoreDots current={currentRound} rounds={rounds} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Round {currentRound + 1} of {TOTAL_ROUNDS}
        </div>
      </div>

      {/* Provider card */}
      <div style={styles.providerCard}>
        <div style={styles.providerName}>{provider.name}</div>
        <div style={styles.providerSpecialty}>{provider.specialty}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {phase === 'result'
            ? `${provider.city}, CA`
            : pendingGuess
              ? 'Tap "Confirm Guess" or pick a different spot'
              : 'Tap the globe to place your guess'}
        </div>
      </div>

      {/* Globe */}
      <div style={styles.globeWrap}>
        <Globe
          onGuess={handleGuess}
          guessLatLng={guessLatLng}
          correctLatLng={phase === 'result' ? { lat: provider.lat, lng: provider.lng } : null}
          disabled={phase !== 'guessing'}
          guessColor={guessMarkerColor}
        />
      </div>

      {/* Confirm / result strip */}
      {phase === 'guessing' && pendingGuess && (
        <div style={styles.confirmWrap}>
          <button style={styles.btn} onClick={handleConfirmGuess}>
            Confirm Guess
          </button>
          <button style={{ ...styles.btnGhost, marginLeft: 10 }} onClick={() => { setGuessLatLng(null); setPendingGuess(null); }}>
            Clear
          </button>
        </div>
      )}

      {phase === 'result' && currentRoundResult && (
        <div style={styles.resultStrip}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{currentRoundResult.emoji}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal-light)' }}>
                +{currentRoundResult.score} pts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatMiles(currentRoundResult.distance)} away
              </div>
            </div>
          </div>
          <button style={{ ...styles.btn, marginTop: 0 }} onClick={handleNextRound}>
            {currentRound + 1 >= TOTAL_ROUNDS ? 'See Results' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
    padding: '12px 16px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
    flexShrink: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: 'var(--teal-light)',
    marginBottom: 4,
  },
  providerCard: {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 10,
    border: '1px solid var(--surface2)',
    flexShrink: 0,
    textAlign: 'center',
  },
  providerName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 2,
  },
  providerSpecialty: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  globeWrap: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    overflow: 'hidden',
    background: 'var(--navy)',
  },
  confirmWrap: {
    marginTop: 10,
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultStrip: {
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--surface)',
    border: '1px solid var(--surface2)',
    borderRadius: 12,
    padding: '10px 16px',
    flexShrink: 0,
  },
  btn: {
    background: 'var(--teal)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    padding: '11px 28px',
    borderRadius: 10,
    marginTop: 12,
    transition: 'background 0.15s',
  },
  btnGhost: {
    background: 'var(--surface2)',
    color: 'var(--text-muted)',
    fontSize: 14,
    fontWeight: 500,
    padding: '11px 20px',
    borderRadius: 10,
    marginTop: 12,
    transition: 'background 0.15s',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(13, 26, 58, 0.92)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    padding: 20,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 16,
    padding: '28px 24px',
    textAlign: 'center',
    border: '1px solid var(--surface2)',
    width: '100%',
    maxWidth: 360,
  },
  resultRow: {
    background: 'var(--surface)',
    border: '1px solid var(--surface2)',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareBox: {
    background: 'var(--surface)',
    border: '1px solid var(--surface2)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 4,
    textAlign: 'left',
  },
};
