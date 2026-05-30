type Props = {
  title: string;
  lead?: string;
};

export function StaticLegalPage({ title, lead }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-trnet-text sm:text-4xl">
        {title}
      </h1>
      <p className="mt-6 text-base leading-relaxed text-trnet-text/70">
        {lead ??
          "Bu sayfa yapım aşamasındadır. Güncel metin ve kurumsal bilgiler kısa süre içinde yayınlanacaktır."}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-trnet-text/55">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
        incididunt ut labore et dolore magna aliqua. TRNETHABER olarak şeffaflık ve
        okuyucu güvenini önemsiyoruz; yasal metinlerimiz editoryal standartlarımızla
        uyumlu şekilde güncellenecektir.
      </p>
    </article>
  );
}
