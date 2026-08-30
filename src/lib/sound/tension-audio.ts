"use client";

// Ortak, dosya gerektirmeyen (Web Audio API ile aninda sentezlenen) gerilim/
// heyecan sesleri - hem soru/deneme oncesi tam ekran geri sayimda (bkz.
// pre-quiz-countdown.tsx) hem de "Değerlendiriliyor..." bekleme ekraninda
// (bkz. evaluation-heartbeat.tsx) kullaniliyor. Kod tekrarini onlemek icin
// tek bir yerde toplaniyor.

export function getAudioCtx(ref: { current: AudioContext | null }): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ref.current) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) ref.current = new Ctx();
  }
  return ref.current;
}

// Kisa, tek bir "tik" sesi - geri sayimda her sayi degisiminde caliyor.
// Exponansiyel azalma matematiksel olarak asla tam sifira inmedigi icin,
// osc.stop() oncesi kisa bir linear ramp ile gain'i tam sifira indiriyoruz -
// aksi halde sesin sonunda kulaga hos gelmeyen bir "cat/pop" sesi olusuyordu.
export function playTick(ctx: AudioContext, freq: number, duration = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration + 0.03);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

// Kalp atışı benzeri iki vuruşluk ("lub-dub") yumuşak bir "tıp" sesi. Eskiden
// gerilim icin alcak frekansli bir testere dalgasi ("sawtooth") kullaniliyordu
// ama bu, hoparlorde hos olmayan bir "zirlama/vizilti" gibi duyuluyordu ve
// sonunda tam sifira inmedigi icin kulak tirmalayan bir kesilme sesi
// birakiyordu. Sine dalga tabanli bu kalp atisi hem daha yumusak/gercekci
// hem de her vurus tam sifirda bitiyor - "zirlama" kalmiyor.
export function playHeartbeat(ctx: AudioContext, at = 0, strength = 1) {
  const t0 = ctx.currentTime + at;
  playThump(ctx, t0, 95, 0.16, 0.32 * strength);
  playThump(ctx, t0 + 0.22, 78, 0.18, 0.22 * strength);
}

function playThump(ctx: AudioContext, time: number, freq: number, duration: number, peakGain: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peakGain, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.gain.linearRampToValueAtTime(0, time + duration + 0.03);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}
