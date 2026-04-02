export class Player {
  public lane: number = 1; // 0 = Left, 1 = Center, 2 = Right
  public targetX: number = 0;
  public x: number = 0;
  public y: number = 0;
  public width: number = 40;
  public height: number = 70;
  public isJumping: boolean = false;
  public jumpHeight: number = 0;
  public isExploding: boolean = false;
  public explodeTimer: number = 0;
  public skidOffset: number = 0;
  public iframeTimer: number = 0;
  
  private jumpVelocity: number = 0;
  private gravity: number = 0.8;
  private slideSpeed: number = 0.2; // Lerp factor for smooth slide

  // Movement bounds
  public targetY: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.reset(canvasWidth, canvasHeight);
  }

  public reset(canvasWidth: number, canvasHeight: number) {
    this.lane = 1;
    this.targetX = this.getLaneX(this.lane, canvasWidth);
    this.x = this.targetX;
    
    // Start near bottom
    this.targetY = canvasHeight - 120;
    this.y = this.targetY;
    
    this.isJumping = false;
    this.jumpHeight = 0;
    this.isExploding = false;
    this.explodeTimer = 0;
    this.skidOffset = 0;
    this.iframeTimer = 0;
  }

  public getLaneX(laneIndex: number, canvasWidth: number): number {
    const laneWidth = canvasWidth / 3;
    return (laneIndex * laneWidth) + (laneWidth / 2);
  }

  public moveLeft() {
    if (this.lane > 0 && !this.isExploding) this.lane--;
  }

  public moveRight() {
    if (this.lane < 2 && !this.isExploding) this.lane++;
  }

  public moveUp() {
    this.targetY = Math.max(this.height, this.targetY - 50);
  }

  public moveDown(canvasHeight: number) {
    this.targetY = Math.min(canvasHeight - this.height, this.targetY + 50);
  }

  public jump(onJump: () => void) {
    if (!this.isJumping && !this.isExploding) {
      this.isJumping = true;
      this.jumpVelocity = 12; // Initial jump strength
      onJump();
    }
  }

  public bounceSkid() {
      if (this.lane === 1) this.lane = Math.random() > 0.5 ? 0 : 2;
      else if (this.lane === 0) this.lane = 1;
      else this.lane = 1;
      
      this.skidOffset = 20 * (Math.random() > 0.5 ? 1 : -1);
      this.iframeTimer = 60; // 1 second of invincibility
  }

  public explode() {
      this.isExploding = true;
      this.explodeTimer = 180; // 3 seconds at 60fps
      this.iframeTimer = 240; // 4 seconds of invincibility (1s after explosion ends)
  }

  public update(canvasWidth: number) {
    if (this.isExploding) {
        this.explodeTimer--;
        if (this.explodeTimer <= 0) {
            this.isExploding = false; // recover
        }
    }

    if (this.iframeTimer > 0) this.iframeTimer--;

    if (this.skidOffset > 0) this.skidOffset -= 1;
    if (this.skidOffset < 0) this.skidOffset += 1;

    // Smooth horizontal lane transition
    this.targetX = this.getLaneX(this.lane, canvasWidth);
    this.x += (this.targetX - this.x) * this.slideSpeed;
    this.x += this.skidOffset;
    
    // Smooth vertical position adjustment
    this.y += (this.targetY - this.y) * this.slideSpeed;

    // Handle jumping
    if (this.isJumping) {
      this.jumpHeight += this.jumpVelocity;
      this.jumpVelocity -= this.gravity;

      if (this.jumpHeight <= 0) {
        this.jumpHeight = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Shadow gets smaller/lighter when jumping
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const shadowScale = Math.max(0.5, 1 - (this.jumpHeight / 200));
    const shadowOffset = this.jumpHeight * 0.5;
    ctx.fillRect(
      this.x - (this.width / 2) * shadowScale + shadowOffset,
      this.y - (this.height / 2) * shadowScale + shadowOffset,
      this.width * shadowScale,
      this.height * shadowScale
    );

    if (this.isExploding) {
        // Draw Explosion effect
        const t = Date.now() / 50;
        const radius = this.width + Math.sin(t) * 10;
        ctx.fillStyle = Math.sin(t*2) > 0 ? '#e74c3c' : '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return; // Don't draw car
    }

    // Flicker if invincible (iframe)
    if (this.iframeTimer > 0 && !this.isExploding) {
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.restore();
            return;
        }
    }

    // Draw Car
    // Scale car slightly to simulate perspective when jumping
    const carScale = 1 + (this.jumpHeight / 150);
    const renderWidth = this.width * carScale;
    const renderHeight = this.height * carScale;

    // Body
    ctx.fillStyle = '#e74c3c'; // Red car
    ctx.fillRect(
      this.x - renderWidth / 2, 
      this.y - renderHeight / 2 - this.jumpHeight, 
      renderWidth, 
      renderHeight
    );

    // Windshield
    ctx.fillStyle = '#3498db'; // blueish glass
    ctx.fillRect(
      this.x - renderWidth * 0.4, 
      this.y - renderHeight * 0.2 - this.jumpHeight, 
      renderWidth * 0.8, 
      renderHeight * 0.25
    );
    
    // Roof/Lights detail
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(
      this.x - renderWidth * 0.3,
      this.y + renderHeight * 0.1 - this.jumpHeight,
      renderWidth * 0.6,
      renderHeight * 0.3
    );

    // Headlights
    ctx.fillStyle = '#f1c40f'; // Yellow lights
    ctx.fillRect(this.x - renderWidth * 0.4, this.y - renderHeight / 2 - this.jumpHeight, renderWidth * 0.2, renderHeight * 0.1);
    ctx.fillRect(this.x + renderWidth * 0.2, this.y - renderHeight / 2 - this.jumpHeight, renderWidth * 0.2, renderHeight * 0.1);

    ctx.restore();
  }

  // Define collision box. Ignore collision if jump height is sufficient
  public getCollisionBox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
      jumpHeight: this.jumpHeight,
      iframeTimer: this.iframeTimer
    };
  }
}
