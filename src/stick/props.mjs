// Small code-drawn props placed with `**Props:**` (feet/bottom-center at x, y).

export const PROPS = ['barricade', 'crate', 'door', 'car', 'jeepney', 'fire', 'supplies', 'cot', 'table', 'trash'];

const DRAW = {
  barricade(ctx, t) {
    ctx.fillStyle = '#7a5a3a';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(0, -40 - i * 55);
      ctx.rotate((i % 2 ? 1 : -1) * 0.06);
      ctx.fillRect(-170, -20, 340, 40);
      ctx.restore();
    }
    ctx.fillRect(-150, -200, 22, 200);
    ctx.fillRect(128, -200, 22, 200);
  },
  crate(ctx) {
    ctx.fillStyle = '#a0763f';
    ctx.fillRect(-70, -140, 140, 140);
    ctx.strokeStyle = '#6b4a2e';
    ctx.lineWidth = 8;
    ctx.strokeRect(-70, -140, 140, 140);
    ctx.beginPath();
    ctx.moveTo(-70, -140);
    ctx.lineTo(70, 0);
    ctx.stroke();
  },
  door(ctx) {
    ctx.fillStyle = '#5a3d26';
    ctx.fillRect(-110, -520, 220, 520);
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(80, -260, 12, 0, Math.PI * 2);
    ctx.fill();
  },
  car(ctx) {
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.roundRect(-260, -170, 520, 120, 30);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-150, -260, 280, 110, 30);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,200,220,0.7)';
    ctx.fillRect(-125, -240, 110, 70);
    ctx.fillRect(5, -240, 105, 70);
    wheels(ctx, [-160, 160], 50);
  },
  jeepney(ctx) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.roundRect(-380, -330, 760, 270, 24);
    ctx.fill();
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(-390, -360, 780, 40);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-380, -160, 760, 26);
    ctx.fillStyle = 'rgba(30,30,40,0.85)';
    for (let x = -340; x < 300; x += 110) ctx.fillRect(x, -300, 80, 110);
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.moveTo(380, -330);
    ctx.lineTo(470, -230);
    ctx.lineTo(470, -60);
    ctx.lineTo(380, -60);
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-60, -360);
    ctx.lineTo(0, -430);
    ctx.lineTo(60, -360);
    ctx.fill();
    wheels(ctx, [-250, 300], 60);
  },
  fire(ctx, t) {
    ctx.fillStyle = '#3b2a1c';
    ctx.fillRect(-80, -24, 160, 24);
    for (let i = 0; i < 3; i++) {
      const f = 1 + 0.15 * Math.sin(t * (9 + i * 3) + i);
      ctx.fillStyle = ['#e74c3c', '#f39c12', '#f9e79f'][i];
      ctx.beginPath();
      ctx.moveTo(-70 + i * 25, -20);
      ctx.quadraticCurveTo(-60 + i * 20, -150 * f * (1 - i * 0.25), 0, -200 * f * (1 - i * 0.25));
      ctx.quadraticCurveTo(60 - i * 20, -150 * f * (1 - i * 0.25), 70 - i * 25, -20);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(0, -80, 10, 0, -80, 420);
    g.addColorStop(0, 'rgba(255,160,60,0.35)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-420, -500, 840, 520);
  },
  supplies(ctx) {
    ctx.fillStyle = '#c8a26b';
    ctx.fillRect(-90, -80, 100, 80);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(20, -110, 50, 110);
    ctx.fillStyle = '#bdc3c7';
    for (let i = 0; i < 3; i++) ctx.fillRect(-80 + i * 30, -120, 24, 40);
  },
  cot(ctx) {
    ctx.fillStyle = '#4f6b3a';
    ctx.fillRect(-170, -70, 340, 30);
    ctx.fillStyle = '#333';
    ctx.fillRect(-160, -40, 10, 40);
    ctx.fillRect(150, -40, 10, 40);
  },
  table(ctx) {
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(-180, -170, 360, 24);
    ctx.fillRect(-160, -146, 18, 146);
    ctx.fillRect(142, -146, 18, 146);
  },
  trash(ctx) {
    ctx.fillStyle = '#2d5a3d';
    ctx.fillRect(-55, -150, 110, 150);
    ctx.fillStyle = '#244a32';
    ctx.fillRect(-62, -160, 124, 18);
  },
};

function wheels(ctx, xs, r) {
  for (const x of xs) {
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.arc(x, -r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.arc(x, -r, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawProp(ctx, prop, t) {
  const fn = DRAW[prop.type];
  if (!fn) return;
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.scale((prop.facing || 1) * (prop.scale || 1), prop.scale || 1);
  fn(ctx, t);
  ctx.restore();
}
