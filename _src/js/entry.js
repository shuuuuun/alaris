import Pentrix from './modules/Pentrix';


// Init
const container = document.querySelector('.container');
const gameRoot = document.getElementById('game-root');
const pentrix = new Pentrix({
  rootElement: gameRoot
});


// Event
pentrix.on('gamequit', () => {
  pentrix.newGame();
});


// Start
pentrix.newGame();
