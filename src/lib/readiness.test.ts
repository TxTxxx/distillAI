import { describe, expect, it } from "vitest";
import { defaults } from "../types";
import { launchIssue } from "./readiness";

const sharedReady = () => {
  const settings = structuredClone(defaults);
  settings.profiles.shared.model = "test-model";
  settings.profiles.shared.key = "test-only";
  return settings;
};
describe("launch preflight", () => {
  it("blocks first use with no credentials", () => {
    expect(launchIssue(structuredClone(defaults), false)).toContain("密钥");
  });
  it("allows shared configuration without requiring unused role profiles", () => {
    expect(launchIssue(sharedReady(), false)).toBe("");
  });
  it("checks separately assigned tutor configuration", () => {
    const settings = sharedReady();
    settings.assignments[2] = "tutor";
    expect(launchIssue(settings, false)).toContain("密钥");
  });
  it("rejects a missing model or invalid endpoint before creating a session", () => {
    const settings = sharedReady();
    settings.profiles.shared.model = " ";
    expect(launchIssue(settings, false)).toContain("模型名称");
    settings.profiles.shared.model = "test-model";
    settings.profiles.shared.baseUrl = "not-a-url";
    expect(launchIssue(settings, false)).not.toBe("");
  });
  it("requires speech credentials only when listening is enabled", () => {
    expect(launchIssue(sharedReady(), true)).toContain("语音服务");
    expect(launchIssue(sharedReady(), false)).toBe("");
  });
});
