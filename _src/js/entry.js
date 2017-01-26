import Pentrix from './modules/Pentrix';


// Init
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();
var audioBuffer = null;
getAudioBuffer('/sound/su715.mp3', function(buffer) {
  audioBuffer = buffer;
  // playSound(audioBuffer);
});

const container = document.querySelector('.container');
const inputTime = document.querySelector('.js-input-time');
const buttonSetAlarm = document.querySelector('.js-button-set-alarm');
const gameRoot = document.getElementById('game-root');
const pentrix = new Pentrix({
  rootElement: gameRoot
});


const now = new Date();
const hour = ('0' + now.getHours()).slice(-2);
const minute = ('0' + now.getMinutes()).slice(-2);
inputTime.value = `${hour}:${minute}`;

buttonSetAlarm.addEventListener('click', () => {
  const value = inputTime.value
  const hour = value.split(':')[0]
  const minute = value.split(':')[1]
  const timeDate = new Date();
  timeDate.setHours(hour);
  timeDate.setMinutes(minute);
  timeDate.setSeconds(0);
  setAlarm(timeDate);
})


// Event
pentrix.once('gamestart', function(){
  // playSequence(1000);
  // playSound(audioBuffer);
});
pentrix.on('gamequit', () => {
  pentrix.newGame();
});


// Start
pentrix.newGame();


// function
function setAlarm(timeDate) {
  const now = new Date();
  const diff = timeDate - new Date();
  if (diff < 0) return;
  console.log(timeDate, `${diff} milliseconds after.`)
  setTimeout(() => {
    console.log("it's time!!!");
    const source = playSound(audioBuffer);

    const hoge = () => {
      console.log(pentrix.sumOfClearLines)
      if (pentrix.sumOfClearLines >= 4) {
        source.stop();
        // pentrix.off(evt);
        // pentrix.off('tick', hoge);
        pentrix.off('tick', hoge);
      }
    }
    pentrix.on('tick', hoge);
  }, diff)
}

function getAudioBuffer(url, fn) {  
  var req = new XMLHttpRequest();
  req.responseType = 'arraybuffer';

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 0 || req.status === 200) {
        context.decodeAudioData(req.response, function(buffer) {
          fn(buffer);
        });
      }
    }
  };

  req.open('GET', url, true);
  req.send('');
}

function playSound(buffer) {  
  var source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
  return source;
}



function sleep(duration) {
    return () => new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}

function playSequence(delay) {
    const basisHz = 442;
    const duration = 200;
    const maxRows = pentrix.LOGICAL_ROWS;

    (function loop(index) {
        const progress = index / pentrix.COLS;
        if (index >= pentrix.COLS) {
            setTimeout(() => loop(0), delay);
            return;
        }
        exec(index, progress)
            .then(() => {
                loop(++index);
            }, () => {
                console.log("fail");
            });
    })(0);

    function exec(index, progress) {
        const promiseList = [];
        pentrix.board.forEach((zAry, row) => {
            const i = maxRows - row;
            if (!zAry[index]) {
                return;
            }
            var hz = basisHz * Math.pow(2, (1 / 12) * (i - 9));
            const promise = playSoundHz(hz, duration);
            promiseList.push(promise);
        });
        promiseList.push(sleep(duration)()); // duration時間は確実に待つように
        return Promise.all(promiseList);
    }
}

function playSoundHz(hz, duration) {
    var osciillator = context.createOscillator();
    var audioDestination = context.destination;

    osciillator.frequency.value = hz;
    osciillator.connect(audioDestination);
    osciillator.start = osciillator.start || osciillator.noteOn; // クロスブラウザ対応
    osciillator.start();

    return new Promise((resolve) => {
        setTimeout(() => {
            osciillator.stop();
            resolve();
        }, duration);
    });
}

