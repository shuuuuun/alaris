import $ from 'jquery-deferred';
import EventEmitter from 'events';
import Util from './Util';
import TouchController from './TouchController';
import {
  COLS,
  ROWS,
  BLOCK_SIZE,
  NUMBER_OF_BLOCK,
  HIDDEN_ROWS,
  LOGICAL_ROWS,
  WIDTH,
  HEIGHT,
  NEXT_WIDTH,
  NEXT_HEIGHT,
  RENDER_INTERVAL,
  DEFAULT_TICK_INTERVAL,
  SPEEDUP_RATE,
  START_X,
  START_Y,
  BG_COLOR,
  DEFAULT_DROP_DIRECTION,
  KEYS,
  CLEARLINE_BLOCK,
  GAMEOVER_BLOCK,
  BLOCK_LIST,
} from '../constants';

const ALL_BLOCK_LIST = BLOCK_LIST.concat([CLEARLINE_BLOCK, GAMEOVER_BLOCK]);
const BLANK_ROW = Array.apply(null, Array(COLS)).map(() => 0); // [0,0,0,0,0,...]

export default class pentrix extends EventEmitter {
  constructor(opts = {}) {
    super();
    
    this.rootElm = opts.rootElement || document.createElement('div');
    this.cnvs = opts.canvas || document.createElement('canvas');
    this.ctx = this.cnvs.getContext('2d');
    this.cnvsNext = opts.canvasNext || document.createElement('canvas');
    this.ctxNext = this.cnvsNext.getContext('2d');
    this.rootElm.appendChild(this.cnvsNext);
    this.rootElm.appendChild(this.cnvs);

    this.initCanvasSize();
    
    if (!opts.disableFocusControls) this.initBlurEvent();
    if (!opts.disableKey) this.initKeyEvent();
    if (!opts.disableTouch) this.initTouchEvent();
  }

  initCanvasSize() {
    this.cnvs.style.width = WIDTH + 'px';
    this.cnvs.style.height = HEIGHT + 'px';
    this.cnvs.width = WIDTH * 2; // for retina
    this.cnvs.height = HEIGHT * 2; // for retina
    this.ctx.scale(2,2); // for retina
    this.ctx.strokeStyle = BG_COLOR;
    
    this.cnvsNext.style.width = NEXT_WIDTH + 'px';
    this.cnvsNext.style.height = NEXT_HEIGHT + 'px';
    this.cnvsNext.width = NEXT_WIDTH * 2; // for retina
    this.cnvsNext.height = NEXT_HEIGHT * 2; // for retina
    this.ctxNext.scale(2,2); // for retina
    this.ctxNext.strokeStyle = BG_COLOR;
  }

  // Controller ------------------------------
  initBlurEvent() {
    window.addEventListener('blur', () => {
      this.pauseGame();
    }, false);
    window.addEventListener('focus', () => {
      this.resumeGame();
    }, false);
  }

  initKeyEvent() {
    document.addEventListener('keydown', (evt) => {
      if (typeof KEYS[evt.keyCode] === 'undefined') return;
      evt.preventDefault();
      this.handleMethod(KEYS[evt.keyCode]);
    }, false);
  }

  initTouchEvent() {
    const touch = new TouchController({
      element: this.cnvs
    });
    let touchStartX;
    let touchStartY;
    let isTap = false;
    let isFreeze = false;
    
    touch.on('touchstart',(info) => {
      touchStartX = info.touchStartX;
      touchStartY = info.touchStartY;
      isTap = true;
      isFreeze = false;
    });
    touch.on('touchmove',(info) => {
      // const blockMoveX = (info.moveX / BLOCK_SIZE) | 0;
      const moveX  = info.touchX - touchStartX;
      const moveY  = info.touchY - touchStartY;
      let blockMoveX = (moveX / BLOCK_SIZE) | 0;
      let blockMoveY = (moveY / BLOCK_SIZE) | 0;
      
      if (isFreeze) return;
      
      // 1マスずつバリデーション（すり抜け対策）
      while (!!blockMoveX) {
        const sign = blockMoveX / Math.abs(blockMoveX); // 1 or -1
        if (!this.validate(sign, 0)) break;
        this.currentBlock.x += sign;
        blockMoveX -= sign;
        touchStartX = info.touchX;
      }
      while (blockMoveY > 0) {
        if (!this.validate(0, 1)) break;
        this.currentBlock.y++;
        blockMoveY--;
        touchStartY = info.touchY;
      }
      isTap = false;
    });
    touch.on('touchend',(info) => {
      if (!!isTap) this.rotateBlock();
    });
    this.on('freeze',() => {
      isFreeze = true;
    });
  }

  handleMethod(key) { // helper
    switch (key) {
      case 'left':
        this.moveBlockLeft();
        break;
      case 'right':
        this.moveBlockRight();
        break;
      case 'down':
        this.moveBlockDown();
        break;
      case 'rotate':
        this.rotateBlock();
        break;
      default:
        break;
    }
  }

  // Model ------------------------------
  newGame() {
    this.initGame();
    this.startGame();
  }

  initGame() {
    clearTimeout(this.tickId);
    this.stopRender();
    this.isPlayng = false;
    this.lose = false;
    this.tickInterval = DEFAULT_TICK_INTERVAL;
    this.sumOfClearLines = 0;
    this.score = 0;
    this.frameCount = 0;
    this.initBoard();
    this.initBlock();
    this.createNextBlock();
    this.render();
    this.emit('gameinit');
  }

  startGame() {
    this.isPlayng = true;
    this.createCurrentBlock();
    this.createNextBlock();
    this.startRender();
    this.emit('gamestart');
    this.tick();
  }

  initBoard() {
    this.board = [];
    for ( let y = 0; y < LOGICAL_ROWS; ++y ) {
      this.board[y] = [];
      for ( let x = 0; x < COLS; ++x ) {
        this.board[y][x] = 0;
      }
    }
  }

  initBlock() {
    this.nextBlock = this.createBlock(0);
    this.currentBlock = this.createBlock(0);
    this.currentBlock.x = START_X;
    this.currentBlock.y = START_Y;
  }

  createBlock(id = 0) {
    const blockConst = BLOCK_LIST[id] || {};
    const shape = blockConst.shape;
    const block = Object.assign({}, BLOCK_LIST[id], {
      shape: [],
      x: 0,
      y: 0,
    });
    for ( let y = 0; y < NUMBER_OF_BLOCK; ++y ) {
      block.shape[y] = [];
      for ( let x = 0; x < NUMBER_OF_BLOCK; ++x ) {
        block.shape[y][x] = shape[y][x] || 0;
      }
    }
    this.emit('newblockcreated');
    return block;
  }

  createCurrentBlock() {
    if (!this.nextBlock) this.createNextBlock();
    this.currentBlock = this.nextBlock;
    this.currentBlock.x = START_X;
    this.currentBlock.y = START_Y;
    this.emit('currentblockcreated');
  }

  createNextBlock() {
    const id = Math.floor(Math.random() * BLOCK_LIST.length);
    this.nextBlock = this.createBlock(id);
    this.emit('nextblockcreated');
  }

  // メインでループする関数
  tick() {
    clearTimeout(this.tickId);
    if (!this.moveBlockDown()) {
      this.freeze();
      this.clearLines();
      if (this.checkGameOver()) {
        this.emit('gameover');
        this.quitGame().then(() => {
          // this.newGame();
        });
        return false;
      }
      this.frameCount++;
      this.createCurrentBlock();
      this.createNextBlock();
    }
    this.tickId = setTimeout(() => this.tick(), this.tickInterval);
    this.emit('tick');
  }

  quitGame() {
    const dfd = $.Deferred();
    this.gameOverEffect().then(() => {
      this.isPlayng = false;
      this.emit('gamequit');
      dfd.resolve();
    });
    return dfd.promise();
  }

  pauseGame() {
    clearTimeout(this.tickId);
    this.stopRender();
  }

  resumeGame() {
    if (!this.isPlayng) return;
    this.tickId = setTimeout(() => this.tick(), this.tickInterval);
    this.startRender();
  }

  freeze() {
    for ( let y = 0; y < NUMBER_OF_BLOCK; ++y ) {
      for ( let x = 0; x < NUMBER_OF_BLOCK; ++x ) {
        const boardX = x + this.currentBlock.x;
        const boardY = y + this.currentBlock.y;
        if (!this.currentBlock.shape[y][x] || boardY < 0) continue;
        this.board[boardY][boardX] = this.currentBlock.shape[y][x] ? (this.currentBlock.id + 1) : 0;
      }
    }
    this.emit('freeze');
  }

  clearLines() {
    let clearLineLength = 0; // 同時消去ライン数
    let filledRowList = [];
    let dfd = $.Deferred();
    dfd.resolve();
    
    const effect = (x, y) => {
      return () => {
        const d = $.Deferred();
        this.board[y][x] = CLEARLINE_BLOCK.id + 1;
        d.resolve();
        return d.promise();
      };
    };
    const dropRow = () => {
      return () => {
        const d = $.Deferred();
        if (!filledRowList.length) return;
        filledRowList.reverse().forEach((row) => {
          this.board.splice(row, 1);
          this.board.unshift(BLANK_ROW);
        });
        d.resolve();
        return d.promise();
      };
    };
    
    for ( let y = LOGICAL_ROWS - 1; y >= 0; --y ) {
      const isRowFilled = this.board[y].every((val) => val !== 0);
      if (!isRowFilled) continue;
      filledRowList.push(y);
      clearLineLength++;
      this.sumOfClearLines++;
      this.tickInterval -= SPEEDUP_RATE; // 1行消去で速度を上げる
      
      // clear line effect
      for ( let x = 0; x < COLS; ++x ) {
        if (!this.board[y][x]) continue;
        dfd = dfd
          .then(effect(x, y))
          .then(Util.sleep(10));
      }
    }
    // clear line drop
    dfd.then(dropRow());
    
    // calc score
    this.score += (clearLineLength <= 1) ? clearLineLength : Math.pow(2, clearLineLength);
    
    if (clearLineLength > 0) this.emit('clearline', filledRowList);
  }

  gameOverEffect() {
    let dfd = $.Deferred();
    dfd.resolve();
    
    const effect = (x, y) => {
      return () => {
        const d = $.Deferred();
        this.board[y][x] = GAMEOVER_BLOCK.id + 1;
        this.emit('gameOverEffectTick');
        d.resolve();
        return d.promise();
      };
    };
    
    for ( let y = 0; y < LOGICAL_ROWS; ++y ) {
      for ( let x = 0; x < COLS; ++x ) {
        if (!this.board[y][x]) continue;
        // this.board[y][x] = BLOCK_IMAGE_LIST.length - 1;
        dfd = dfd
          .then(effect(x, y))
          .then(Util.sleep(10));
      }
    }
    this.emit('gameOverEffect');
    return dfd.then(Util.sleep(500)).promise();
  }

  moveBlockLeft() {
    const isValid = this.validate(-1, 0);
    if (isValid) {
      --this.currentBlock.x;
    }
    return isValid;
  }

  moveBlockRight() {
    const isValid = this.validate(1, 0);
    if (isValid) {
      ++this.currentBlock.x;
    }
    return isValid;
  }

  moveBlockDown() {
    const isValid = this.validate(0, 1);
    if (isValid) {
      ++this.currentBlock.y;
    }
    return isValid;
  }

  rotateBlock() {
    const rotatedBlock = Object.assign({}, this.currentBlock);
    rotatedBlock.shape = this.rotate(this.currentBlock.shape);
    const isValid = this.validate(0, 0, rotatedBlock);
    if (isValid) {
      this.currentBlock = rotatedBlock;
    }
    return isValid;
  }

  rotate(shape = this.currentBlock.shape) {
    const newBlockShape = [];
    for ( let y = 0; y < NUMBER_OF_BLOCK; ++y ) {
      newBlockShape[y] = [];
      for ( let x = 0; x < NUMBER_OF_BLOCK; ++x ) {
        newBlockShape[y][x] = shape[NUMBER_OF_BLOCK - 1 - x][y];
      }
    }
    return newBlockShape;
  }

  rotateBoard(sign) {
    const newBoard = [];
    for ( let y = 0; y < ROWS; ++y ) {
      newBoard[y] = [];
      for ( let x = 0; x < COLS; ++x ) {
        newBoard[y][x] = this.board[COLS - 1 - x + HIDDEN_ROWS][y];
      }
    }
    for (let i = 0; i < HIDDEN_ROWS; ++i) {
      newBoard.unshift(BLANK_ROW);
    }
    this.board = newBoard;
    return newBoard;
  }

  validate(offsetX = 0, offsetY = 0, block = this.currentBlock) {
    const nextX = block.x + offsetX;
    const nextY = block.y + offsetY;
    
    for ( let y = 0; y < NUMBER_OF_BLOCK; ++y ) {
      for ( let x = 0; x < NUMBER_OF_BLOCK; ++x ) {
        if (!block.shape || !block.shape[y][x]) {
          continue;
        }
        const boardX = x + nextX;
        const boardY = y + nextY;
        const isOutsideLeftWall = boardX < 0;
        const isOutsideRightWall = boardX >= COLS;
        const isUnderBottom = boardY >= LOGICAL_ROWS;
        const isOutsideBoard = typeof this.board[boardY] === 'undefined' || typeof this.board[boardY][boardX] === 'undefined';
        const isExistsBlock = !isOutsideBoard && !!this.board[boardY][boardX];
        if (isOutsideLeftWall || isOutsideRightWall || isUnderBottom || isOutsideBoard || isExistsBlock) {
          return false;
        }
      }
    }
    return true;
  }

  checkGameOver() {
    // ブロックの全てが画面外ならゲームオーバー
    let isGameOver = true;
    for ( let y = 0; y < NUMBER_OF_BLOCK; ++y ) {
      for ( let x = 0; x < NUMBER_OF_BLOCK; ++x ) {
        const boardX = x + this.currentBlock.x;
        const boardY = y + this.currentBlock.y;
        if (boardY >= HIDDEN_ROWS) {
          isGameOver = false;
          break;
        }
      }
    }
    return isGameOver;
  }

  // View ------------------------------
  startRender() {
    // TODO: change to requestAnimationFrame
    this.renderId = setInterval(() => this.render(), RENDER_INTERVAL);
  }

  stopRender() {
    clearInterval(this.renderId);
  }

  render() {
    this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.ctxNext.clearRect(0, 0, NEXT_WIDTH, NEXT_HEIGHT);
    
    // background
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctxNext.fillStyle = BG_COLOR;
    this.ctxNext.fillRect(0, 0, NEXT_WIDTH, NEXT_HEIGHT);
    
    this.renderBoard();
    this.renderCurrentBlock();
    this.renderNextBlock();
  }

  renderBoard() {
    // 盤面を描画する
    for (let x = 0; x < COLS; ++x) {
      for (let y = 0; y < ROWS; ++y) {
        const boardX = x;
        const boardY = y + HIDDEN_ROWS;
        const blockId = this.board[boardY][boardX] - 1;
        if (!this.board[boardY][boardX] || isNaN(blockId) || blockId < 0) continue;
        this.drawBlock(x, y, blockId);
      }
    }
  }

  renderCurrentBlock() {
    // 操作ブロックを描画する
    if (!this.currentBlock.shape || !this.currentBlock.shape.length) {
      return;
    }
    for (let y = 0; y < NUMBER_OF_BLOCK; ++y) {
      for (let x = 0; x < NUMBER_OF_BLOCK; ++x) {
        const blockId = this.currentBlock.id;
        if (!this.currentBlock.shape[y][x] || isNaN(blockId) || blockId < 0) continue;
        const drawX = x + this.currentBlock.x;
        const drawY = y + this.currentBlock.y - HIDDEN_ROWS;
        this.drawBlock(drawX, drawY, blockId);
      }
    }
  }

  renderNextBlock() {
    // Nextブロック描画
    if (!this.nextBlock.shape || !this.nextBlock.shape.length) {
      return;
    }
    for (let y = 0; y < NUMBER_OF_BLOCK; ++y) {
      for (let x = 0; x < NUMBER_OF_BLOCK; ++x) {
        const blockId = this.nextBlock.id;
        if (!this.nextBlock.shape[y][x] || isNaN(blockId) || blockId < 0) continue;
        this.drawNextBlock(x, y, blockId);
      }
    }
  }

  drawBlock(x, y, id) {
    if (!ALL_BLOCK_LIST[id]) {
      return;
    }
    const blockX = BLOCK_SIZE * x;
    const blockY = BLOCK_SIZE * y;
    const blockSize = BLOCK_SIZE;
    this.ctx.fillStyle = ALL_BLOCK_LIST[id].color;
    this.ctx.fillRect( blockX, blockY, blockSize, blockSize );
    this.ctx.strokeRect( blockX, blockY, blockSize, blockSize );
  }

  drawNextBlock(x, y, id) {
    if (!ALL_BLOCK_LIST[id]) {
      return;
    }
    const blockX = BLOCK_SIZE * x;
    const blockY = BLOCK_SIZE * y;
    const blockSize = BLOCK_SIZE;
    this.ctxNext.fillStyle = ALL_BLOCK_LIST[id].color;
    this.ctxNext.fillRect( blockX, blockY, blockSize, blockSize );
    this.ctxNext.strokeRect( blockX, blockY, blockSize, blockSize );
  }
}
