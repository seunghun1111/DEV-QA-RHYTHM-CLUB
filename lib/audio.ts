import { type Track } from './tracks';
let context:AudioContext|undefined;
export async function unlockAudio(){context ??= new AudioContext(); await context.resume(); if(context.state !== 'running')throw new Error('소리를 활성화하려면 버튼을 다시 눌러 주세요.'); return context;}
export class Soundtrack {
  ctx:AudioContext; master:GainNode; element:HTMLAudioElement; source:MediaElementAudioSourceNode; start=0; timer?:ReturnType<typeof setTimeout>; stopped=false;
  constructor(public track:Track,ctx:AudioContext,volume:number,public playbackRate=1){this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=volume;this.master.connect(ctx.destination);this.element=new Audio(track.audio);this.element.preload='auto';this.element.playbackRate=playbackRate;this.source=ctx.createMediaElementSource(this.element);this.source.connect(this.master);}
  play(delay:number=1.4){this.start=this.ctx.currentTime+delay;this.timer=setTimeout(()=>{if(!this.stopped)void this.element.play();},Math.max(0,delay*1000));}
  elapsed(){return this.element.currentTime-(this.ctx.currentTime<this.start?(this.start-this.ctx.currentTime)*this.playbackRate:0);}
  pause(){this.element.pause();}
  async resume(){await this.ctx.resume();await this.element.play();}
  ended(){return this.element.ended;}
  duration(){return this.element.duration||this.track.duration;}
  stop(){this.stopped=true;clearTimeout(this.timer);this.element.pause();this.element.removeAttribute('src');this.element.load();this.source.disconnect();this.master.disconnect();}
}
