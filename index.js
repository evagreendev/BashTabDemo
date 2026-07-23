"use strict";
(function(){
// ── Terminal setup ──────────────────────────────────────
const term = new Terminal({
  cols: 90,
  rows: 30,
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
  theme: {
    background: '#0d1117',
    foreground: '#c9d1d9',
    cursor: '#58a6ff',
    selectionBackground: '#264f78',
    black: '#484f58',
    red: '#f85149',
    green: '#3fb950',
    yellow: '#d29922',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39c5cf',
    white: '#b1bac4',
    brightBlack: '#6e7681',
    brightRed: '#ff7b72',
    brightGreen: '#56d364',
    brightYellow: '#e3b341',
    brightBlue: '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#56d4dd',
    brightWhite: '#f0f6fc',
  },
  allowProposedApi: true,
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
const terminalElement = document.getElementById('terminal');
const statusDotElement = document.getElementById('statusDot');
const statusTextElement = document.getElementById('statusText');
if (terminalElement === null) {
  console.error("Failed to find terminal element");
  return;
}
if (statusDotElement === null) {
  console.error("statusDot element not found");
}
if (statusTextElement === null) {
  console.error("statusText element not found");
}
term.open(terminalElement);
fitAddon.fit();

const unicodeAddon = new Unicode11Addon.Unicode11Addon();
term.loadAddon(unicodeAddon);
term.unicode.activeVersion = "11";

// Resize handler
window.addEventListener('resize', () => fitAddon.fit());

// ── v86 Emulator ────────────────────────────────────────
const emulator = new V86({
  wasm_path: "node_modules/v86/build/v86.wasm",
  memory_size: 256 * 1024 * 1024,
  vga_memory_size: 8 * 1024 * 1024,
  screen_container: null,
  bios: { url: "bios/seabios.bin" },
  vga_bios: { url: "bios/vgabios.bin" },
  filesystem: {
    baseurl: "images/alpine-bashtab-rootfs-flat/",
    basefs: "images/alpine-bashtab-fs.json",
  },
  autostart: true,
  bzimage_initrd_from_filesystem: true,
  cmdline: "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose modules=virtio_pci tsc=reliable mitigations=off random.trust_cpu=on",
  disable_keyboard: true,
  disable_mouse: true,
  disable_speaker: true,
  // No network needed for the demo
  uart1: false,
  uart2: false,
  uart3: false,
});

// ── Wire serial to xterm ────────────────────────────────
let booted = false;
let serialBuffer = "";

term.onResize(({cols, rows} ) => {
  if (!booted) {
    return;
  }
  sendDimensions(cols, rows);
});

/**
 * @param {number} cols 
 * @param {number} rows 
 */
function sendDimensions(cols, rows) {
  emulator.serial0_send(`\nstty cols ${cols} rows ${rows}\n`);
}

const decoder = new TextDecoder('utf-8', {fatal: false});
emulator.add_listener("serial0-output-byte", function(byte) {
  const text = decoder.decode(new Uint8Array([byte]), { stream: true });

  if (!booted) {
    serialBuffer += text;
    // Detect login prompt
    if (serialBuffer.includes("automatic login")) {
      booted = true;
      serialBuffer = "";
      if (statusDotElement) {
        statusDotElement.className = 'dot ready';
      }
      if (statusTextElement) {
        statusTextElement.textContent = 'Ready — BashTab loaded';
      }
      // Send empty line to trigger shell
      setTimeout(() => sendDimensions(term.cols, term.rows), 500);
    }
  }

  term.write(text);
});

// Send terminal input to serial
term.onData(function(data) {
  if (!booted) { 
    console.debug(`Not sending text: ${data}`);
    return;
  }
  emulator.serial0_send(data);
});

// ── Click-to-send commands ──────────────────────────────
window.sendCmd = function(cmd) {
  emulator.serial0_send(cmd + "\n");
};

// ── Toast notification ──────────────────────────────────
/** @type {number} */
let toastTimer;
/**
 * @param {string} msg 
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (t === null) {
    console.error("Cannot find toast element");
    return;
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ── Share link ──────────────────────────────────────────
window.copyShareLink = function() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('✅ Link copied to clipboard!');
  }).catch(() => {
    showToast('📋 ' + url);
  });
};

// ── Handle connection errors ────────────────────────────
emulator.add_listener("download-error", function(e) {
  console.error("Download error:", e);
  term.write("\r\n\x1b[31m[Error loading disk image — check console]\x1b[0m\r\n");
  if (statusDotElement) {
    statusDotElement.className = 'dot error';
  }
  if (statusTextElement) {
    statusTextElement.textContent = 'Error loading files';
  }
});
})();
