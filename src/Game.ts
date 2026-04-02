import { Player } from './Player';
import { Environment } from './Environment';
import { HazardManager } from './HazardManager';
import { ItemManager } from './ItemManager';
import { SoundManager } from './SoundManager';
import { WeatherSystem } from './WeatherSystem';

export class Game {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  
  public player: Player;
  public env: Environment;
  public hazards: HazardManager;
  public items: ItemManager;
  public sounds: SoundManager;
  public weather: WeatherSystem;

  public isPlaying: boolean = false;
  public gameState: 'menu' | 'intro' | 'playing' | 'gameover' = 'menu';
  public introTimer: number = 0;
  public lastPhaseScore: number = 0;
  public score: number = 0;
  public fuel: number = 100; // max 100
  public speed: number = 0;
  public maxSpeed: number = 15;
  public acceleration: number = 0.05;

  private fuelDepletionRate: number = 0.05;
  private animationId: number = 0;

  // DOM Elements
  private scoreEl: HTMLElement;
  private fuelFillEl: HTMLElement;
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScoreEl: HTMLElement;

  private keys: { [key: string]: boolean } = {};
  private baseGamma: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Resize canvas
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Init modules
    this.player = new Player(this.canvas.width, this.canvas.height);
    this.env = new Environment();
    this.hazards = new HazardManager();
    this.items = new ItemManager();
    this.sounds = new SoundManager();
    this.weather = new WeatherSystem();

    // DOM bindings
    this.scoreEl = document.getElementById('score-display')!;
    this.fuelFillEl = document.getElementById('fuel-fill')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.finalScoreEl = document.getElementById('final-score')!;

    // Event Listeners
    document.getElementById('start-btn')!.addEventListener('click', () => this.requestGyroPermissionAndStart());
    document.getElementById('restart-btn')!.addEventListener('click', () => this.start());
    
    document.getElementById('sound-toggle')!.addEventListener('click', (e) => {
        const btn = e.target as HTMLElement;
        const isMuted = this.sounds.toggleMute();
        if (isMuted) {
            btn.classList.add('muted');
            btn.innerText = '🔇';
        } else {
            btn.classList.remove('muted');
            btn.innerText = '🔊';
        }
    });

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });

    // First draw
    this.draw();
  }

  private requestGyroPermissionAndStart() {
      if (typeof (DeviceOrientationEvent as any) !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
              if (permissionState === 'granted') {
                  window.addEventListener('deviceorientation', (e) => this.handleDeviceOrientation(e));
              }
              this.start();
          })
          .catch((e: Error) => {
              console.error(e);
              this.start();
          });
      } else {
          window.addEventListener('deviceorientation', (e) => this.handleDeviceOrientation(e));
          this.start();
      }
  }

  private handleTouch(e: TouchEvent) {
    if (!this.isPlaying) return;
    
    const target = e.target as HTMLElement;
    if (target && target.closest('button')) return; // Ignore if tapping a button
    
    e.preventDefault(); // Prevent scrolling

    // Tap to jump
    if (!this.player.isJumping) {
      this.player.jump(() => this.sounds.playJumpSound());
    }
  }

  private handleDeviceOrientation(e: DeviceOrientationEvent) {
    if (!this.isPlaying || this.player.isExploding || e.gamma === null) return;
    
    if (this.baseGamma === null) {
      this.baseGamma = e.gamma;
    }
    
    // gamma ranges typically -90 to +90 degrees.
    let tilt = e.gamma - this.baseGamma;
    
    // Handle wrap-around just in case
    if (tilt > 180) tilt -= 360;
    if (tilt < -180) tilt += 360;
    
    if (tilt < -15) {
       this.player.lane = 0;
    } else if (tilt > 15) {
       this.player.lane = 2;
    } else if (Math.abs(tilt) < 5) {
       this.player.lane = 1;
    }
  }

  private resize() {
    // Keep max width constraint
    const container = document.getElementById('game-container')!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = true;
    
    if (this.isPlaying) {
      if (e.key === ' ' && !this.player.isJumping) {
        this.player.jump(() => this.sounds.playJumpSound());
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = false;
  }

  private processInput() {
    if (!this.isPlaying || this.player.isExploding) return;

    if (this.keys['a']) {
        this.player.moveLeft();
        this.keys['a'] = false; // Require release to move again (or debounce)
    }
    if (this.keys['d']) {
        this.player.moveRight();
        this.keys['d'] = false;
    }
    if (this.keys['w']) {
        this.player.moveUp();
    }
    if (this.keys['s']) {
        this.player.moveDown(this.canvas.height);
    }
  }

  public start() {
    this.sounds.init();
    this.sounds.resume();
    
    this.isPlaying = true;
    this.gameState = 'intro';
    this.introTimer = 180; // 3 seconds
    this.score = 0;
    this.fuel = 100;
    this.speed = 0; // Don't move yet
    this.lastPhaseScore = 0;
    this.baseGamma = null; // Recalibrate gyro
    
    this.player.reset(this.canvas.width, this.canvas.height);
    this.player.y = this.canvas.height + 150; // Start offscreen
    this.hazards.hazards = [];
    this.items.items = [];

    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');

    this.sounds.startEngineSound();
    this.sounds.playBGM();
    
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.loop();
  }

  public gameOver() {
    this.isPlaying = false;
    this.gameState = 'gameover';
    this.sounds.stopEngineSound();
    this.sounds.stopBGM();
    this.sounds.playCrashSound();
    
    this.gameOverScreen.classList.remove('hidden');
    this.finalScoreEl.innerText = `Final Score: ${Math.floor(this.score)}`;
    cancelAnimationFrame(this.animationId);
  }

  private update() {
    if (!this.isPlaying) return;

    if (this.gameState === 'intro') {
        this.introTimer--;
        
        // Intro animation: car drives from bottom
        const targetY = this.canvas.height - 150;
        this.player.y += (targetY - this.player.y) * 0.05;
        
        // Road scrolls to simulate movement
        this.env.update(4, this.score);
        this.player.update(this.canvas.width, 0, 1.0);
        
        if (this.introTimer === 120 || this.introTimer === 60) {
            this.sounds.playIndicatorBeep();
        }
        
        if (this.introTimer === 0) {
            this.gameState = 'playing';
            this.speed = 5; // Blast off!
            this.sounds.playOvertakeSound(); // Engine roar equivalent
        }
        return;
    }

    this.processInput();

    // Speed up logic slowly over time if not exploding
    if (!this.player.isExploding) {
      if (this.speed < this.maxSpeed) {
        this.speed += this.acceleration;
      }
      this.sounds.setEngineSpeed(this.speed / this.maxSpeed);
    } else {
      // Exploding: halt road movement visually
      this.speed *= 0.8; // smoothly decelerate to 0
      this.sounds.setEngineSpeed(0.1);
    }

    // Fuel depletion
    this.fuel -= this.fuelDepletionRate * (this.player.isExploding ? 2.0 : 1.0); // Drain faster when exploding
    if (this.fuel <= 0) {
      this.gameOver();
      return;
    }

    // Score based on distance
    this.score += this.speed * 0.01;

    // Update modules
    this.env.update(this.speed, this.score);
    
    // Check 500 progression for bonus
    const currentPhaseIndex = Math.floor(this.score / 500);
    if (currentPhaseIndex > this.lastPhaseScore) {
        this.lastPhaseScore = currentPhaseIndex;
        this.fuel = Math.min(100, this.fuel + 20); // Bonus Fuel!
        this.sounds.playCoinSound();
        this.player.iframeTimer = 60; // Brief invincibility pop as reward
    }
    
    this.weather.type = this.env.currentWeather;
    
    // Apply centrifugal force to player based on curve
    const curveForce = this.env.targetCurveOffset * 0.005;
    
    // Increase slide if it's snow (slippery)
    const slipperyMult = this.env.currentWeather === 'snow' ? 2.5 : 1.0;
    this.player.update(this.canvas.width, curveForce, slipperyMult);
    
    this.weather.update(this.speed, this.canvas.width, this.canvas.height);
    this.hazards.update(this.speed, this.canvas.width, this.canvas.height, () => this.sounds.playIndicatorBeep(), () => this.sounds.playWarningBeep(), this.env);
    this.items.update(this.speed, this.canvas.height);

    // Collisions
    const pBox = this.player.getCollisionBox();
    
    if (!this.player.isExploding) {
        const collisions = this.hazards.checkCollisions(pBox, this.canvas.width, this.canvas.height, this.env);
        
        if (collisions.crash) {
            this.player.explode();
            this.sounds.playCrashSound();
        } else if (collisions.bounce) {
            this.player.bounceSkid();
            this.sounds.playCrashSound();
            this.speed = Math.max(2, this.speed * 0.5); // Slow down on bounce
        }

        if (collisions.overtakes > 0) {
            this.sounds.playOvertakeSound();
            this.score += collisions.overtakes * 10;
        }
    }

    const collections = this.items.checkCollection(pBox, this.canvas.width, this.canvas.height, this.env);
    if (collections.coins > 0) {
       this.score += collections.coins * 50;
       this.sounds.playCoinSound();
    }
    if (collections.fuel > 0) {
       this.fuel = Math.min(100, this.fuel + collections.fuel);
       this.sounds.playFuelSound();
    }

    this.updateHUD();
  }

  private updateHUD() {
    this.scoreEl.innerText = `Score: ${Math.floor(this.score)}`;
    this.fuelFillEl.style.width = `${this.fuel}%`;
    if (this.fuel < 20) {
        this.fuelFillEl.style.backgroundColor = 'red';
    } else {
        this.fuelFillEl.style.backgroundColor = '#2ecc71';
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.env.draw(this.ctx, this.canvas.width, this.canvas.height);
    this.items.draw(this.ctx, this.canvas.width, this.canvas.height, this.env);
    this.hazards.draw(this.ctx, this.canvas.width, this.canvas.height, this.env);
    
    // Player headlights if night
    if (this.env.isNight) {
        this.ctx.save();
        const pBox = this.player.getCollisionBox();
        const pCurve = this.env.getCurveOffset(pBox.y, this.canvas.height);
        const grad = this.ctx.createLinearGradient(pBox.x + pBox.width/2 + pCurve, pBox.y, pBox.x + pBox.width/2 + pCurve, pBox.y - 200);
        grad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(pBox.x + pBox.width/2 - 15 + pCurve, pBox.y);
        this.ctx.lineTo(pBox.x + pBox.width/2 - 60 + pCurve, pBox.y - 200);
        this.ctx.lineTo(pBox.x + pBox.width/2 + 60 + pCurve, pBox.y - 200);
        this.ctx.lineTo(pBox.x + pBox.width/2 + 15 + pCurve, pBox.y);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    this.player.draw(this.ctx, this.env, this.canvas.height);

    // Weather & Atmosphere Overlay
    this.weather.draw(this.ctx);
    
    if (this.env.sunColor !== 'rgba(255, 255, 255, 0)') {
        this.ctx.fillStyle = this.env.sunColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Intro Text overlay
    if (this.gameState === 'intro') {
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let msg = 'READY';
        if (this.introTimer < 120) msg = 'SET';
        if (this.introTimer < 60) msg = 'GO!!';
        
        const scale = 1 + (this.introTimer % 60) / 60; // Pulse effect
        this.ctx.font = `bold ${40 * scale}px Arial`;
        this.ctx.shadowColor = '#e74c3c';
        this.ctx.shadowBlur = 10;
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2 - 100);
        this.ctx.fillText(msg, 0, 0);
        this.ctx.restore();
    }
  }

  private loop = () => {
    this.update();
    this.draw();
    if (this.isPlaying) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }
}
