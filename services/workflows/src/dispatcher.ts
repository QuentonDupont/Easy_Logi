import type { EventEnvelope, EventName } from "@easy-logi/shared";

/**
 * The workflow dispatcher. Agents never call each other: an agent emits an event row, the
 * dispatcher decides what runs next (CLAUDE.md "Agent rules"). In Phase 0 no agents are wired,
 * so every registered workflow returns a no-op — but the plug-in point exists, so Phase 1
 * agents attach here by adding an entry to WORKFLOWS.
 */

export interface NextAction {
  type: "run_agent" | "emit_event" | "noop";
  /** For `run_agent`: the agent folder name under services/agents. */
  agent?: string;
  /** For `emit_event`: the follow-up event to publish. */
  event?: EventName;
  reason: string;
}

export type Workflow = (event: EventEnvelope) => NextAction[];

/**
 * Registry mapping an incoming event to the steps it triggers. Phase 1+ fills these in, e.g.
 *   "request.created": () => [{ type: "run_agent", agent: "part-intent-extractor", reason: ... }]
 */
export const WORKFLOWS: Partial<Record<EventName, Workflow>> = {
  "order.created": () => [
    { type: "noop", reason: "Phase 0: order created; no agents wired yet" },
  ],
  "order.status_changed": () => [
    { type: "noop", reason: "Phase 0: status changed; no downstream agents yet" },
  ],
};

/** Decide the next actions for an event. Pure and deterministic. */
export function planNext(event: EventEnvelope): NextAction[] {
  const wf = WORKFLOWS[event.name];
  if (!wf) {
    return [{ type: "noop", reason: `no workflow registered for ${event.name}` }];
  }
  return wf(event);
}
