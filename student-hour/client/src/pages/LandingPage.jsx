import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid var(--border-soft)', background: 'rgba(253,250,247,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--yellow-500)', fontSize: 15, fontWeight: 700 }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--brown-900)' }}>The Student Hour</span>
        </Link>
        <div className="nav-desktop" style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn-outline" style={{ padding: '9px 22px', fontSize: 14 }}>Log in</Link>
          <Link to="/signup" className="btn-primary" style={{ padding: '9px 22px', fontSize: 14 }}>Get started</Link>
        </div>
        <div className="nav-mobile-cta" style={{ display: 'none', gap: 10, alignItems: 'center' }}>
          <Link to="/signup" className="btn-accent" style={{ padding: '9px 18px', fontSize: 13 }}>Get started</Link>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span style={{ transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none', transition: 'all .2s' }} />
            <span style={{ opacity: menuOpen ? 0 : 1, transition: 'all .2s' }} />
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none', transition: 'all .2s' }} />
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border-soft)', padding: '12px 20px 16px' }}>
          <Link to="/login" className="btn-outline" style={{ width: '100%', justifyContent: 'center', display: 'flex' }} onClick={() => setMenuOpen(false)}>Log in</Link>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: '72px 40px 56px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <span className="badge badge-yellow" style={{ marginBottom: 20 }}>AI-Powered Academic Recovery</span>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px,5vw,54px)', fontWeight: 700, lineHeight: 1.15, color: 'var(--brown-900)', marginBottom: 20 }}>
              Your personal path back to academic strength
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 36 }}>
              The Student Hour groups you with peers who share your struggles, assigns a mentor, and gives you Professor Nova — an AI teacher who knows your name and your story.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/signup" className="btn-accent" style={{ fontSize: 16, padding: '14px 30px' }}>Start learning free</Link>
              <Link to="#how-it-works" className="btn-outline" style={{ fontSize: 16, padding: '14px 30px' }}>How it works</Link>
            </div>
          </div>
          <div className="hero-visual" style={{ background: 'linear-gradient(135deg,var(--brown-100) 0%,var(--yellow-100) 100%)', borderRadius: 'var(--radius-xl)', padding: 32, border: '1px solid var(--border-soft)' }}>
            <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '18px 20px', border: '1px solid var(--border-soft)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 700 }}>N</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brown-900)' }}>Professor Nova</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your AI tutor</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>"Good to see you again, Chidi! Last time we worked on integration by parts — you were so close. Let's crack it today."</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Study group','4 students','var(--brown-200)'],['Mentor','Assigned','var(--yellow-300)'],['Courses','3 tracked','var(--brown-200)'],['Streak','7 days','var(--yellow-300)']].map(([l,v,c])=>(
                <div key={l} style={{ background: c, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '60px 24px', background: 'var(--surface-2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span className="badge badge-brown" style={{ marginBottom: 14 }}>How it works</span>
            <h2 className="section-title">Four steps to academic recovery</h2>
          </div>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {[['01','Sign up & share your weak spots','Enter your course codes. Takes 2 minutes.'],['02','Get grouped by AI','Smart matching with students facing the same challenges.'],['03','Your mentor steps in','A human mentor guides your group and shares resources.'],['04','Learn with Professor Nova','Your AI tutor builds on every session.']].map(([s,t,d])=>(
              <div key={s} className="card" style={{ padding: '22px 18px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 700, color: 'var(--yellow-500)', marginBottom: 12, lineHeight: 1 }}>{s}</div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--brown-900)', marginBottom: 8, lineHeight: 1.4 }}>{t}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nova section */}
      <section style={{ padding: '60px 24px' }}>
        <div className="nova-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <span className="badge badge-yellow" style={{ marginBottom: 18 }}>Meet your teacher</span>
            <h2 className="section-title" style={{ marginBottom: 18 }}>Professor Nova — an AI that actually teaches</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>Not a chatbot. He knows your history, adapts to your pace, uses humor, and never makes you feel judged.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Remembers your name, courses, and past struggles','Teaches in classroom mode or one-on-one','Uses mentor-uploaded materials as his primary source','Builds a private learning profile just for you'].map(f=>(
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--brown-900)', fontWeight: 700 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--brown-900)', borderRadius: 'var(--radius-xl)', padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#fff', fontFamily: 'var(--font-serif)' }}>Professor Nova</div>
                <div style={{ fontSize: 12, color: 'var(--brown-400)' }}>AI Teaching Intelligence</div>
              </div>
            </div>
            <p style={{ color: 'var(--brown-200)', fontSize: 14, lineHeight: 1.8, fontStyle: 'italic', marginBottom: 18 }}>"I exist to make you understand — not just memorize. If one approach isn't landing, we try another. I don't give up on you."</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Socratic method','Spaced repetition','First principles','Feynman technique'].map(tag=>(
                <span key={tag} style={{ background: 'rgba(245,200,66,0.15)', color: 'var(--yellow-400)', border: '1px solid rgba(245,200,66,0.25)', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 24px', background: 'var(--brown-900)', textAlign: 'center' }}>
        <span className="badge" style={{ background: 'rgba(245,200,66,0.2)', color: 'var(--yellow-400)', marginBottom: 18 }}>Ready to turn it around?</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 700, color: '#fff', marginBottom: 14 }}>Your breakthrough semester starts here</h2>
        <p style={{ fontSize: 15, color: 'var(--brown-300)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px' }}>Join students who stopped falling behind and started catching up.</p>
        <Link to="/signup" className="btn-accent" style={{ fontSize: 16, padding: '14px 36px' }}>Create your free account</Link>
      </section>

      {/* Footer */}
      <footer className="footer-row" style={{ padding: '24px 40px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--brown-700)', fontSize: 14 }}>The Student Hour</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>© 2025 The Student Hour</span>
      </footer>
    </div>
  )
}
