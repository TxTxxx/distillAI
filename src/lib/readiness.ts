import type { Settings } from "../types";
import { checkConfig, errorMessage } from "./api";

/** Local validation only: filling credentials is not a successful connection test. */
export function launchIssue(settings: Settings, voice: boolean): string {
  try {
    settings.assignments.forEach((key) => checkConfig(settings.profiles[key]));
    if (voice && !settings.voice.key.trim())
      return "请配置语音服务，或关闭双角色听讲。";
    return "";
  } catch (e) {
    return errorMessage(e);
  }
}
