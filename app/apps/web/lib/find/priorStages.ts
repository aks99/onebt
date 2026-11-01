// Prior Stages (6.5): the five described facts, validated the same way on the client and the server.

export interface StageInput { month: number | null; year: number | null; city: string; countryCode: string | null; organization: string; audienceSize: number | null; topic: string; resultLine: string; link: string }

export function validateStage(s: StageInput): Record<string, string> {
  const e: Record<string, string> = {};
  if ((s.organization ?? "").trim().length < 2) e.organization = "Which organization or event?";
  if ((s.topic ?? "").trim().length < 5) e.topic = "What did you speak about, in one line?";
  if (s.year !== null && (s.year < 1950 || s.year > 2100)) e.year = "Check the year.";
  if (s.month !== null && (s.month < 1 || s.month > 12)) e.month = "Pick a month.";
  if (s.audienceSize !== null && s.audienceSize < 0) e.audienceSize = "Audience size cannot be negative.";
  if (s.link && !/^https?:\/\/\S+$/i.test(s.link)) e.link = "A public link starts with http:// or https://. Leave it empty if there is none.";
  return e;
}
