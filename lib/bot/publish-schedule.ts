/** Normal haberler için 2–8 dk arası rastgele ek gecikme (dakika). */
export function randomStaggerMinutes(): number {
  return 2 + Math.floor(Math.random() * 7);
}

/**
 * Aynı fetch-news döngüsünde normal haberleri sırayla yayınlar.
 * Son dakika haberleri scheduleCursor'ı etkilemez; anında NOW kullanılır.
 */
export class FetchNewsPublishSchedule {
  private scheduleCursorMs: number;

  constructor(startMs: number = Date.now()) {
    this.scheduleCursorMs = startMs;
  }

  /** Son dakika — sıfır gecikme */
  breakingPublishedAt(): string {
    return new Date().toISOString();
  }

  /** Önceki normal habere 2–8 dk ekleyerek planlar */
  nextNormalPublishedAt(): string {
    const addMs = randomStaggerMinutes() * 60 * 1000;
    this.scheduleCursorMs += addMs;
    return new Date(this.scheduleCursorMs).toISOString();
  }
}
