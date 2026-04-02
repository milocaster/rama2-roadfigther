import { Player } from './Player';
import { Environment } from './Environment';
import { HazardManager } from './HazardManager';
import { ItemManager } from './ItemManager';
import { SoundManager } from './SoundManager';

export class Game {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  
  public player: Player;
  public env: Environment;
  public hazards: HazardManager;
  public items: ItemManager;
  public sounds: SoundManager;

  public isPlaying: boolean = false;
  
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

    // DOM bindings
    this.scoreEl = document.getElementById('score-display')!;
    this.fuelFillEl = document.getElementById('fuel-fill')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.finalScoreEl = document.getElementById('final-score')!;

    // Event Listeners
    document.getElementById('start-btn')!.addEventListener('click', () => this.start());
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

    // First draw
    this.draw();
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
    this.score = 0;
    this.fuel = 100;
    this.speed = 5; // Initial speed
    
    this.player.reset(this.canvas.width, this.canvas.height);
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
    this.sounds.stopEngineSound();
    this.sounds.stopBGM();
    this.sounds.playCrashSound();
    
    this.gameOverScreen.classList.remove('hidden');
    this.finalScoreEl.innerText = `Final Score: ${Math.floor(this.score)}`;
    cancelAnimationFrame(this.animationId);
  }

  private update() {
    if (!this.isPlaying) return;

    this.processInput();

    // Speed up logic slowly over time if not exploding
    if (!this.player.isExploding) {
      if (this.speed < this.maxSpeed) {
        this.speed += this.acceleration * 0.01;
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
    this.player.update(this.canvas.width);
    this.env.update(this.speed);
    this.hazards.update(this.speed, this.canvas.width, this.canvas.height, () => this.sounds.playIndicatorBeep());
    this.items.update(this.speed, this.canvas.height);

    // Collisions
    const pBox = this.player.getCollisionBox();
    
    if (!this.player.isExploding) {
        const collisions = this.hazards.checkCollisions(pBox, this.canvas.width);
        
        if (collisions.crash) {
            this.player.explode();
            this.sounds.playCrashSound();
            if (this.fuel > 10) this.fuel -= 10; // Extra penalty
        } else if (collisions.bounce) {
            this.player.bounceSkid();
            this.sounds.playCrashSound();
            if (this.fuel > 5) this.fuel -= 5;
            this.speed = Math.max(2, this.speed * 0.5); // Slow down on bounce
        }

        if (collisions.overtakes > 0) {
            this.sounds.playOvertakeSound();
            this.score += collisions.overtakes * 10;
        }
    }

    const collections = this.items.checkCollection(pBox, this.canvas.width);
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
    this.items.draw(this.ctx, this.canvas.width);
    this.hazards.draw(this.ctx, this.canvas.width);
    this.player.draw(this.ctx);
  }

  private loop = () => {
    this.update();
    this.draw();
    if (this.isPlaying) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }
}
