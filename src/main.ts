import './style.css'
import { Game } from './Game'

window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error("Canvas element not found!");
  
  // Game instance initializes itself and hooks onto DOM
  new Game(canvas);
});
