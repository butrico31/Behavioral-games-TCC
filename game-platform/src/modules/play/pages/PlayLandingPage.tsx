import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePlayTheme } from '../hooks/usePlayTheme'
import { PlayGameModal } from '../components/PlayGameModal'
import { useGsapReveal } from '../../../shared/hooks/useGsapReveal'

const PLAY_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800;900&family=Manrope:wght@400;500;600&display=swap');

  [data-dctheme="warm"] {
    --bg:#FFFDF9; --text:#231F1A; --headline:#1F1A15; --p:#4A4139; --small:#6B6157;
    --blob1:linear-gradient(150deg,oklch(0.78 0.14 230) 0%,oklch(0.68 0.19 230) 45%,oklch(0.5 0.2 245) 100%);
    --blob2:linear-gradient(140deg,oklch(0.65 0.2 225) 0%,oklch(0.5 0.2 245) 70%,oklch(0.4 0.18 250) 100%);
    --ring-border:oklch(0.68 0.19 230);
    --logo-bg:linear-gradient(135deg,oklch(0.65 0.2 225),oklch(0.5 0.2 245)); --logo-shadow:oklch(0.5 0.2 245 / .32); --logo-text-shadow:oklch(0.3 0.15 250 / .5);
    --prof-border:oklch(0.5 0.2 245 / .35); --prof-color:oklch(0.68 0.19 230);
    --pulse-bg:oklch(0.5 0.2 245);
    --btn-bg:oklch(0.68 0.19 230); --btn-text:oklch(0.15 0.02 240); --btn-shadow:oklch(0.5 0.2 245 / .38);
    --modal-overlay:oklch(0.1 0.05 250 / .6); --modal-bg:#fff; --modal-title:#1F1A15; --modal-text:#5C5349; --modal-btn:linear-gradient(135deg,oklch(0.65 0.2 225),oklch(0.5 0.2 245));
  }
  [data-dctheme="lab"] {
    --bg:oklch(0.20 0.035 250); --text:oklch(0.9 0.01 240); --headline:oklch(0.96 0.01 240); --p:oklch(0.82 0.01 242); --small:oklch(0.74 0.01 242);
    --blob1:linear-gradient(150deg,oklch(0.78 0.14 230) 0%,oklch(0.68 0.19 230) 45%,oklch(0.5 0.2 245) 100%);
    --blob2:linear-gradient(140deg,oklch(0.65 0.2 225) 0%,oklch(0.5 0.2 245) 70%,oklch(0.4 0.18 250) 100%);
    --ring-border:oklch(0.68 0.19 230);
    --logo-bg:linear-gradient(135deg,oklch(0.65 0.2 225),oklch(0.5 0.2 245)); --logo-shadow:oklch(0.5 0.2 245 / .32); --logo-text-shadow:oklch(0.3 0.15 250 / .5);
    --prof-border:oklch(0.5 0.2 245 / .35); --prof-color:oklch(0.68 0.19 230);
    --pulse-bg:oklch(0.5 0.2 245);
    --btn-bg:oklch(0.68 0.19 230); --btn-text:oklch(0.15 0.02 240); --btn-shadow:oklch(0.5 0.2 245 / .38);
    --modal-overlay:oklch(0.1 0.05 250 / .6); --modal-bg:oklch(0.22 0.03 246); --modal-title:oklch(0.96 0.01 240); --modal-text:oklch(0.82 0.01 242); --modal-btn:linear-gradient(135deg,oklch(0.65 0.2 225),oklch(0.5 0.2 245));
  }

  @keyframes om-pulse { 0% { transform: scale(1); opacity: .55 } 70% { transform: scale(1.45); opacity: 0 } 100% { transform: scale(1.45); opacity: 0 } }
  @keyframes om-float-slow { 0% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(14px,12px,0) scale(1.04) } 100% { transform: translate3d(0,0,0) scale(1) } }
  @keyframes om-enter-left { from { transform: translateX(-160px) } to { transform: translateX(0) } }
  @keyframes om-enter-right { from { transform: translateX(160px) } to { transform: translateX(0) } }

  .theme-btn { width:38px; height:38px; border-radius:999px; border:2px solid var(--prof-border); background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--prof-color); font-size:15px; }
  .prof-btn { border:2px solid var(--prof-border); color:var(--prof-color); background:none; transition:background .2s ease, color .2s ease, border-color .2s ease; }
  .prof-btn:hover { background:var(--prof-color); border-color:var(--prof-color); color:#000; }
`

export function PlayLandingPage() {
  const navigate = useNavigate()
  const { is_authenticated } = useAuth()
  const { theme, toggleTheme } = usePlayTheme()
  const [is_modal_open, setIsModalOpen] = useState(false)
  const root_ref = useRef<HTMLDivElement | null>(null)

  useGsapReveal('[data-intro="title"], [data-intro="text"], [data-intro="cta"]', {
    root: root_ref,
    y: 22,
    duration: 0.7,
    stagger: 0.1
  })

  return (
    <>
      <style>{PLAY_STYLES}</style>
      <div
        ref={root_ref}
        data-dctheme={theme}
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          background: 'var(--bg)',
          fontFamily: 'Manrope, Helvetica, Arial, sans-serif',
          color: 'var(--text)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background .25s ease, color .25s ease'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', left: '-20%', top: '-26%', width: '56%', minWidth: 380, aspectRatio: '1/1.15', animation: 'om-enter-left 0.9s ease-out both' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '58% 42% 47% 53% / 52% 44% 56% 48%', background: 'var(--blob1)', animation: 'om-float-slow 16s ease-in-out infinite' }} />
          </div>
          <div style={{ position: 'absolute', left: '-28%', top: '6%', width: '50%', minWidth: 340, aspectRatio: '1/1.2', animation: 'om-enter-left 0.9s ease-out both' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '46% 54% 62% 38% / 44% 58% 42% 56%', background: 'var(--blob2)', opacity: 0.9, animation: 'om-float-slow 20s ease-in-out infinite reverse' }} />
          </div>
          <div style={{ position: 'absolute', right: -70, bottom: -70, width: 280, height: 280, borderRadius: '50%', border: '26px solid var(--ring-border)', opacity: 0.22, animation: 'om-enter-right 0.9s ease-out both' }} />
        </div>

        <header style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '26px clamp(20px,5vw,72px)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--logo-bg)', boxShadow: '0 8px 20px var(--logo-shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Brain width={22} height={22} />
            </div>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 19, letterSpacing: '-.01em', color: '#fff', textShadow: '0 1px 10px var(--logo-text-shadow)' }}>BehaviorLab</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="theme-btn"
              onClick={toggleTheme}
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {theme === 'warm' ? '☀' : '☾'}
            </button>
            <button
              type="button"
              onClick={() => navigate(is_authenticated ? '/sessions' : '/login')}
              className="prof-btn"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 15.5 }}
            >
              Sou professor
            </button>
          </div>
        </header>

        <main style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 26, padding: 'clamp(40px,8vw,90px) clamp(20px,5vw,72px)' }}>
          <h1 data-intro="title" style={{ margin: 0, maxWidth: '18ch', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(42px,7vw,82px)', lineHeight: 0.98, letterSpacing: '-.03em', color: 'var(--headline)' }}>
            Bora jogar e aprender?
          </h1>
          <p data-intro="text" style={{ margin: 0, maxWidth: '34ch', fontSize: 'clamp(16px,1.7vw,20px)', lineHeight: 1.55, color: 'var(--p)' }}>
            Escolha um dos jogos da aula de hoje e jogue com a turma.
          </p>

          <div data-intro="cta" style={{ position: 'relative', display: 'flex', marginTop: 8 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--pulse-bg)', animation: 'om-pulse 2.4s ease-out infinite' }} />
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 14, padding: '24px 52px', border: 'none', borderRadius: 999, cursor: 'pointer', background: 'var(--btn-bg)', color: 'var(--btn-text)', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(22px,2.4vw,30px)', letterSpacing: '.02em', boxShadow: '0 16px 34px var(--btn-shadow)' }}
            >
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 0, height: 0, borderLeft: '14px solid var(--btn-text)', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 4 }} />
              </span>
              JOGAR
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--small)' }}>Travou? Chame o professor.</p>
        </main>

        <footer style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', padding: '0 clamp(20px,5vw,72px) 34px', fontSize: 14, color: 'var(--small)' }}>
          <span>© 2026 BehaviorLab - Todos os direitos reservados.</span>
        </footer>

        {is_modal_open && <PlayGameModal theme={theme} onClose={() => setIsModalOpen(false)} />}
      </div>
    </>
  )
}
