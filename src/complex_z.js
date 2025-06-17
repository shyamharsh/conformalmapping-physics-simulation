const board = JXG.JSXGraph.initBoard('board1', {
      boundingbox: [-14, 14, 14, -14],
      axis: true,
      grid: true,
      showNavigation: true,
      showCopyright: false,
      pan: {
         enabled: true,
         needTwoFingers: false,
         needShift: false
    },
      zoom: { 
        enabled: true, 
        wheel: true,
        needShift: false
      }
    });

    function f(z) { return z; }

    board.create('curve', [
      t => f({ re: Math.cos(t), im: Math.sin(t) }).re,
      t => f({ re: Math.cos(t), im: Math.sin(t) }).im,
      0, 2 * Math.PI
    ], { strokeColor: 'orange', strokeWidth: 2 });