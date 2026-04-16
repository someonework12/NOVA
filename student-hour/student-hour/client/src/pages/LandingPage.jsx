import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', borderBottom: '1px solid var(--border-soft)',
        background: 'rgba(253,250,247,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--brown-700)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: 'var(--yellow-500)', fontSize: 16, fontWeight: 700 }}>S</span>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--brown-900)' }}>
            The Student Hour
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn-outline" style={{ padding: '9px 22px', fontSize: 14 }}>Log in</Link>
          <Link to="/signup" className="btn-primary" style={{ padding: '9px 22px', fontSize: 14 }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '100px 48px 80px',
        maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64,
        alignItems: 'center'
      }}>
        <div>
          <span className="badge badge-yellow" style={{ marginBottom: 20 }}>
            AI-Powered Academic Recovery
          </span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,5vw,58px)',
            fontWeight: 700, lineHeight: 1.15, color: 'var(--brown-900)',
            marginBottom: 24
          }}>
            Your personal path back to academic strength
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 40, maxWidth: 480 }}>
            The Student Hour identifies where you struggle, groups you with peers who share your challenges, assigns you a mentor, and gives you Professor Nova — an AI teacher who knows your name and your story.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn-accent" style={{ fontSize: 16, padding: '14px 32px' }}>
              Start learning free
            </Link>
            <Link to="#how-it-works" className="btn-outline" style={{ fontSize: 16, padding: '14px 32px' }}>
              See how it works
            </Link>
          </div>
        </div>

        {/* Hero visual */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brown-100) 0%, var(--yellow-100) 100%)',
          borderRadius: 'var(--radius-xl)', padding: 40, minHeight: 380,
          display: 'flex', flexDirection: 'column', gap: 16,
          border: '1px solid var(--border-soft)'
        }}>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-lg)', padding: '20px 24px',
            border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brown-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--yellow-500)', fontSize: 18, fontWeight: 700 }}>N</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brown-900)' }}>Professor Nova</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your AI tutor</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "Good to see you again, Chidi! Last time we worked on integration by parts — you were so close. Let's crack it today. And yes, I remember you hate when I use the word 'trivial.' I'll behave."
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Study group', value: '4 students', color: 'var(--brown-200)' },
              { label: 'Mentor', value: 'Assigned', color: 'var(--yellow-300)' },
              { label: 'Courses', value: '3 tracked', color: 'var(--brown-200)' },
              { label: 'Session streak', value: '7 days', color: 'var(--yellow-300)' }
            ].map(item => (
              <div key={item.label} style={{
                background: item.color, borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--brown-900)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '80px 48px', background: 'var(--surface-2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="badge badge-brown" style={{ marginBottom: 16 }}>How it works</span>
            <h2 className="section-title">From struggling to thriving in four steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              { step: '01', title: 'Sign up & tell us your weak spots', desc: 'Enter your course codes and the topics you find hardest. Takes 2 minutes.' },
              { step: '02', title: 'Get grouped by our AI', desc: 'Our grouping engine places you with students who share your struggles — smart matches, not random.' },
              { step: '03', title: 'Your mentor steps in', desc: 'A human academic mentor is assigned to your group. They share resources, track progress and guide the journey.' },
              { step: '04', title: 'Learn with Professor Nova', desc: 'Your personal AI tutor knows your name, your history, and your style. Every session builds on the last.' },
            ].map(item => (
              <div key={item.step} className="card" style={{ padding: '28px 24px' }}>
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 700,
                  color: 'var(--yellow-500)', marginBottom: 16, lineHeight: 1
                }}>{item.step}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--brown-900)', marginBottom: 10, lineHeight: 1.4 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professor Nova section */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <span className="badge badge-yellow" style={{ marginBottom: 20 }}>Meet your teacher</span>
            <h2 className="section-title" style={{ marginBottom: 24 }}>Professor Nova — an AI that actually teaches</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 24 }}>
              Professor Nova is not a chatbot. He is a fully animated teaching presence who knows your academic history, adapts to your pace, uses humor to keep you engaged, and never makes you feel judged.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Remembers your name, courses, and past struggles',
                'Teaches in classroom mode or one-on-one',
                'Uses mentor-uploaded materials as his primary source',
                'Builds a private learning profile just for you'
              ].map(feat => (
                <div key={feat} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 12, color: 'var(--brown-900)', fontWeight: 700 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            background: 'var(--brown-900)', borderRadius: 'var(--radius-xl)',
            padding: 40, minHeight: 360, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--yellow-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown-900)', fontFamily: 'var(--font-serif)' }}>N</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18, color: '#fff', fontFamily: 'var(--font-serif)' }}>Professor Nova</div>
                <div style={{ fontSize: 13, color: 'var(--brown-400)' }}>AI Teaching Intelligence · The Student Hour</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
              <p style={{ color: 'var(--brown-200)', fontSize: 15, lineHeight: 1.8, fontStyle: 'italic' }}>
                "I exist to make you understand — not just memorize. I'll use every trick in the book: analogies, humor, repetition, the Socratic method, visual thinking. If one approach isn't landing, we try another. I don't give up on you."
              </p>
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Socratic method', 'Spaced repetition', 'First principles', 'Feynman technique'].map(tag => (
                  <span key={tag} style={{
                    background: 'rgba(245,200,66,0.15)', color: 'var(--yellow-400)',
                    border: '1px solid rgba(245,200,66,0.25)',
                    padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px', background: 'var(--brown-900)', textAlign: 'center' }}>
        <span className="badge" style={{ background: 'rgba(245,200,66,0.2)', color: 'var(--yellow-400)', marginBottom: 24 }}>
          Ready to turn it around?
        </span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,4vw,46px)', fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          Your breakthrough semester starts here
        </h2>
        <p style={{ fontSize: 16, color: 'var(--brown-300)', marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
          Join students who stopped falling behind and started catching up — with AI, mentors, and a community that moves with them.
        </p>
        <Link to="/signup" className="btn-accent" style={{ fontSize: 17, padding: '16px 40px' }}>
          Create your free account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--brown-700)', fontSize: 15 }}>The Student Hour</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>© 2025 The Student Hour. All rights reserved.</span>
      </footer>
    </div>
  )
}
