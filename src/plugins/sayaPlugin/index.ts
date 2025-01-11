import { Plugin } from "@elizaos/core";
import { recommendationAction } from "./actions/recommendationAction.ts";
import { EscrowProvider } from "./providers/EscrowProvider.ts";

export const sayaPlugin: Plugin = {
	name: "SayaPlugin",
	actions: [recommendationAction],
	providers: [EscrowProvider],
	description: "Query and feed info of saya",
};
