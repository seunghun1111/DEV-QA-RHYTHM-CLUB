type YTPlayer={playVideo():void;pauseVideo():void;destroy():void;getCurrentTime():number;getDuration():number;getPlayerState():number;setPlaybackRate(rate:number):void};
type YTNamespace={Player:new(element:HTMLElement,options:Record<string,unknown>)=>YTPlayer;PlayerState:{ENDED:number}};
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

export interface PlaybackClock{play(delay?:number):void;elapsed():number;pause():void;resume():Promise<void>;stop():void;ended():boolean;duration():number}

export class YouTubeSoundtrack implements PlaybackClock{
 player?:YTPlayer;timer?:ReturnType<typeof setTimeout>;stopped=false;isEnded=false;startAt=0;
 constructor(private videoId:string,private container:HTMLElement,private playbackRate=1){}
 async ready(){const YT=await loadApi();await new Promise<void>((resolve,reject)=>{this.player=new YT.Player(this.container,{videoId:this.videoId,width:'100%',height:'100%',playerVars:{playsinline:1,rel:0,controls:1,modestbranding:1},events:{onReady:()=>{this.player?.setPlaybackRate(this.playbackRate);resolve();},onStateChange:(event:{data:number})=>{if(event.data===YT.PlayerState.ENDED)this.isEnded=true;},onError:()=>reject(new Error('YouTube playback failed'))}});});}
 play(delay=1.4){this.startAt=performance.now()+delay*1000;this.timer=setTimeout(()=>{if(!this.stopped)this.player?.playVideo();},Math.max(0,delay*1000));}
 elapsed(){if(performance.now()<this.startAt)return-(this.startAt-performance.now())/1000*this.playbackRate;return this.player?.getCurrentTime()??0;}
 pause(){this.player?.pauseVideo();}
 async resume(){this.player?.playVideo();}
 stop(){this.stopped=true;clearTimeout(this.timer);this.player?.destroy();}
 ended(){return this.isEnded;}
 duration(){return this.player?.getDuration()||0;}
}
