/**
 * Word-level sync (CLAUDE.md §5, "Semantic 1:1 Lock"). scripts/align_audio.py writes
 * `episodes/<id>/audio/words.json`: [{word, start, end}] in seconds. Visual states key off these, never off
 * hand-typed frame numbers, so a re-recorded line re-times every cue automatically.
 */
export type Word = {word: string; start: number; end: number};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Frame at which `phrase` (one or more words) begins, `occurrence` counting from 0.
 * `leadFrames` starts the visual slightly early so it LANDS on the syllable (within 100ms).
 * Throws when the phrase is absent: a missing cue is a script/audio mismatch, never a silent frame 0.
 */
export const cueFrame = (words: Word[], phrase: string, fps: number, occurrence = 0, leadFrames = 2): number => {
	const target = phrase.split(/\s+/).map(norm).filter(Boolean);
	let seen = 0;
	for (let i = 0; i + target.length <= words.length; i++) {
		if (target.every((t, j) => norm(words[i + j].word) === t)) {
			if (seen === occurrence) return Math.max(0, Math.round(words[i].start * fps) - leadFrames);
			seen++;
		}
	}
	throw new Error(`cue not found in alignment: "${phrase}" (occurrence ${occurrence})`);
};
