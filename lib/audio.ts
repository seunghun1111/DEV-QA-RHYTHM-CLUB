import { type Track, duration } from './tracks';
let context:AudioContext|undefined;
export async function unlockAudio(){context ??= new AudioContext(); await context.resume(); if(context.state !== 'running')throw new Error('소리를 활성화하려면 버튼을 다시 눌러 주세요.'); return context;}
const frequency=(n:number)=>440*Math.pow(2,(n-69)/12);
export class Soundtrack {
  ctx:AudioContext; master:GainNode; start=0; timer?:ReturnType<typeof setInterval>; step=0; stopped=false;
  constructor(public track:Track,ctx:AudioContext,volume:number){this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=volume*.32;this.master.connect(ctx.destination);}
  tone(time:number,midi:number,len:number,amp:number,type:OscillatorType='sine'){
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=frequency(midi);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(amp,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+len);
    osc.connect(gain);gain.connect(this.master);osc.start(time);osc.stop(time+len+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  drum(time:number,kick:boolean){
    if(kick){const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.frequency.setValueAtTime(135,time);osc.frequency.exponentialRampToValueAtTime(42,time+.14);g.gain.setValueAtTime(.8,time);g.gain.exponentialRampToValueAtTime(.0001,time+.24);osc.connect(g);g.connect(this.master);osc.start(time);osc.stop(time+.25);osc.onended=()=>{osc.disconnect();g.disconnect();};}
    else {const length=.07,buf=this.ctx.createBuffer(1,this.ctx.sampleRate*length,this.ctx.sampleRate);const data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=buf;filter.type='highpass';filter.frequency.value=6200;g.gain.value=.15;src.connect(filter);filter.connect(g);g.connect(this.master);src.start(time);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();};}
  }
  play(delay:number=1.4){this.start=this.ctx.currentTime+delay;const schedule=()=>{if(this.stopped)return;const half=30/this.track.bpm;
    while(this.start+this.step*half<this.ctx.currentTime+.18 && this.step<256){const s=this.step++,t=this.start+s*half;if(t<this.ctx.currentTime)continue;const bar=Math.floor(s/8),root=this.track.root+this.track.chords[Math.floor(bar/4)%4];
      if(s%2===0)this.drum(t,true);if(s>15)this.drum(t,false);
      if(s%4===2)this.tone(t,root+19,.1,.1,'triangle');
      if(s%2===0)this.tone(t,root-24,.25,.5,'triangle');
      if(s%8===0)for(const offset of [0,3,7])this.tone(t,root+offset,half*7,.09,'triangle');
      if(s>=8 && (bar%8<6 || s%2===0))this.tone(t,root+12+this.track.melody[s%8],half*.85,.18, this.track.id===2?'sawtooth':'triangle');
    }
    if(this.elapsed()>duration(this.track)+1)clearInterval(this.timer);
  };schedule();this.timer=setInterval(schedule,60);}
  elapsed(){return this.ctx.currentTime-this.start;}
  stop(){this.stopped=true;clearInterval(this.timer);this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.015);setTimeout(()=>this.master.disconnect(),150);}
}
