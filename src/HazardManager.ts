import { Environment } from './Environment';

export interface Hazard {
  type: 'pillar' | 'pothole' | 'motorcycle' | 'truck' | 'drunkcar' | 'lightning';
  lane: number;
  laneOffset: number; // For swerving
  y: number;
  width: number;
  height: number;
  active: boolean; // Pillars dropping
  warnTimer: number; // Time before drop
  warned: boolean;
  passed: boolean;
  speedParam: number; // Generic parameter for movement/swerving
  cleared?: boolean; // Avoid repeat collision
}

export class HazardManager {
  public hazards: Hazard[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 100;
  
  constructor() {}

  public update(speed: number, canvasWidth: number, canvasHeight: number, playBeep: () => void, playWarningBeep: () => void, env: Environment) {
    this.spawnTimer++;
    
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnHazard(canvasWidth, canvasHeight, env);
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(30, 90 - (speed * 2) + Math.random() * 30);
    }

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];

      if (h.type === 'pillar') {
        if (!h.active) {
            h.warnTimer--;
            if (!h.warned && h.warnTimer < 60) {
               playBeep(); 
               h.warned = true;
            }
            // Move indicator
            h.y += speed * 0.5;

            if (h.warnTimer <= 0) {
                h.active = true;
            }
        } else {
            h.y += speed;
        }
      } else if (h.type === 'lightning') {
          if (!h.active) {
              h.warnTimer--;
              h.y += speed;
              if (h.warnTimer <= 0) {
                  // STRIKE!
                  h.active = true;
                  h.warnTimer = 15; // stays active for 15 frames
              }
          } else {
              h.y += speed;
              h.warnTimer--;
              if (h.warnTimer <= 0) h.cleared = true; // remove collision
          }
      } else if (h.type === 'pothole') {
          h.y += speed;
          h.active = true;
      } else if (h.type === 'motorcycle') {
          // Overtaking: comes from bottom, moves UP screen
          h.y -= h.speedParam; 
          h.active = true;
          if (h.y > canvasHeight && !h.warned) {
              h.warned = true;
              playWarningBeep();
          }
      } else if (h.type === 'truck') {
          // Slow: comes from top, moves down Slower than static objects (speed) usually
          // Since speed is how fast player approaches static, if truck moves at 3, relative speed difference is (speed - 3).
          // Actually, if we add speed, it means it's static. If we add speed-3, it moves down screen SLOWER than static (meaning it moves forward in the world).
          const relSpeed = speed - h.speedParam;
          h.y += relSpeed;
          h.active = true;
      } else if (h.type === 'drunkcar') {
          const relSpeed = speed - 4; // Drunk car moves forward at speed 4
          h.y += relSpeed;
          h.laneOffset = Math.sin(Date.now() / 300) * 0.5; // Swerve up to 0.5 lanes left/right
          h.active = true;
      }

      // Remove off-screen
      if (h.y > canvasHeight + 100 || h.y < -300) {
        this.hazards.splice(i, 1);
      }
    }
  }

  private spawnHazard(canvasWidth: number, canvasHeight: number, env: Environment) {
    const r = Math.random();
    const laneWidth = canvasWidth / 3;

    // During rain, 15% chance to spawn lightning trap
    if (env.currentWeather === 'rain' && r < 0.15) {
        this.hazards.push({
            type: 'lightning', lane: Math.floor(Math.random() * 3), laneOffset: 0,
            y: 100, width: laneWidth, height: canvasHeight, // Hits the whole lane
            active: false, warnTimer: 60, warned: false, passed: false, speedParam: 0
        });
        return;
    }

    if (r < 0.35) {
        // Spawn Pillars (can be 1, or 2)
        const type = Math.random();
        if (type > 0.5) {
            // 2 Pillars spread
            this.createPillar(0, laneWidth);
            this.createPillar(2, laneWidth);
        } else {
            // 1 Pillar
            this.createPillar(Math.floor(Math.random() * 3), laneWidth);
        }
    } else if (r < 0.45) {
        // Pothole
        this.hazards.push({
            type: 'pothole', lane: Math.floor(Math.random() * 3), laneOffset: 0,
            y: -50, width: laneWidth * 0.6, height: 60,
            active: true, warnTimer: 0, warned: true, passed: false, speedParam: 0
        });
    } else if (r < 0.65) {
        // Motorcycle (from bottom)
        this.hazards.push({
            type: 'motorcycle', lane: Math.floor(Math.random() * 3), laneOffset: 0,
            y: canvasHeight + 400, width: 20, height: 40,
            active: true, warnTimer: 0, warned: false, passed: false, speedParam: 6 + Math.random()*4 // Overtake speed
        });
    } else if (r < 0.85) {
        // Truck (from top)
        this.hazards.push({
            type: 'truck', lane: Math.floor(Math.random() * 3), laneOffset: 0,
            y: -200, width: laneWidth * 0.7, height: 120,
            active: true, warnTimer: 0, warned: true, passed: false, speedParam: 2 + Math.random()*2 // Moves slow forward
        });
    } else {
        // Drunk Car (from top)
        this.hazards.push({
            type: 'drunkcar', lane: 1, laneOffset: 0, // Starts center usually
            y: -100, width: 40, height: 70,
            active: true, warnTimer: 0, warned: true, passed: false, speedParam: 0
        });
    }
  }

  private createPillar(lane: number, laneWidth: number) {
      this.hazards.push({
          type: 'pillar', lane: lane, laneOffset: 0,
          y: 50, width: laneWidth * 0.8, height: 100,
          active: false, warnTimer: 90, warned: false, passed: false, speedParam: 0
      });
  }

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, env: Environment) {
    const laneWidth = canvasWidth / 3;

    for (const h of this.hazards) {
        const curveOffset = env.getCurveOffset(h.y, canvasHeight);
        const xPos = ((h.lane + h.laneOffset) * laneWidth) + (laneWidth / 2) + curveOffset;

        if (h.type === 'pillar') {
            if (!h.active) {
                // Determine drop progress
                const dropProgress = 1 - (h.warnTimer / 90); // 0 to 1
                
                // Shadow
                const shadowWidth = h.width * dropProgress;
                const shadowAlpha = dropProgress * 0.7;
                ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
                ctx.beginPath();
                ctx.ellipse(xPos, h.y + h.height/2, shadowWidth/2, 20 * dropProgress, 0, 0, Math.PI*2);
                ctx.fill();

                // Falling Block (drawn higher based on progress)
                const fallHeight = 300 * (1 - dropProgress);
                ctx.fillStyle = '#555';
                ctx.fillRect(xPos - h.width / 2, h.y - h.height / 2 - fallHeight, h.width, h.height);
                ctx.fillStyle = '#777';
                ctx.fillRect(xPos - h.width / 2, h.y - h.height / 2 - fallHeight, h.width, 20);

                const blink = Math.floor(h.warnTimer / 10) % 2 === 0;
                if (blink) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(xPos, h.y - fallHeight - 20, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 20px Arial';
                    ctx.fillText('!', xPos, h.y - fallHeight - 20);
                }
            } else {
                ctx.fillStyle = '#555';
                ctx.fillRect(xPos - h.width / 2, h.y - h.height / 2, h.width, h.height);
                ctx.fillStyle = '#777';
                ctx.fillRect(xPos - h.width / 2, h.y - h.height / 2, h.width, 20);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(xPos - h.width / 2, h.y + h.height / 2, h.width, 10);
            }
        } else if (h.type === 'pothole') {
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(xPos, h.y, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(xPos - 5, h.y + 5, h.width / 3, h.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (h.type === 'motorcycle') {
            if (h.y > canvasHeight) {
                // Draw incoming indicator at the bottom edge of screen
                const blink = Math.floor(Date.now() / 150) % 2 === 0;
                if (blink) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(xPos - 30, canvasHeight - 40, 60, 30);
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 20px Arial';
                    ctx.fillText('[ !! ]', xPos, canvasHeight - 25);
                }
            } else {
                ctx.fillStyle = '#27ae60'; // Green motorcycle
                ctx.fillRect(xPos - 10, h.y - 20, 20, 40);
                ctx.fillStyle = '#000'; // Rider helmet
                ctx.beginPath();
                ctx.arc(xPos, h.y - 5, 8, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (h.type === 'truck') {
            // trailer
            ctx.fillStyle = '#bdc3c7'; // silver 
            ctx.fillRect(xPos - h.width/2, h.y - h.height/2, h.width, h.height - 25);
            // cab
            ctx.fillStyle = '#f39c12'; // orange cab
            ctx.fillRect(xPos - h.width/2 + 5, h.y + h.height/2 - 25, h.width - 10, 25);
            // wheels
            ctx.fillStyle = '#222';
            ctx.fillRect(xPos - h.width/2 - 5, h.y - h.height/2 + 10, 5, 20);
            ctx.fillRect(xPos + h.width/2, h.y - h.height/2 + 10, 5, 20);
            ctx.fillRect(xPos - h.width/2 - 5, h.y + h.height/2 - 45, 5, 20);
            ctx.fillRect(xPos + h.width/2, h.y + h.height/2 - 45, 5, 20);
        } else if (h.type === 'drunkcar') {
            ctx.fillStyle = '#8e44ad'; // purple drunk car
            ctx.fillRect(xPos - 20, h.y - 35, 40, 70);
            ctx.fillStyle = '#f1c40f'; // headlights indicating swerve
            ctx.fillRect(xPos - 18, h.y + 35, 10, 5);
            ctx.fillRect(xPos + 8, h.y + 35, 10, 5);
        } else if (h.type === 'lightning') {
            if (!h.active) {
                // Warning glow on the ground
                if (Math.floor(Date.now() / 100) % 2 === 0) {
                    ctx.fillStyle = 'rgba(241, 196, 15, 0.4)';
                    ctx.beginPath();
                    ctx.ellipse(xPos, h.y, h.width/2, 50, 0, 0, Math.PI*2);
                    ctx.fill();
                }
            } else {
                // Strike flashes the lane
                if (!h.cleared) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(xPos - h.width/2, h.y - h.height/2, h.width, h.height);
                    
                    // Main bolt
                    ctx.strokeStyle = '#f1c40f';
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(xPos, h.y - h.height/2);
                    ctx.lineTo(xPos + (Math.random()*40 - 20), h.y - h.height/4);
                    ctx.lineTo(xPos + (Math.random()*40 - 20), h.y);
                    ctx.lineTo(xPos + (Math.random()*40 - 20), h.y + h.height/4);
                    ctx.lineTo(xPos, h.y + h.height/2);
                    ctx.stroke();
                }
            }
        }
    }
  }

  public checkCollisions(playerBox: {x: number, y: number, width: number, height: number, jumpHeight: number, iframeTimer: number}, canvasWidth: number, canvasHeight: number, env: Environment) {
    const laneWidth = canvasWidth / 3;
    let res = { crash: false, bounce: false, overtakes: 0 };
    
    for (const h of this.hazards) {
        if (!h.active || h.cleared) continue;

        const curveOffset = env.getCurveOffset(h.y, canvasHeight);
        const hX = ((h.lane + h.laneOffset) * laneWidth) + (laneWidth / 2) + curveOffset;
        
        const rect1 = playerBox;
        const rect2 = { x: hX - h.width / 2, y: h.y - h.height / 2, width: h.width, height: h.height };

        const isOverlapping = rect1.x < rect2.x + rect2.width &&
                              rect1.x + rect1.width > rect2.x &&
                              rect1.y < rect2.y + rect2.height &&
                              rect1.y + rect1.height > rect2.y;

        if (isOverlapping && playerBox.iframeTimer <= 0) {
            if (h.type === 'pothole') {
                if (playerBox.jumpHeight <= 20) { res.crash = true; h.cleared = true; }
            } else if (h.type === 'pillar' || h.type === 'lightning') {
                res.crash = true;
                h.cleared = true;
            } else {
                // Hit another vehicle -> bounce/skid
                res.bounce = true;
                h.cleared = true; // Mark so we don't double bounce
            }
        } else if (!isOverlapping) {
            // Overtake detection (Near miss on Y axis, while X is close enough but not colliding)
            if (!h.passed) {
               // If player's center Y is ahead of hazard's center Y, we passed it
               if (playerBox.y < h.y) {
                   h.passed = true;
                   res.overtakes++;
               }
            }
        }
    }
    return res;
  }
}
