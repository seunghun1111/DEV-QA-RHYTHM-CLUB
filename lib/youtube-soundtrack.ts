type YTPlayer={playVideo():void;pauseVideo():void;destroy():void;getCurrentTime():number;getDuration():number;getPlayerState():number;setPlaybackRate(rate:number):void;seekTo(seconds:number,allowSeekAhead:boolean):void};
type YTNamespace={Player:new(element:HTMLElement,options:Record<string,unknown>)=>YTPlayer;PlayerState:{ENDED:number;PLAYING:number;PAUSED:number;BUFFERING:number}};
declare global{interface Window{YT?:YTNamespace;onYouTubeIframeAPIReady?:()=>void}}

let apiPromise:Promise<YTNamespace>|null=null;
function loadApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{previous?.();if(window.YT)resolve(window.YT);else reject(new Error('YouTube API unavailable'));};
  if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>reject(new Error('YouTube API load failed'));document.head.appendChild(script);}
 });
 return apiPromise;
}

export interface PlaybackClock{play(delay?:number,offset?:number):void;elapsed():number;pause():void;resume():Promise<void>;stop():void;ended():boolean;duration():number}

export class YouTubeSoundtrack implements PlaybackClock{
 player?:YTPlayer;timer?:ReturnType<typeof setTimeout>;stopped=false;isEnded=false;startAt=0;state=-1;anchorTime=0;anchorAt=0;lastPoll=0;
 constructor(private videoId:string,private container:HTMLElement,private playbackRate=1,private audioOffsetMs=0){}
 private sample(now=performance.now(),hard=false){const actual=this.player?.getCurrentTime()??this.anchorTime,predicted=this.state===1?this.anchorTime+(now-this.anchorAt)/1000*this.playbackRate:this.anchorTime,error=actual-predicted;this.anchorTime=hard||Math.abs(error)>.15?actual:predicted+error*.35;this.anchorAt=now;this.lastPoll=now;}
 async ready(){const YT=await loadApi();await new Promise<void>((resolve,reject)=>{this.player=new YT.Player(this.container,{videoId:this.videoId,width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,controls:1,modestbranding:1},events:{onReady:()=>{this.player?.setPlaybackRate(this.playbackRate);this.sample(performance.now(),true);resolve();},onStateChange:(event:{data:number})=>{this.state=event.data;this.sample(performance.now(),true);if(event.data===YT.PlayerState.ENDED)this.isEnded=true;},onError:()=>reject(new Error('YouTube playback failed'))}});});}
 play(delay=1.4,offset=0){this.startAt=performance.now()+delay*1000;this.timer=setTimeout(()=>{if(!this.stopped){if(offset>0)this.player?.seekTo(offset,true);this.sample(performance.now(),true);this.player?.playVideo();}},Math.max(0,delay*1000));}
 elapsed(){const now=performance.now();if(now<this.startAt)return-(this.startAt-now)/1000*this.playbackRate;if(now-this.lastPoll>=200)this.sample(now);const predicted=this.state===1?this.anchorTime+(now-this.anchorAt)/1000*this.playbackRate:this.anchorTime;return predicted-this.audioOffsetMs/1000;}
 pause(){this.player?.pauseVideo();}
 async resume(){this.player?.playVideo();}
 stop(){this.stopped=true;clearTimeout(this.timer);this.player?.destroy();}
 ended(){return this.isEnded;}
 duration(){return this.player?.getDuration()||0;}
}
