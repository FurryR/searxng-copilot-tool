// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const TOOL_NAME = 'searxng_search';
const CONFIG_SECTION = 'searxngCopilotTool';

type ToolInput = {
	query: string;
};

type SearxngResult = {
	title?: string;
	url?: string;
	content?: string;
	score?: number;
};

type SearxngResponse = {
	query?: string;
	results?: SearxngResult[];
};

class SearxngSearchTool implements vscode.LanguageModelTool<ToolInput> {
	prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<ToolInput>
	): vscode.PreparedToolInvocation {
		const query = options.input.query?.trim() ?? '';
		return {
			invocationMessage: query
				? `Searching SearXNG for "${query}"`
				: 'Searching SearXNG'
		};
	}

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<ToolInput>,
		token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		const query = options.input.query?.trim();
		if (!query) {
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart('Missing search query.')
			]);
		}

		const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
		const endpoint = (config.get<string>('endpoint') ?? '').trim();
		const apiToken = (config.get<string>('token') ?? '').trim();
		const scoreThreshold = config.get<number>('scoreThreshold') ?? 0;

		if (!endpoint) {
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(
					'Missing SearXNG endpoint. Set searxngCopilotTool.endpoint in settings.'
				)
			]);
		}
		// if (!apiToken) {
		// 	return new vscode.LanguageModelToolResult([
		// 		new vscode.LanguageModelTextPart(
		// 			'Missing SearXNG token. Set searxngCopilotTool.token in settings.'
		// 		)
		// 	]);
		// }

		let url: URL;
		try {
			url = new URL(endpoint);
		} catch (error) {
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(
					`Invalid endpoint URL: ${String(error)}`
				)
			]);
		}

		url.searchParams.set('q', query);
		url.searchParams.set('format', 'json');

		const controller = new AbortController();
		const cancelSubscription = token.onCancellationRequested(() => {
			controller.abort();
		});

		try {
			const headers: Record<string, string> = {
				Accept: 'application/json'
			};
			headers['X-API-Key'] = apiToken;

			const response = await fetch(url.toString(), {
				method: 'GET',
				headers,
				signal: controller.signal
			});

			if (!response.ok) {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart(
						`SearXNG request failed: ${response.status} ${response.statusText}`
					)
				]);
			}

			const data = (await response.json()) as SearxngResponse;
			const results = Array.isArray(data.results) ? data.results : [];
			const filtered = results.filter((result) => {
				const score = typeof result.score === 'number' ? result.score : 0;
				return score >= scoreThreshold;
			});

			const output = filtered.map((result) => ({
				title: result.title ?? '',
				url: result.url ?? '',
				snippet: result.content ?? '',
				score: typeof result.score === 'number' ? result.score : 0
			}));

			const text = output.length
				? output
						.map((result) => {
							const title = result.title || 'Untitled result';
							const url = result.url || '';
							const snippet = result.snippet || 'No snippet provided.';
							return [
								`- [${title}](${url})`,
								`  - Score: ${result.score}`,
								`  - Snippet: ${snippet}`
							].join('\n');
						})
						.join('\n\n')
				: 'No results returned.';

			const markdown = `${text}\n\nUse the fetch tool to retrieve detailed results.`;

			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(markdown)
			]);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return new vscode.LanguageModelToolResult([
					new vscode.LanguageModelTextPart('Search cancelled.')
				]);
			}
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart(
					`SearXNG request failed: ${String(error)}`
				)
			]);
		} finally {
			cancelSubscription.dispose();
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.lm.registerTool(TOOL_NAME, new SearxngSearchTool())
	);
}

export function deactivate() {}
