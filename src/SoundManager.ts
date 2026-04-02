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

  public playWarningBeep() {
    if (!this.ctx || this.isMuted) return;
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.playTone(1200, 'sine', 0.08, 0.05);
        }, i * 100);
    }
  }

  public playOvertakeSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    
    // Doppler effect: High pitch approaching, sharp drop exactly as it passes, low pitch receding
    const approachTime = 0.15;
    const passTime = 0.1;
    const recedeTime = 0.35;
    
    // Frequency (Pitch)
    osc.frequency.setValueAtTime(700, now); // Approaching pitch
    osc.frequency.setValueAtTime(750, now + approachTime); // Peaks slightly higher just before pass
    osc.frequency.exponentialRampToValueAtTime(350, now + approachTime + passTime); // Nyeeeee--
    osc.frequency.linearRampToValueAtTime(250, now + approachTime + passTime + recedeTime); // --rrrrrowww

    // Filter to make it sound like a motor
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.linearRampToValueAtTime(800, now + approachTime + passTime + recedeTime);
    
    // Amplitude (Volume distance effect)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + approachTime); // Maximum volume when directly next to us
    gain.gain.exponentialRampToValueAtTime(0.01, now + approachTime + passTime + recedeTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + approachTime + passTime + recedeTime);
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
    this.engineOsc.frequency.value = 50; // Deep rumble
    
    // Add resonance to the engine to make it 'growl'
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600; // Open up the filter more so we hear it
    filter.Q.value = 2.0;
    
    this.engineGain.gain.value = 0.12; // Increased volume so it's not drowned out by BGM
    
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    
    this.engineOsc.start();
    this.isEngineRunning = true;
  }

  public setEngineSpeed(speedRatio: number) {
     if (this.engineOsc && this.isEngineRunning) {
         // Pitch goes up like a gear revving
         this.engineOsc.frequency.value = 50 + (speedRatio * 150); // Wider rev range!
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
