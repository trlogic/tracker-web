import type { SuspiciousFlags } from "src/domain/suspicious-flags";
import { TrackerVariableWebType } from "src/domain/variable/VariableTypeDefinitions";
import type { VariableProperties } from "src/domain/VariablePropertiesDomains";
import { VariableResolver } from "src/services/variable-resolver";
import { beforeEach, describe, expect, it } from "vitest";

const flags: SuspiciousFlags = {
  unnaturalMouseMoves:  false,
  bigClipboardPaste:    false,
  lowFPSDetected:       false,
  delayedClickDetected: false,
};

function makeResolver() {
  return new VariableResolver("1.1.1.1", "device123", flags, { customVar: "hello" });
}

describe("VariableResolver", () => {
  beforeEach(() => {
    // basic jsdom setup
    Object.defineProperty(window, "screen", { value: { width: 100, height: 50 }, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: "TestUA", configurable: true });
  });

  it("resolves custom variable", async () => {
    const resolver = makeResolver();
    const value = await resolver.resolve(
      {
        type:        TrackerVariableWebType.CUSTOM,
        name:        "customVar",
        description: "",
        properties:  { dataType: undefined as unknown as never } as unknown as VariableProperties,
      },
      new MouseEvent("click"),
    );
    expect(value).toBe("hello");
  });

  it("resolves screen resolution", async () => {
    const resolver = makeResolver();
    const value = await resolver.resolve(
      {
        type:        TrackerVariableWebType.SCREEN_RESOLUTION,
        name:        "res",
        description: "",
        properties:  { dataType: undefined as unknown as never } as unknown as VariableProperties,
      },
      new MouseEvent("click"),
    );
    expect(value).toBe("100x50");
  });
});
