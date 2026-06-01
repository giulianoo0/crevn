import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

if (typeof globalThis !== 'undefined' && !globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

const zeroRect = () =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON() {
      return this;
    },
  }) as DOMRect;

const geometryTargetTypes = [Node, Element, HTMLElement, Range] as const;

for (const targetType of geometryTargetTypes) {
  if (typeof targetType === 'undefined') continue;

  if (!targetType.prototype.getBoundingClientRect) {
    Object.defineProperty(targetType.prototype, 'getBoundingClientRect', {
      value: zeroRect,
    });
  }

  if (!targetType.prototype.getClientRects) {
    Object.defineProperty(targetType.prototype, 'getClientRects', {
      value: () => [zeroRect()],
    });
  }
}
