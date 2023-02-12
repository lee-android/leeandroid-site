window.onload = function () {
  var c = document.getElementById('c');
  var ctx = c.getContext('2d');
  W = c.width = innerWidth;
  H = c.height = innerHeight;
  msg = ["BE MY VALENTINE", "SAY YES..."];
  s = 10;
  var Y = Array(Math.ceil(W / s)).fill(H + s);
  var V = Array(Math.ceil(W / s)).fill(-1);
  var X = Array(Math.ceil(W / s)).fill(0)

  let draw = function () {
    ctx.fillStyle = 'rgba(0,0,0,.03)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = s.toString() + 'pt  Courier, monospace';

    for (var i = 0; i < Y.length; i++) {
      x = (i * s);
      y = Y[i];
      if (Math.random() * 1e4 > 1e4 - 15 && V[i] < 0) {
        X[i] = Math.floor(Math.random() * msg.length);
        V[i] = msg[X[i]].length - 1;
      }
      if (V[i] >= 0) {
        ctx.fillStyle = "#DFD";
        ctx.fillText(msg[X[i]][msg[X[i]].length - 1 - V[i]], x, y);
        V[i] = V[i] - 1;
      } else {
        ctx.fillStyle = "#0F0";
        ctx.fillText(String.fromCharCode(33 + Math.random() * 94), x, y);
      }
      if (y > 120 + Math.random() * 1e4 && V[i] <= 0) {
        Y[i] = 0;
      } else {
        Y[i] = y + s;
      }
    }
  };
  setInterval(draw, 50);
};