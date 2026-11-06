import type { View } from '../engine/view';

/** Paused card drawn on the canvas. Words are placeholders until designer's screen note. */
export function drawPauseCard(g: CanvasRenderingContext2D, view: View): void {
  const { width: W, height: H } = view;
  g.fillStyle = 'rgba(10, 20, 12, 0.72)';
  g.fillRect(0, 0, W, H);

  const cw = 260;
  const ch = 110;
  const x = (W - cw) / 2;
  const y = (H - ch) / 2;
  g.fillStyle = '#fffaf0';
  g.beginPath();
  g.roundRect(x, y, cw, ch, 16);
  g.fill();

  g.textAlign = 'center';
  g.fillStyle = '#0e7a3e';
  g.font = 'bold 28px "Trebuchet MS", Verdana, sans-serif';
  g.fillText('Paused', W / 2, y + 46);
  g.fillStyle = '#1d1a14';
  g.font = '16px "Trebuchet MS", Verdana, sans-serif';
  g.fillText('Tap to keep running', W / 2, y + 82);
}
