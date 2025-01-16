import { TwitterApi, TweetV2PostTweetResult } from "twitter-api-v2";
import { ClientBase } from "./base.ts";
import { TwitterPostClient } from "./post.ts";
import { Client } from "twitter-api-sdk";
import { getTopicBlacklist } from "./blacklist.ts";
import { IAgentRuntime } from "@elizaos/core";

export class MixTwitterPostClient extends TwitterPostClient {
	twitterSDKClient: TwitterApi;
	twitterOfficialSdkClient: Client;

	recordHistory: { timeStamp: number }[] = [];

	// default is false, because the allow to use sdk is limited
	enableSdk: boolean = false;

	constructor(client: ClientBase, runtime: IAgentRuntime) {
		super(client, runtime);

		this.twitterSDKClient = new TwitterApi({
			appKey: process.env.TWITTER_SDK_API_KEY,
			appSecret: process.env.TWITTER_SDK_API_KEY_SECRET,
			accessToken: process.env.TWITTER_SDK_ACCESS_TOKEN,
			accessSecret: process.env.TWITTER_SDK_ACCESS_TOKEN_SECRET,
		});

		this.twitterOfficialSdkClient = new Client(
			process.env.TWITTER_SDK_BEARER_TOKEN
		);
	}

	shouldUseSdk() {
		if (!this.enableSdk) {
			return false;
		}

		if (this.recordHistory.length <= 100) {
			return true;
		}

		this.recordHistory = this.recordHistory.slice(1);

		const currentDate = new Date().getTime();

		const result =
			currentDate - this.recordHistory[0].timeStamp > 24 * 3600 * 1000;

		console.log(
			`currentTime =${currentDate}, first peek time = ${this.recordHistory[0].timeStamp}, result = ${result}`
		);
		return result;
	}

	override async sendTweet(_content: string, _inReplyTo: string = null) {
		const topicBlacklist = await getTopicBlacklist(this.runtime.cacheManager);

		const content = _content.replace(
			new RegExp(`${topicBlacklist.join("|")}/g`, "g"),
			""
		);

		console.log("sendTweet is called, shouldUseSdk = ", this.shouldUseSdk());

		if (this.shouldUseSdk()) {
			try {
				const result = await this.sendTweetBySdk(content, _inReplyTo);
				return result;
			} catch (e) {
				console.log("sendTweetBySdk fail, will callback to spider", e?.errors);
				return super.sendTweet(content, _inReplyTo);
			}
		} else {
			return super.sendTweet(content, _inReplyTo);
		}
	}

	async sendTweetBySdk(content: string, _inReplyTo?: string) {
		console.log(
			"sendTweetBySdk is called, content = ",
			content,
			", _inReplyTo = ",
			_inReplyTo
		);

		let param;
		if (_inReplyTo) {
			param = {
				text: content,
				reply: {
					in_reply_to_tweet_id: _inReplyTo,
				},
			};
		} else {
			param = {
				text: content,
			};
		}

		const resultSdkFormat = await this.twitterSDKClient.v2.tweet(param);

		this.recordHistory.push({ timeStamp: new Date().getTime() });

		console.log("sendTweetBySdk success, response = ", resultSdkFormat.data);

		let _conversationId = "";
		if (_inReplyTo) {
			const tweetSdkFormat =
				await this.twitterOfficialSdkClient.tweets.findTweetById(
					resultSdkFormat.data.id,
					{
						expansions: ["author_id", "in_reply_to_user_id"],
						"tweet.fields": ["conversation_id", "created_at"],
						"user.fields": ["name", "username"],
					}
				);

			_conversationId = tweetSdkFormat.data.conversation_id;
		}

		const response = this.convert(resultSdkFormat, _inReplyTo, _conversationId);

		console.log("convert success");

		return response;
	}

	convert(
		resultSdkFormat: TweetV2PostTweetResult,
		_inReplyTo?: string,
		_conversationId?: string
	): Response {
		const innerResult = {
			rest_id: resultSdkFormat.data.id,
			legacy: {
				full_text: resultSdkFormat.data.text,
				conversation_id_str: _conversationId,
				created_at: new Date().getTime(),
				in_reply_to_status_id_str: _inReplyTo ? _inReplyTo : "",
			},
		};

		const json = () => {
			return {
				data: {
					create_tweet: { tweet_results: { result: innerResult } },
				},
			};
		};

		const result = {
			json: json,
		};

		return result as any as Response;
	}
}
