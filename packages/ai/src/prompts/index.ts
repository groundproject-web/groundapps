/**
 * Prompts versionados. Mudou o texto → nova versão (novo arquivo), nunca edição silenciosa.
 * A versão vai para o registro de custo (ai_usage.prompt_version).
 */
export { default as mappingV1 } from "./mapping.v1";
export { default as missionCopyV1 } from "./mission-copy.v1";
export { default as replyClassifierV1 } from "./reply-classifier.v1";
export { default as personaV1 } from "./persona.v1";
export { default as competitorResearchV1 } from "./competitor-research.v1";

export interface PromptDef {
  id: string;
  version: string;
  system: string;
}
