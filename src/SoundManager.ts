export class SoundManager {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;
  
  public isMuted: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.bgmAudio = new Audio('./Pixel Overdrive.mp3');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.4;
  }

  public init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.updateMuteState();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateMuteState();
    return this.isMuted;
  }

  private updateMuteState() {
    if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    if (this.bgmAudio) {
        this.bgmAudio.muted = this.isMuted;
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playBGM() {
      if (this.bgmAudio && !this.isMuted) {
          this.bgmAudio.play().catch(e => console.log('BGM play prevented', e));
      }
  }

  public stopBGM() {
      if (this.bgmAudio) {
          this.bgmAudio.pause();
          this.bgmAudio.currentTime = 0;
      }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playIndicatorBeep() {
    if (!this.ctx || this.isMuted) return;
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.playTone(880, 'square', 0.1, 0.05);
        }, i * 150);
    }
  }

  public playOvertakeSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    // "Ngiwee" sound
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCoinSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(988, now); // B5
    osc.frequency.setValueAtTime(1319, now + 0.1); // E6
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playFuelSound() {
    this.playCoinSound();
  }

  public playJumpSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2); 
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCrashSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    // Long loud white noise
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800; // Deep rumble
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.0);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();
  }

  public startEngineSound() {
    if (!this.ctx || !this.masterGain || this.isEngineRunning || this.isMuted) return;
    
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    this.engineGain.gain.value = 0.05;
    
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    
    this.engineOsc.start();
    this.isEngineRunning = true;
  }

  public setEngineSpeed(speedRatio: number) {
     if (this.engineOsc && this.isEngineRunning) {
         this.engineOsc.frequency.value = 50 + (speedRatio * 50); 
     }
  }

  public stopEngineSound() {
    if (this.engineOsc && this.engineGain) {
        this.engineGain.gain.setValueAtTime(0, this.ctx!.currentTime + 0.1);
        this.engineOsc.stop(this.ctx!.currentTime + 0.2);
        this.isEngineRunning = false;
        this.engineOsc = null;
        this.engineGain = null;
    }
  }
}
