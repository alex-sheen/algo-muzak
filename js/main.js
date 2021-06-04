const ctx = new (window.AudioContext || window.webkitAudioContext)()
const fft = new AnalyserNode(ctx, { fftSize: 2048 })
const dis = new WaveShaperNode ( ctx )
createWaveCanvas({ element: 'section', analyser: fft })

const major = [0, 2, 4, 5, 7, 9, 11, 12]
const minor = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24]

const delayStart = 1
const bpm = 174
const beat = 60 / bpm
const bar = beat * 4
const root = 440
const scale = minor

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

function adsr (opts) {
  const param = opts.param
  const peak = opts.peak || 1
  const hold = opts.hold || 0.7
  const time = opts.time || ctx.currentTime
  const dur = opts.duration || 1
  const a = opts.a || dur * 0.2
  const d = opts.d || dur * 0.1
  const s = opts.s || dur * 0.5
  const r = opts.r || dur * 0.2

  const initVal = param.value
  param.setValueAtTime(initVal, time)
  param.exponentialRampToValueAtTime(peak, time+a)
  param.linearRampToValueAtTime(hold, time+a+d)
  param.linearRampToValueAtTime(hold, time+a+d+s)
  param.exponentialRampToValueAtTime(initVal, time+a+d+s+r)
  param.setTargetAtTime(0, time+a+d+s+r, 0.015);
}

function step (rootFreq, steps) {
  if (!steps) return null
  let tr2 = Math.pow(2, 1 / 12)
  let rnd = rootFreq * Math.pow(tr2, steps)
  return Math.round(rnd * 100) / 100
}

function makeDistortionCurve(amount,rate) {
    let k = typeof amount === 'number' ? amount : 50
    let n_samples = rate || 44100
    let curve = new Float32Array(n_samples)
    let deg = Math.PI / 180
    let i = 0
    let x
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) )
    }
    return curve
}
dis.curve = makeDistortionCurve(50,ctx.sampleRate)
dis.oversample = '4x'

function pitch_bend (rootFreq, targetFreq, time, duration) {
  const t = time || ctx.currentTime
  const dur = duration || 1
  const length = dur * ctx.sampleRate

  const sinePitchShiftedBuffer = ctx.createBuffer(2, ctx.sampleRate*dur, ctx.sampleRate)
  for (let ch = 0; ch < sinePitchShiftedBuffer.numberOfChannels; ch++) {
      let samples = sinePitchShiftedBuffer.getChannelData(ch)

      for (let s = 0; s < sinePitchShiftedBuffer.length; s++){
          let integral = -1*(rootFreq - targetFreq)/ 2 /sinePitchShiftedBuffer.length * s * s + s * rootFreq

          samples[s] = Math.sin(2 * Math.PI / sinePitchShiftedBuffer.sampleRate * integral)
      }
  }
  const sineNote = new AudioBufferSourceNode(ctx,{
      buffer:sinePitchShiftedBuffer,
      loop:true
  })
  const lvl = new GainNode(ctx, { gain: 0.0001})
  sineNote.connect(lvl)
  lvl.connect(dis)
  dis.connect(ctx.destination)
  dis.connect(fft)
  adsr({
    param: lvl.gain,
    time: t,
    duration: dur,
    hold: 0.9,
    a: dur * 0.1,
    d: 0,
    s: dur * 0.8,
    r: dur * 0.1
  })
  sineNote.start(t)
  sineNote.stop(t + dur*2)
}

function oscillator (type, pitch) {
  const osc = new OscillatorNode(ctx, {
    type: type || 'sine',
    frequency: pitch || 440
  })
  return osc
}

function tone (type, pitch, time, duration, initPitch, volume) {
  if (!pitch) return

  if (type == 'bend') {
    pitch_bend(initPitch, pitch, time, duration)
    return
  }

  const t = time || ctx.currentTime
  const dur = duration || 1
  let osc

  if (type == 'bassline' || type == 'lead') {
    osc = oscillator('sine', pitch)
  }
  else {
    osc = oscillator(type, pitch)
  }

  const lvl = new GainNode(ctx, { gain: 0.0001})
  osc.connect(lvl)

  if (type == 'bassline') {
    lvl.connect(dis)
    dis.connect(ctx.destination)
    dis.connect(fft)
    adsr({
      param: lvl.gain,
      time: t,
      duration: dur,
      hold: 0.9,
      a: dur * 0.1,
      d: dur * 0,
      s: dur * 0.85,
      r: dur * 0.05
    })
  }
  else if (type == 'sawtooth') {
    lvl.connect(ctx.destination)
    lvl.connect(fft)
    adsr({
      param: lvl.gain,
      time: t,
      duration: dur,
      peak: 0.2,
      hold: 0.1
    })
  }
  else {
    lvl.connect(ctx.destination)
    lvl.connect(fft)
    adsr({
      param: lvl.gain,
      time: t,
      duration: dur
    })
  }

  osc.start(t)
  osc.stop(t + duration*2)
}

const intro = {lead: [], bass: [], arp: []}
const intro_bars = 4
const verse = {lead: [], bass: [], arp: []}
const verse_bars = 4
const chorus = {lead: [], bass: [], arp: []}
const chorus_bars = 12
const bridge = []
const bridge_length = 8
const outro = []
const outro_length = 8

const intro_length = intro_bars * 4
const verse_length = verse_bars * 4
const chorus_length = chorus_bars * 4

let tmp = 0
let bass_offset = 56
// intro -----------------------------------------------------------------------
while (tmp < chorus_length) {
  let index = getRandomInt(7)
  tmp += 4
  intro.bass.push({step: scale[index] - bass_offset, index: index})
  intro.bass.push({step: scale[index] - bass_offset, index: index})
  intro.bass.push({step: scale[index] - bass_offset, index: index})
  intro.bass.push({step: scale[index] - bass_offset, index: index})
}

tmp = 0
while (tmp < intro_length) {
  let rand = Math.random()
  let index = getRandomInt(7)
  if (tmp == 0) intro.lead.push({step: scale[index], index: index, rest: false})
  else if (rand > 0.3 && intro.lead[tmp - 1].rest == true) {
    intro.lead.push({step: scale[index], index: index, rest: false})
  }
  else if (rand > 0.75) {
    intro.lead.push({step: scale[index], index: index, rest: false})
  }
  else if (rand > 0.5 && intro.lead[tmp - 1].rest == false) {
    intro.lead.push({step: scale[intro.lead[tmp - 1].index + 1], index: intro.lead[tmp - 1].index + 1, rest: false})
  }
  else if (rand > 0.25 && intro.lead[tmp - 1].rest == false) {
    intro.lead.push({step: Math.max(scale[intro.lead[tmp - 1].index - 1],0), index: intro.lead[tmp - 1].index + 1, rest: false})
  }
  else {
    intro.lead.push({step: null, index: null, rest: true})
  }
  tmp++
}
// intro -----------------------------------------------------------------------
// verse -----------------------------------------------------------------------
// verse -----------------------------------------------------------------------
// chorus ----------------------------------------------------------------------
tmp = 0
while (tmp < chorus_length) {
  let index = getRandomInt(7)
  tmp += 4
  chorus.bass.push({step: scale[index] - bass_offset, index: index})
  chorus.bass.push({step: scale[index] - bass_offset, index: index})
  chorus.bass.push({step: scale[index] - bass_offset, index: index})
  chorus.bass.push({step: scale[index] - bass_offset, index: index})
}

tmp = 0
while (tmp < chorus_length) {
  let rand = Math.random()
  let index = getRandomInt(7)
  if (tmp == 0) chorus.lead.push({step: scale[index], index: index, rest: false, bend: false})
  else if (rand > 0.2 && chorus.lead[tmp - 1].rest == true) {
    chorus.lead.push({step: scale[index], index: index, rest: false, bend: false})
  }
  else if (rand > 0.75) {
    chorus.lead.push({step: scale[index], index: index, rest: false, bend: false})
  }
  else if (rand > 0.5 && chorus.lead[tmp - 1].rest == false) {
    chorus.lead.push({step: scale[chorus.lead[tmp - 1].index + 1], index: chorus.lead[tmp - 1].index + 1, rest: false, bend: false})
  }
  else if (rand > 0.25 && chorus.lead[tmp - 1].rest == false) {
    chorus.lead.push({step: Math.max(scale[chorus.lead[tmp - 1].index + 1], 0), index: chorus.lead[tmp - 1].index + 1, rest: false, bend: false})
  }
  else {
    chorus.lead.push({step: null, index: null, rest: true, bend: false})
  }
  tmp++
}
// chorus ----------------------------------------------------------------------

const granular = document.querySelector('#granular')
granular.addEventListener('click', () => {
  window.location = 'granular.html'
})

const button = document.querySelector('#start')

button.addEventListener('click', () => {
  for (let bar_v = 0; bar_v < intro_bars; bar_v++) {
    const delayBar = bar_v * bar

    for (let quarter = 0; quarter < 4; quarter++) {
      const delayBeat = delayBar + quarter * beat
      tone('bassline', step(440, intro.bass[bar_v * 4 + quarter].step), delayBeat, beat)
      if (intro.lead[bar_v * 4 + quarter].rest == false) {
        tone('sawtooth', step(440, intro.lead[bar_v * 4 + quarter].step), delayBeat, beat)
      }
    }
  }
  for (let bar_v = 0; bar_v < chorus_bars; bar_v++) {
    const delayBar = bar_v * bar + intro_bars * bar

    for (let quarter = 0; quarter < 4; quarter++) {
      const delayBeat = delayBar + quarter * beat
      tone('bassline', step(440, chorus.bass[bar_v * 4 + quarter].step), delayBeat, beat)
      if (chorus.lead[bar_v * 4 + quarter].rest == false) {
        tone('lead', step(440, chorus.lead[bar_v * 4 + quarter].step), delayBeat, beat)
      }
    }
  }
})
