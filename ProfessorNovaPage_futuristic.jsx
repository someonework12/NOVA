import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useGroup } from '../hooks/useGroup.js'
import { supabase } from '../lib/supabase.js'
import NovaHumanoid from '../components/NovaHumanoid.jsx'

const OWNER_ID = '41ebd717-ab98-4461-9642-8e9d07c50cac'
const ON_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const PERSONAS = [
  { id:'professor', label:'🎓 Professor',  desc:'Formal, precise, calm' },
  { id:'coach',     label:'⚡ Coach',       desc:'Energetic, motivating, direct' },
  { id:'friendly',  label:'😊 Friendly',    desc:'Warm, patient, conversational' },
  { id:'examprep',  label:'📝 Exam Prep',   desc:'Fast, rigorous, exam-focused' },
]

function detectNoteRequest(text) {
  return /pull.?up|show.?(me|my)|display|open.?my|bring.?up|put.?(up|on.?board)|write.?(on|on.?the)|show.?note|show.?section|show.?chapter|show.?definition|show.?theorem|show.?formula|write.?out|put.?on.?board/i.test(text)
}

class NovaEar {
  constructor(onSpeech) {
    this.onSpeech=onSpeech; this.rec=null; this.running=false
    this.restartT=null; this.settleT=null; this.settling=false
  }
  open(){ this.running=true; this.settling=false; this._start() }
  settle(ms=200){ this.settling=true; clearTimeout(this.settleT); this.settleT=setTimeout(()=>{this.settling=false},ms) }
  close(){ this.running=false; clearTimeout(this.restartT); clearTimeout(this.settleT); this._kill() }
  _kill(){ try{this.rec?.abort()}catch(_){} this.rec=null }
  _start(){
    if(!this.running) return
    clearTimeout(this.restartT); this._kill()
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return
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
      const t=best.trim(); if(!t||t.length<2) return
      this.onSpeech(t)
    }
    rec.onerror=(e)=>{ if(e.error==='aborted') return; if(e.error==='not-allowed'){this.running=false;return}; if(this.running) this.restartT=setTimeout(()=>this._start(),e.error==='no-speech'?100:600) }
    rec.onend=()=>{ if(this.running) this.restartT=setTimeout(()=>this._start(),ON_MOBILE?150:400) }
    this.rec=rec; try{rec.start()}catch(_){if(this.running)this.restartT=setTimeout(()=>this._start(),500)}
  }
}

class VAD {
  constructor(onVoice){
    this.onVoice=onVoice; this.ctx=null; this.analyser=null; this.stream=null
    this.rafId=null; this.armed=false; this.fired=false; this.holdStart=null
    this.THRESHOLD=14; this.HOLD_MS=80
  }
  async init(){
    if(this.ctx) return
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      this.ctx=new(window.AudioContext||window.webkitAudioContext)()
      const src=this.ctx.createMediaStreamSource(this.stream)
      this.analyser=this.ctx.createAnalyser(); this.analyser.fftSize=256
      src.connect(this.analyser); this._loop()
    }catch(_){}
  }
  getStream(){ return this.stream }
  arm(){ this.armed=true; this.fired=false; this.holdStart=null }
  disarm(){ this.armed=false; this.fired=false; this.holdStart=null }
  destroy(){ this.armed=false; cancelAnimationFrame(this.rafId); try{this.stream?.getTracks().forEach(t=>t.stop())}catch(_){} try{this.ctx?.close()}catch(_){} }
  _loop(){
    if(!this.analyser) return
    const buf=new Uint8Array(this.analyser.fftSize)
    const tick=()=>{
      this.rafId=requestAnimationFrame(tick)
      if(!this.armed||this.fired) return
      this.analyser.getByteTimeDomainData(buf)
      let sum=0; for(let i=0;i<buf.length;i++){const v=buf[i]-128;sum+=v*v}
      const rms=Math.sqrt(sum/buf.length)
      if(rms>this.THRESHOLD){if(!this.holdStart)this.holdStart=Date.now();else if(Date.now()-this.holdStart>=this.HOLD_MS){this.fired=true;this.armed=false;this.onVoice()}}
      else this.holdStart=null
    }; tick()
  }
}

function getVoice(){
  const voices=window.speechSynthesis?.getVoices()||[]
  const want=['Google UK English Male','Microsoft David Desktop','Daniel','Alex','Fred']
  for(const n of want){const v=voices.find(v=>v.name.includes(n));if(v)return v}
  return voices.find(v=>v.lang?.startsWith('en')&&!/(female|zira|hazel|victoria|karen|samantha)/i.test(v.name))||voices.find(v=>v.lang?.startsWith('en'))||null
}
function waitForVoices(){
  return new Promise(resolve=>{
    const v=window.speechSynthesis?.getVoices()||[]; if(v.length>0){resolve();return}
    let done=false; window.speechSynthesis.onvoiceschanged=()=>{if(!done){done=true;resolve()}}
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
    }; next()
  })
}

function BlackboardText({text,onDone}){
  const [shownLines,setShownLines]=useState([])
  const [curLine,setCurLine]=useState(0)
  const [curText,setCurText]=useState('')
  const lines=text.split('\n').filter(l=>l.trim())

  useEffect(()=>{setShownLines([]);setCurLine(0);setCurText('')},[text])

  useEffect(()=>{
    if(!lines.length) return
    if(curLine>=lines.length){onDone?.();return}
    const line=lines[curLine]; let i=0; setCurText('')
    const iv=setInterval(()=>{
      if(i<line.length) setCurText(line.slice(0,++i))
      else{clearInterval(iv);setShownLines(p=>[...p,line]);setTimeout(()=>setCurLine(l=>l+1),300)}
    },22)
    return()=>clearInterval(iv)
  },[curLine,lines.length])

  const style=(l)=>({
    marginBottom:6,
    color:l.startsWith('#')?'#f5c842':l.startsWith('•')||l.startsWith('-')?'#86efac':'rgba(255,255,240,0.9)',
    fontWeight:l.startsWith('#')?700:400,
    fontSize:l.startsWith('#')?'1.05em':'1em'
  })

  return(
    <div style={{fontFamily:"'Courier New',monospace",lineHeight:1.9}}>
      {shownLines.map((l,i)=><div key={i} style={style(l)}>{l.replace(/^#+\s?/,'')}</div>)}
      {curLine<lines.length&&(
        <div style={style(lines[curLine])}>
          {curText.replace(/^#+\s?/,'')}
          <span style={{display:'inline-block',width:2,height:'1em',background:'rgba(255,255,220,0.9)',marginLeft:2,verticalAlign:'middle',animation:'blink 0.5s ease-in-out infinite'}}/>
        </div>
      )}
    </div>
  )
}

function Blackboard({text,title,visible,onClose,onWritingChange}){
  const [phase,setPhase]=useState('idle')
  useEffect(()=>{
    if(visible&&text){setPhase('writing');onWritingChange?.(true)}
    else{setPhase('idle');onWritingChange?.(false)}
  },[visible,text])
  if(!visible) return null
  return(
    <div style={{position:'absolute',inset:0,zIndex:60,background:'rgba(3,7,3,0.97)',backdropFilter:'blur(8px)',display:'flex',flexDirection:'column',animation:'board-in 0.4s ease-out'}}>
      <div style={{padding:'12px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(245,200,66,0.12)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:phase==='writing'?'#f5c842':'#86efac',animation:phase==='writing'?'pulse 0.8s ease-in-out infinite':'none'}}/>
          <span style={{fontSize:11,color:'rgba(245,200,66,0.7)',textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:'monospace'}}>
            {phase==='writing'?'Professor Nova is writing...':'Board · '+(title||'Notes')}
          </span>
        </div>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'4px 12px',fontSize:11,color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:'monospace'}}>✕ Close</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'28px 32px',background:`repeating-linear-gradient(transparent,transparent 31px,rgba(245,200,66,0.04) 31px,rgba(245,200,66,0.04) 32px),linear-gradient(180deg,#040d04 0%,#030a03 100%)`,position:'relative'}}>
        <div style={{position:'absolute',left:60,top:0,bottom:0,width:1,background:'rgba(255,100,100,0.15)',pointerEvents:'none'}}/>
        <div style={{paddingLeft:20,fontSize:'clamp(13px,2vw,15px)',minHeight:200}}>
          {text&&<BlackboardText text={text} onDone={()=>{setPhase('done');onWritingChange?.(false)}}/>}
        </div>
      </div>
      {phase==='done'&&(
        <div style={{padding:'12px 18px',borderTop:'1px solid rgba(245,200,66,0.08)',flexShrink:0,display:'flex',gap:10,alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontFamily:'monospace'}}>What would you like to understand from this?</span>
          <button onClick={onClose} style={{background:'rgba(245,200,66,0.12)',border:'1px solid rgba(245,200,66,0.3)',borderRadius:6,padding:'6px 16px',fontSize:11,color:'#f5c842',cursor:'pointer',fontFamily:'monospace'}}>Ask Nova →</button>
        </div>
      )}
    </div>
  )
}

export default function ProfessorNovaPage(){
  const {profile}=useAuth(); const {group}=useGroup()
  const [mode,setMode]=useState('personal')
  const [messages,setMessages]=useState([])
  const [novaState,setNovaState]=useState('idle')
  const [boardContent,setBoardContent]=useState('')
  const [boardTitle,setBoardTitle]=useState('')
  const [boardVisible,setBoardVisible]=useState(false)
  const [boardIsWriting,setBoardIsWriting]=useState(false)
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
  const avatarState=boardIsWriting?'writing':novaState

  useEffect(()=>{messagesRef.current=messages},[messages])
  useEffect(()=>{loadingRef.current=loading},[loading])
  useEffect(()=>{voiceOnRef.current=voiceOn},[voiceOn])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{if(profile?.nova_persona)setPersona(profile.nova_persona)},[profile])

  const interrupt=useCallback(()=>{
    if(!speakingRef.current)return
    window.speechSynthesis.cancel(); speakingRef.current=false; vadRef.current?.disarm()
    setNovaState('idle'); setBoardVisible(false); earRef.current?.settle(200)
  },[])

  const sendMessage=useCallback(async(text)=>{
    const clean=text?.trim(); if(!clean)return
    if(speakingRef.current)interrupt()
    if(loadingRef.current)return
    const userMsg={role:'user',content:clean}
    const history=[...messagesRef.current,userMsg]
    setMessages(history); setInput('')
    setLoading(true);loadingRef.current=true; setNovaState('thinking'); setError('')
    const isNoteReq=detectNoteRequest(clean)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const endpoint=mode==='classroom'?'/api/nova/classroom':'/api/nova/chat'
      const body=mode==='classroom'?{messages:history,groupId:group?.id}:{messages:history,noteRequest:isNoteReq}
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)})
      if(!res.ok){let msg=`Server error ${res.status}`;if(res.status===504)msg='Professor Nova is waking up — please try again.';else{try{const e=await res.json();msg=e.error||msg}catch(_){}}throw new Error(msg)}
      let data; try{data=await res.json()}catch(_){throw new Error('Bad response — try again.')}
      const reply=data.reply
      setMessages(prev=>[...prev,{role:'assistant',content:reply}])
      if(isNoteReq||data.boardContent){
        setBoardContent(data.boardContent||reply); setBoardTitle(data.boardTitle||'Notes'); setBoardVisible(true)
        if(voiceOnRef.current){
          speakingRef.current=true
          speak(data.boardIntro||'Let me write that up for you.',{
            onStart:()=>{if(speakingRef.current)setNovaState('speaking')},
            onDone:()=>{speakingRef.current=false;setNovaState('idle')},
            cancelRef:speakingRef
          })
        }
      }else if(voiceOnRef.current){
        speakingRef.current=true; vadRef.current?.arm()
        speak(reply,{
          onStart:()=>{if(speakingRef.current)setNovaState('speaking')},
          onDone:()=>{speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle');setBoardVisible(false)},
          cancelRef:speakingRef
        })
      }else setNovaState('idle')
    }catch(err){
      setError(err.message);setNovaState('idle');speakingRef.current=false;vadRef.current?.disarm()
    }finally{setLoading(false);loadingRef.current=false}
  },[mode,group,interrupt])

  sendRef.current=sendMessage

  useEffect(()=>{
    if(window.speechSynthesis){window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=()=>window.speechSynthesis.getVoices()}
    const ear=new NovaEar(t=>{if(sendRef.current)sendRef.current(t)})
    earRef.current=ear
    const vad=new VAD(()=>{if(speakingRef.current){window.speechSynthesis.cancel();speakingRef.current=false;vad.disarm();setNovaState('idle');setBoardVisible(false);ear.settle(200)}})
    vadRef.current=vad
    fetch('/api/health').catch(()=>{})
    const keepAlive=setInterval(()=>fetch('/api/health').catch(()=>{}),13*60*1000)
    if(!ON_MOBILE){
      const t=setTimeout(()=>{
        setMicOn(true);vad.init();vadInitedRef.current=true
        const name=profile?.full_name?.split(' ')[0]||'there'
        if(voiceOnRef.current&&!greetedRef.current){
          greetedRef.current=true;speakingRef.current=true
          speak('Hello '+name+'. I am Professor Nova. Ask me anything, or say show me to pull up your notes on the board.',{
            onStart:()=>{if(speakingRef.current)setNovaState('speaking')},
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
      earRef.current?.open();setMicOn(true)
      if(!vadInitedRef.current){vadInitedRef.current=true;vadRef.current?.init()}
      if(ON_MOBILE&&!greetedRef.current&&voiceOnRef.current){
        greetedRef.current=true;speakingRef.current=true
        const name=profile?.full_name?.split(' ')[0]||'there'
        speak('Hello '+name+'. I am Professor Nova. Tap Stop to interrupt me any time.',{
          onStart:()=>{if(speakingRef.current)setNovaState('speaking')},
          onDone:()=>{speakingRef.current=false;setNovaState('idle')},
          cancelRef:speakingRef
        })
      }
    }
  }

  async function savePersona(p){
    setPersona(p);setPersonaSaving(true)
    try{const {data:{session}}=await supabase.auth.getSession();await fetch('/api/nova/set-persona',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({persona:p})})}catch(_){}
    setPersonaSaving(false)
  }

  async function uploadVoiceRecording(e){
    const file=e.target.files?.[0];if(!file)return
    setVoiceUploading(true);setVoiceUploadMsg('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const fd=new FormData();fd.append('file',file);fd.append('courseCode','VOICE_TRAINING');fd.append('courseTitle','Teaching Style Reference')
      const res=await fetch('/api/nova/upload-material',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:fd})
      const data=await res.json();if(!res.ok)throw new Error(data.error)
      setVoiceUploadMsg('✅ Uploaded. Nova will learn from this teaching style.')
    }catch(err){setVoiceUploadMsg('Error: '+err.message)}
    setVoiceUploading(false);if(voiceFileRef.current)voiceFileRef.current.value=''
  }

  const sessionCount=(profile?.session_count||0)+1
  const firstName=profile?.full_name?.split(' ')[0]||'Student'

  return(
    <div style={{height:'100vh',background:'#020504',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'monospace',position:'relative'}}>
      <style>{`
        @keyframes board-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chat-in{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes hud-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes dot-flash{0%,80%,100%{opacity:.2}40%{opacity:1}}
        .nvbtn{border:none;cursor:pointer;transition:all 0.15s;font-family:monospace;}
        .nvbtn:hover{filter:brightness(1.2);}
        .nvbtn:active{transform:scale(0.94);}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(245,200,66,0.2)}
      `}</style>

      {/* Grid overlay */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0,backgroundImage:'linear-gradient(rgba(245,200,66,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(245,200,66,0.018) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>

      {/* Scan line */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden',opacity:0.04}}>
        <div style={{position:'absolute',left:0,right:0,height:2,background:'rgba(245,200,66,0.8)',animation:'scanline 10s linear infinite'}}/>
      </div>

      {/* TOP BAR */}
      <div style={{position:'relative',zIndex:50,padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(2,5,4,0.96)',borderBottom:'1px solid rgba(245,200,66,0.1)',backdropFilter:'blur(20px)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:'rgba(245,200,66,0.1)',border:'1px solid rgba(245,200,66,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#f5c842'}}>N</div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#f5c842',letterSpacing:'0.08em'}}>PROFESSOR NOVA</div>
            <div style={{fontSize:9,color:'rgba(245,200,66,0.4)',letterSpacing:'0.1em'}}>
              {novaState==='speaking'?'● SPEAKING':novaState==='thinking'?'◌ PROCESSING':boardIsWriting?'✎ WRITING':micOn?'◉ LISTENING':'○ STANDBY'} · SESSION {sessionCount}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button className="nvbtn" onClick={()=>setSettingsOpen(v=>!v)} style={{background:'rgba(245,200,66,0.06)',border:'1px solid rgba(245,200,66,0.2)',borderRadius:6,padding:'5px 10px',fontSize:9,color:'rgba(245,200,66,0.6)',letterSpacing:'0.08em'}}>⚙ CONFIG</button>
          <button className="nvbtn" onClick={()=>{const v=!voiceOn;setVoiceOn(v);voiceOnRef.current=v;if(!v&&speakingRef.current){window.speechSynthesis.cancel();speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle')}}}
            style={{background:voiceOn?'rgba(245,200,66,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${voiceOn?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:6,padding:'5px 10px',fontSize:9,color:voiceOn?'#f5c842':'rgba(255,255,255,0.2)',letterSpacing:'0.08em'}}>
            {voiceOn?'◉ VOICE':'○ MUTED'}
          </button>
          {group&&(
            <div style={{display:'flex',background:'rgba(255,255,255,0.03)',borderRadius:6,padding:2,gap:1}}>
              {['personal','classroom'].map(m=>(
                <button key={m} className="nvbtn" onClick={()=>setMode(m)} style={{padding:'4px 8px',borderRadius:4,fontSize:8,border:'none',background:mode===m?'rgba(245,200,66,0.15)':'transparent',color:mode===m?'#f5c842':'rgba(255,255,255,0.2)',letterSpacing:'0.06em'}}>
                  {m==='personal'?'PERSONAL':'CLASS'}
                </button>
              ))}
            </div>
          )}
          <Link to="/dashboard" style={{fontSize:9,color:'rgba(255,255,255,0.2)',textDecoration:'none',padding:'5px 8px',letterSpacing:'0.08em'}}>← BACK</Link>
        </div>
      </div>

      {/* SETTINGS */}
      {settingsOpen&&(
        <div style={{position:'absolute',top:54,right:10,zIndex:200,background:'rgba(3,7,3,0.98)',border:'1px solid rgba(245,200,66,0.18)',borderRadius:10,padding:16,width:270,boxShadow:'0 8px 40px rgba(0,0,0,0.8)',maxHeight:'80vh',overflowY:'auto',backdropFilter:'blur(20px)'}}>
          <div style={{fontSize:9,fontWeight:700,color:'rgba(245,200,66,0.5)',marginBottom:10,letterSpacing:'0.12em'}}>TEACHING MODE</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
            {PERSONAS.map(p=>(
              <button key={p.id} onClick={()=>savePersona(p.id)} className="nvbtn"
                style={{display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'9px 12px',borderRadius:8,border:`1px solid ${persona===p.id?'rgba(245,200,66,0.4)':'rgba(255,255,255,0.05)'}`,background:persona===p.id?'rgba(245,200,66,0.07)':'rgba(255,255,255,0.02)',cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:12,color:persona===p.id?'#f5c842':'rgba(255,255,255,0.55)',fontWeight:persona===p.id?700:400}}>{p.label}</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',marginTop:2}}>{p.desc}</span>
              </button>
            ))}
          </div>
          {personaSaving&&<div style={{fontSize:10,color:'rgba(245,200,66,0.3)',marginBottom:8}}>Saving...</div>}
          {isOwner&&(
            <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:12,marginTop:4}}>
              <div style={{fontSize:9,fontWeight:700,color:'rgba(245,200,66,0.5)',marginBottom:6,letterSpacing:'0.12em'}}>🎙 VOICE TRAINING</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginBottom:10,lineHeight:1.5}}>Upload professor recording. Nova learns their teaching style.</div>
              <input ref={voiceFileRef} type="file" accept=".mp3,.m4a,.wav,.ogg,.webm,.mp4" onChange={uploadVoiceRecording} style={{display:'none'}} id="voice-upload"/>
              <label htmlFor="voice-upload" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',background:'rgba(245,200,66,0.08)',border:'1px solid rgba(245,200,66,0.25)',borderRadius:6,fontSize:10,color:'#f5c842',cursor:voiceUploading?'not-allowed':'pointer',opacity:voiceUploading?0.6:1,letterSpacing:'0.06em'}}>
                {voiceUploading?'⏳ PROCESSING...':'+ UPLOAD RECORDING'}
              </label>
              {voiceUploadMsg&&<div style={{fontSize:10,marginTop:8,color:voiceUploadMsg.startsWith('Error')?'#fca5a5':'#86efac',lineHeight:1.4}}>{voiceUploadMsg}</div>}
            </div>
          )}
          <button onClick={()=>setSettingsOpen(false)} className="nvbtn" style={{marginTop:12,width:'100%',padding:8,borderRadius:6,background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.25)',fontSize:10,border:'1px solid rgba(255,255,255,0.05)',letterSpacing:'0.08em'}}>CLOSE</button>
        </div>
      )}

      {/* MAIN STAGE */}
      <div style={{flex:1,position:'relative',display:'flex',overflow:'hidden'}}>

        {/* LEFT HUD */}
        {!ON_MOBILE&&(
          <div style={{width:190,flexShrink:0,borderRight:'1px solid rgba(245,200,66,0.07)',padding:'20px 14px',display:'flex',flexDirection:'column',gap:16,background:'rgba(2,5,4,0.5)',animation:'hud-in 0.5s ease-out',overflow:'hidden'}}>
            <div style={{borderBottom:'1px solid rgba(245,200,66,0.07)',paddingBottom:14}}>
              <div style={{fontSize:8,color:'rgba(245,200,66,0.35)',letterSpacing:'0.12em',marginBottom:6}}>STUDENT</div>
              <div style={{fontSize:13,color:'#f5c842',fontWeight:700}}>{firstName.toUpperCase()}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:2}}>Session #{sessionCount}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[{label:'MIC',active:micOn,color:'#64c8ff'},{label:'VOICE',active:voiceOn,color:'#f5c842'},{label:'RAG',active:true,color:'#86efac'},{label:'BOARD',active:boardVisible,color:'#f5c842'}].map(({label,active,color})=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:9,color:'rgba(255,255,255,0.2)',letterSpacing:'0.1em'}}>{label}</span>
                  <div style={{width:6,height:6,borderRadius:'50%',background:active?color:'rgba(255,255,255,0.08)',boxShadow:active?`0 0 6px ${color}`:'none',animation:active?'pulse 2s ease-in-out infinite':'none'}}/>
                </div>
              ))}
            </div>
            <div style={{marginTop:'auto',padding:10,background:'rgba(245,200,66,0.03)',border:'1px solid rgba(245,200,66,0.08)',borderRadius:6}}>
              <div style={{fontSize:9,color:'rgba(245,200,66,0.4)',lineHeight:1.6}}>Say "show me [topic]" to display notes on the board.</div>
            </div>
          </div>
        )}

        {/* CENTER */}
        <div style={{flex:1,position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>

          {!boardVisible&&(
            <div style={{position:'relative',zIndex:10,animation:'hud-in 0.4s ease-out'}}>
              <NovaHumanoid state={avatarState} size={ON_MOBILE?200:290}/>
            </div>
          )}

          {!boardVisible&&messages.length===0&&novaState==='idle'&&(
            <div style={{textAlign:'center',marginTop:14,zIndex:10,padding:'0 24px'}}>
              <div style={{fontSize:11,color:'rgba(245,200,66,0.35)',letterSpacing:'0.08em',lineHeight:1.8}}>
                {ON_MOBILE?micOn?'SPEAK TO NOVA':'TAP MIC TO BEGIN':micOn?'SPEAK NATURALLY · INTERRUPT ANY TIME':'ENABLE MIC TO BEGIN'}
              </div>
              {micOn&&<div style={{fontSize:10,color:'rgba(255,255,255,0.12)',marginTop:6,lineHeight:1.6}}>"Show me the definition of integration"<br/>"Pull up my calculus notes"</div>}
            </div>
          )}

          {error&&(
            <div style={{position:'absolute',top:10,left:'50%',transform:'translateX(-50%)',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:8,padding:'7px 14px',fontSize:11,color:'#fca5a5',display:'flex',gap:8,zIndex:40,maxWidth:'88%'}}>
              <span>⚠ {error}</span>
              <button onClick={()=>setError('')} style={{background:'none',border:'none',color:'#fca5a5',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
            </div>
          )}

          {loading&&(
            <div style={{position:'absolute',bottom:100,left:'50%',transform:'translateX(-50%)',display:'flex',gap:5,alignItems:'center',zIndex:30}}>
              {[0,1,2,3,4].map(i=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:'rgba(245,200,66,0.5)',animation:'dot-flash 1.2s ease-in-out infinite',animationDelay:i*0.15+'s'}}/>)}
              <span style={{fontSize:9,color:'rgba(245,200,66,0.35)',marginLeft:6,letterSpacing:'0.1em'}}>PROCESSING</span>
            </div>
          )}

          <Blackboard text={boardContent} title={boardTitle} visible={boardVisible} onClose={()=>{setBoardVisible(false);setBoardIsWriting(false)}} onWritingChange={setBoardIsWriting}/>
        </div>

        {/* RIGHT HUD — recent messages */}
        {!ON_MOBILE&&messages.length>0&&!boardVisible&&(
          <div style={{width:200,flexShrink:0,borderLeft:'1px solid rgba(245,200,66,0.07)',padding:'20px 14px',display:'flex',flexDirection:'column',gap:8,background:'rgba(2,5,4,0.5)',overflowY:'auto',animation:'hud-in 0.5s ease-out'}}>
            <div style={{fontSize:8,color:'rgba(245,200,66,0.35)',letterSpacing:'0.12em',marginBottom:4,flexShrink:0}}>RECENT EXCHANGE</div>
            {messages.slice(-4).map((msg,i)=>(
              <div key={i} style={{padding:'8px 10px',borderRadius:6,background:msg.role==='user'?'rgba(245,200,66,0.05)':'rgba(255,255,255,0.02)',border:`1px solid ${msg.role==='user'?'rgba(245,200,66,0.12)':'rgba(255,255,255,0.04)'}`,fontSize:10,color:msg.role==='user'?'rgba(245,200,66,0.7)':'rgba(255,255,255,0.4)',lineHeight:1.5}}>
                <div style={{fontSize:8,letterSpacing:'0.1em',marginBottom:3,color:msg.role==='user'?'rgba(245,200,66,0.35)':'rgba(255,255,255,0.18)'}}>{msg.role==='user'?firstName.toUpperCase():'NOVA'}</div>
                {msg.content.slice(0,110)}{msg.content.length>110?'...':''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:50,padding:'12px 20px',background:'rgba(2,5,4,0.96)',borderTop:'1px solid rgba(245,200,66,0.08)',display:'flex',justifyContent:'center',alignItems:'center',gap:16}}>
        <button className="nvbtn" onClick={()=>setChatOpen(v=>!v)}
          style={{width:44,height:44,borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:'0.06em',position:'relative'}}>
          CHAT
          {messages.length>0&&<span style={{position:'absolute',top:6,right:6,width:5,height:5,borderRadius:'50%',background:'#f5c842'}}/>}
        </button>

        <button className="nvbtn" onClick={toggleMic}
          style={{width:64,height:64,borderRadius:12,background:micOn?'rgba(100,200,255,0.08)':'rgba(245,200,66,0.05)',border:`2px solid ${micOn?'#64c8ff':'rgba(245,200,66,0.25)'}`,color:micOn?'#64c8ff':'rgba(245,200,66,0.5)',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:micOn?'0 0 20px rgba(100,200,255,0.15)':'0 0 12px rgba(245,200,66,0.08)',transition:'all 0.2s'}}>
          🎤
        </button>

        {novaState==='speaking'?(
          <button className="nvbtn" onClick={interrupt}
            style={{width:44,height:44,borderRadius:8,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',fontSize:9,color:'#fca5a5',letterSpacing:'0.06em'}}>
            STOP
          </button>
        ):boardVisible?(
          <button className="nvbtn" onClick={()=>{setBoardVisible(false);setBoardIsWriting(false)}}
            style={{width:44,height:44,borderRadius:8,background:'rgba(245,200,66,0.06)',border:'1px solid rgba(245,200,66,0.25)',fontSize:9,color:'#f5c842',letterSpacing:'0.06em'}}>
            CLOSE
          </button>
        ):<div style={{width:44}}/>}
      </div>

      {/* CHAT DRAWER */}
      {chatOpen&&(
        <div style={{position:'absolute',inset:0,zIndex:100,background:'rgba(2,5,4,0.97)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',animation:'chat-in 0.2s ease-out'}}>
          <div style={{padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(245,200,66,0.08)',flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:700,color:'#f5c842',letterSpacing:'0.1em'}}>CONVERSATION LOG</span>
            <button className="nvbtn" onClick={()=>setChatOpen(false)} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6,padding:'4px 10px',fontSize:10,color:'rgba(255,255,255,0.35)',letterSpacing:'0.06em'}}>CLOSE</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
            {messages.length===0&&<p style={{fontSize:11,color:'rgba(255,255,255,0.15)',textAlign:'center',marginTop:40,letterSpacing:'0.08em'}}>NO MESSAGES YET</p>}
            {messages.map((msg,i)=>(
              <div key={i} style={{display:'flex',flexDirection:msg.role==='user'?'row-reverse':'row',gap:8,alignItems:'flex-start'}}>
                <div style={{width:24,height:24,borderRadius:4,background:msg.role==='user'?'rgba(245,200,66,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${msg.role==='user'?'rgba(245,200,66,0.25)':'rgba(255,255,255,0.06)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:msg.role==='user'?'#f5c842':'rgba(255,255,255,0.3)',flexShrink:0,letterSpacing:'0.06em'}}>
                  {msg.role==='user'?'YOU':'N'}
                </div>
                <div style={{maxWidth:'80%',padding:'9px 12px',fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',background:msg.role==='user'?'rgba(245,200,66,0.05)':'rgba(255,255,255,0.03)',color:msg.role==='user'?'rgba(245,200,66,0.85)':'rgba(255,255,255,0.65)',borderRadius:msg.role==='user'?'8px 2px 8px 8px':'2px 8px 8px 8px',border:`1px solid ${msg.role==='user'?'rgba(245,200,66,0.12)':'rgba(255,255,255,0.05)'}`}}>
                  {msg.content}
                  {msg.role==='assistant'&&(
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      {voiceOn&&<button onClick={()=>{setChatOpen(false);speakingRef.current=true;vadRef.current?.arm();speak(msg.content,{onStart:()=>{if(speakingRef.current)setNovaState('speaking')},onDone:()=>{speakingRef.current=false;vadRef.current?.disarm();setNovaState('idle')},cancelRef:speakingRef})}} style={{background:'none',border:'none',fontSize:9,color:'rgba(245,200,66,0.35)',cursor:'pointer',padding:0,letterSpacing:'0.06em'}}>▶ REPLAY</button>}
                      <button onClick={()=>{setChatOpen(false);setBoardContent(msg.content);setBoardTitle("Nova's Response");setBoardVisible(true)}} style={{background:'none',border:'none',fontSize:9,color:'rgba(100,200,255,0.35)',cursor:'pointer',padding:0,letterSpacing:'0.06em'}}>✎ BOARD</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid rgba(245,200,66,0.06)',flexShrink:0,display:'flex',gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&input.trim()){sendMessage(input);setChatOpen(false)}}}
              placeholder="Type to Professor Nova..."
              style={{flex:1,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(245,200,66,0.12)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#fff',fontFamily:'monospace',outline:'none'}}
              onFocus={e=>e.target.style.borderColor='rgba(245,200,66,0.35)'}
              onBlur={e=>e.target.style.borderColor='rgba(245,200,66,0.12)'}
            />
            <button className="nvbtn" onClick={()=>{sendMessage(input);setChatOpen(false)}} disabled={!input.trim()||loading}
              style={{height:42,padding:'0 16px',borderRadius:8,background:'rgba(245,200,66,0.12)',color:'#f5c842',fontWeight:700,fontSize:11,border:'1px solid rgba(245,200,66,0.25)',opacity:input.trim()&&!loading?1:0.3,letterSpacing:'0.08em'}}>
              SEND
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
