export {
  runNewsBotPipeline as runNewsBot,
  runNewsBotFetchPhase,
  runNewsBotProcessPhase,
} from "@/lib/bot/pipeline";
export type {
  NewsBotProcessPhaseResult as NewsBotResult,
  NewsBotPipelineResult,
  NewsBotFetchPhaseResult,
} from "@/lib/bot/pipeline";
