/*
   load buffer from file using Fetch
*/
const ctx = new (window.AudioContext || window.webkitAudioContext)()
const fft = new AnalyserNode( ctx )
const gn = new GainNode(ctx, {gain:0.5})

createWaveCanvas({element:'section', analyser:fft })

let file
let paused = false
let start = 23.87
let end = 0.5

const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

let buff
fetch('billie_eilish_everything_i_wanted _studio_capella_trimmed.mp3')
.then(res => res.arrayBuffer() )
.then(data => {
  ctx.decodeAudioData(data, (buffer) => {
    buff = buffer
    createBufferCanvas({
        element:'section',
        buffer:buff,
        scale:0.5
    })
    updateBuff()
  })
})
.catch(err => { console.error(err) })

let src
function updateBuff () {
  src = new AudioBufferSourceNode( ctx, {
      loop:true,
      loopStart: start, // in-point offset
      loopEnd: start + end // out-point offset
  })

  src.buffer = buff
  src.start( ctx.currentTime, start )
  src.connect(gn)
  gn.connect(fft)
  fft.connect(ctx.destination)
}

function position(val) {

  src.stop()
  start = map(val, 1,1000,1,src.buffer.duration)
  updateBuff()
  src.loopStart = start
  src.loopEnd = Math.min(start + end, src.buffer.duration)
  src.loop = true
}

function length(val) {
  src.stop()
  updateBuff()
  end = map(val, 1,1000,0,1)
  src.loopStart = start
  src.loopEnd = start + end
  src.loop = true
}
