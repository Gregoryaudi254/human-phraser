export function LandingHowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Paste your draft",
      body: "Drop in blog posts, emails, landing copy, or anything that sounds too stiff."
    },
    {
      step: "02",
      title: "Pick a rewrite mode",
      body: "Light for quick polish, Standard for balance, Deep when you want maximum naturalness."
    },
    {
      step: "03",
      title: "Review and publish",
      body: "Use diff view to accept the flow, then copy the result straight into your workflow."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-12 md:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">How it works</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">From draft to done in minutes</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative border-l-2 border-accent/40 pl-6">
              <span className="font-mono text-sm font-semibold text-accent">{item.step}</span>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
