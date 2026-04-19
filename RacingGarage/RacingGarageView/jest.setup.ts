import "@testing-library/jest-dom";

import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Element.prototype.scrollIntoView = jest.fn();

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function () {};
}

jest.mock("@/api/client/client", () => {
  const mockApi = jest.fn();
  return { api: mockApi, __esModule: true, default: { api: mockApi } };
});
