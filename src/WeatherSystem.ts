export type WeatherType = 'none' | 'rain' | 'snow' | 'dust';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life?: number;
}

export class WeatherSystem {
    public type: WeatherType = 'none';
    private particles: Particle[] = [];
    private width: number = 0;
    private height: number = 0;

    public update(speed: number, canvasWidth: number, canvasHeight: number) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        if (this.type === 'none') {
            this.particles = [];
            return;
        }

        // Spawn particles based on type
        if (this.type === 'rain') {
            if (this.particles.length < 200) {
                this.particles.push({
                    x: Math.random() * canvasWidth * 1.5 - canvasWidth * 0.25,
                    y: -50,
                    vx: 2 + Math.random(),
                    vy: 15 + Math.random() * 5,
                    size: 1 + Math.random() * 2
                });
            }
        } else if (this.type === 'snow') {
            if (this.particles.length < 300) {
                this.particles.push({
                    x: Math.random() * canvasWidth,
                    y: -50,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + Math.random() * 3 + speed * 0.5,
                    size: 2 + Math.random() * 3
                });
            }
        } else if (this.type === 'dust') {
            if (this.particles.length < 50) {
                this.particles.push({
                    x: Math.random() * canvasWidth,
                    y: Math.random() * canvasHeight,
                    vx: 1 + Math.random() * 2,
                    vy: (Math.random() - 0.5) * 1 + speed * 0.2,
                    size: 50 + Math.random() * 100
                });
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Optional wavy movement for snow
            if (this.type === 'snow') {
                p.x += Math.sin(Date.now() / 500 + p.y) * 1;
            }

            if (p.x > canvasWidth * 1.5 || p.x < -canvasWidth * 0.5 || p.y > canvasHeight + 100) {
                // Respawn
                if (this.type === 'dust') {
                    p.x = -100;
                    p.y = Math.random() * canvasHeight;
                } else {
                    p.y = -50;
                    p.x = Math.random() * canvasWidth * 1.5 - canvasWidth * 0.25;
                }
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.type === 'none') return;

        ctx.save();
        if (this.type === 'rain') {
            ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const p of this.particles) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            }
            ctx.stroke();
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (const p of this.particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'dust') {
            // Sepia/dust haze overlay
            ctx.fillStyle = 'rgba(211, 163, 118, 0.15)';
            ctx.fillRect(0, 0, this.width, this.height);
            
            // Draw dust clouds
            for (const p of this.particles) {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, 'rgba(211, 163, 118, 0.2)');
                gradient.addColorStop(1, 'rgba(211, 163, 118, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
