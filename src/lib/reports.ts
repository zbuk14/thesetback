import { getCollection } from 'astro:content';

/** Maps a report slug to the href of its Part 2, for reports that have one. */
export async function getNumbersHrefs(): Promise<Map<string, string>> {
  const numbers = await getCollection('numbers');
  return new Map(numbers.map((n) => [n.data.report, `/reports/${n.data.report}/numbers`]));
}
