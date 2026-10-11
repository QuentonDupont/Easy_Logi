import type { AgentRunner, StoredEvent } from "@easy-logi/workflows";

/**
 * AgentRunner registry. Phase 1 agents register here (name -> run function) as they land; each
 * will build its input via plain-code retrieval, call `runAgent` from @easy-logi/agent-runtime,
 * and publish the resulting event. Until then the registry is empty and `run` reports the agent is
 * not yet wired (handled: false) rather than failing the message.
 */
export type RegisteredAgent = (event: StoredEvent) => Promise<void>;

export function createAgentRunner(
  registry: Record<string, RegisteredAgent> = {},
): AgentRunner {
  return {
    async run(agentName, event) {
      const agent = registry[agentName];
      if (!agent) {
        console.warn(
          `[worker] no agent registered for "${agentName}" (event ${event.id}); skipping`,
        );
        return { handled: false };
      }
      await agent(event);
      return { handled: true };
    },
  };
}
