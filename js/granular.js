/*
   load buffer from file using Fetch
*/
const ctx = new (window.AudioContext || window.webkitAudioContext)()
const fft = new AnalyserNode( ctx )
const src = new AudioBufferSourceNode( ctx )
const gn = new GainNode(ctx, {gain:0.5})

src.connect(gn)
gn.connect(fft)
fft.connect(ctx.destination)

createWaveCanvas({element:'section', analyser:fft })

function fetchAudio(file) {
  fetch(file)
  .then(res => res.arrayBuffer() )
  .then(data => {
      // use the AudioContext's decodeAudioData method to decode
      // the audio data contained in the buffer
      ctx.decodeAudioData(data, (buffer)=>{
          // set the BufferSourceNode's buffer to the decoded buffer
          src.buffer = buffer
          // now you can play the audio
          src.start()
      })
  })
  .catch(err => { console.error(err) })
}
function changedVocal() {
  let opt = document.getElementById("audio").value;
  let file
  console.log(opt)
  switch(opt) {
  case 'v1':
    file = '/oversampled/Oversampled_vocal_chops_01_120_A'
    fetchAudio(file)
    break;
  case 'v2':
    file = '/oversampled/Oversampled_vocal_chops_03_120_A'
    fetchAudio(file)
    break;
  case 'v3':
    file = '/oversampled/Oversampled_vocal_chops_82_160_C'
    fetchAudio(file)
    break;
  case 'v4':
    file = '/oversampled/Oversampled_vocal_chops_138_180_Bm'
    fetchAudio(file)
    break;
}
}
