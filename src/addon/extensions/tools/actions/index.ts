import type { Action } from "./types.js";

// Process
export { psAction, killAction } from "./process-actions.js";
// File
export { lsAction, catAction } from "./file-actions.js";
// System
export { dfAction, duAction } from "./system-actions.js";
// Search
export { grepAction, findAction } from "./search-actions.js";
// Network
export { pingAction, curlAction } from "./network-actions.js";
// Docker
export { dockerPsAction, dockerImagesAction } from "./docker-actions.js";
// Git
export { gitStatusAction, gitLogAction, gitDiffAction, gitAddAction, gitCommitAction, gitPushAction, gitPullAction } from "./git-actions.js";
// Package
export { npmAction, aptAction } from "./package-actions.js";

export const actions: Record<string, Action> = {
  ps: (await import("./process-actions.js")).psAction,
  kill: (await import("./process-actions.js")).killAction,
  ls: (await import("./file-actions.js")).lsAction,
  cat: (await import("./file-actions.js")).catAction,
  df: (await import("./system-actions.js")).dfAction,
  du: (await import("./system-actions.js")).duAction,
  grep: (await import("./search-actions.js")).grepAction,
  find: (await import("./search-actions.js")).findAction,
  ping: (await import("./network-actions.js")).pingAction,
  curl: (await import("./network-actions.js")).curlAction,
  docker_ps: (await import("./docker-actions.js")).dockerPsAction,
  docker_images: (await import("./docker-actions.js")).dockerImagesAction,
  git_status: (await import("./git-actions.js")).gitStatusAction,
  git_log: (await import("./git-actions.js")).gitLogAction,
  git_diff: (await import("./git-actions.js")).gitDiffAction,
  git_add: (await import("./git-actions.js")).gitAddAction,
  git_commit: (await import("./git-actions.js")).gitCommitAction,
  git_push: (await import("./git-actions.js")).gitPushAction,
  git_pull: (await import("./git-actions.js")).gitPullAction,
  npm: (await import("./package-actions.js")).npmAction,
  apt: (await import("./package-actions.js")).aptAction,
};
