const useCases = [
  "AI-generated blog posts and articles",
  "Student drafts and research notes",
  "Business reports, proposals, and emails",
  "Marketing copy, landing pages, and social posts"
];

const modeDetails = [
  {
    name: "Light mode",
    body: "Best for quick cleanup. It keeps your structure close to the original while smoothing awkward phrasing, adding natural contractions, and improving readability."
  },
  {
    name: "Standard mode",
    body: "Best for everyday publishing. It rewrites sentence rhythm, improves transitions, reduces robotic repetition, varies vocabulary, and checks quality with a perplexity signal so the result feels less predictable."
  },
  {
    name: "Deep mode",
    body: "Best for drafts that still feel obviously AI-assisted. It runs a multi-pass rewrite loop, checks naturalness after each pass, and pushes harder on voice, flow, sentence variety, and authentic human texture."
  }
];

const faqs = [
  {
    question: "What is an AI humanizer?",
    answer:
      "An AI humanizer rewrites AI-assisted text so it reads more naturally. It reduces stiff phrasing, repetitive structure, overly formal transitions, and the flat rhythm common in generated drafts."
  },
  {
    question: "Does Humaniser work with ChatGPT, Gemini, and Claude text?",
    answer:
      "Yes. You can paste text from ChatGPT, Gemini, Claude, Grok, or another writing assistant and use Humaniser to improve clarity, rhythm, and naturalness while keeping the meaning intact."
  },
  {
    question: "Does it guarantee bypassing every AI detector?",
    answer:
      "No tool can honestly guarantee that. Humaniser focuses on writing quality and naturalness, then uses scoring signals to help you judge how fluid and human-like the result reads."
  }
];

export function LandingSeoContent() {
  return (
    <section id="ai-humanizer" className="border-t bg-background py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">AI humanizer</p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Humanize ChatGPT, Gemini, and Claude drafts without losing the point.
            </h2>
            <div className="mt-5 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Humaniser is a free AI humanizer demo and writing quality editor built for people who want AI-assisted
                text to sound clearer, warmer, and more genuinely human. Paste a draft, choose a rewrite depth, and
                compare every change in diff view before you use it.
              </p>
              <p>
                Instead of simply swapping words, Humaniser works on sentence rhythm, transitions, contractions,
                vocabulary variety, and natural flow. The goal is polished human-like writing that preserves your facts,
                intent, and voice.
              </p>
            </div>
          </div>

          <aside className="w-full rounded-lg border bg-card p-5 shadow-sm lg:mt-2">
            <h3 className="font-semibold">Common use cases</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {useCases.map((item) => (
                <li key={item} className="border-l-2 border-accent/50 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="mt-14 md:mt-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Rewrite modes</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight">
              What makes each rewrite mode different?
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {modeDetails.map((mode) => (
              <article key={mode.name} className="rounded-lg border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">{mode.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{mode.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 md:mt-16">
          <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight">AI humanizer FAQ</h2>
          <div className="mt-6 divide-y rounded-lg border bg-card">
            {faqs.map((item) => (
              <div key={item.question} className="p-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
