import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaAvatar from '../components/NovaAvatar.jsx'

const OWNER_ID = '41ebd717-ab98-4461-9642-8e9d07c50cac'
const ON_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const PERSONAS = [
  { id:'professor', label:'🎓 Professor',  desc:'Formal, precise, calm' },
  { id:'coach',     label:'⚡ Coach',       desc:'Energetic, motivating, direct' },
  { id:'friendly',  label:'😊 Friendly',    desc:'Warm, patient, conversational' },
  { id:'examprep',  label:'📝 Exam Prep',   desc:'Fast, rigorous, exam-focused' },
]

class NovaEar {
  constructor(onSpeech) {
    this.onSpeech = onSpeech
    this.rec = null; this.running = false
    this.restartT = null; this.settleT = null; this.settling = false
  }
  open() { this.running = true; this.settling = false; this._start() }
  settle(ms=200) { this.settling=true; clearTimeout(this.settleT); this.settleT=setTimeout(()=>{this.settling=false},ms) }
  close() { this.running=false; this.settling=false; clearTimeout(this.restartT); clearTimeout(this.settleT); this._kill() }
  _kill() { try{this.rec?.abort()}catch(_){} this.rec=null }
  _start() {
    if(!this.running) return
    clearTimeout(this.restartT); this._kill()
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SR) return
    const rec=new SR()
    rec.lang='en-US'; rec.maxAlternatives=1; rec.interimResults=false; rec.continuous=!ON_MOBILE
    rec.onresult=(e)=>{
      if(this.settling) return
      let best='',bestConf=-1
      for(let i=e.resultIndex??0;i<e.results.length;i++){
        if(!e.results[i].isFinal&&!ON_MOBILE) continue
        const a=e.results[i][0],c=a.confidence||0.5
        if(c>bestConf){bestConf=c;best=a.transcript}
      }
      const t=best.trim()
      if(!t||t.length<2) return
      this.onSpeech(t)
    }
    rec.onerror=(e)=>{
      if(e.error==='aborted') return
      if(e.error==='not-allowed'){this.running=false;return}
      if(this.running) this.restartT=setTimeout(()=>this._start(),e.error==='no-speech'?100:600)
    }
    rec.onend=()=>{ if(this.running) this.restartT=setTimeout(()=>this._start(),ON_MOBILE?150:400) }
    this.rec=rec
    try{rec.start()}catch(_){ if(this.running) this.restartT=setTimeout(()=>this._start(),500) }
  }
}

class VAD {
  constructor(onVoice) {
    this.onVoice=onVoice; this.ctx=null; this.analyser=null; this.stream=null
    this.rafId=null; this.armed=false; this.fired=false; this.holdStart=null; this.ready=false
    this.THRESHOLD=14; this.HOLD_MS=80
  }
  async init() {
    if(this.ctx) return
    try {
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      this.ctx=new(window.AudioContext||window.webkitAudioContext)()
      const src=this.ctx.createMediaStreamSource(this.stream)
      this.analyser=this.ctx.createAnalyser(); this.analyser.fftSize=256
      src.connect(this.analyser); this.ready=true; this._loop()
    }catch(_){}
  }
  arm(){ this.armed=true; this.fired=false; this.holdStart=null }
  disarm(){ this.armed=false; this.fired=false; this.holdStart=null }
  destroy(){ this.armed=false; cancelAnimationFrame(this.rafId); try{this.stream?.getTracks().forEach(t=>t.stop())}catch(_){} try{this.ctx?.close()}catch(_){} this.ctx=null }
  _loop(){
    if(!this.analyser) return
    const buf=new Uint8Array(this.analyser.fftSize)
    const tick=()=>{
      this.rafId=requestAnimationFrame(tick)
      if(!this.armed||this.fired) return
      this.analyser.getByteTimeDomainData(buf)
      let sum=0; for(let i=0;i<buf.length;i++){const v=buf[i]-128;sum+=v*v}
      const rms=Math.sqrt(sum/buf.length)
      if(rms>this.THRESHOLD){ if(!this.holdStart) this.holdStart=Date.now(); else if(Date.now()-this.holdStart>=this.HOLD_MS){this.fired=true;this.armed=false;this.onVoice()} }
      else this.holdStart=null
    }
    tick()
  }
}

function getVoice(){
  const voices=window.speechSynthesis?.getVoices()||[]
  const want=['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred']
  for(const n of want){const v=voices.find(v=>v.name.includes(n));if(v) return v}
  return voices.find(v=>v.lang?.startsWith('en')&&!/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name))||voices.find(v=>v.lang?.startsWith('en'))||null
}
function waitForVoices(){
  return new Promise(resolve=>{
    const v=window.speechSynthesis?.getVoices()||[]
    if(v.length>0){resolve();return}
    let done=false
    window.speechSynthesis.onvoiceschanged=()=>{if(!done){done=true;resolve()}}
    setTimeout(()=>{if(!done){done=true;resolve()}},3000)
  })
}
function speak(text,{onStart,onDone,cancelRef}={}){
  if(!window.speechSynthesis){onDone?.();return}
  window.speechSynthesis.cancel()
  waitForVoices().then(()=>{
    if(cancelRef&&!cancelRef.current){onDone?.();return}
    const voice=getVoice()
    const sentences=text.match(/[^.!?]+[.!?]*/g)||[text]
    let i=0,started=false
    function next(){
      if(cancelRef&&!cancelRef.current){onDone?.();return}
      if(i>=sentences.length){onDone?.();return}
      const s=sentences[i++].trim(); if(!s){next();return}
      const u=new SpeechSynthesisUtterance(s)
      u.rate=0.86;u.pitch=0.72;u.volume=1;if(voice)u.voice=voice
      u.onstart=()=>{if(!started){started=true;onStart?.()}}
      u.onend=next; u.onerror=()=>next()
      window.speechSynthesis.speak(u)
    }
    next()
  })
}

export default function ProfessorNovaPage() {
  const {profile}=useAuth()
  const {group}=useGroup()
  const [mode,setMode]=useState('personal')
  const [messages,setMessages]=useState([])
  const [novaState,setNovaState]=useState('idle')
  const [boardText,setBoardText]=useState('')
  const [boardVisible,setBoardVisible]=useState(false)
  const [chatOpen,setChatOpen]=useState(false)
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [voiceOn,setVoiceOn]=useState(true)
  const [micOn,setMicOn]=useState(false)
  const [error,setError]=useState('')
  const [persona,setPersona]=useState('professor')
  const [personaSaving,setPersonaSaving]=useState(false)
  const [voiceUploading,setVoiceUploading]=useState(false)
  const [voiceUploadMsg,setVoiceUploadMsg]=useState('')

  const earRef=useRef(null); const vadRef=useRef(null); const vadInitedRef=useRef(false)
  const loadingRef=useRef(false); const messagesRef=useRef([]); const voiceOnRef=useRef(true)
  const speakingRef=useRef(false); const bottomRef=useRef(null)
  const greetedRef=useRef(false); const sendRef=useRef(null); const voiceFileRef=useRef(null)

  const isOwner=profile?.id===OWNER_ID

  useEffect(()=>{messagesRef.current=messages},[messages])
  useEffect(()=>{loadingRef.current=loading},[loading])
  useEffect(()=>{voiceOnRef.current=voiceOn},[voiceOn])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{if(profile?.nova_persona) setPersona(profile.nova_persona)},[profile])

  const interrupt=useCallback(()=>{
    if(!speakingRef.current) return
    window.speechSynthesis.cancel()
    speakingRef.current=false; vadRef.current?.disarm()
    setNovaState('idle'); setBoardVisible(false)
    earRef.current?.settle(200)
  },[])

  const sendMessage=useCallback(async(text)=>{
    const clean=text?.trim(); if(!clean) return
    if(speakingRef.current) interrupt()
    if(loadingRef.current) return
    const userMsg={role:'user',content:clean}
    const history=[...messagesRef.current,userMsg]
    setMessages(history); setInput('')
    setLoading(true);loadingRef.current=true; setNovaState('thinking'); setError('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const endpoint=mode==='classroom'?'/api/nova/classroom':'/api/nova/chat'
      const body=mode==='classroom'?{messages:history,groupId:group?.id}:{messages:history}
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)})
      if(!res.ok){
        let msg=`Server error ${res.status}`
        if(res.status===504) msg='Professor Nova is waking up — please try again.'
        else{try{const e=await res.json();msg=e.error||msg}catch(_){}}
        throw new Error(msg)
      }
      let data; try{data=await res.json()}catch(_){throw new Error('Bad response — try again.')}
      const reply=data.reply
      setMessages(prev=>[...prev,{role:'assistant',content:reply}])
      setBoardText(reply); setBoardVisible(true)
      if(voiceOnRef.current){
        speakingRef.current=true; vadRef.current?.arm()
        speak(reply,{
          onStart:()=>{if(speakingRef.current) setNovaState('speaking')},
          onDone:()=>{speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle');setBoardVisible(false)},
          cancelRef:speakingRef
        })
      }else setNovaState('idle')
    }catch(err){
      setError(err.message); setNovaState('idle')
      speakingRef.current=false; vadRef.current?.disarm()
    }finally{setLoading(false);loadingRef.current=false}
  },[mode,group,interrupt])

  sendRef.current=sendMessage

  useEffect(()=>{
    if(window.speechSynthesis){window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=()=>window.speechSynthesis.getVoices()}
    const ear=new NovaEar(t=>{if(sendRef.current) sendRef.current(t)})
    earRef.current=ear
    const vad=new VAD(()=>{
      if(speakingRef.current){
        window.speechSynthesis.cancel(); speakingRef.current=false; vad.disarm()
        setNovaState('idle'); setBoardVisible(false); ear.settle(200)
      }
    })
    vadRef.current=vad
    fetch('/api/health').catch(()=>{})
    const keepAlive=setInterval(()=>fetch('/api/health').catch(()=>{}),13*60*1000)
    // Desktop only: auto-start. Mobile: wait for mic tap (iOS gesture requirement)
    if(!ON_MOBILE){
      const t=setTimeout(()=>{
        setMicOn(true)
        vad.init() // safe on desktop, no system chime
        vadInitedRef.current=true
        const name=profile?.full_name?.split(' ')[0]||'there'
        if(voiceOnRef.current&&!greetedRef.current){
          greetedRef.current=true; speakingRef.current=true
          speak('Hello '+name+'. I am Professor Nova. You can interrupt me any time — just speak.',{
            onStart:()=>{if(speakingRef.current) setNovaState('speaking')},
            onDone:()=>{speakingRef.current=false;setNovaState('idle');ear.open()},
            cancelRef:speakingRef
          })
        }else ear.open()
      },800)
      return()=>{clearTimeout(t);clearInterval(keepAlive);ear.close();vad.destroy();window.speechSynthesis?.cancel()}
    }
    return()=>{clearInterval(keepAlive);ear.close();vad.destroy();window.speechSynthesis?.cancel()}
  },[])

  function toggleMic(){
    if(micOn){earRef.current?.close();setMicOn(false);setNovaState('idle')}
    else{
      // Direct user gesture — safe for iOS SpeechRecognition + AudioContext
      earRef.current?.open(); setMicOn(true)
      if(!vadInitedRef.current){vadInitedRef.current=true;vadRef.current?.init()}
      if(ON_MOBILE&&!greetedRef.current&&voiceOnRef.current){
        greetedRef.current=true; speakingRef.current=true
        const name=profile?.full_name?.split(' ')[0]||'there'
        speak('Hello '+name+'. I am Professor Nova. Speak to me, and tap Stop to interrupt.',{
          onStart:()=>{if(speakingRef.current) setNovaState('speaking')},
          onDone:()=>{speakingRef.current=false;setNovaState('idle')},
          cancelRef:speakingRef
        })
      }
    }
  }

  async function savePersona(p){
    setPersona(p); setPersonaSaving(true)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      await fetch('/api/nova/set-persona',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({persona:p})})
    }catch(_){}
    setPersonaSaving(false)
  }

  async function uploadVoiceRecording(e){
    const file=e.target.files?.[0]; if(!file) return
    setVoiceUploading(true);setVoiceUploadMsg('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const fd=new FormData()
      fd.append('file',file); fd.append('courseCode','VOICE_TRAINING'); fd.append('courseTitle','Teaching Style Reference')
      const res=await fetch('/api/nova/upload-material',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:fd})
      const data=await res.json()
      if(!res.ok) throw new Error(data.error)
      setVoiceUploadMsg('✅ Uploaded and transcribed. Nova will learn from this teaching style.')
    }catch(err){setVoiceUploadMsg('Error: '+err.message)}
    setVoiceUploading(false)
    if(voiceFileRef.current) voiceFileRef.current.value=''
  }

  const sessionCount=(profile?.session_count||0)+1

  return(
    <div style={{height:'100vh',background:'#080604',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'sans-serif',position:'relative'}}>
      <style>{`
        @keyframes nb{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
        @keyframes board-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chat-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes cblink{0%,100%{opacity:1}50%{opacity:0}}
        .nvbtn{border:none;cursor:pointer;font-family:sans-serif;transition:all 0.18s;}
        .nvbtn:active{transform:scale(0.93);}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12)}
      `}</style>

      {/* TOP BAR */}
      <div style={{padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexShrink:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'#f5c842',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#3B1F0E',fontFamily:'serif'}}>N</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>Professor Nova</div>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.07em',color:novaState==='speaking'?'#22c55e':novaState==='thinking'?'#f5c842':micOn?'rgba(100,200,255,0.5)':'rgba(255,255,255,0.25)'}}>
              {novaState==='speaking'?'speaking — interrupt any time':novaState==='thinking'?'thinking…':micOn?'listening · session '+sessionCount:ON_MOBILE?'tap mic to start':'session '+sessionCount}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button className="nvbtn" onClick={()=>setSettingsOpen(v=>!v)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:99,padding:'5px 10px',fontSize:10,color:'rgba(255,255,255,0.5)'}}>⚙ Settings</button>
          <button className="nvbtn" onClick={()=>{const v=!voiceOn;setVoiceOn(v);voiceOnRef.current=v;if(!v&&speakingRef.current){window.speechSynthesis.cancel();speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle')}}}
            style={{background:voiceOn?'rgba(245,200,66,0.1)':'rgba(255,255,255,0.05)',border:`1px solid ${voiceOn?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.08)'}`,borderRadius:99,padding:'5px 10px',fontSize:10,color:voiceOn?'#f5c842':'rgba(255,255,255,0.25)'}}>
            {voiceOn?'🔊 Voice':'🔇 Muted'}
          </button>
          {group&&<div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:99,padding:2,gap:1}}>
            {['personal','classroom'].map(m=>(
              <button key={m} className="nvbtn" onClick={()=>setMode(m)} style={{padding:'4px 8px',borderRadius:99,fontSize:9,border:'none',background:mode===m?'#f5c842':'transparent',color:mode===m?'#3B1F0E':'rgba(255,255,255,0.35)',fontWeight:mode===m?600:400}}>
                {m==='personal'?'Personal':'Class'}
              </button>
            ))}
          </div>}
          <Link to="/dashboard" style={{fontSize:10,color:'rgba(255,255,255,0.2)',textDecoration:'none',padding:'5px 6px'}}>Back</Link>
        </div>
      </div>

      {/* SETTINGS PANEL */}
      {settingsOpen&&(
        <div style={{position:'absolute',top:52,right:10,zIndex:200,background:'rgba(18,14,10,0.98)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'16px',width:270,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',maxHeight:'80vh',overflowY:'auto'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#f5c842',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>Nova Teaching Mode</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:4}}>
            {PERSONAS.map(p=>(
              <button key={p.id} onClick={()=>savePersona(p.id)} className="nvbtn"
                style={{display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${persona===p.id?'#f5c842':'rgba(255,255,255,0.08)'}`,background:persona===p.id?'rgba(245,200,66,0.12)':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:13,color:persona===p.id?'#f5c842':'rgba(255,255,255,0.8)',fontWeight:persona===p.id?600:400}}>{p.label}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>{p.desc}</span>
              </button>
            ))}
          </div>
          {personaSaving&&<div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>Saving...</div>}

          {isOwner&&(
            <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:14,marginTop:10}}>
              <div style={{fontSize:12,fontWeight:600,color:'#f5c842',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>🎙 Voice Training</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:10,lineHeight:1.5}}>Upload your professor's voice recording. Nova will transcribe it and learn their teaching style.</div>
              <input ref={voiceFileRef} type="file" accept=".mp3,.m4a,.wav,.ogg,.webm,.mp4" onChange={uploadVoiceRecording} style={{display:'none'}} id="voice-upload"/>
              <label htmlFor="voice-upload" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(245,200,66,0.15)',border:'1px solid rgba(245,200,66,0.3)',borderRadius:8,fontSize:12,color:'#f5c842',cursor:voiceUploading?'not-allowed':'pointer',opacity:voiceUploading?0.6:1}}>
                {voiceUploading?'⏳ Transcribing...':'+ Upload Recording'}
              </label>
              {voiceUploadMsg&&<div style={{fontSize:11,marginTop:8,color:voiceUploadMsg.startsWith('Error')?'#fca5a5':'#86efac',lineHeight:1.4}}>{voiceUploadMsg}</div>}
            </div>
          )}

          <button onClick={()=>setSettingsOpen(false)} className="nvbtn" style={{marginTop:14,width:'100%',padding:'8px',borderRadius:8,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)',fontSize:12,border:'1px solid rgba(255,255,255,0.08)'}}>
            Close
          </button>
        </div>
      )}

      {/* STAGE */}
      <div style={{flex:1,position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 40%,rgba(245,200,66,0.04) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.013) 1px,transparent 1px)',backgroundSize:'34px 34px',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:10,marginBottom:boardVisible?12:0,transition:'margin 0.3s'}}>
          <NovaAvatar state={novaState} size={Math.min(window.innerWidth*0.44,190)}/>
        </div>
        {!boardVisible&&messages.length===0&&novaState==='idle'&&(
          <p style={{fontSize:12,color:'rgba(255,255,255,0.2)',marginTop:8,zIndex:10,textAlign:'center',padding:'0 20px'}}>
            {ON_MOBILE?micOn?'Speak to Nova — tap Stop to interrupt':'👆 Tap the mic button below to start':micOn?'Speak naturally — interrupt me any time':'Turn mic on to talk'}
          </p>
        )}
        {error&&(
          <div style={{position:'absolute',top:10,left:'50%',transform:'translateX(-50%)',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:10,padding:'7px 14px',fontSize:12,color:'#fca5a5',display:'flex',gap:8,zIndex:40,maxWidth:'88%'}}>
            <span>{error}</span>
            <button onClick={()=>setError('')} style={{background:'none',border:'none',color:'#fca5a5',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
          </div>
        )}
        {loading&&(
          <div style={{position:'absolute',bottom:90,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:30}}>
            {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#f5c842',animation:'nb 1.2s ease-in-out infinite',animationDelay:i*0.2+'s',opacity:0.7}}/>)}
          </div>
        )}
        {boardVisible&&(
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(180deg,transparent 0%,rgba(8,6,4,0.94) 18%,rgba(12,22,14,0.98) 100%)',padding:'18px 22px 92px',animation:'board-in 0.35s ease-out',zIndex:20,maxHeight:'58vh',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:novaState==='speaking'?'#22c55e':'#f5c842',animation:novaState==='speaking'?'nb 1s ease-in-out infinite':undefined}}/>
              <span style={{fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.07em'}}>Professor Nova</span>
              {novaState==='speaking'&&<span style={{fontSize:9,color:'rgba(100,200,255,0.35)',marginLeft:4}}>— speak to interrupt</span>}
            </div>
            <BoardText text={boardText}/>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{position:'absolute',bottom:16,left:0,right:0,display:'flex',justifyContent:'center',alignItems:'center',gap:14,zIndex:50}}>
        <button className="nvbtn" onClick={()=>setChatOpen(v=>!v)} style={{width:46,height:46,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)',backdropFilter:'blur(12px)',position:'relative'}}>
          Chat
          {messages.length>0&&<span style={{position:'absolute',top:10,right:10,width:7,height:7,borderRadius:'50%',background:'#f5c842'}}/>}
        </button>
        <button className="nvbtn" onClick={toggleMic}
          style={{width:70,height:70,borderRadius:'50%',background:micOn?'rgba(100,200,255,0.2)':'rgba(255,255,255,0.07)',border:`3px solid ${micOn?'#64c8ff':'rgba(255,255,255,0.15)'}`,color:micOn?'#64c8ff':'rgba(255,255,255,0.4)',fontSize:24,backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:micOn?'0 0 20px rgba(100,200,255,0.3)':'none',transition:'all 0.2s'}}>
          🎤
        </button>
        {novaState==='speaking'?(
          <button className="nvbtn" onClick={interrupt} style={{width:46,height:46,borderRadius:'50%',background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',fontSize:11,color:'#fca5a5',backdropFilter:'blur(12px)'}}>Stop</button>
        ):<div style={{width:46}}/>}
      </div>

      {/* CHAT DRAWER */}
      {chatOpen&&(
        <div style={{position:'absolute',inset:0,zIndex:100,background:'rgba(5,3,2,0.92)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',animation:'chat-in 0.22s ease-out'}}>
          <div style={{padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>Conversation</span>
            <button className="nvbtn" onClick={()=>setChatOpen(false)} style={{background:'rgba(255,255,255,0.06)',border:'none',borderRadius:'50%',width:26,height:26,fontSize:13,color:'rgba(255,255,255,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
            {messages.length===0&&<p style={{fontSize:13,color:'rgba(255,255,255,0.25)',textAlign:'center',marginTop:40}}>No messages yet.</p>}
            {messages.map((msg,i)=>(
              <div key={i} style={{display:'flex',flexDirection:msg.role==='user'?'row-reverse':'row',gap:7,alignItems:'flex-start'}}>
                {msg.role==='assistant'&&<div style={{width:24,height:24,borderRadius:'50%',background:'#f5c842',fontSize:10,fontWeight:700,color:'#3B1F0E',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'serif',flexShrink:0,marginTop:2}}>N</div>}
                <div style={{maxWidth:'80%',padding:'9px 12px',fontSize:13,lineHeight:1.65,whiteSpace:'pre-wrap',background:msg.role==='user'?'#7A3D14':'rgba(255,255,255,0.055)',color:msg.role==='user'?'#fff':'rgba(255,255,255,0.82)',borderRadius:msg.role==='user'?'12px 12px 3px 12px':'3px 12px 12px 12px',border:'1px solid rgba(255,255,255,0.05)'}}>
                  {msg.content}
                  {msg.role==='assistant'&&voiceOn&&(
                    <button onClick={()=>{
                      setChatOpen(false);speakingRef.current=true;vadRef.current?.arm()
                      setBoardText(msg.content);setBoardVisible(true)
                      speak(msg.content,{onStart:()=>{if(speakingRef.current)setNovaState('speaking')},onDone:()=>{speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle');setBoardVisible(false)},cancelRef:speakingRef})
                    }} style={{display:'block',marginTop:4,background:'none',border:'none',fontSize:10,color:'rgba(255,255,255,0.2)',cursor:'pointer',padding:0}}>▶ Replay</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0,display:'flex',gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&input.trim()){sendMessage(input);setChatOpen(false)}}}
              placeholder="Type to Professor Nova..."
              style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px 13px',fontSize:13,color:'#fff',fontFamily:'sans-serif',outline:'none'}}
              onFocus={e=>e.target.style.borderColor='#f5c842'}
              onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
            />
            <button className="nvbtn" onClick={()=>{sendMessage(input);setChatOpen(false)}} disabled={!input.trim()||loading}
              style={{height:42,padding:'0 16px',borderRadius:12,background:'#f5c842',color:'#3B1F0E',fontWeight:700,fontSize:13,border:'none',opacity:input.trim()&&!loading?1:0.3}}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BoardText({text}){
  const [shown,setShown]=useState('')
  useEffect(()=>{
    setShown('');let i=0
    const t=setInterval(()=>{if(i<text.length)setShown(text.slice(0,++i));else clearInterval(t)},15)
    return()=>clearInterval(t)
  },[text])
  return(
    <div style={{fontSize:'clamp(13px,2vw,15px)',color:'rgba(255,255,240,0.88)',lineHeight:1.75,fontFamily:"'Courier New',monospace",letterSpacing:'0.02em',maxHeight:'calc(58vh - 90px)',overflowY:'auto',textShadow:'0 0 10px rgba(255,255,200,0.12)'}}>
      {shown}
      {shown.length<text.length&&<span style={{display:'inline-block',width:2,height:'1em',background:'rgba(255,255,220,0.7)',marginLeft:2,verticalAlign:'middle',animation:'cblink 0.6s ease-in-out infinite'}}/>}
    </div>
  )
}
