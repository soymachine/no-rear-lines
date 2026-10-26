// ESLint (auditoría de código): solo reglas que señalan fallos reales o código que sobra, sin estilo.
// Uso: eslint js   (ESLint global; no hace falta instalar nada en el proyecto)
const browser = ['window', 'document', 'CSS', 'navigator', 'localStorage', 'sessionStorage', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'performance', 'fetch', 'URL', 'URLSearchParams', 'Blob', 'Image', 'ImageData',
  'OffscreenCanvas', 'Worker', 'self', 'postMessage', 'AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'AudioBuffer', 'matchMedia', 'getComputedStyle', 'CustomEvent', 'Event',
  'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'TouchEvent', 'HTMLElement', 'HTMLCanvasElement', 'HTMLInputElement', 'Element', 'Node', 'DOMParser', 'TextEncoder', 'TextDecoder', 'CompressionStream',
  'DecompressionStream', 'Response', 'Request', 'location', 'history', 'alert', 'confirm', 'prompt', 'structuredClone', 'queueMicrotask', 'crypto', 'atob', 'btoa', 'FileReader', 'File',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'indexedDB', 'caches', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'screen', 'addEventListener', 'removeEventListener',
  'dispatchEvent', 'Path2D', 'createImageBitmap', 'ImageBitmap', 'WebSocket', 'AbortController', 'globalThis', 'MessageChannel', 'BroadcastChannel', 'FormData', 'XMLHttpRequest',
  'DOMRect', 'FontFace', 'getSelection', 'scrollTo', 'open', 'close', 'focus', 'onerror', 'Option', 'SVGElement', 'ClipboardItem', 'HTMLAudioElement', 'Audio', 'MediaRecorder', 'webkitURL',
  'process', 'importScripts', 'reportError', 'visualViewport', 'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset', 'outerWidth', 'outerHeight', 'speechSynthesis', 'SpeechSynthesisUtterance'];
export default [
  {
    files: ['js/**/*.js', 'tools/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: Object.fromEntries(browser.map((g) => [g, 'readonly'])) },
    rules: {
      'no-undef': 'error', 'no-dupe-keys': 'error', 'no-dupe-class-members': 'error', 'no-duplicate-case': 'error', 'no-dupe-else-if': 'error',
      'no-unreachable': 'error', 'no-self-assign': 'error', 'no-self-compare': 'error', 'no-const-assign': 'error', 'no-func-assign': 'error',
      'no-redeclare': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-unsafe-finally': 'error', 'no-sparse-arrays': 'error', 'getter-return': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
];
