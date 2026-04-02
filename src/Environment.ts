import type { WeatherType } from './WeatherSystem';

export class Environment {
  private yOffset: number = 0;
  
  // Scene / Color management
  public sunColor: string = 'rgba(255, 255, 255, 0)'; // transparency
  public roadColor: string = '#4c525b';
  public markerColor: string = '#ffffff';
  public pillarColor: string = '#8a8e94';
  
  public isNight: boolean = false;
  public currentWeather: WeatherType = 'none';
  public curveOffsetTop: number = 0; // The X offset at the top of the canvas
  public targetCurveOffset: number = 0;
  
  // Day / Night Colors
  private dayRoad: number[] = [76, 82, 91]; // #4c525b
  private nightRoad: number[] = [20, 22, 28]; // Darker road
  
  private rightPillarY: number = 0;

  constructor() {}

  public update(speed: number, score: number) {
    this.yOffset += speed;
    if (this.yOffset > 100) this.yOffset -= 100;

    this.rightPillarY += speed;
    if (this.rightPillarY > 300) this.rightPillarY -= 300;

    // Scene definitions based on repeating phases
    // Phase length = 300 score
    const totalPhase = 1200;
    const currentPhase = score % totalPhase;

    if (currentPhase < 300) {
        // Scene 1: Day Sunny
        this.isNight = false;
        this.currentWeather = 'none';
        this.sunColor = 'rgba(255, 255, 255, 0)';
    } else if (currentPhase < 600) {
        // Scene 2: Afternoon Rain + Lightning
        this.isNight = false;
        this.currentWeather = 'rain';
        this.sunColor = 'rgba(100, 100, 120, 0.4)'; // Gloomy
    } else if (currentPhase < 900) {
        // Scene 3: Night
        this.isNight = true;
        this.currentWeather = 'none';
        this.sunColor = 'rgba(0, 0, 0, 0.7)'; // Dark
    } else {
        // Scene 4: Night Snow or Day Dust
        this.isNight = currentPhase < 1050; // Half night snow, half day dust
        this.currentWeather = this.isNight ? 'snow' : 'dust';
        this.sunColor = this.isNight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(211, 163, 118, 0.2)';
    }

    // Curve Generation (randomly bend left or right occasionally)
    // Every 100 score, chance to change curve
    if (Math.floor(score * 10) % 1000 === 0) {
        const r = Math.random();
        if (r < 0.3) this.targetCurveOffset = -200; // Left
        else if (r < 0.6) this.targetCurveOffset = 200; // Right
        else this.targetCurveOffset = 0; // Straight
    }

    // Lerp curve
    this.curveOffsetTop += (this.targetCurveOffset - this.curveOffsetTop) * 0.01;

    // Lerp colors based on night mode
    const targetRoad = this.isNight ? this.nightRoad : this.dayRoad;
    this.roadColor = `rgb(${targetRoad[0]}, ${targetRoad[1]}, ${targetRoad[2]})`;
  }

  // Calculate curve X offset at a specific Y
  public getCurveOffset(y: number, canvasHeight: number): number {
      const normalizedY = (canvasHeight - y) / canvasHeight;
      return normalizedY * normalizedY * this.curveOffsetTop; // Quadratic curve
  }

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    // Draw Road Background
    ctx.fillStyle = this.roadColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Lane Markings
    ctx.strokeStyle = this.markerColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 40]);

    const laneWidth = canvasWidth / 3;
    
    ctx.save();
    
    // Custom dash loop since we are drawing curves and lineDashOffset might interact weirdly
    // Actually, lineDashOffset works with quadraticCurveTo just fine!
    ctx.lineDashOffset = -this.yOffset;
    
    ctx.beginPath();
    // Left divider
    ctx.moveTo(laneWidth, canvasHeight);
    ctx.quadraticCurveTo(laneWidth + this.curveOffsetTop / 2, canvasHeight / 2, laneWidth + this.curveOffsetTop, 0);
    // Right divider
    ctx.moveTo(laneWidth * 2, canvasHeight);
    ctx.quadraticCurveTo(laneWidth * 2 + this.curveOffsetTop / 2, canvasHeight / 2, laneWidth * 2 + this.curveOffsetTop, 0);
    
    ctx.stroke();
    // Road edge lines
    ctx.strokeStyle = '#e67e22'; // Orange edge lines
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    ctx.quadraticCurveTo(this.curveOffsetTop / 2, canvasHeight / 2, this.curveOffsetTop, 0);
    ctx.moveTo(canvasWidth, canvasHeight);
    ctx.quadraticCurveTo(canvasWidth + this.curveOffsetTop / 2, canvasHeight / 2, canvasWidth + this.curveOffsetTop, 0);
    ctx.stroke();
    ctx.restore();

    // Draw expressway shadows (bridge shadow on the road to make it feel like "under the expressway")
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    // Create a repeating shadow pattern
    ctx.fillRect(0, (this.yOffset % 200) - 200, canvasWidth, 50);
    ctx.fillRect(0, (this.yOffset % 200), canvasWidth, 50);
    ctx.fillRect(0, (this.yOffset % 200) + 200, canvasWidth, 50);
    ctx.fillRect(0, (this.yOffset % 200) + 400, canvasWidth, 50);

    // Draw Rama 2 side pillars (Right side only)
    ctx.fillStyle = this.pillarColor;
    // We just draw big rectangles indicating pillars passing by
    // Draw a pillar
    const pillarWidth = 40;
    const pillarHeight = 80;
    const pillarX = canvasWidth - pillarWidth;
    
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = -5;
    
    // Draw columns on the right edge (curved)
    for (const offset of [-300, 0, 300]) {
        const pillarBaseY = this.rightPillarY + offset;
        const curCurve = this.getCurveOffset(pillarBaseY, canvasHeight);
        const drawX = pillarX + curCurve;
        
        ctx.fillRect(drawX, pillarBaseY, pillarWidth, pillarHeight);
        
        // If night, draw street lamps on pillars!
        if (this.isNight) {
            ctx.fillStyle = '#f1c40f'; // Lamp light
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(drawX - 10, pillarBaseY + 10, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = this.pillarColor; // Reset
            ctx.shadowBlur = 0;
        }
    }
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
  }
}
