import { DirectClient } from "@elizaos/client-direct";
import {
	AgentRuntime,
	elizaLogger,
	settings,
	stringToUuid,
	type Character,
} from "@elizaos/core";
import { bootstrapPlugin } from "@elizaos/plugin-bootstrap";
import { createNodePlugin } from "@elizaos/plugin-node";
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDbCache } from "./cache/index.ts";
import { character, sayaUUID } from "./character.ts";
import { startChat } from "./chat/index.ts";
import { initializeClients } from "./clients/index.ts";
import {
	getTokenForProvider,
	loadCharacters,
	parseArguments,
} from "./config/index.ts";
import { initializeDatabase } from "./database/index.ts";
import { sayaPlugin } from "./plugins/sayaPlugin/index.ts";
import { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
	const waitTime =
		Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
	return new Promise((resolve) => setTimeout(resolve, waitTime));
};

let nodePlugin: any | undefined;

export function createAgent(
	character: Character,
	db: any,
	cache: any,
	token: string
) {
	elizaLogger.success(
		elizaLogger.successesTitle,
		"Creating runtime for character",
		character.name
	);

	nodePlugin ??= createNodePlugin();

	return new AgentRuntime({
		databaseAdapter: db,
		token,
		modelProvider: character.modelProvider,
		evaluators: [],
		character,
		plugins: [bootstrapPlugin, nodePlugin, sayaPlugin].filter(Boolean),
		providers: [],
		actions: [],
		services: [],
		managers: [],
		cacheManager: cache,
	});
}

async function startAgent(character: Character, directClient: DirectClient) {
	try {
		character.id ??= stringToUuid(character.name);
		character.username ??= character.name;

		const token = getTokenForProvider(character.modelProvider, character);
		const dataDir = path.join(__dirname, "../data");

		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}

		const db = initializeDatabase(dataDir);

		await db.init();

		const cache = initializeDbCache(character, db);
		const runtime = createAgent(character, db, cache, token);

		await runtime.initialize();

		runtime.clients = await initializeClients(character, runtime);

		directClient.registerAgent(runtime);

		// report to console
		elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

		return runtime;
	} catch (error) {
		elizaLogger.error(
			`Error starting agent for character ${character.name}:`,
			error
		);
		console.error(error);
		throw error;
	}
}

const checkPortAvailable = (port: number): Promise<boolean> => {
	return new Promise((resolve) => {
		const server = net.createServer();

		server.once("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				resolve(false);
			}
		});

		server.once("listening", () => {
			server.close();
			resolve(true);
		});

		server.listen(port);
	});
};

const startAgents = async () => {
	const directClient = new DirectClient();
	let serverPort = parseInt(settings.SERVER_PORT || "3000");
	const args = parseArguments();

	let charactersArg = args.characters || args.character;
	let characters = [character];

	console.log("charactersArg", charactersArg);
	if (charactersArg) {
		characters = await loadCharacters(charactersArg);
	}
	console.log("characters", characters);
	try {
		for (const character of characters) {
			const runtime = await startAgent(character, directClient as DirectClient);
			if (character.id === sayaUUID) {
				extendDirectClient(directClient, runtime);
			}
		}
	} catch (error) {
		elizaLogger.error("Error starting agents:", error);
	}

	while (!(await checkPortAvailable(serverPort))) {
		elizaLogger.warn(`Port ${serverPort} is in use, trying ${serverPort + 1}`);
		serverPort++;
	}

	// upload some agent functionality into directClient
	directClient.startAgent = async (character: Character) => {
		// wrap it so we don't have to inject directClient later
		return startAgent(character, directClient);
	};

	directClient.start(serverPort);

	if (serverPort !== parseInt(settings.SERVER_PORT || "3000")) {
		elizaLogger.log(`Server started on alternate port ${serverPort}`);
	}

	elizaLogger.log("Chat started. Type 'exit' to quit.");
	const chat = startChat(characters);
	chat();
};

const extendDirectClient = (
	directClient: DirectClient,
	runtime: AgentRuntime
) => {
	directClient.app.post(
		"/addTopicBlacklist",
		async (req: Request, res: Response) => {
			const agent = directClient;
			const newAddList = req.body as string[];

			const oldList =
				(await runtime.cacheManager.get<string[]>("topic_black_list")) ?? [];

			const newList = Array.from(new Set(oldList.concat(newAddList)));

			runtime.cacheManager.set("topic_black_list", newList);

			res.status(200).json({ success: true, list: newList });
		}
	);

	directClient.app.post(
		"/addUserBlacklist",
		async (req: Request, res: Response) => {
			const newAddList = req.body as string[];

			const oldList =
				(await runtime.cacheManager.get<string[]>("user_black_list")) ?? [];

			const newList = Array.from(new Set(oldList.concat(newAddList)));

			runtime.cacheManager.set("user_black_list", newList);

			res.status(200).json({ success: true, list: newList });
		}
	);
};

startAgents().catch((error) => {
	elizaLogger.error("Unhandled error in startAgents:", error);
	process.exit(1);
});
