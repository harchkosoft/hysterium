let canvas,
  gl,
  startTime,
  isActive = false;
let intensity = 0;
let maxIntensity = 1;
let intensityIncreaseRate = 0.0001;
let lastGlitchTime = 0;
let glitchInterval = 1000;
let lastColorShiftTime = 0;
let colorShiftInterval = 1500;
let lastDistortionTime = 0;
let distortionInterval = 2000;
let lastPulseTime = 0;
let pulseInterval = 3000;
let lastShakeTime = 0;
let shakeInterval = 2500;
let lastTextCorruptionTime = 0;
let textCorruptionInterval = 500;
let shakeAmount = 0;
let pulseAmount = 0;
let audioContext,
  beepSounds = [];
let lastBeepTime = 0;
let beepInterval = 1600;

window.onload = function () {
  canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  } catch (e) {
    alert("WebGL not supported");
    return;
  }

  if (!gl) {
    alert("Unable to initialize WebGL");
    return;
  }

  initAudio();

  document.addEventListener("click", function () {
    if (!isActive) {
      startEffects();
    }
  });

  window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  render();
};

function startEffects() {
  isActive = true;
  startTime = Date.now();
  document.getElementById("start-screen").style.opacity = "0";
  document.getElementById("text-container").style.opacity = "1";

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  setTimeout(() => {
    document.getElementById("start-screen").style.display = "none";
  }, 500);
}

function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadBeepSounds();
  } catch (e) {
    console.error("Web Audio API not supported", e);
  }
}

function loadBeepSounds() {
  beepSounds = [];
 
  const frequencies = [2500];
  const duration = 0.175;

  frequencies.forEach((freq) => {
    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const t = i / audioContext.sampleRate;
      const wave = Math.sign(Math.sin(t * 2 * Math.PI * freq));
      const envelope =
        Math.min(1, t * 100) * Math.min(1, ((duration - t) * 100) / duration);
      data[i] = wave * envelope * 0.07;

    }

    beepSounds.push(buffer);
  });
}

function playBeepSound() {
  if (!audioContext || beepSounds.length === 0) return;

  if (!audioContext) return;  
  const source = audioContext.createBufferSource();
  source.buffer = beepSounds[Math.floor(Math.random() * beepSounds.length)];
  source.connect(audioContext.destination);
  const filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1 + Math.random() * 5 * intensity * 100;

  source.connect(filter);
  filter.connect(audioContext.destination);

  source.playbackRate.value = 0.4 + Math.random() * 0.03;

  source.start();
  source.stop(audioContext.currentTime + 1 + Math.random() * 0.1 + 0.05);

}

function corruptText() {
  const textElements = document.querySelectorAll(".system-text");

  textElements.forEach((el) => {
    if (!el.dataset.original) {
      el.dataset.original = el.textContent;
      el.dataset.corruptionStep = "0";
    }

    const originalText = el.dataset.original;
    let currentText = el.textContent;
    const corruptionStep = parseInt(el.dataset.corruptionStep);
    const maxCorruption = originalText.length * 999;

    el.dataset.corruptionStep = Math.min(
      corruptionStep + 1,
      maxCorruption
    ).toString();

    let newText = "";
    for (let i = 0; i < originalText.length; i++) {
      const corruptionIntensity = Math.min(1, corruptionStep / 10);

      if (Math.random() < 0.2 * intensity * corruptionIntensity) {
        newText +=
          originalText[i] +
          String.fromCharCode(
            Math.random() > 0.5
              ? 65 + Math.floor(Math.random() * 26)
              : 97 + Math.floor(Math.random() * 26)
          );
      } else if (Math.random() < 0.2 * intensity) {
        if (i < currentText.length && !originalText.includes(currentText[i])) {
          continue;
        }
      } else {
        newText += originalText[i];
      }
    }

    el.textContent = newText.slice(0, originalText.length * 3);

    const hueShift = Math.sin(Date.now() * 0.01) * 60;
    el.style.color = `hsl(${(120 + hueShift) % 360}, 100%, ${
      50 + Math.sin(Date.now() * 0.02) * 20
    }%)`;
    el.style.textShadow = `0 0 5px hsl(${(240 + hueShift) % 360}, 100%, 50%)`;
  });
}

function render() {
  if (!gl) return;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const currentTime = Date.now();

  if (isActive) {
    const elapsed = (currentTime - startTime) / 1000;
    intensity = Math.min(maxIntensity, elapsed / 60);
    intensityIncreaseRate = 0.0001 + intensity * 0.0005;

    if (currentTime - lastGlitchTime > glitchInterval / (1 + intensity * 10)) {
      applyGlitchEffect();
      lastGlitchTime = currentTime;
      glitchInterval = Math.max(50, 1000 - intensity * 950);
    }

    if (
      currentTime - lastColorShiftTime >
      colorShiftInterval / (1 + intensity * 10)
    ) {
      applyColorShift();
      lastColorShiftTime = currentTime;
      colorShiftInterval = Math.max(100, 1500 - intensity * 1400);
    }

    if (
      currentTime - lastDistortionTime >
      distortionInterval / (1 + intensity * 10)
    ) {
      applyDistortion();
      lastDistortionTime = currentTime;
      distortionInterval = Math.max(150, 2000 - intensity * 1850);
    }

    if (currentTime - lastPulseTime > pulseInterval / (1 + intensity * 10)) {
      applyPulse();
      lastPulseTime = currentTime;
      pulseInterval = Math.max(200, 3000 - intensity * 2800);
    }

    if (currentTime - lastShakeTime > shakeInterval / (1 + intensity * 10)) {
      applyShake();
      lastShakeTime = currentTime;
      shakeInterval = Math.max(100, 2500 - intensity * 2400);
    }

    if (
      currentTime - lastTextCorruptionTime >
      textCorruptionInterval / (1 + intensity * 20)
    ) {
      corruptText();
      lastTextCorruptionTime = currentTime;
      textCorruptionInterval = Math.max(
        1000,
        3000 - intensity * 500 + Math.random() * 100
      );
    }

    if (currentTime - lastBeepTime > beepInterval / (1 + intensity * 5)) {
      playBeepSound();
      lastBeepTime = currentTime;
      beepInterval = 1600 / (1 + intensity * 2);
    }
  }

  applyEffects();

  requestAnimationFrame(render);
}

function applyGlitchEffect() {
  if (Math.random() < 0.7) {
    const flickerIntensity = intensity * Math.random();
    gl.clearColor(flickerIntensity, flickerIntensity, flickerIntensity, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  if (Math.random() < 0.3 * intensity) {
    gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  if (Math.random() < 0.5 * intensity) {
    gl.enable(gl.SCISSOR_TEST);
    for (let i = 0; i < 5 * intensity; i++) {
      const isHorizontal = Math.random() > 0.5;
      if (isHorizontal) {
        const y = Math.floor(Math.random() * canvas.height);
        const height = 1 + Math.floor(Math.random() * 5 * intensity);
        gl.scissor(0, y, canvas.width, height);
      } else {
        const x = Math.floor(Math.random() * canvas.width);
        const width = 1 + Math.floor(Math.random() * 5 * intensity);
        gl.scissor(x, 0, width, canvas.height);
      }

      gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.disable(gl.SCISSOR_TEST);
  }
}

function applyColorShift() {
  const channel = Math.floor(Math.random() * 3);
  const shift = Math.floor(intensity * 50 * Math.random());

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const colors = [0, 0, 0, 0.3 * intensity];
  colors[channel] = 0.7;
  gl.clearColor(colors[0], colors[1], colors[2], colors[3]);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.disable(gl.BLEND);
}

function applyDistortion() {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const distortionPower = intensity * 0.5;

  for (let i = 0; i < 3 * intensity; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 50 + Math.random() * 150 * intensity;

    gl.scissor(x, y, size, size);
    gl.enable(gl.SCISSOR_TEST);

    gl.clearColor(
      Math.random(),
      Math.random(),
      Math.random(),
      0.3 * distortionPower
    );
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.SCISSOR_TEST);
  }

  gl.disable(gl.BLEND);
}

function applyPulse() {
  pulseAmount = intensity * 0.1;

  if (Math.random() < 0.7) {
    gl.clearColor(
      pulseAmount * Math.random(),
      pulseAmount * Math.random(),
      pulseAmount * Math.random(),
      1.0
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

function applyShake() {
  shakeAmount = intensity * 10;

  const shiftX = (Math.random() * 2 - 1) * shakeAmount;
  const shiftY = (Math.random() * 2 - 1) * shakeAmount;

  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(shiftX, shiftY, canvas.width, canvas.height);

  if (Math.random() < 0.3) {
    gl.clearColor(
      Math.random() * intensity,
      Math.random() * intensity,
      Math.random() * intensity,
      1.0
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  gl.disable(gl.SCISSOR_TEST);
}

function applyEffects() {
  if (Math.random() < 0.1 + intensity * 0.9) {
    const noiseIntensity = intensity * 0.2;
    gl.enable(gl.SCISSOR_TEST);

    for (let i = 0; i < 100 * intensity; i++) {
      const x = Math.floor(Math.random() * canvas.width);
      const y = Math.floor(Math.random() * canvas.height);
      const size = 1 + Math.floor(Math.random() * 3);

      gl.scissor(x, y, size, size);
      gl.clearColor(
        Math.random() * noiseIntensity,
        Math.random() * noiseIntensity,
        Math.random() * noiseIntensity,
        1.0
      );
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.disable(gl.SCISSOR_TEST);
  }

  if (intensity > 0.7 && Math.random() < 0.3) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(Math.random(), Math.random(), Math.random(), 0.3 * intensity);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.BLEND);
  }
}
