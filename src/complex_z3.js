const board = JXG.JSXGraph.initBoard('board3', {
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

    function complexAdd(a, b) {
      return { re: a.re + b.re, im: a.im + b.im };
    }

    function complexMul(a, b) {
      return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
      };
    }

    function complexPow(a, n) {
      let result = { re: 1, im: 0 };
      for (let i = 0; i < n; i++) result = complexMul(result, a);
      return result;
    }

    function complexDivReal(a, r) {
      return { re: a.re / r, im: a.im / r };
    }

    function f(z) {
      return complexAdd(z, complexDivReal(complexPow(z, 3), 3));
    }

    board.create('curve', [
      t => f({ re: Math.cos(t), im: Math.sin(t) }).re,
      t => f({ re: Math.cos(t), im: Math.sin(t) }).im,
      0, 2 * Math.PI
    ], { strokeColor: 'purple', strokeWidth: 2 });