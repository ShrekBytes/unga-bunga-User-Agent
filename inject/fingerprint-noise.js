// Experimental fingerprint noise hooks (MAIN world)
// Intended to be opt-in and best-effort only.

(function () {
  'use strict';

  const seed = (Math.random() * 1e9) | 0;

  function makeRng(extra) {
    let x = (seed ^ extra ^ Date.now()) | 0;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function noise8(rng, span) {
    return Math.floor((rng() * (span * 2 + 1)) - span);
  }

  function applyCanvasNoise(imageData, span) {
    const rng = makeRng((imageData.width << 16) ^ imageData.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + noise8(rng, span)));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise8(rng, span)));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise8(rng, span)));
    }
    return imageData;
  }

  try {
    const ctxProto = self.CanvasRenderingContext2D && self.CanvasRenderingContext2D.prototype;
    if (ctxProto && typeof ctxProto.getImageData === 'function') {
      const originalGetImageData = ctxProto.getImageData;
      ctxProto.getImageData = function (...args) {
        const result = originalGetImageData.apply(this, args);
        return applyCanvasNoise(result, 1);
      };
    }

    const canvasProto = self.HTMLCanvasElement && self.HTMLCanvasElement.prototype;
    if (canvasProto) {
      if (typeof canvasProto.toDataURL === 'function') {
        const originalToDataURL = canvasProto.toDataURL;
        canvasProto.toDataURL = function (...args) {
          try {
            const ctx = this.getContext && this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const originalGetImageData = Object.getPrototypeOf(ctx).getImageData;
              const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
              ctx.putImageData(applyCanvasNoise(imageData, 1), 0, 0);
            }
          } catch (e) {
            // ignore and fallback to original output
          }
          return originalToDataURL.apply(this, args);
        };
      }

      if (typeof canvasProto.toBlob === 'function') {
        const originalToBlob = canvasProto.toBlob;
        canvasProto.toBlob = function (...args) {
          try {
            const ctx = this.getContext && this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const originalGetImageData = Object.getPrototypeOf(ctx).getImageData;
              const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
              ctx.putImageData(applyCanvasNoise(imageData, 1), 0, 0);
            }
          } catch (e) {
            // ignore and fallback to original output
          }
          return originalToBlob.apply(this, args);
        };
      }
    }
  } catch (e) {
    // keep extension resilient
  }

  try {
    const glProtos = [self.WebGLRenderingContext && self.WebGLRenderingContext.prototype,
      self.WebGL2RenderingContext && self.WebGL2RenderingContext.prototype].filter(Boolean);

    for (const glProto of glProtos) {
      if (typeof glProto.getParameter !== 'function') {
        continue;
      }
      const originalGetParameter = glProto.getParameter;
      glProto.getParameter = function (param) {
        const out = originalGetParameter.call(this, param);
        if (typeof out !== 'string') {
          return out;
        }

        const isVendor = param === this.VENDOR;
        const isRenderer = param === this.RENDERER;
        if (isVendor || isRenderer) {
          const rng = makeRng(param | 0);
          const suffix = String.fromCharCode(97 + Math.floor(rng() * 26));
          return out + ' ' + suffix;
        }
        return out;
      };
    }
  } catch (e) {
    // keep extension resilient
  }

  try {
    const audioProto = self.AudioBuffer && self.AudioBuffer.prototype;
    if (audioProto && typeof audioProto.getChannelData === 'function') {
      const originalGetChannelData = audioProto.getChannelData;
      audioProto.getChannelData = function (channel) {
        const targetChannel = typeof channel === 'number' ? channel : 0;
        const data = originalGetChannelData.call(this, targetChannel);
        const rng = makeRng((targetChannel + 1) * 2654435761);
        for (let i = 0; i < data.length; i += 256) {
          data[i] += (rng() - 0.5) * 1e-7;
        }
        return data;
      };
    }
  } catch (e) {
    // keep extension resilient
  }
})();
