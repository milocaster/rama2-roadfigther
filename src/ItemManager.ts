export interface Item {
  type: 'coin' | 'fuel';
  lane: number;
  y: number;
  radius: number;
  collected: boolean;
}

export class ItemManager {
  public items: Item[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 150; // frames
  
  constructor() {}

  public update(speed: number, canvasHeight: number) {
    this.spawnTimer++;
    
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
      this.spawnInterval = 80 + Math.random() * 100;
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += speed;

      if (item.y > canvasHeight + 50 || item.collected) {
        this.items.splice(i, 1);
      }
    }
  }

  private spawnItem() {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random() > 0.3 ? 'coin' : 'fuel'; // 70% coin, 30% fuel

    this.items.push({
      type,
      lane,
      y: -50,
      radius: type === 'coin' ? 15 : 20,
      collected: false
    });
  }

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number) {
    const laneWidth = canvasWidth / 3;

    for (const item of this.items) {
      const xPos = (item.lane * laneWidth) + (laneWidth / 2);

      ctx.save();
      if (item.type === 'coin') {
        // Gold Coin
        ctx.fillStyle = '#f1c40f'; // Gold
        ctx.beginPath();
        ctx.arc(xPos, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#d4ac0d';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('$', xPos, item.y);
      } else {
        // Fuel Canister (Gas can)
        ctx.fillStyle = '#e74c3c'; // Red
        ctx.fillRect(xPos - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2.5);
        ctx.fillStyle = '#c0392b'; // Dark red for shadow
        ctx.fillRect(xPos - item.radius, item.y + item.radius, item.radius * 2, item.radius * 0.5);
        
        ctx.fillStyle = '#f1c40f'; // Yellow stripe
        ctx.fillRect(xPos - item.radius, item.y, item.radius * 2, 5);
        
        // Handle / Nozzle
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(xPos - item.radius + 5, item.y - item.radius - 8, item.radius - 5, 8);
        ctx.fillStyle = '#333';
        ctx.fillRect(xPos + item.radius - 10, item.y - item.radius - 5, 12, 5);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('OIL', xPos, item.y - 5);
      }
      ctx.restore();
    }
  }

  public checkCollection(playerBox: {x: number, y: number, width: number, height: number, jumpHeight: number}, canvasWidth: number): { coins: number, fuel: number } {
    const laneWidth = canvasWidth / 3;
    let collectedCoins = 0;
    let collectedFuel = 0;

    for (const item of this.items) {
        if (item.collected) continue;

        // Roughly check collision with bounding box. Ignore Z-height because you can grab items while jumping?
        // Actually, maybe you miss items if you jump too high over them. Let's say you can always grab them for better game feel.
        const iX = (item.lane * laneWidth) + (laneWidth / 2);
        
        // Simple AABB
        if (playerBox.x < iX + item.radius &&
            playerBox.x + playerBox.width > iX - item.radius &&
            playerBox.y < item.y + item.radius &&
            playerBox.y + playerBox.height > item.y - item.radius) {
            
            item.collected = true;
            if (item.type === 'coin') collectedCoins++;
            if (item.type === 'fuel') collectedFuel += 20; // +20 fuel units
        }
    }

    return { coins: collectedCoins, fuel: collectedFuel };
  }
}
