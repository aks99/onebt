# Technical Architecture, APIs, Costs and Legal Constraints for a TEDx Speaker-Prep Web App (state as of 2026)

All URLs below were viewed on 2026-10-30 unless stated otherwise. All prices in USD unless marked (Gladia prices are quoted in EUR by the source). Prices marked **[unverified]** could not be confirmed on the vendor's own pricing page during this research. Note: the web-search budget for this session was exhausted after ~45 searches; the remaining gaps below are explicitly listed so the report writer does not infer coverage that does not exist.

Incumbent stack assumption throughout: React/Next.js front end + Supabase (Auth, Postgres, Storage, Edge Functions). Recommendations favour keeping that stack and adding services around it rather than migrating.

---

## 1. Speech-to-text and speech analytics (vendor comparison, filler words, metrics computation, reference values)

### Takeaway
For a rehearsal-analytics product the two best-fit STT vendors are Deepgram Nova-3 (documented `filler_words=true` that keeps "uh/um/mhmm…", word timestamps, en-IN and Hindi, batch + streaming, $0.0077/min PAYG) and AssemblyAI Universal-3.5 Pro (documented `disfluencies=true`, $0.21/hr = $0.0035/min, cheapest for quality batch). OpenAI gpt-transcribe is $0.0045/min but has no documented verbatim/filler option on the pages viewed; Google STT v2 and Azure are more expensive at list price and have no documented filler-word retention in the pages viewed. Pace/pause/pitch/energy metrics should be computed in your own pipeline from word timestamps plus a Praat/Parselmouth or librosa pass; the only sourced pace reference is a VirtualSpeech sample of five TED talks averaging 173 WPM (range 154–201) versus conversational 120–150 WPM.

### Cited Findings

**Deepgram (Nova-3 / Flux)**
- Nova-3 Monolingual $0.0077/min pay-as-you-go, $0.0065/min Growth; Nova-3 Multilingual $0.0092/min PAYG, $0.0078/min Growth; Flux STT English $0.0077/min PAYG. FAQ equivalents: $0.46/hr PAYG and $0.39/hr Growth for monolingual streaming; $0.55/hr multilingual Nova-3. The page does not list separate pre-recorded vs streaming rates; the FAQ says pre-recorded "runs lower" without a figure — [Deepgram pricing](https://deepgram.com/pricing)
- Add-ons per minute (PAYG/Growth): Speaker Diarization $0.0020/$0.0017; Redaction $0.0020/$0.0017; Keyterm Prompting $0.0013/$0.0012; Entity Detection $0.0017; Smart Formatting included. Audio Intelligence (summarization, topics, sentiment, intent) billed at $0.0003 per 1k input tokens and $0.0006 per 1k output tokens PAYG — [Deepgram pricing](https://deepgram.com/pricing)
- New accounts get a $200 non-expiring credit (≈43,000 minutes of Nova-3 per Deepgram's FAQ); Growth starts at $4,000+/year prepaid for up to 20% savings; concurrency 150 streaming connections on PAYG, 225 on Growth; billing per second with no minimum — [Deepgram pricing](https://deepgram.com/pricing)
- `filler_words=true` keeps filler words; default `false` removes "uh" and "um". Detected tokens: uh, um, mhmm, mm-mm, uh-uh, uh-huh, nuh-uh (always normalised to that spelling, e.g., "uhhhh" → "uh"). Available for Nova, Nova-2 and Nova-3 general models; page badges list Pre-recorded and Streaming, English — [Deepgram filler words docs](https://developers.deepgram.com/docs/filler-words.md)
- Nova-3 language list includes Hindi (`hi`) in both multilingual and monolingual groups, and English variants `en`, `en-US`, `en-GB`, `en-AU`, `en-NZ`, `en-IN`, `en-CA`. Nova-3 is recommended "in batch or streaming"; Flux is described as a streaming model for voice agents. The page does not name a Hindi–English code-switching option for general Nova-3 — [Deepgram models & languages](https://developers.deepgram.com/docs/models-languages-overview)
- Verbatim vs clean output discussion (vendor article) — [Deepgram: filler words, verbatim vs clean](https://deepgram.com/learn/filler-words-speech-to-text-verbatim-vs-clean-output)

**AssemblyAI (Universal family)**
- Pre-recorded: Universal-3.5 Pro (`universal-3-5-pro`) $0.21/hr; Universal-2 (`universal-2`) $0.15/hr; SLAM-1 deprecated. Streaming (billed for WebSocket session time, including idle): Universal-3.6 Pro Realtime $0.45/hr base; Universal-Streaming English $0.15/hr; Universal-Streaming Multilingual $0.15/hr — [AssemblyAI pricing (authoritative .md)](https://www.assemblyai.com/pricing.md)
- Add-ons per hour: speaker diarization +$0.02 (async standard), +$0.065 (async experimental), +$0.12 (streaming); sentiment +$0.02; key phrases +$0.01; entity detection +$0.08; translation +$0.06; topic detection +$0.15; keyterms prompting +$0.05/hr on Universal-3.5 Pro. $50 free signup credit, no card — [AssemblyAI pricing](https://www.assemblyai.com/pricing.md)
- `disfluencies=true` keeps filler words (default removes them). Supported on Universal-3.5 Pro for English, Spanish, German, French, Portuguese, Italian; on Universal-2 for English only. The page gives "uh" and "um" as examples, not a full list, and does not mention streaming — [AssemblyAI filler words docs](https://www.assemblyai.com/docs/pre-recorded-audio/include-filler-words.md)
- Hindi is supported on Universal-2 in the "Good accuracy (>10% to ≤25% WER)" group; Universal-3.5 Pro "supports 18 languages" (not enumerated on the page); U-3.5 Pro lists American, British and Australian English variants; no `en_in` mentioned. With `language_code`, unsupported features error; with `language_detection`, unsupported features are silently omitted — [AssemblyAI supported languages](https://www.assemblyai.com/docs/speech-to-text/pre-recorded-audio/supported-languages)
- AssemblyAI's "LLM Gateway" (replacement for LeMUR) resells LLMs per 1M tokens, e.g., Claude 4.6 Sonnet $3/$15, GPT-5-Mini $0.25/$2, Gemini 2.5 Flash $0.30/$2.50; in-region (US/EU) routing is 10% higher — [AssemblyAI pricing](https://www.assemblyai.com/pricing.md)

**OpenAI transcription**
- `gpt-transcribe` $0.0045/min; `gpt-4o-transcribe` $2.50 input / $10.00 output per 1M audio tokens (page estimate ≈ $0.006/min); `gpt-4o-mini-transcribe` $1.25/$5.00 per 1M (≈ $0.003/min); `gpt-live-transcribe` and `gpt-realtime-whisper` $0.017/min; `gpt-realtime-translate` $0.034/min. `whisper-1` and `gpt-4o-transcribe-diarize` were not listed on the page viewed — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing?no_head=1)

**Google Cloud Speech-to-Text**
- V2 standard recognition $0.016/min for 0–500k min/month, stepping down to $0.004/min above 2M min; V2 dynamic batch $0.003/min; Chirp is listed within the Standard V2 model group (no separate Chirp 3 rate); V1 keeps a 60 free minutes/month tier and a logged ($0.016) vs not-logged ($0.024) split; billing per second — [Google STT pricing](https://cloud.google.com/speech-to-text/pricing/)

**Azure AI Speech (incl. Pronunciation Assessment)**
- The official pricing page rendered every price as a "$-" placeholder during this research; it does state that Pronunciation Assessment "is charged as standard Speech to Text", the F0 free tier is 5 audio hours/month (no batch on free), and commitment tiers of 2,000 / 10,000 / 50,000 hours/month exist — [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)
- A Microsoft Q&A answer dated 2025-11-04 gives US-East PAYG figures of $1/hr standard real-time (question) vs $1.32/hr (answer, internally inconsistent), $0.66/hr fast transcription REST, 2,000-hour commitment overage $0.66/hr, and confirms pronunciation assessment is billed under STT Standard with no extra feature charge **[unverified on the pricing page]** — [Microsoft Q&A on Pronunciation Assessment pricing](https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat)

**Speechmatics / Gladia / Rev.ai**
- Speechmatics (vendor comparison page, vendor claims): batch from $0.12/hr (Melia) with diarisation included; $100 signup credit; 55+ languages; real-time diarisation at no extra charge. Gladia as characterised by Speechmatics: batch from €0.16/hr (Solaria-3) or €0.27/hr (Solaria-1); real-time from €0.68/hr; add-ons €0.02–0.07/hr; diarisation batch-only. No WER figures given — [Speechmatics vs Gladia (vendor page)](https://www.speechmatics.com/how-we-compare/gladia-alternative.md)
- Rev.ai: only third-party comparison pages surfaced (e.g., [costbench Rev AI vs Speechmatics](https://costbench.com/compare/rev-ai-vs-speechmatics/), [Gladia's Rev.ai comparison](https://www.gladia.io/blog/rev-ai-vs-gladia-complete-comparison-for-global-teams-2026)); no Rev.ai first-party price was fetched **[unverified]**.

**Reference values for pace and pauses**
- Conversational speech 120–150 WPM; presentations 100–150 WPM "comfortable"; audiobooks and radio 150–160 WPM. VirtualSpeech's own dataset: median 111 WPM across 32,809 practice presentations (IQR 86–133). Five TED talks measured (including applause/slide time): Sinek 170, Cain 176, Robinson 165, Robbins 201, Brown 154 — average 173 WPM, range 154–201. Article gives no filler-word frequency or numeric pause benchmarks — [VirtualSpeech: average speaking rate](https://virtualspeech.com/blog/average-speaking-rate-words-per-)

**Acoustic-feature libraries**
- Parselmouth is a Python library wrapping Praat's C/C++ code, exposing Pitch, Intensity, Formant, Harmonicity, Spectrogram, MFCC classes; algorithms/outputs match Praat; Python 3 only — [Parselmouth docs](https://parselmouth.readthedocs.io/)
- openSMILE extracts audio/video features for signal processing and ML with a focus on speech emotion recognition; the docs index lists "Default feature sets" and a "Licensing" section but the fetched text did not expose feature-set names or licence terms — [openSMILE docs](https://audeering.github.io/opensmile/)

### Inferences
- **Recommended primary STT**: Deepgram Nova-3 (`filler_words=true`, `smart_format`, `utterances`/word timestamps, `language=en-IN` or `hi`) for rehearsal analytics because it is the only vendor among those checked with a documented, enumerated filler-token list that works in both batch and streaming. Use AssemblyAI Universal-3.5 Pro (`disfluencies=true`) as a cheaper batch fallback/second opinion for English (~55% cheaper per minute than Deepgram PAYG). Avoid relying on OpenAI/Google/Azure for filler detection until their docs confirm a verbatim mode.
- **Hindi/Indian English**: Deepgram documents both `hi` and `en-IN` on Nova-3; AssemblyAI documents Hindi only on Universal-2 at a 10–25% WER band. For Hinglish code-switching neither vendor documents a general Hindi–English multi-language mode on the pages viewed; test with real rehearsal audio before promising it.
- **Batch vs streaming**: rehearsal feedback is a post-hoc report, so use batch (cheaper, more accurate, allows diarization-free single-speaker mode). Use streaming only for a live "filler-word nudge" or live teleprompter sync; note AssemblyAI bills streaming for socket-open time including idle, so close sockets promptly.
- **Metric computation from word timestamps** (own pipeline, no vendor dependency):
  - WPM = words ÷ speaking minutes; report both gross WPM (total words ÷ total duration) and articulation rate (words ÷ (duration − pauses ≥ 0.5 s)).
  - Pause distribution: gaps between consecutive word end/start; bin 0.5–1 s (micro), 1–2 s (deliberate), >2 s (long); report count/min and longest pause; flag pauses >3 s that are not at sentence boundaries.
  - Filler rate: count of filler tokens ÷ minutes and ÷ 100 words (requires `filler_words`/`disfluencies` on); also count user-configurable "crutch" words ("like", "so", "you know", "basically") from the normal transcript.
  - Pitch/energy variation: run Parselmouth (Praat) on 16 kHz mono to get F0 mean/SD/range in semitones (voiced frames only) and intensity; RMS energy via librosa; express "energy/vocal variety" as coefficient of variation of F0 and RMS per 10-second window, normalised against the user's own baseline rather than an absolute scale (no sourced population norms exist in the material found).
  - Run these in a background worker (Python container on Trigger.dev/Inngest-triggered compute), not in Supabase Edge Functions (see §5 CPU limits).
- **Reference targets to display**: "TED-style delivery ~150–175 WPM" is defensible from the VirtualSpeech sample plus the general 150–160 WPM audiobook range; show pace as a band, not a single target, and show the user's trend across rehearsals.
- Cost per 10-minute rehearsal (batch, single speaker): Deepgram Nova-3 ≈ $0.077; AssemblyAI U-3.5 Pro ≈ $0.035; OpenAI gpt-transcribe ≈ $0.045; Google V2 batch ≈ $0.03 (standard ≈ $0.16); Azure ≈ $0.17 [unverified]. A heavy user doing 20 × 10-minute rehearsals/month costs ≈ $1.54 (Deepgram) or ≈ $0.70 (AssemblyAI).

### Gaps
- No vendor page viewed states which filler words OpenAI gpt-4o-transcribe/gpt-transcribe, Google Chirp or Azure retain; Azure Pronunciation Assessment's fluency/prosody outputs were not examined in docs.
- No 2025–2026 independent WER benchmark comparing these vendors on Indian-English or on filler-word recall was fetched (search budget exhausted before this could be done).
- No sourced filler-word benchmark (fillers per minute or per 100 words) was found; the VirtualSpeech article has none. Treat any "X fillers/min is good" threshold as a product decision until sourced.
- Rev.ai 2026 pricing and Gladia first-party pricing not fetched.
- openSMILE licence terms (commercial use) were not visible on the fetched page; verify before bundling eGeMAPS in a commercial product.
- Azure's actual per-hour prices are masked on the public pricing page; obtain from the Azure pricing calculator.

---

## 2. Video capture and analysis in the browser (recording, upload, storage/transcoding, gaze/gesture estimation, Yoodli/Poised)

### Takeaway
Record with `MediaRecorder` using a runtime `isTypeSupported` fallback (WebM/VP9+Opus → MP4), emit chunks with `start(timeslice)`, and push them via the tus resumable protocol directly to storage (never through a Next.js/Vercel function). For storage/playback, Cloudflare Stream ($5 per 1,000 min stored/month, $1 per 1,000 min delivered, free encoding) and Mux (720p: $0.0024/min/month storage, $0.0008/min delivery, basic encoding free, $20/month credit) are the simplest managed options; Supabase Storage + raw playback is cheapest for short-retention rehearsal clips. For eye contact, MediaPipe Face Landmarker (478 landmarks, 52 blendshapes, head-pose matrices) runs in-browser via WASM, which is also the privacy-preferred design: compute gaze metrics on-device and upload only aggregates.

### Cited Findings

**Browser recording**
- `MediaRecorder.start(timeslice)` captures media in chunks of `timeslice` ms, firing `dataavailable` (a `BlobEvent`) per chunk; `stop()` fires a final chunk; `requestData()` flushes early. `isTypeSupported(type)` is the static capability check; constructor options set container MIME type (e.g., `video/webm` or `video/mp4`) and bitrates; actual `videoBitsPerSecond` may differ from requested. MDN marks MediaRecorder as Baseline "Widely available" since April 2021 but notes "some parts of this feature may have varying levels of support" — [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- tus resumable upload protocol v1.0.0: client does `HEAD` to read `Upload-Offset`, resumes with `PATCH` (`Content-Type: application/offset+octet-stream`), server replies `204`; extensions include Creation (`POST` with `Upload-Length`/`Upload-Metadata`), Expiration (`Upload-Expires`), Checksum (`Upload-Checksum`, SHA-1 required, `460` on mismatch), Concatenation (parallel partial uploads), Termination — [tus protocol](https://tus.io/protocols/resumable-upload)
- Cloudflare Stream counts reserved `maxDurationSeconds` for unfinished "Direct Creator or TUS uploads" toward storage until completion/expiry (i.e., Stream accepts tus uploads) — [Cloudflare Stream pricing docs](https://developers.cloudflare.com/stream/pricing/index.md)

**Hosting / transcoding / playback prices**
- **Cloudflare Stream**: storage $5/month per 1,000 minutes (prepaid in $5 increments); delivery $1 per 1,000 minutes delivered; ingest and encoding "always free"; no separate egress; storage counted on original duration regardless of renditions; delivery counted per HTTP segment request (4-second segments for uploads); no free tier listed; 30 GB max file; WebRTC (WHEP) playback billed as delivery from Oct 15, 2026 — [Cloudflare Stream pricing docs](https://developers.cloudflare.com/stream/pricing/index.md); product page confirms $5/1,000 min stored and $1/1,000 min delivered — [Cloudflare Stream product page](https://www.cloudflare.com/products/cloudflare-stream/)
- **Mux Video**: Basic quality ingest free at all resolutions; Plus from $0.025/min (720p), Premium from $0.0375/min. Storage per minute per month: 720p $0.0024, 1080p $0.003, 2K $0.0048, 4K $0.0096 (cold storage up to 60% cheaper). Delivery per minute: 720p $0.0008 (first 100K min/month free), 1080p $0.001, 2K $0.0016, 4K $0.0032. Free plan: 100K delivery minutes/month, up to 10 stored videos. Pay-as-you-go includes $20/month credit; pre-pay Launch $20/mo for $100 credit, Scale $500/mo for $1,000 credit; enterprise discounts above ~$3K/month. MP4/static renditions from $0.0006/min; DRM $100/mo + $0.003/play; Mux Data analytics listed as free — [Mux pricing](https://mux.com/pricing)
- **Bunny Stream**: storage from $0.01/GB, CDN delivery from $0.005/GB, "No transcoding fees", $1/month minimum, free player and security features; DRM/Premium Encoding priced on request — [Bunny Stream pricing](https://bunny.net/pricing/stream/)
- **AWS Elemental MediaConvert** (US East Ohio, on-demand, per normalized minute): Basic tier $0.0075 first 100K min, $0.0053 next 900K; Professional $0.0120 first 50K; 1080p AVC ≤30 fps uses a 2× multiplier, so ≈ $0.015/output-minute Basic — [AWS MediaConvert pricing](https://aws.amazon.com/mediaconvert/pricing/)
- **Supabase Storage** (Pro plan): 100 GB included then $0.0213/GB; egress 250 GB included then $0.09/GB; cached egress $0.03/GB; image transformations $5 per 1,000 origin images beyond 100 — [Supabase pricing](https://supabase.com/pricing)

**In-browser face/pose analysis**
- MediaPipe Face Landmarker (Web/JS) outputs 478 3D face landmarks per face, 52 blendshape scores (facial expression), and facial transformation matrices; running modes IMAGE and VIDEO (video frames or live camera input); the JS app loads a WASM runtime and model file; `detect()`/`detectForVideo()` run synchronously and block the UI thread, so Google recommends web workers; code samples Apache 2.0 — [MediaPipe Face Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- A third-party enum listing of the MediaPipe/ARKit-style blendshape names (incl. eye-look and blink shapes) exists but is not Google documentation — [face_gesture_detector FaceBlendshape enum (pub.dev)](https://pub.dev/documentation/face_gesture_detector/latest/face_gesture_detector/FaceBlendshape.html)
- Community write-ups of real-time face tracking in the browser with MediaPipe — [Real-time face tracking in the browser with MediaPipe (DEV)](https://dev.to/kenzic/real-time-face-tracking-in-the-browser-with-mediapipe-22c9)

**Yoodli / Poised (what is public)**
- Toastmasters' partnership page says Yoodli reports eye contact, filler words ("ah", "um"), pacing (too fast/slow), word choice, "and others"; partnership began December 2022; no statement about where video is processed or stored — [Toastmasters × Yoodli](https://www.toastmasters.org/about/partnerships/yoodli)
- Yoodli's privacy hub states "Yoodli is SOC 2 Type 2 certified" and "Yoodli is GDPR compliant", with details deferred to a Trust Center; nothing about on-device processing, biometrics, retention or named subprocessors on that page — [Yoodli privacy hub](https://yoodli.ai/privacy)

### Inferences
- **Recording pipeline**: `getUserMedia` (720p30, mono 48 kHz Opus) → `MediaRecorder` with candidate list `["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/mp4"]` chosen via `isTypeSupported` → `start(1000–3000 ms)` chunks → tus upload (Uppy/tus-js-client) straight to Supabase Storage (resumable endpoint), Cloudflare Stream Direct Creator Upload, or Mux Direct Upload. Keep a local IndexedDB buffer of chunks until the server acknowledges the final offset so a tab crash does not lose a rehearsal. Extract a separate 16 kHz mono WAV server-side (FFmpeg) for STT and Praat; send that to Deepgram/AssemblyAI rather than the full video.
- **Why direct-to-storage**: Vercel Fluid functions cap at 300 s default/800 s max on Pro and 2 GB/1 vCPU default (see §5), and Supabase Edge Functions allow 2 s CPU per request (§5), so neither should proxy multi-hundred-MB uploads or run FFmpeg.
- **Storage economics per 10-minute 720p rehearsal (≈190 MB at 2.5 Mbps)**: Supabase Storage ≈ $0.004/month beyond included quota (+ ≈ $0.017 egress per full playback beyond quota); Cloudflare Stream $0.05/month stored + $0.01 per full playback; Mux $0.024/month stored + $0.008 per playback (delivery free within 100K min/month). Supabase raw storage + `<video>` progressive playback is adequate for an MVP whose rehearsals are watched once by their owner; move to Stream/Mux only when you need adaptive bitrate, thumbnails, clip trimming or public sharing.
- **Retention is the dominant video cost**. At 10,000 active users × 200 rehearsal-minutes/month, keeping everything forever adds ≈ 2M minutes/month → +$4,800/month at Mux 720p storage, +$10,000/month at Cloudflare Stream, or ≈ +38 TB/month ≈ +$810/month at Supabase Storage rates. Default to auto-deleting raw video after 30 days (keep transcript + metrics), with an opt-in "keep" per rehearsal.
- **Eye contact**: implement on-device with MediaPipe Face Landmarker in a Web Worker (VIDEO mode at ~10–15 fps sampling is sufficient for a per-minute "gaze-on-camera %"): combine the facial transformation matrix (head yaw/pitch) with the eye-look blendshapes to classify each sampled frame as "toward camera" within a tolerance cone; report % of speaking time facing camera, longest look-away, and look-away events per minute. Calibrate on the first 3 seconds ("look at the lens"). Accuracy limits: webcam position vs screen position means "looking at the notes/teleprompter" and "looking at the camera" differ by only a few degrees, so present it as "camera-facing time", not true gaze; low light, glasses glare and off-axis cameras degrade it. Gesture: MediaPipe Pose Landmarker (same runtime) gives shoulder/wrist landmarks for "hands visible %" and "gesture activity" (wrist displacement per second) — keep it simple and on-device.
- **Privacy architecture**: never upload landmarks, blendshapes or face crops; upload only per-window aggregates (numbers). This both minimises BIPA/GDPR exposure (§7) and avoids server GPU costs. If a server-side path is ever needed, run it ephemeral (no persistence of face templates) and gate it behind separate explicit consent.
- **Teleprompter interaction**: when teleprompter mode is on, eye-contact scoring should be disabled or relabelled, since reading from the screen will depress the metric; Yoodli's public marketing lists eye contact as a metric but gives no methodology, so there is no benchmark to copy.

### Gaps
- Google's own page did not enumerate the eye-related blendshape names; confirm `eyeLookInLeft/eyeLookOutRight/eyeBlinkLeft`, etc., in the model card before designing the gaze classifier.
- No published accuracy figures for MediaPipe gaze/head-pose on webcam video were found in this research.
- Poised was not researched (search budget exhausted); Yoodli's full privacy policy/Trust Center (processing location, retention, subprocessors) was not fetched.
- Browser-specific codec support (Safari MP4-only recording, Chrome VP9/AV1 availability) was not confirmed from the MDN compatibility table; verify with `isTypeSupported` at runtime.
- Cloudflare Stream free-tier existence is ambiguous (product page shows "—" for Free; docs list none).
- Mux and Supabase tus/direct-upload documentation pages were not fetched; the tus support claim is confirmed only for Cloudflare Stream and the tus spec itself.

---

## 3. LLM layer (Claude models and pricing, OpenAI/Google alternatives, caching/batch, long-form generation patterns, per-action and per-user cost)

### Takeaway
On the Claude pricing page viewed 2026-10-30, the current line-up is Claude Opus 5.5 ($4/$20 per MTok), Sonnet 5.5 ($2/$10), Haiku 5.5 ($0.10/$0.50, with a >100K-token surcharge) and the top-end Fable 5.1 / Mythos 5.1 ($10/$50), with cache reads at 0.05× input on Opus/Sonnet 5.5 (0.025× on Fable/Mythos 5.1) and a 50% Batch discount. OpenAI's comparable tiers are gpt-6.1-sol ($2/$10) and gpt-6.1-terra ($1/$5); Google's Gemini 3.8 Flash is $0.75/$3.75 through 2026-12-31 (then doubling) and Gemini 3.1 Pro $2/$12. A full 18-minute script (~2,500 words ≈ 3,300 output tokens) costs ≈ $0.07 on Sonnet 5.5 or ≈ $0.14 on Opus 5.5 with outline-first generation; a heavy user (2 drafts, 10 revisions, 20 rehearsal feedbacks, 3 idea rounds/month) costs ≈ $1.2/month on Sonnet 5.5 or ≈ $2.4/month on Opus 5.5 before caching.

### Cited Findings

**Claude API pricing (per 1M tokens; viewed 2026-10-30)**
- Claude Opus 5.5: $4 input / $20 output; 5-min cache write $5; 1-h cache write $8; cache read $0.20. Claude Sonnet 5.5: $2 / $10; cache write $2.50 (5m) / $4 (1h); cache read $0.10. Claude Haiku 5.5 (≤100K prompt): $0.10 / $0.50, cache read $0.01; Haiku 5.5 (>100K prompt): $0.50 / $2.50. Claude Fable 5.1 and Mythos 5.1: $10 / $50, cache read $0.25. Older: Opus 4.5–5 $5/$25; Sonnet 4.5/4.6 $3/$15; Sonnet 5 $2/$10; Haiku 4.5 $1/$5 — [Claude pricing (platform.claude.com)](https://platform.claude.com/docs/en/about-claude/pricing) (docs.claude.com redirects here)
- Batch API = 50% discount: Opus 5.5 $2/$10; Sonnet 5.5 $1/$5; Haiku 5.5 $0.05/$0.25; Fable 5.1 $5/$25 — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Prompt caching multipliers: 5-minute write 1.25× input, 1-hour write 2× input; cache read 0.1× base input, except 0.05× on Opus 5.5 and Sonnet 5.5 and 0.025× on Fable 5.1/Mythos 5.1. Claude 4.6+ models (except Haiku 5.5) include the full 1M context window at standard pricing; no 200K long-context surcharge tier is listed — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Tooling costs: web search $10 per 1,000 searches; web fetch free beyond tokens; code execution free with `web_search_20260209`+ tools, otherwise 1,550 free container-hours/month then $0.05/hr; tool-use system prompt overhead 286 tokens (`auto`) / 406 (`any`) on Opus/Sonnet/Haiku 5.5. Data residency (`inference_geo: "us"`) 1.1×; "Fast mode" Opus 5.5 $8/$40 — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Exact model ID strings are not shown on the pricing page (only `claude-mythos-preview`); they are in the model overview pages — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)

**OpenAI text models (viewed 2026-10-30)**
- Standard tier: gpt-6-astra $10 / $50 (cached $1); gpt-6.1-sol $2 / $10 (cached $0.10); gpt-6.1-terra $1 / $5 (cached $0.05); gpt-6-luna $0.10 / $0.50 (cached $0.01). A Flex/Batch table at ~50% of Standard and Fast at 2× are shown by tab order (tier labels inferred by the fetch, not explicit). GPT-5 base, GPT-4.1 and o-series were not listed — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing?no_head=1)

**Google Gemini (viewed 2026-10-30)**
- Gemini 3.1 Pro Preview: $2.00 input / $12.00 output (≤200k prompt), $4/$18 above 200k; batch 50%; context caching $0.20 + $4.50/1M tokens/hour storage. Gemini 4 Argon ("flagship reasoning"): $2/$10 through 2026-11-30, then $4/$20 from 2026-12-01. Gemini 3.8 Flash and 3.6 Flash: $0.75/$3.75 through 2026-12-31, then $1.50/$7.50 from 2027-01-01 (batch half). Gemini 3.5 Flash-Lite $0.30/$2.50; 3.1 Flash-Lite $0.25/$1.50. Free tier available for Flash/Flash-Lite with content used to improve Google products; not for Pro/Argon — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

**Script length reference**
- The five TED talks sampled by VirtualSpeech averaged 173 WPM — [VirtualSpeech](https://virtualspeech.com/blog/average-speaking-rate-words-per-) (so an 18-minute talk at 140–160 WPM delivered pace is ≈ 2,500–2,900 words, consistent with the brief's 2,300–2,700-word planning figure)

### Inferences
- **Model routing**: Sonnet 5.5 as the default writer (pitch, outline, script, revisions); Opus 5.5 only for the "final polish" or when the user explicitly requests a premium pass; Haiku 5.5 for high-volume, low-stakes work (rehearsal feedback summaries, event topic tagging, title/tag generation, moderation). At 2026 prices Opus 5.5 is only 2× Sonnet 5.5, so a premium tier that uses Opus for drafts is affordable (≈ +$0.07 per draft).
- **Token budget per action** (assumptions: 1 word ≈ 1.3 tokens; system prompt + user profile ≈ 1,500 tokens; full script ≈ 3,300 tokens):
  - 5 talk ideas: ~2,000 in / ~1,200 out → Sonnet 5.5 ≈ $0.016; Opus 5.5 ≈ $0.032; Haiku 5.5 ≈ $0.0008.
  - Idea expansion (thesis, through-line, 3 stories): ~3,000 in / ~1,500 out → Sonnet ≈ $0.021; Opus ≈ $0.042.
  - Application pitch (title, 100-word abstract, bio, why-this-event): ~4,000 in / ~1,000 out → Sonnet ≈ $0.018; Opus ≈ $0.036.
  - Full script draft, outline-first (call 1: outline ~5,000 in / ~1,000 out; call 2: script ~7,000 in / ~3,500 out) → Sonnet ≈ $0.07; Opus ≈ $0.14. Single-shot 3,500-token generation is within any model's output limit, but outline-first gives a checkpoint the user can edit and keeps each call under ~60 s of streaming.
  - Revision pass: full rewrite ~8,000 in / ~3,500 out → Sonnet ≈ $0.051, Opus ≈ $0.10; section-level edit (~8,000 in / ~800 out) → Sonnet ≈ $0.024. Prefer section-level edits with a JSON "patch" output (section id + replacement text) to cut output tokens ~4×.
  - Rehearsal feedback (transcript ~2,000 tokens + metrics JSON ~500 + script ~3,300 + prompt ≈ 8,000 in / ~1,200 out) → Sonnet ≈ $0.028; Haiku 5.5 ≈ $0.0014; Opus ≈ $0.056.
- **Heavy user per month** (3 idea rounds, 3 expansions, 2 pitches, 2 full drafts, 10 revisions at a 50/50 full/section mix, 20 rehearsal feedbacks): Sonnet 5.5 ≈ $1.20; Opus 5.5 ≈ $2.40; Sonnet for writing + Haiku for feedback ≈ $0.68. With 1-hour prompt caching of the system prompt + script context during an editing session (cache read $0.10/MTok on Sonnet 5.5 vs $2 uncached), the input side of revisions and feedback drops ~95%, taking the Sonnet heavy-user figure to roughly $0.80–0.90. These are planning estimates, not measured numbers.
- **Generation patterns**: (1) structured outputs/JSON schema for outline, section metadata (estimated duration per section at target WPM), and metric-grounded feedback (`{"metric":"pace","value":182,"target_band":[140,170],"advice":"..."}`); (2) stream the script to the editor section by section with server-sent events from a Next.js route handler (keep the route under Vercel's 300 s default; outline-first keeps each call short); (3) tool use for "insert a statistic" (web search at $10/1k searches) only in a premium tier; (4) a Batch-API job queue for nightly, non-interactive work (event tagging, embedding, clip-candidate selection) at 50% off.
- **Evals and guardrails**: build a Promptfoo (or Braintrust/Langfuse) suite with 30–50 golden briefs scored on structure (has hook/through-line/call-to-action), length-to-time fit (words ÷ target WPM within ±10% of the slot), banned-phrase list, and a Haiku-graded rubric; log every generation with Langfuse-style tracing (model, tokens, cost, latency) to a `llm_calls` table; enforce per-user monthly token caps (e.g., 2M tokens on the basic tier) and per-request `max_tokens`; add a content-safety pre-check (Haiku) before publishing or posting externally. None of the eval tools' 2026 prices were fetched (see Gaps).
- **Cost caps**: a per-organisation hard cap in the orchestrator (sum of `llm_calls.cost_usd` this month ≥ plan cap → degrade to Haiku, then block) is cheaper and more reliable than relying on vendor-side limits.

### Gaps
- Exact Claude model ID strings (e.g., `claude-sonnet-5-5-…`) and context/output-token limits were not captured; they live on the model overview pages, which were not fetched.
- OpenAI's Batch discount percentage is inferred from table layout, not stated; GPT-5/4.1 pricing was absent from the page.
- Promptfoo, Langfuse and Braintrust 2026 pricing and limits were not researched.
- Token estimates above are assumptions, not measurements; run a 20-sample tokenizer check before publishing unit economics.

---

## 4. Event data pipeline (sources, dedup, geocoding, tagging, freshness, legal status of scraping, recommended approach and cost)

### Takeaway
There is no TED API; TED's Terms of Use (updated May 7, 2024) ban scraping/bots "in a manner inconsistent with these Terms" and ban using TED content in datasets or ML training without a written licence, so a bulk crawl of ted.com/tedx/events is a breach-of-contract risk even though CFAA exposure for public pages is low after hiQ/Van Buren. The defensible pipeline is organiser-submitted listings + manual curation + public search/social monitoring, storing only facts (name, date, city, URL, deadline) with link-backs, and asking TED for a data partnership. Dedup, geocoding and pgvector topic tagging are cheap; the real cost is the curator's time.

### Cited Findings

**TED terms**
- TED Terms of Use, "Date updated: May 7, 2024": §6.4 "You may not use automated means — including scraping tools, bots, crawlers, harvesting technologies, or similar mechanisms" to access, collect, download, extract or analyse "in a manner inconsistent with these Terms"; §6.3/6.4 prohibit "incorporating TED Content into research datasets, archives, or collections" and "using TED Content for the development, training, evaluation, fine-tuning" of AI/ML "absent a separate written license agreement with TED"; general prohibition on publishing/reproducing TED Content; no clause specifically addresses the TEDx event listings/directory; governed by New York law with jurisdiction in New York County courts — [TED Terms of Use](https://www.ted.com/termsofuse)
- Related TED policy pages exist for talk usage and TEDx publishing — [TED Talks Usage Policy](https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy); [TEDx Publishing Policy](https://www.ted.com/pages/tedx-publishing-policy)
- Individual TEDx event pages are public at URLs of the form `ted.com/tedx/events/<id>` — [example TEDx event page](https://www.ted.com/tedx/events/9209)

**US scraping law**
- Ninth Circuit (2019; reaffirmed April 2022 after Supreme Court remand) held the CFAA does not reach automated collection of publicly accessible data (hiQ v. LinkedIn); LinkedIn later won summary judgment on contract/unfair-competition claims limited to hiQ's use of contractors with fake accounts to collect logged-in data; a stipulated permanent injunction against hiQ was entered December 6, 2022. Van Buren declined to extend "exceeds authorized access" to purpose-based misuse. Courts are "more willing to restrict scraping when the scraper agreed by contract not to scrape"; fake accounts/logged-in collection is the clear exception and has drawn DMCA anti-circumvention claims — [Farella Braun + Martel on hiQ and other rulings](https://www.fbm.com/data-analytics/publications/what-recent-rulings-in-hiq-v-linkedin-and-other-cases-say-about-the-legality-of-data-scraping/)
- Van Buren v. United States, 141 S. Ct. 1648 (June 3, 2021), adopted a "gates up or down" reading; Southwest Airlines v. Kiwi.com (N.D. Tex., Sept. 30, 2021) granted a preliminary injunction on breach-of-contract grounds where the scraper had assented to the site's terms; practical advice: CFAA claims based solely on ToS violations are unlikely to succeed, contract claims are viable where assent is provable — [Haynes Boone, "The Shifting Legal Landscape Surrounding Web Scraping" (Oct 25, 2021)](https://www.haynesboone.com/news/publications/the-shifting-legal-landscape-surrounding-web-scraping.pdf)
- Meta v. Bright Data (N.D. Cal., Judge Chen, summary judgment January 23, 2024): Meta's terms could not be read to prohibit logged-off scraping of publicly available data; a perpetual anti-scraping clause surviving account termination was unenforceable; the court did not decide logged-in scraping; the ruling is narrow to Meta's terms, and tortious-interference/quasi-contract claims remained — [Quinn Emanuel client alert](https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/)
- Eventbrite's terms expressly prohibit scraping and automated data extraction (relevant if monitoring TEDx ticket pages) — [Eventbrite ToS provision record](https://conductatlas.com/platform/eventbrite/eventbrite-terms-of-service/provision/CA-P-039158/scraping-and-automated-data-extraction-prohibited/)

**Tagging/matching infrastructure prices**
- Supabase Pro includes 8 GB disk ($0.125/GB beyond) and pgvector is part of Postgres; Edge Functions 2M invocations included then $2/M; cron is available in-platform — [Supabase pricing](https://supabase.com/pricing)
- Claude Haiku 5.5 at $0.10/$0.50 per MTok (Batch $0.05/$0.25) for tagging — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- YouTube Data API: default quota 10,000 units/day; `search.list` costs 1 unit but has its own bucket of 100 calls/day; `videos.list`, `channels.list`, `playlistItems.list` 1 unit each — [YouTube API quota costs](https://developers.google.com/youtube/v3/determine_quota_cost) (useful for discovering TEDx organiser channels' "call for speakers" videos within quota)

### Inferences
- **Recommended source mix (in priority order)**: (1) organiser self-service listing form with a verification email to the organiser's TEDx-licensed address and an "edit/claim your event" link; (2) in-house curator queue fed by Google Programmable Search / SerpAPI queries ("TEDx" + "call for speakers" + "apply" + month), Instagram/LinkedIn hashtag monitoring done by a human or via official APIs where permitted, and organiser newsletters; (3) user-submitted tips with a one-click "report outdated" button; (4) a low-frequency (e.g., weekly) *monitor* of individual public TEDx event pages the curator has already added, fetching only that page to detect date/status changes, honouring robots.txt and caching headers, storing only facts plus the canonical TED URL, never storing or reproducing descriptions/images; (5) formally request a data-sharing arrangement with TED (TED's ToS anticipates "a separate written license agreement").
- **Do not** bulk-crawl the ted.com directory, log in to scrape, or feed TED descriptions into LLM prompts for generation (that is the "datasets/ML" clause). Rewriting event summaries from the organiser's own submission or from your curator's notes avoids the content-reuse issue; facts (dates, cities, names) are not copyrightable but the contractual prohibition is independent of copyright.
- **Data model**: `events(id, name, slug, city, country, lat, lng, start_date, application_deadline, status, theme, source, canonical_url, last_verified_at, confidence)`, `event_sources(event_id, kind, url, seen_at)`, `event_topics` (embedding vector(1024) via pgvector; tags via Haiku), `organizer_claims`. Dedup key: normalised event name (strip "TEDx", punctuation, year) + city + ±60-day date window; use `pg_trgm` similarity > 0.6 plus geodistance < 25 km as a candidate pair sent to the curator queue.
- **Matching**: cosine similarity between the user's talk-idea embedding and the event theme embedding, filtered by geography (PostGIS radius or country) and deadline window; expose "why matched" (theme overlap, distance, deadline fit). Embedding and tagging 5,000 events/year with Haiku 5.5 Batch costs well under $1/year; the pipeline's variable cloud cost is negligible next to curator labour.
- **Freshness SLA**: every event with a future deadline re-verified at least every 14 days; `last_verified_at` surfaced in UI; auto-expire 30 days after `start_date`. Budget ≈ 0.25–0.5 FTE curator for a 1,000–2,000-event global catalogue.
- **Geocoding**: Mapbox or Google Geocoding once per event at insert time (cache in `lat,lng`); at a few thousand events/year the cost is in the free/low tiers of either provider (prices not verified; see Gaps).

### Gaps
- ted.com `robots.txt` and the exact robots directives for `/tedx/events/` were not fetched.
- No 2025–2026 update on hiQ-line case law was fetched (the Haynes Boone piece is Oct 2021; the Farella piece Dec 2022; Quinn Emanuel Jan 2024); check for later Ninth Circuit or N.D. Cal. decisions (e.g., in Meta v. Bright Data follow-ons, X v. Bright Data) before finalising policy.
- Google Programmable Search JSON API, SerpAPI, Mapbox and Google Geocoding 2026 prices were not verified (search budget exhausted).
- Instagram Graph API / LinkedIn API terms for hashtag or "call for speakers" monitoring were not researched.

---

## 5. Platform stack (Next.js + Supabase vs alternatives, jobs, email, payments, analytics, errors, flags, hosting) with 2026 prices and limits

### Takeaway
Keep Next.js on Vercel Pro ($20/seat incl. $20 usage; Fluid functions 300 s default/800 s max) and Supabase Pro ($25/month; 100K MAU, 8 GB disk, 100 GB storage, 250 GB egress, 2M edge-function invocations) and add: a durable job runner (Inngest Free→Pro $99 or Trigger.dev Hobby $10→Pro $50 with ~$0.12–0.61/hr compute for FFmpeg/Praat), Resend (Free 3K→Pro $20), Stripe (2.9%+30¢; Billing 0.7%; Tax Basic 0.5%) for US/EU with Paddle or Lemon Squeezy (both 5%+50¢ merchant-of-record) if you want India GST and global VAT handled for you, PostHog (generous free tiers) and Sentry Team ($29). Migration to Clerk/Neon/Convex is not justified: Supabase Auth/Postgres/Storage already cover the needs and Supabase Team ($599) brings SOC 2/ISO reports when you need them.

### Cited Findings

**Supabase (viewed 2026-10-30)**
- Free $0: 500 MB DB, 50K MAU, 5 GB egress, 1 GB storage, 2M realtime messages, 500K edge-function invocations, 2 active projects, paused after a week of inactivity. Pro from $25/month: 8 GB disk, 100K MAU, 250 GB egress, 100 GB storage, 500 realtime connections, 5M realtime messages, 2M edge-function invocations, 7-day backups, 7-day logs; spend cap on by default. Team from $599/month: Pro quotas + SOC 2 / ISO 27001, dashboard SSO, 14-day backups, 28-day logs. Enterprise custom — [Supabase pricing](https://supabase.com/pricing)
- Overages: MAU $0.00325; disk $0.125/GB; egress $0.09/GB; cached egress $0.03/GB; storage $0.0213/GB; realtime $10 per 1,000 extra concurrent connections and $2.50/M messages; edge functions $2/M; log ingestion $0.50/GB beyond 20 GB. Compute add-ons (hourly billed): Micro $10, Small $15, Medium $60, Large $110 (2 vCPU/8 GB), XL $210, 2XL $410 … 16XL $3,730; $10/month compute credit on paid plans; branching $0.01344/branch-hour; PITR $100/month per 7 days; custom domain $10/month — [Supabase pricing](https://supabase.com/pricing)
- Edge Functions limits: 256 MB memory; worker wall-clock 150 s (Free) / 400 s (paid); **2 s CPU time per request**; 150 s idle timeout (504); function bundle 20 MB (CLI) / 5 MB (dashboard); 100/1,000/2,000 functions per project on Free/Pro/Team; background tasks allowed within the wall-clock window — [Supabase Edge Functions limits](https://supabase.com/docs/guides/functions/limits)

**Vercel (viewed 2026-10-30)**
- Hobby $0 (non-commercial; 1M function invocations, 100 GB fast data transfer, 4 h Active CPU, 360 GB-h memory). Pro $20/month per seat including $20 usage credit; overages: function invocations from $0.60/M, Fluid Active CPU from $0.128/hr, provisioned memory from $0.0106/GB-h, image transformations $0.05/1K, build minutes $0.007/min; developer seats $20/month, unlimited viewers; Flat Rate CDN option on Pro; Enterprise custom with 99.99% SLA — [Vercel pricing](https://vercel.com/pricing)
- Fluid-compute function limits: max duration Hobby 300 s (default and max); Pro/Enterprise 300 s default, 800 s max, up to 1,800 s in beta; memory/CPU Hobby 2 GB/1 vCPU, Pro up to 4 GB/2 vCPU; build step max 45 minutes (docs last updated 2026-09-16) — [Vercel limits](https://vercel.com/docs/limits)

**Auth/DB alternatives**
- Clerk: Hobby free up to 50,000 monthly retained users (MRU); Pro $20/month annual ($25 monthly) incl. 50K MRU, then $0.02/MRU (50K–100K), $0.018 (100K–1M); Enhanced B2B add-on $100/month ($85 annual); MFA included in Pro — [Clerk pricing](https://clerk.com/pricing)
- Neon Postgres: Free 100 projects, 100 CU-hours/project, 1 GB storage/project (20 GB account), 5 GB egress; Launch $0.106/CU-hour, $0.35/GB-month storage, 500 GB egress then $0.10/GB; Scale $0.222/CU-hour; 1 CU ≈ 4 GB RAM; Neon is now described as part of Databricks' Lakebase Postgres — [Neon pricing](https://neon.com/pricing)
- Convex: Free/Starter 1M function calls then $2.20/M, 0.5 GB DB then $0.22/GB, 1 GB egress then $0.132/GB; Professional $25/developer/month with 25M calls, 50 GB DB, 50 GB egress — [Convex pricing](https://www.convex.dev/pricing)

**Background jobs**
- Inngest: Free $0 (50K executions/month, 5 concurrent steps, 3 workers, 500K events); Pro from $99/month (1M executions, 100 concurrent steps then $25 per 25, 20 workers, 5M events, 15 seats then $10/seat); Business from $499/month (10M executions, 500 concurrency); Pro overage tiered $0.000050→$0.000015 per execution (≈ $50→$15 per million) — [Inngest pricing](https://www.inngest.com/pricing)
- Trigger.dev: Free $5 compute credit, 20 concurrent runs; Hobby $10/month ($10 credit, 50 concurrent); Pro $50/month ($50 credit, 200+ concurrent, +$10 per 50); compute per second: Micro $0.0000169 (≈$0.061/hr), Small 1x (0.5 vCPU/0.5 GB) $0.0000338 (≈$0.12/hr), Small 2x ≈ $0.24/hr, Medium 1x ≈ $0.31/hr, Medium 2x (2 vCPU/4 GB) ≈ $0.61/hr, Large 1x ≈ $1.22/hr; plus $0.000025 per run; HIPAA BAA $500/month — [Trigger.dev pricing](https://trigger.dev/pricing)

**Email**
- Resend: Free 3,000 emails/month (100/day, 3 domains, 30-day retention); Pro $20/month 50,000 emails, 10 domains; Scale $90/month 100,000 emails, 1,000 domains; overage $0.90 per 1,000; dedicated IP $30/month (Scale, >3,000/day) — [Resend pricing](https://resend.com/pricing)
- Postmark: Free 100 emails/month (no overage); Basic $15/month from 10,000 emails ($1.80 per extra 1,000); Pro $16.50 ($1.30/1,000); Platform $18 ($1.20/1,000); dedicated IP from $50/month at 300K+/month; DMARC monitoring from $14/month/domain — [Postmark pricing](https://postmarkapp.com/pricing)

**Payments**
- Stripe: 2.9% + 30¢ per domestic card; +1.5% international cards; +1% currency conversion; +0.5% manually entered. Stripe Billing: 0.7% of billing volume pay-as-you-go or from $620/month on a 1-year contract; basic usage-based billing via the Meters API included (up to 100M events/month); Metronome Startup $0.04 per 1K ingest events + 0.8% of billing volume. Stripe Tax: Basic no-code 0.5% per transaction where registered; API $0.50 per transaction; Tax Complete from $90/month. Checkout custom domain $10/month — [Stripe pricing](https://stripe.com/pricing)
- Paddle (merchant of record): 5% + 50¢ per checkout transaction, "No added costs, no hidden fees"; Paddle "handles global sales tax and VAT" including collection, filing and remittance; products under $10 require bespoke pricing; enterprise custom; payout/chargeback/FX fees not stated on page — [Paddle pricing](https://www.paddle.com/pricing)
- Lemon Squeezy (merchant of record): 5% + 50¢ per transaction with MoR tax handling (sales tax, EU VAT) included; no monthly fee; payouts twice monthly to 200+ countries; page footer "Sold through Link, LLC f/k/a Lemon Squeezy LLC" with a Stripe badge and a link to a "2026 Update: Lemon Squeezy + Stripe Managed Payments" article (content not fetched); page is internally inconsistent on currency and payment-method counts — [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing)

**Analytics / errors / flags**
- PostHog free monthly allowances: 1M analytics events, 5K session replays, 1M feature-flag requests, 100K error-tracking exceptions, 1,500 survey responses; usage above is metered (per-unit rates on a separate page not fetched); logs custom retention $0.05/GB-month — [PostHog pricing](https://posthog.com/pricing); Feb 2026 plan renames noted by a tracker — [costbench PostHog changelog](https://costbench.com/changelog/posthog-plans-renamed-2026-02/)
- Sentry: Developer free 5K errors, 5M spans, 50 replays (1 user); Team $29/month ($26 annual) with 50K errors, 5M spans, 50 replays; Business $89/month ($80 annual); add-ons logs/metrics $0.50/GB, uptime $1, cron monitors $0.78, profiling $0.25/hr; error/replay overage rates on docs page — [Sentry pricing](https://sentry.io/pricing/)

### Inferences
- **Keep Supabase; do not migrate**. Supabase Auth replaces Clerk at $0 incremental (Clerk's Pro would add $20–25/month plus $0.02/MRU above 50K); Supabase Postgres with pgvector/PostGIS plus RLS covers event matching; Supabase Storage with resumable uploads covers rehearsal video for an MVP. Move to Team ($599) only when a customer or audit requires the SOC 2 report.
- **Compute layout**: Next.js route handlers on Vercel for UI/API and LLM streaming; Supabase Edge Functions for webhooks and light transforms only (2 s CPU limit rules out FFmpeg/Praat/MediaPipe); a Trigger.dev or Inngest worker (Docker with FFmpeg, Python Parselmouth/librosa) for media processing. Trigger.dev's per-second machine pricing suits bursty FFmpeg/Praat jobs (a 10-minute rehearsal processed in ~60 s on Medium 1x ≈ $0.005 + $0.000025 run fee); Inngest suits event-driven orchestration (STT webhook → metrics → feedback LLM → email) and its Free tier (50K executions) covers an MVP.
- **Cron/queues**: use Supabase cron (pg_cron) for freshness checks and retention deletes; use the job runner for anything that takes >1 s CPU.
- **Payments**: Stripe for subscriptions and usage credits (Meters API included in Billing) if the team is willing to register for tax where required; choose Paddle or Lemon Squeezy as MoR to offload India GST/EU VAT at a ~2.1 percentage-point premium over Stripe (5%+50¢ vs 2.9%+30¢). Lemon Squeezy's status after its Stripe transition ("Link, LLC f/k/a Lemon Squeezy") should be confirmed before adopting; Paddle's under-$10 restriction matters if you sell small credit packs.
- **Observability**: PostHog's free tiers (1M events, 5K replays, 1M flag requests, 100K errors) are enough through ~1,000 active users; use PostHog feature flags rather than a separate flag vendor; Sentry Team at $29 for backend/worker errors.
- **Fixed platform cost** (excluding usage-based LLM/STT/video): ≈ $100–150/month at 100 users (Supabase Pro $25 + Vercel Pro 2 seats $40 + Sentry $29 + Resend free + Inngest free); ≈ $400–600/month at 1,000 users (add Supabase Small/Medium compute $15–60, Resend Pro $20, Inngest Pro $99 or Trigger.dev Pro $50, PostHog overages); ≈ $1,500–3,000/month at 10,000 users (Supabase Large/XL compute $110–210 + storage/egress overages, Inngest Business $499, Sentry Business $89, Vercel usage, PostHog usage, optional Supabase Team $599).

### Gaps
- Vercel's request-body size limit for functions (commonly cited as 4.5 MB) was not located in the fetched limits page; verify at vercel.com/docs/functions/limitations. The architecture assumes direct-to-storage uploads regardless.
- Supabase Storage per-file upload limits (standard vs resumable) and the resumable-upload docs were not fetched.
- Stripe Tax coverage for India GST registration/remittance and Paddle/Lemon Squeezy payout, FX and chargeback fees were not verified.
- PostHog per-unit overage rates and Sentry error/replay overage rates are on sub-pages that were not fetched.
- Firebase pricing was not researched.

---

## 6. Teleprompter, script editor, versioning and exports

### Takeaway
No vendor pricing or primary documentation for Tiptap/Lexical, react-pdf, Puppeteer, the `docx` npm package or ICS libraries was fetched in this research (search budget exhausted), so this section is engineering guidance rather than cited fact; the only sourced inputs are the WPM reference (173 WPM TED sample; 120–150 conversational) that should drive teleprompter speed and section-timing estimates.

### Cited Findings
- Pace references used for teleprompter speed defaults: TED sample average 173 WPM (154–201); conversational 120–150 WPM; VirtualSpeech practice-session median 111 WPM — [VirtualSpeech](https://virtualspeech.com/blog/average-speaking-rate-words-per-)
- Supabase Pro includes branching at $0.01344/branch-hour and 7-day backups; Edge Functions limited to 2 s CPU per request (relevant for server-side PDF/DOCX generation placement) — [Supabase pricing](https://supabase.com/pricing); [Supabase Edge Functions limits](https://supabase.com/docs/guides/functions/limits)
- Vercel Pro functions: 300 s default, 800 s max, up to 4 GB/2 vCPU (relevant for Puppeteer-based PDF rendering) — [Vercel limits](https://vercel.com/docs/limits)

### Inferences
- **Editor**: Tiptap (ProseMirror) is the pragmatic choice for a React/Next.js codebase: block-level section nodes with attributes (`sectionId`, `kind` = hook/story/evidence/turn/close, `targetSeconds`), inline marks for "emphasis" and "pause" cues that the teleprompter renders, and JSON document storage in Postgres (`script_versions(script_id, version, doc jsonb, created_by, source = user|llm, parent_version)`). Lexical is viable if the team prefers Meta's model, but Tiptap's node-schema ergonomics map more directly onto "LLM returns a JSON patch per section".
- **Versioning/diff**: store every LLM revision as a new version with `source='llm'` and compute a word-level diff (e.g., `diff-match-patch`) for an accept/reject UI per section; keep the user's last manual version as the baseline for "revert". Avoid real-time multi-user CRDT (Yjs) for the MVP unless coaches co-edit.
- **Teleprompter**: render the script as a single scroll container; drive scroll with `requestAnimationFrame` using `pixelsPerSecond = (lineHeightPx × wordsPerLine⁻¹ × targetWPM) / 60`, computed from measured line metrics; expose target WPM (default 150, range 110–190 per the references), font size, mirror mode (`transform: scaleX(-1)` on the container for beam-splitter rigs), countdown, and tap/space to pause. Highlight the "current" line by elapsed time; optionally sync to live STT (Deepgram streaming) to auto-advance on recognised words — a premium feature given streaming cost (§1). Record "teleprompter on/off" as rehearsal metadata so eye-contact scoring is interpreted correctly (§2).
- **Section timing**: `estimatedSeconds = words / (targetWPM/60)`; show a running total against the slot (TEDx slots are typically ≤18 min; the brief's 2,300–2,700 words ≈ 15–18 min at 150 WPM); warn when a section's rehearsed pace diverges >15% from its planned time.
- **Exports**: PDF via `@react-pdf/renderer` for a deterministic, font-embedded "speaker script" and "press kit" (runs in Node without a browser, fits in a Vercel function); use Puppeteer/Chromium only if pixel-perfect HTML fidelity is required (needs the larger Vercel memory tier or a job worker). DOCX via the `docx` npm package with heading styles per section and a cover page; TXT/Markdown for teleprompter apps. ICS via a small RFC 5545 generator (e.g., `ics` npm) for application deadlines and event dates with `VALARM` 7 and 1 days before; also expose a per-user calendar feed URL (`/api/calendar/:token.ics`) so deadlines stay in sync.

### Gaps
- Tiptap Cloud/Pro feature licensing (e.g., collaboration, AI extensions) and Lexical's maturity for React 19/Next.js App Router were not verified.
- No sources fetched on teleprompter UX research (optimal scroll speed vs reading comprehension); defaults above are derived from the WPM references, not teleprompter-specific studies.

---

## 7. Repurposing and amplification (YouTube Data API, clip generation, captions, LinkedIn/X posting, press kit)

### Takeaway
The YouTube Data API's 10,000-unit daily quota is ample for fetching a speaker's published TEDx talk and stats (`videos.list` = 1 unit), but `search.list` is now in its own 100-calls/day bucket, so discovery of the talk should rely on the user pasting the URL or on the TEDx Talks channel's playlist. LinkedIn posting on behalf of a member needs the `w_member_social` scope with versioned (`Linkedin-Version: 2026xx`) Posts API calls and pre-uploaded media URNs; X has moved to pay-per-use (third-party report: $0.015 per post, $0.20 per post containing a URL, Free/Basic tiers closed Feb 2026). Clip generation is cheapest self-hosted with FFmpeg on a job worker using transcript timestamps; Vizard's API is bundled into its Creator/Business plans and OpusClip's API needs an enterprise account at 1 credit per minute.

### Cited Findings
- YouTube Data API: default quota 10,000 units/day for all endpoints other than `search.list` and `videos.insert`; `search.list` 1 unit with its own bucket of 100 calls/day; `videos.list`, `channels.list`, `playlistItems.list` 1 unit each; `videos.insert` 1 unit with a 100-calls/day bucket; captions `list` 50 / `insert` 400 / `update` 450 / `delete` 50; a separate "Quota and Compliance Audits" guide governs extensions — [YouTube quota costs](https://developers.google.com/youtube/v3/determine_quota_cost)
- LinkedIn Posts API: `w_member_social` to "Post, comment, and like posts on behalf of an authenticated member"; `w_organization_social` restricted to ADMINISTRATOR / DIRECT_SPONSORED_CONTENT_POSTER / CONTENT_ADMIN page roles; `r_member_social` "restricted to approved users only"; organic posts support text, images, videos, documents, articles, multi-image, polls; media must first be uploaded via the Images/Videos/Documents APIs to obtain a URN; `POST https://api.linkedin.com/rest/posts` with `Linkedin-Version: {YYYYMM}` and `X-Restli-Protocol-Version: 2.0.0`; doc version li-lms-2026-10 (page updated 2026-05-13); Marketing Version 202511 sunsets November 16, 2026; the page does not state app-review requirements or numeric rate limits — [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- X API (third-party summary "Updated July 2026", checked by the author against X's docs; **unverified against X's own pages here**): pay-per-use $0.015 per post create, $0.20 per post containing a URL (added April 2026), $0.005 per post read, $0.010 per user object, $0.001 per owned-resource read; Free tier closed to new signups Feb 6, 2026; Basic ($200/month) closed Feb 2026 with remaining subscribers migrated to pay-per-use from June 1, 2026; Pro $5,000/month and Enterprise remain; pay-per-use reads capped at 2M posts/month — [opentweet: X API pay-per-use explained](https://opentweet.io/how-to/x-api-pay-per-use-explained); other 2026 trackers — [postproxy X API pricing 2026](https://postproxy.dev/blog/x-api-pricing-2026), [bundle.social X API pricing 2026](https://bundle.social/blog/x-api-pricing-2026-costs-limits)
- Vizard API: access "included in the Creator and Business plans"; submissions draw from the plan's video upload minutes; max 600-minute video, 10 GB, 4K; >10,000 minutes/month requires contacting Vizard; no per-minute price, rate limits or output options listed — [Vizard API pricing docs](https://docs.vizard.ai/docs/pricing.md)
- OpusClip API: available "After setting up your enterprise account"; credits scale with video length, "one credit covers one minute of processing"; endpoints Create a Project, Query Project Details, Query Clips; no webhooks, rate limits or caption/reframe options documented on the intro page — [OpusClip API v2 introduction](https://help.opus.pro/api-reference/v2/introduction); plan prices only available via an ambiguous competitor page ($39/$15 "Starter", $99/$29 "Pro", 50% annual discount) **[unverified]** — [Creatify on OpusClip pricing](https://creatify.ai/blog/opusclip-pricing-plans-and-what-you-ll-actually-pay-in-2026)
- Mux MP4/static renditions from $0.0006/min; Mux live captions 6K free minutes/month then $0.024/min — [Mux pricing](https://mux.com/pricing); Cloudflare Stream encoding free, delivery $1/1,000 min — [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing/index.md)
- Trigger.dev compute Medium 2x (2 vCPU/4 GB) ≈ $0.61/hr, Large 1x ≈ $1.22/hr, plus $0.000025/run — [Trigger.dev pricing](https://trigger.dev/pricing)
- TED's terms restrict reproduction of TED Content and TEDx publishing is governed by a separate policy — [TED Terms of Use](https://www.ted.com/termsofuse); [TEDx Publishing Policy](https://www.ted.com/pages/tedx-publishing-policy)

### Inferences
- **Fetching the published talk**: ask the user to paste their TEDx Talks YouTube URL (or OAuth-link their channel); call `videos.list(part=snippet,statistics,contentDetails)` daily (1 unit) to track views/likes/comments; cache stats in `talk_stats`. Avoid `search.list` (100 calls/day bucket) except as a fallback. Captions: the official TEDx Talks channel owns the video, so `captions.download` is not available to the speaker's token; instead run your own STT on the audio only if the user has rights to the file, or rely on the user-uploaded recording from the event.
- **Clip generation (recommended self-hosted)**: (1) transcript with word timestamps (Deepgram/AssemblyAI); (2) Haiku/Sonnet selects 5–8 candidate 30–60 s segments via structured output (scores for hook strength, self-containment, quotability) constrained to sentence boundaries from the timestamps; (3) FFmpeg on a Trigger.dev Medium machine: `-ss/-to` trim, 9:16 crop with a simple face-centred crop (MediaPipe Face Detector on sampled frames), burned-in captions from an ASS/SRT generated from word timestamps (`subtitles=` filter), loudness normalisation (`loudnorm`), MP4 H.264 output. Cost per 18-minute talk ≈ $0.08 STT + ≈ $0.02 LLM + ≈ 5 minutes of Medium 2x compute ≈ $0.05 → well under $0.25 per talk, versus plan-bundled minutes on Vizard/OpusClip. Use Vizard/OpusClip only if the product wants their virality scoring and auto-reframing without building it.
- **Posting**: LinkedIn is the primary channel for TEDx speakers; implement OAuth with `w_member_social`, upload the clip via the Videos API, then `POST /rest/posts`; keep a published-version header constant and track LinkedIn's monthly version sunsets (202511 → sunset Nov 16, 2026). For X, pay-per-use makes "post with link" 13× costlier than a plain post ($0.20 vs $0.015 per the third-party figures); default to posting the clip natively with the link in a reply. Budget ≈ $0.02–0.25 per X post and $0 per LinkedIn post. Instagram/TikTok posting APIs were not researched.
- **Press kit**: generate with `@react-pdf/renderer` (bio, headshot, talk abstract, 3 pull-quotes from the transcript, QR/short link to the talk, key stats) and host on Supabase Storage with a signed URL; regenerate when stats change.
- **Rights**: TEDx talks published on the TEDx Talks channel are TED-licensed content; clipping and re-posting the TED-produced video may need to follow the TED Talks Usage Policy/TEDx publishing rules; the safest default is clips from the speaker's own recording or linking/embedding the YouTube video, with a rights checkbox before any re-upload.

### Gaps
- X's official 2026 pricing page was not fetched; the pay-per-use rates above are third-party and must be verified.
- LinkedIn app-review requirements for `w_member_social` (Community Management vs "Share on LinkedIn" products) and numeric rate limits were not confirmed.
- Instagram Graph API / TikTok Content Posting API and their 2026 approval processes were not researched.
- Vizard/OpusClip plan prices and included minutes are not verified first-party.
- TED Talks Usage Policy specifics on clipping/re-uploading TEDx videos were not read.

---

## 8. Privacy, security and compliance (BIPA/Texas/Washington, GDPR/UK GDPR, India DPDP, retention, SOC 2, AI disclosure, TEDxYouth)

### Takeaway
Face-landmark-based eye-contact analysis sits squarely inside BIPA's "scan of face geometry" and voice analytics may touch "voiceprint" definitions, so treat both as biometric: get prior written (electronic signature is now valid under the 2024 BIPA amendment) consent with a published retention/destruction schedule, default the feature off, and process on-device without storing templates. Under GDPR, biometric data is special-category only when used "for the purpose of uniquely identifying a natural person" (Art. 9(1)), so an on-device, non-identifying gaze metric can be designed to stay outside Art. 9 while still requiring Art. 6 lawful basis and transparency. India's DPDP Rules (notified Nov 14, 2025) phase core obligations in over 18 months (≈ May 2027) with 72-hour breach reporting, erasure after one year of inactivity, and verifiable parental consent under 18 — relevant to TEDxYouth users.

### Cited Findings

**Illinois BIPA**
- SB 2979 (signed Aug 2, 2024) changed accrual to a per-person standard ("an aggrieved person is entitled to, at the most, one recovery") instead of per scan/disclosure; statutory damages remain up to $1,000 per negligent violation and $5,000 per reckless/intentional violation; the amendment confirms consent/"written release" may be obtained by electronic signature; BIPA covers fingerprints, voiceprints, retina scans and facial geometry; BIPA requires notice of collection and retention practices; the legislature did not address retroactivity — [Fisher Phillips BIPA alert](https://www.fisherphillips.com/en/news-insights/breaking-bipa-news-illinois-curtails-massive-damage-awards-in-biometric-cases.html)
- Additional firm summaries of the amendment (not fetched; titles indicate courts have since held the damages-limiting amendment applies retroactively) — [Mondaq: damages-limiting amendment applies retroactively](https://www.mondaq.com/unitedstates/privacy-protection/1771928/damages-limiting-amendment-to-bipa-applies-retroactively); [Coblentz: BIPA damages limitation applies retroactively](https://www.coblentzlaw.com/news/bipa-damages-limitation-applies-retroactively/); [Benesch on SB 2979](https://www.beneschlaw.com/resources/illinois-amends-biometric-information-privacy-act-to-reign-in-liquidated-damages-and-permit-electronic-signatures.html); [McGuireWoods 2026 BIPA publication (PDF)](https://media.mcguirewoods.com/publications/2026/2460000-2460906-bipa.pdf)

**GDPR**
- Art. 9(1) prohibits processing special categories including "biometric data for the purpose of uniquely identifying a natural person"; Art. 9(2)(a) lifts the prohibition where "the data subject has given explicit consent to the processing of those personal data for one or more specified purposes" (unless Union/Member State law provides otherwise) — [GDPR Art. 9 (gdpr-info.eu)](https://gdpr-info.eu/art-9-gdpr/)

**India DPDP Act 2023 / Rules 2025**
- Rules issued November 14, 2025. Phasing: Data Protection Board and definitions/enforcement provisions immediate; Consent Manager registration rules at 12 months; core obligations (consent notices, purpose limitation, children's data, retention/erasure, security safeguards) at 18 months; large tech may face full obligations into 2027. Consent notices must be plain-language with purposes displayed prominently, a withdrawal link and contact details. Retention: personal data cannot be kept beyond one year of user inactivity unless another law requires it, with 48 hours' notice before erasure (the article's e-book example keeps order/payment/log data ≥1 year from the transaction). Breach: notify affected individuals immediately via registered channels, initial notice to the Board without delay and a detailed report within 72 hours. Children: verifiable parental consent for anyone under 18 using reliable ID or DigiLocker credentials (exemptions for healthcare, safety, education). Significant Data Fiduciaries: annual DPIA + independent audit, algorithmic-risk assurance, data-localisation for notified categories. Cross-border transfers permitted subject to government conditions. Penalties up to INR 250 crore (~US$28M) per breach — [India Briefing: DPDP Rules 2025](https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html); corroborating alerts — [Hogan Lovells: DPDP Act brought into force](https://www.hlc.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-); [Mondaq: DPDP Rules 2025 notified](https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified); [EY DPDP Act and Rules (PDF)](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/pdf/2025/11/dpdp-act-and-rules.pdf)

**SOC 2 and vendor posture**
- Supabase Team plan ($599/month) includes SOC 2 and ISO 27001 reports, dashboard SSO, project-scoped/read-only access — [Supabase pricing](https://supabase.com/pricing)
- Yoodli states it is SOC 2 Type 2 certified and GDPR compliant — [Yoodli privacy hub](https://yoodli.ai/privacy)
- Trigger.dev offers a HIPAA BAA at $500/month; Inngest Enterprise includes SAML/RBAC/audit trails/HIPAA — [Trigger.dev pricing](https://trigger.dev/pricing); [Inngest pricing](https://www.inngest.com/pricing)
- Claude API data residency option (`inference_geo: "us"`) at 1.1× pricing — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- AssemblyAI in-region (US/EU) LLM routing 10% higher; EU/US routing selectable — [AssemblyAI pricing](https://www.assemblyai.com/pricing.md)

### Inferences
- **Consent design (US)**: before enabling any face/eye analysis, show a dedicated consent screen (separate from the ToS) that (a) states that facial geometry is scanned on the user's device to compute camera-facing time, (b) states that no face template or landmarks leave the device, (c) states the retention schedule for the derived metrics and the raw video (e.g., video auto-deleted after 30 days, metrics kept with the account until deletion), and (d) captures an electronic signature/checkbox with timestamp, IP and policy version stored in `consents`. Publish the retention/destruction schedule in the privacy policy (BIPA §15(a)). Default the feature off; offer an audio-only rehearsal mode as the baseline. Because BIPA accrual is now per person, worst-case exposure per non-consented Illinois user is $1,000–5,000 rather than per-session multiples — but class exposure at scale is still material.
- **Voice**: STT and prosody metrics are not voiceprints if you never create a speaker-identification template; avoid speaker-identification/"voice fingerprint" features; do not use diarization identity models to recognise returning users. Still disclose that audio is sent to a third-party STT processor (Deepgram/AssemblyAI) and name subprocessors.
- **GDPR/UK GDPR**: lawful basis for video/audio rehearsal processing = contract (Art. 6(1)(b)) for core coaching, with consent for the optional gaze feature; keep the gaze metric non-identifying so Art. 9 is not triggered; run a DPIA anyway (systematic monitoring + special-category-adjacent data); offer export/delete; sign DPAs with Deepgram/AssemblyAI/Anthropic/OpenAI/Supabase/Vercel/Mux; use EU-region Supabase project and EU STT routing for EU users if marketing there; AI-generated outputs should be labelled.
- **India**: given the 18-month phase-in from Nov 2025, plan DPDP compliance (notice, withdrawal link, grievance contact, 72-hour breach runbook, 1-year inactivity erasure job, parental consent gate for under-18s) for ≈ Q2 2027; the inactivity-erasure rule maps naturally onto the 30-day video / 12-month account retention defaults; if India is a primary market, host data in an India or Singapore Supabase region and check the localisation list once notified.
- **Retention defaults (recommended)**: raw rehearsal video 30 days (user-extendable), audio-only derivative deleted after processing, transcripts + metrics kept for the account lifetime, LLM prompt/response logs 90 days (hashed user id), consents indefinitely; account inactivity 12 months → warning → erase (DPDP-aligned).
- **SOC 2**: for a prosumer app, SOC 2 Type I within 12 months of launch is a reasonable target driven by B2B (corporate coaching, universities, TEDx organiser) deals rather than consumers; the practical path is picking vendors that already have reports (Supabase Team, Vercel Enterprise, Deepgram/AssemblyAI/Anthropic) and using an automation platform; cost not sourced (see Gaps).
- **AI disclosure norms**: label AI-generated drafts in the editor and exports ("Draft generated with AI; edited by speaker"), disclose AI use in the ToS/privacy policy, and give TEDx applicants a reminder that organisers may ask whether AI was used — TED's own policy on AI-assisted talks was not researched (gap).
- **TEDxYouth**: speakers can be minors. Under DPDP, under-18 requires verifiable parental consent; under COPPA, under-13 is the threshold; GDPR sets 13–16 by member state. Simplest policy: 18+ only for recording/analysis features, with a parent/guardian-managed account path (parent signs up, consents, and the minor's rehearsals live under the parent's account) if TEDxYouth is a target segment.

### Gaps
- Texas CUBI (Bus. & Com. Code §503.001) and Washington My Health My Data Act primary texts could not be fetched (statute site returned the homepage; Wikipedia fetch failed); verify CUBI's AG-only enforcement/$25,000 per violation and MHMDA's private right of action and biometric scope before launch.
- UK GDPR/ICO biometric guidance and EU AI Act obligations for emotion-recognition-adjacent features (energy/"sentiment" scoring could be construed as emotion inference) were not researched; check the AI Act's prohibition on emotion recognition in workplaces/education if selling to employers or schools.
- Cost of SOC 2 (Vanta/Drata/auditor) in 2026 was not sourced.
- TED's own policy on AI-assisted talk writing/disclosure for TEDx applicants was not found.
- The DPDP one-year inactivity erasure rule's applicability thresholds (which classes of data fiduciaries it applies to) should be confirmed in the Rules' schedule; the India Briefing summary states it generally.

---

## 9. Build estimates and total infrastructure cost at 100 / 1,000 / 10,000 active users; recommended architecture and alternatives

### Takeaway
Variable COGS for a heavy user is roughly $3–5/month (LLM ≈ $1.2 on Sonnet 5.5, STT ≈ $0.7–1.5 for 200 rehearsal minutes, video ≈ $0.1–1.0 depending on host and retention), so blended infrastructure lands near $350/month at 100 users, $2.5K/month at 1,000 and $18–25K/month at 10,000 before volume discounts, with video retention policy and model routing as the two biggest levers. An MVP across all four pillars is on the order of 20–30 person-weeks; a full product 50–70 person-weeks. These are inferences from the cited unit prices.

### Cited Findings
- Unit prices used (all cited above): Deepgram Nova-3 $0.0077/min, AssemblyAI U-3.5 Pro $0.0035/min ([Deepgram](https://deepgram.com/pricing), [AssemblyAI](https://www.assemblyai.com/pricing.md)); Claude Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 per MTok, cache read 0.05× on Opus/Sonnet 5.5, Batch 50% ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)); Mux 720p storage $0.0024/min/month and delivery $0.0008/min ([Mux](https://mux.com/pricing)); Cloudflare Stream $5/1,000 min stored, $1/1,000 min delivered ([Cloudflare](https://developers.cloudflare.com/stream/pricing/index.md)); Supabase Pro $25, storage $0.0213/GB, egress $0.09/GB, compute Small $15 / Large $110 / XL $210, Team $599 ([Supabase](https://supabase.com/pricing)); Vercel Pro $20/seat ([Vercel](https://vercel.com/pricing)); Inngest Free/Pro $99/Business $499 ([Inngest](https://www.inngest.com/pricing)); Trigger.dev Hobby $10/Pro $50 + ≈$0.12–0.61/hr compute ([Trigger.dev](https://trigger.dev/pricing)); Resend Free/Pro $20/Scale $90 ([Resend](https://resend.com/pricing)); Sentry Team $29/Business $89 ([Sentry](https://sentry.io/pricing/)); PostHog free allowances ([PostHog](https://posthog.com/pricing)); Stripe 2.9%+30¢ ([Stripe](https://stripe.com/pricing)); Paddle/Lemon Squeezy 5%+50¢ ([Paddle](https://www.paddle.com/pricing), [Lemon Squeezy](https://www.lemonsqueezy.com/pricing)).

### Inferences

**Per-user variable cost (planning assumptions: heavy user = 20 × 10-min rehearsals, 2 drafts, 10 revisions, 3 idea rounds; light user = ¼ of that; mix 30% heavy / 70% light → average ≈ 0.48 × heavy)**

| Component | Heavy user / month | Notes |
|---|---|---|
| LLM (Sonnet 5.5 writing + Haiku 5.5 feedback, with caching) | ≈ $0.70–0.90 | ≈ $1.20 uncached on Sonnet for everything; ≈ $2.40 on Opus 5.5 |
| STT (200 min batch) | ≈ $0.70 (AssemblyAI) – $1.54 (Deepgram) | Deepgram preferred for filler words |
| Audio feature extraction (Praat/librosa on Trigger.dev Small 1x, ~30 s per rehearsal) | ≈ $0.02 | plus $0.0005 run fees |
| Video storage (200 new min/month, 30-day retention) | ≈ $0.08 (Supabase) – $0.48 (Mux) – $1.00 (Cloudflare Stream) | without retention limits this grows linearly every month |
| Video delivery (owner watches each rehearsal once) | ≈ $0 (Mux within 100K min free) – $0.20 (Cloudflare) – $0.35 (Supabase egress beyond quota) | |
| Email/analytics/errors | < $0.05 | within free tiers until ~1K users |
| **Total heavy user** | **≈ $1.6–4.0** | **≈ $3–5 if Opus is used for drafts** |

**Monthly infrastructure (variable + fixed), mid-range assumptions (Deepgram, Sonnet+Haiku with caching, Supabase Storage with 30-day retention)**

| Active users | Variable (≈ $2/user avg) | Fixed platform | Total |
|---|---|---|---|
| 100 | ≈ $200 | ≈ $130 (Supabase Pro $25 + Vercel Pro 2 seats $40 + Sentry $29 + Mux/Inngest/Resend/PostHog free tiers + Micro compute credit) | **≈ $300–400** |
| 1,000 | ≈ $2,000 | ≈ $450 (Supabase Pro + Small/Medium compute $15–60 + Vercel Pro $40 + usage + Inngest Pro $99 or Trigger Pro $50 + Resend Pro $20 + Sentry $29 + PostHog overage) | **≈ $2,300–2,800** |
| 10,000 | ≈ $20,000 list (≈ $14–17K with Deepgram Growth −15%, Batch/caching, Haiku routing) | ≈ $1,500–3,000 (Supabase Large/XL compute $110–210 + ~5 TB storage/egress overages ≈ $300–600 + Inngest Business $499 + Sentry Business $89 + Vercel usage ≈ $200–500 + PostHog usage + optional Supabase Team $599) | **≈ $16–23K** |

Payment processing is additional: at $20/month ARPU, Stripe ≈ 4.4% effective (≈ $0.88/user) vs Paddle/Lemon Squeezy ≈ 7.5% (≈ $1.50/user).

**Engineering effort (person-weeks; MVP → full; assumes 2 senior full-stack engineers familiar with Next.js/Supabase, one with Python/FFmpeg)**

| Module | MVP | Full |
|---|---|---|
| Auth, profiles, billing (Supabase Auth, Stripe/Paddle, plans + credit caps) | 2–3 | 4–6 |
| Event database + curator admin + organiser submissions + matching (pgvector/PostGIS) | 4–6 | 10–14 (monitors, dedup tooling, organiser portal, freshness SLAs) |
| LLM ideation → pitch → outline → script → revisions (structured outputs, streaming, versioning, evals, cost caps) | 4–6 | 8–12 |
| Rehearsal capture + upload + STT + audio analytics (WPM, pauses, fillers, pitch/energy) + feedback | 5–7 (audio-first; video stored but not analysed) | 10–16 (on-device eye contact/gesture, dashboards, progress tracking, live mode) |
| Teleprompter + editor + exports (PDF/DOCX/ICS) | 2–3 | 5–7 |
| Repurposing (YouTube stats, press kit; later clips + captions + LinkedIn/X posting) | 2–3 | 8–12 |
| Privacy/compliance/ops (consents, retention jobs, DPIA docs, monitoring) | 1–2 | 3–5 |
| **Total** | **≈ 20–30 pw (≈ 3–4 months for 2 engineers)** | **≈ 50–70 pw** |

**Recommended architecture (compatible with the incumbent React + Supabase codebase)**
1. **Front end**: Next.js App Router on Vercel Pro; React client components for recorder (MediaRecorder + tus), teleprompter (rAF), Tiptap editor; MediaPipe Face/Pose Landmarker in a Web Worker for on-device metrics.
2. **Data**: Supabase Postgres (RLS per user/org), pgvector for event/idea embeddings, PostGIS for geo, pg_cron for freshness and retention jobs; Supabase Storage (resumable uploads) for rehearsal media with 30-day default lifecycle; signed URLs for playback.
3. **Compute**: Next.js route handlers for LLM streaming (SSE) within Vercel's 300 s default; Supabase Edge Functions only for webhooks/light logic (2 s CPU cap); Trigger.dev (or Inngest) workers in Docker with FFmpeg + Python (Parselmouth/librosa) for media processing, clip generation and PDF/DOCX rendering.
4. **AI**: Claude Sonnet 5.5 default writer, Opus 5.5 premium polish, Haiku 5.5 for feedback/tagging/moderation; 1-hour prompt caching on system prompt + script; Batch API for nightly jobs; Deepgram Nova-3 (`filler_words=true`, `en-IN`/`hi`) for STT with AssemblyAI as fallback; per-user token/minute caps enforced in an `usage_ledger` table.
5. **Events**: organiser submissions + curator queue + public-search/social leads, weekly single-page re-verification of curated TED URLs under robots/ToS discipline, and a partnership request to TED.
6. **Billing**: Stripe Billing + Meters for US/EU; Paddle (or Lemon Squeezy, after confirming its post-Stripe status) as MoR for India/global tax if the team does not want tax registrations.
7. **Ops**: PostHog (analytics, replay, flags), Sentry Team, Resend, Supabase Team plan when SOC 2 evidence is needed.

**Alternatives and when to switch**
- *Video*: Cloudflare Stream or Mux when you need adaptive streaming, public sharing, thumbnails/trimming or multi-device playback; Bunny Stream for lowest per-GB cost with your own player.
- *Jobs*: Inngest instead of Trigger.dev if the team prefers event-driven orchestration over machine-hour compute; Vercel Workflows (limits documented but pricing not researched) if staying all-in on Vercel.
- *Auth/DB*: Clerk only if B2B org management/SSO becomes central before Supabase's offering suffices; Neon/Convex only for a greenfield rebuild — not justified here.
- *LLM*: OpenAI gpt-6.1-sol ($2/$10) or Gemini 3.8 Flash ($0.75/$3.75 until end-2026) as cost/quality alternates behind the same provider-agnostic interface; keep prompts model-agnostic and re-run the eval suite before switching.
- *STT*: AssemblyAI U-3.5 Pro as primary if cost dominates and English-only fillers suffice; Azure only if Pronunciation Assessment (phoneme-level scoring) becomes a product feature.

### Gaps
- All effort and total-cost figures are planning estimates derived from the cited unit prices and stated assumptions; no benchmark of real token usage or rehearsal durations exists yet.
- Volume discounts beyond the published Deepgram Growth tier, Mux enterprise (> $3K/month) and Google/Azure commitment tiers were not quantified.
- Vercel Workflows pricing, Firebase, and Google Programmable Search/SerpAPI/geocoding costs were not researched (search budget exhausted).
