import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as booru from 'booru';
import { Client } from 'discord.js';
import SearchParameters from 'booru/dist/structures/SearchParameters';
import SearchResults from 'booru/dist/structures/SearchResults';
import Post from 'booru/dist/structures/Post';

type Config = {
    Discord: {
        Token: string,
        Prefix: string,
        Channel: string
    }
}

async function loadConfig(): Promise<Config> {
    const file = await fs.readFile('./config.yaml', 'utf-8');
    const doc = yaml.load(file);
    return doc as Config;
}

function booruStream(site: string, tags: string | string[], options: SearchParameters, interval: number, callback: (posts: Post[]) => any) {
    let prevPosts: string[] = [];
    
    setInterval(async () => {
        const searchResults = await booru.search(site, tags, options);
        const posts = searchResults.posts.filter(p => !prevPosts.includes(p.id));

        if (!posts || posts.length === 0) return;

        callback(posts);

        prevPosts.splice(0, posts.length - 1);
        prevPosts.push(...posts.map(p => p.id));
    }, interval)
}

async function listenForPosts(client: Client, config: Config) {
    const channel = client.channels.cache.get(config.Discord.Channel);
    if (!channel || channel.type !== 'GUILD_TEXT') return;

    booruStream('gb', [], { limit: 1 }, 5000, (posts) => {
        for (const post of posts) {
            console.log(post.fileUrl);
            channel.send({
                files: [post.fileUrl]
            }).catch(console.error);
        }
    });
}

async function main() {
    const client = new Client({
        intents: ['GUILDS', 'GUILD_MESSAGES'],
        retryLimit: 100000,
        restRequestTimeout: 1000000000
    });

    const config = await loadConfig();

    client.on('ready', () => {
        console.log('Logged in as ' + client.user.tag);
        listenForPosts(client, config);
    });

    client.login(config.Discord.Token);
}

main();