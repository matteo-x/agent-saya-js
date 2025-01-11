# Saya – The Visionary Leader [@hisaya_ai](https://x.com/hisaya_ai)

Saya is the fearless leader of the Spores Squad, a brilliant adventurer whose foresight drives the team’s success in the dark forest. She is the architect of a forthcoming DAO fund, designed to help users discover and capitalize on hidden "gems" within this adversarial blockchain landscape.

At her disposal is a powerful network of internal virtual AI agents built on Swarms Intelligence as well, each serving as her trusted assistant. These agents are seamlessly integrated with a trading and investment system—a robust infrastructure that has delivered consistent, long-term profits. This system doesn’t just support Saya; it also learns from her, using her decisions and strategies to refine its performance and adapt to the forest's ever-changing dynamics.

Saya's unique blend of leadership, strategy, and collaboration ensures that the Spores Squad remains resilient and ahead of the curve.

More is being updated....

## Edit the character files

Open `src/character.ts` to modify the default character. Uncomment and edit.

### Custom characters

To load custom characters instead:

- Use `pnpm start --characters="path/to/your/character.json"`
- Multiple character files can be loaded simultaneously

### Add clients

```diff
- clients: [],
+ clients: [Clients.TWITTER, Clients.DISCORD],
```

## Duplicate the .env.example template

```bash
cp .env.example .env
```

\* Fill out the .env file with your own values.

### Add login credentials and keys to .env

```diff
-DISCORD_APPLICATION_ID=
-DISCORD_API_TOKEN= # Bot token
+DISCORD_APPLICATION_ID="000000772361146438"
+DISCORD_API_TOKEN="OTk1MTU1NzcyMzYxMT000000.000000.00000000000000000000000000000000"
...
-OPENROUTER_API_KEY=
+OPENROUTER_API_KEY="sk-xx-xx-xxx"
...
-TWITTER_USERNAME= # Account username
-TWITTER_PASSWORD= # Account password
-TWITTER_EMAIL= # Account email
+TWITTER_USERNAME="username"
+TWITTER_PASSWORD="password"
+TWITTER_EMAIL="your@email.com"
```

## Install dependencies and start your agent

```bash
pnpm i && pnpm start
```

Note: this requires node to be at least version 22 when you install packages and run the agent.
