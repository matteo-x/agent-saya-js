import { settings } from "@elizaos/core";
import readline from "readline";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.on("SIGINT", () => {
	rl.close();
	process.exit(0);
});

async function handleUserInput(input, agentId, roomId, userId, userName) {
	if (input.toLowerCase() === "exit") {
		rl.close();
		process.exit(0);
	}

	try {
		const serverPort = parseInt(settings.SERVER_PORT || "3000");

		const response = await fetch(
			`http://localhost:${serverPort}/${agentId}/message`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: input,
					userId: userId,
					userName: userName,
					roomId: roomId,
				}),
			}
		);

		const data = await response.json();
		data.forEach((message) => console.log(`${"Agent"}: ${message.text}`));
	} catch (error) {
		console.error("Error fetching response:", error);
	}
}

export function startChat(characters) {
	const roomId = "room-" + new Date().getDate().toString();
	const user = "user-" + new Date().getDate().toString();
	function chat() {
		const agentId = characters[0].name ?? "Agent";
		rl.question("You: ", async (input) => {
			await handleUserInput(input, agentId, roomId, user, user);
			if (input.toLowerCase() !== "exit") {
				chat(); // Loop back to ask another question
			}
		});
	}

	return chat;
}
