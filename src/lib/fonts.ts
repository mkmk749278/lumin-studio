import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';

// Vendored OFL fonts (public/fonts). Never fetched from the network at render time (CLAUDE.md §4.3).
const faces = [
	{family: 'Inter', file: 'fonts/Inter-400.woff2', weight: '400'},
	{family: 'Inter', file: 'fonts/Inter-500.woff2', weight: '500'},
	{family: 'Inter', file: 'fonts/Inter-600.woff2', weight: '600'},
	{family: 'Inter', file: 'fonts/Inter-700.woff2', weight: '700'},
	{family: 'JetBrains Mono', file: 'fonts/JetBrainsMono-400.woff2', weight: '400'},
	{family: 'JetBrains Mono', file: 'fonts/JetBrainsMono-500.woff2', weight: '500'},
	{family: 'JetBrains Mono', file: 'fonts/JetBrainsMono-700.woff2', weight: '700'},
];

let loaded = false;

/** Call once at module level in Root.tsx; holds the first frame until every face is ready. */
export const loadStudioFonts = (): void => {
	if (loaded) return;
	loaded = true;
	const handle = delayRender('studio fonts');
	Promise.all(faces.map((f) => loadFont({family: f.family, url: staticFile(f.file), weight: f.weight})))
		.then(() => continueRender(handle))
		.catch((err: unknown) => {
			throw err instanceof Error ? err : new Error(String(err));
		});
};
