import { ClientBase } from "./base.ts";
import { QueryTweetsResponse, SearchMode, Tweet } from "agent-twitter-client";
import { Client } from "twitter-api-sdk";
import { TwitterConfig } from "./environment.ts";
import { IAgentRuntime } from "@elizaos/core";

export class MixClientBase extends ClientBase {
	twitterSdkClient = new Client(process.env.TWITTER_SDK_BEARER_TOKEN);

	constructor(runtime: IAgentRuntime, twitterConfig: TwitterConfig) {
		super(runtime, twitterConfig);
	}

	async fetchHomeTimeline(count: number): Promise<Tweet[]> {
		try {
			const result = await this.fetchHomeTimelineBySdk(count);
			return result;
		} catch (e) {
			console.log(
				"[MixClientBase] fetchHomeTimeline fail, will callback to spider",
				e?.error
			);
			return super.fetchHomeTimeline(count);
		}
	}

	async fetchSearchTweets(
		query: string,
		maxTweets: number,
		searchMode: SearchMode,
		cursor?: string
	): Promise<QueryTweetsResponse> {
		const shouldUseSdk = this.shouldUseSdk();

		console.log(
			"[MixClientBase] fetchSearchTweets is called, shouldUseSdk = ",
			shouldUseSdk
		);

		if (shouldUseSdk) {
			try {
				const result = await this.fetchSearchTweetsBySdk(
					query,
					maxTweets,
					searchMode,
					cursor
				);
				return result;
			} catch (e) {
				console.log(
					"[MixClientBase] fetchSearchTweetsBySdk fail, will callback to spider",
					e?.error
				);
				return super.fetchSearchTweets(query, maxTweets, searchMode, cursor);
			}
		} else {
			return super.fetchSearchTweets(query, maxTweets, searchMode, cursor);
		}
	}

	shouldUseSdk() {
		// 10 requests / 15 mins
		return true;
	}

	async fetchSearchTweetsBySdk(
		query: string,
		maxTweets: number,
		searchMode: SearchMode,
		cursor?: string
	): Promise<QueryTweetsResponse> {
		console.log(
			"[MixClientBase] fetchSearchTweetsBySdk is called",
			query,
			maxTweets,
			searchMode,
			cursor,
			this.runtime.character.twitterProfile.id
		);

		return this.getMentions(
			this.runtime.character.twitterProfile.id,
			this.lastCheckedTweetId ? this.lastCheckedTweetId.toString() : null
		);
	}

	async getMentions(userId: string, lastCheckedTweetId?: string) {
		console.log(
			`[MixClientBase] getMentions is called at ${new Date().toISOString()}, lastCheckedTweetId = ${lastCheckedTweetId}`
		);

		const tweetsFromSdk = await this.twitterSdkClient.tweets.usersIdMentions(
			userId,
			{
				expansions: ["author_id", "in_reply_to_user_id"],
				"tweet.fields": ["conversation_id", "created_at"],
				"user.fields": ["name", "username"],
				since_id: lastCheckedTweetId,
				max_results: 20,
			}
		);

		console.log("[MixClientBase] tweets request success.");

		const tweetsTarget = this.convert(tweetsFromSdk);

		console.log(
			`[MixClientBase] result tweetId = ${tweetsTarget.tweets
				.map((item) => item.id)
				.join(",")}`
		);

		return tweetsTarget;
	}

	async fetchHomeTimelineBySdk(count: number): Promise<Tweet[]> {
		const tweetsFromSdk = await this.twitterSdkClient.tweets.usersIdTweets(
			this.profile.id,
			{
				expansions: ["author_id", "in_reply_to_user_id"],
				"tweet.fields": ["conversation_id", "created_at"],
				"user.fields": ["name", "username"],
				max_results: count,
			}
		);

		console.log("[MixClientBase] tweets request success.");

		const tweetsTarget = this.convert(tweetsFromSdk);

		console.log(
			`[MixClientBase] result tweetId = ${tweetsTarget.tweets
				.map((item) => item.id)
				.join(",")}`
		);

		return tweetsTarget.tweets;
	}

	convert(
		tweetFromSdk: Awaited<
			ReturnType<typeof this.twitterSdkClient.tweets.usersIdMentions>
		>
	): QueryTweetsResponse {
		const hasNewTweets = (tweetFromSdk?.meta?.result_count ?? 0) > 0;

		if (!hasNewTweets) {
			return { tweets: [] };
		}

		const tweetBaseData = tweetFromSdk.data;
		const tweetUsersMap = new Map(
			tweetFromSdk.includes.users.map((user) => [user.id, user])
		);

		const tweets: Tweet[] = tweetBaseData?.map((tweetBase) => ({
			userId: tweetBase.author_id,
			id: tweetBase.id,
			conversationId: tweetBase.conversation_id,
			name: tweetUsersMap.get(tweetBase.author_id).name,
			username: tweetUsersMap.get(tweetBase.author_id).username,
			text: tweetBase.text,
			timestamp: new Date(tweetBase.created_at).getTime(),
			permanentUrl: `https://x.com/${
				tweetUsersMap.get(tweetBase.author_id).username
			}/status/${tweetBase.id}`,
			hashtags: [],
			mentions: [],
			photos: [],
			thread: [],
			urls: [],
			videos: [],
		}));

		return { tweets: tweets };
	}
}
