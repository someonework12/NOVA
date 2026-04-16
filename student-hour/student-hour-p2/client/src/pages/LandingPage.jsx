import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,4vw,48px)', height: 64,
        borderBottom: '1px solid var(--border-soft)',
        background: 'rgba(253,250,247,0.95)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brown-700), var(--brown-900))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ color: 'var(--yellow-500)', fontSize: 15, fontWeight: 800 }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: 'var(--brown-900)' }}>
            The Student Hour
          </span>
        </Link>

        {/* Desktop buttons */}
        <div className="nav-desktop" style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" style={{
            padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            border: '1.5px solid var(--border)', color: 'var(--brown-700)',
            background: 'transparent', textDecoration: 'none', transition: 'all 0.2s'
          }}>Log in</Link>
          <Link to="/signup" style={{
            padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, var(--brown-700), var(--brown-900))',
            color: '#fff', textDecoration: 'none'
          }}>Get started</Link>
        </div>

        {/* Hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none', flexDirection: 'column', gap: 5, background: 'none',
            border: 'none', cursor: 'pointer', padding: 6
          }}
          aria-label="Menu"
        >
          <span style={{ display: 'block', width: 24, height: 2, background: menuOpen ? 'transparent' : 'var(--brown-900)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
          <span style={{ display: 'block', width: 24, height: 2, background: 'var(--brown-900)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg)' : 'none', marginTop: menuOpen ? -7 : 0 }} />
          {!menuOpen && <span style={{ display: 'block', width: 24, height: 2, background: 'var(--brown-900)', borderRadius: 2 }} />}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
          background: 'rgba(253,250,247,0.98)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-soft)',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{
            padding: '14px 20px', borderRadius: 12, fontSize: 15, fontWeight: 500,
            border: '1.5px solid var(--border)', color: 'var(--brown-700)',
            textDecoration: 'none', textAlign: 'center'
          }}>Log in</Link>
          <Link to="/signup" onClick={() => setMenuOpen(false)} style={{
            padding: '14px 20px', borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: 'linear-gradient(135deg, var(--brown-700), var(--brown-900))',
            color: '#fff', textDecoration: 'none', textAlign: 'center'
          }}>Get started free</Link>
        </div>
      )}

      {/* HERO */}
      <section style={{ padding: 'clamp(48px,7vw,100px) clamp(20px,5vw,48px)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--yellow-100)', color: 'var(--brown-800)',
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--yellow-300)', marginBottom: 24
            }}>✦ AI-Powered Academic Recovery</span>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,5vw,58px)',
              fontWeight: 700, lineHeight: 1.12, color: 'var(--brown-900)', marginBottom: 20
            }}>
              Your personal path back to academic strength
            </h1>
            <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 36, maxWidth: 480 }}>
              The Student Hour identifies where you struggle, groups you with peers who share your challenges, assigns you a mentor, and gives you Professor Nova — an AI teacher who knows your name and your story.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/signup" style={{
                padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #F5C842, #e8b820)',
                color: 'var(--brown-900)', textDecoration: 'none', boxShadow: '0 4px 20px rgba(245,200,66,0.4)'
              }}>Start learning free →</Link>
              <Link to="#how-it-works" style={{
                padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 500,
                border: '1.5px solid var(--border)', color: 'var(--brown-700)',
                textDecoration: 'none'
              }}>See how it works</Link>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, var(--brown-100) 0%, var(--yellow-100) 100%)',
            borderRadius: 24, padding: 'clamp(20px,3vw,36px)',
            border: '1px solid var(--border-soft)', boxShadow: '0 8px 40px rgba(58,31,14,0.08)'
          }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 14, border: '1px solid var(--border-soft)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--brown-700),var(--brown-900))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 800 }}>N</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--brown-900)' }}>Professor Nova</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your AI tutor</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                "Good to see you again, Chidi! Last time we worked on integration by parts — you were so close. Let's crack it today."
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Study group', value: '4 students', color: 'var(--brown-200)' },
                { label: 'Mentor', value: 'Assigned ✓', color: 'var(--yellow-300)' },
                { label: 'Courses', value: '3 tracked', color: 'var(--brown-200)' },
                { label: 'Session streak', value: '7 days 🔥', color: 'var(--yellow-300)' }
              ].map(item => (
                <div key={item.label} style={{ background: item.color, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brown-900)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,48px)', background: 'var(--surface-2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'var(--brown-100)', color: 'var(--brown-800)', padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>How it works</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 700, color: 'var(--brown-900)' }}>From struggling to thriving in four steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { step: '01', title: 'Sign up & tell us your weak spots', desc: 'Enter your course codes and topics you find hardest. Takes 2 minutes.' },
              { step: '02', title: 'Get grouped by our AI', desc: 'Smart matching places you with students who share your exact struggles.' },
              { step: '03', title: 'Your mentor steps in', desc: 'A human academic mentor is assigned, shares resources and tracks your progress.' },
              { step: '04', title: 'Learn with Professor Nova', desc: 'Your AI tutor knows your name, history, and style. Every session builds on the last.' },
            ].map(item => (
              <div key={item.step} style={{
                background: '#fff', borderRadius: 20, padding: '24px 20px',
                border: '1px solid var(--border-soft)', boxShadow: '0 2px 12px rgba(58,31,14,0.06)'
              }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 800, color: 'var(--yellow-500)', marginBottom: 12, lineHeight: 1 }}>{item.step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown-900)', marginBottom: 8, lineHeight: 1.4 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,48px)', background: 'var(--brown-900)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px,4vw,46px)', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          Your breakthrough semester starts here
        </h2>
        <p style={{ fontSize: 15, color: 'var(--brown-400)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
          Join students who stopped falling behind — with AI, mentors, and a community built for recovery.
        </p>
        <Link to="/signup" style={{
          display: 'inline-block', padding: '15px 40px', borderRadius: 14, fontSize: 16, fontWeight: 700,
          background: 'linear-gradient(135deg, #F5C842, #e8b820)', color: 'var(--brown-900)',
          textDecoration: 'none', boxShadow: '0 4px 24px rgba(245,200,66,0.35)'
        }}>Create your free account →</Link>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '24px clamp(20px,4vw,48px)', borderTop: '1px solid var(--border-soft)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Link to="/" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--brown-700)', fontSize: 14, textDecoration: 'none' }}>The Student Hour</Link>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>© 2025 The Student Hour. All rights reserved.</span>
      </footer>

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
