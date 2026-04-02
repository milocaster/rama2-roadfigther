export class Environment {
  private yOffset: number = 0;
  private roadColor: string = '#4c525b'; // asphalt
  private markerColor: string = '#ffffff';
  private pillarColor: string = '#8a8e94'; // concrete
  
  // Pillars passing logic
  private rightPillarY: number = 0;

  constructor() {}

  public update(speed: number) {
    this.yOffset += speed;
    if (this.yOffset > 100) {
      this.yOffset -= 100;
    }

    this.rightPillarY += speed;
    if (this.rightPillarY > 300) {
      this.rightPillarY -= 300;
    }
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
    // Offset for moving effect
    ctx.lineDashOffset = -this.yOffset;
    
    ctx.beginPath();
    // Left divider
    ctx.moveTo(laneWidth, 0);
    ctx.lineTo(laneWidth, canvasHeight);
    // Right divider
    ctx.moveTo(laneWidth * 2, 0);
    ctx.lineTo(laneWidth * 2, canvasHeight);
    
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
    
    // Draw columns on the right edge
    ctx.fillRect(pillarX, this.rightPillarY - 300, pillarWidth, pillarHeight);
    ctx.fillRect(pillarX, this.rightPillarY, pillarWidth, pillarHeight);
    ctx.fillRect(pillarX, this.rightPillarY + 300, pillarWidth, pillarHeight);
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
  }
}
