// Styles for the hidden plan offer screens (popup, banner, /plan-offer, success). Colors and type follow the
// "Hidden Plan Offer Flow" canvas: cream #F5F0E6 pages, black #000 plan card, gold #E8B930, emerald #1A3C34.
export const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";

export const planOfferCss = `
.po { font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #111; box-sizing: border-box; }
.po *, .po *::before, .po *::after { box-sizing: border-box; }
.po-display { font-family: 'Bebas Neue', Impact, sans-serif; font-weight: 400; letter-spacing: 0.5px; }

/* Page (confirm, messages) */
.po-page { min-height: calc(100vh - 56px); background: #F5F0E6; display: flex; flex-direction: column; align-items: center; }
.po-top { width: 100%; height: 64px; background: #000; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.po-top-brand { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 28px; letter-spacing: 2px; color: #E8B930; }
.po-top-right { display: flex; align-items: center; gap: 6px; }
.po-top-user { font-size: 13px; color: #CFC6B4; }
.po-x { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; border-radius: 22px; color: inherit; text-decoration: none; }
.po-x:focus-visible, .po-btn:focus-visible, .po-link:focus-visible { outline: 2px solid #E8B930; outline-offset: 2px; }
.po-body { width: 100%; max-width: 440px; padding: 28px 22px 32px; display: flex; flex-direction: column; gap: 18px; flex: 1; }
.po-step { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; color: #1A3C34; }
.po-h1 { margin: 0; font-size: 42px; line-height: 0.95; }
.po-sub { margin: 0; font-size: 15px; color: #3A3A3A; }
.po-lead { margin: 0; font-size: 16px; line-height: 1.5; color: #3A3A3A; }
.po-plan { background: #000; color: #F5F0E6; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.po-plan-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.po-plan-name { font-size: 28px; }
.po-chip { background: #E8B930; color: #000; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.po-price { display: flex; align-items: baseline; gap: 6px; }
.po-price-num { font-size: 44px; line-height: 1; color: #E8B930; }
.po-price-unit { font-size: 15px; color: #CFC6B4; }
.po-plan-note { margin: 0; font-size: 14px; color: #CFC6B4; }
.po-card { background: #fff; border: 1px solid #E2D9C6; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
.po-card-dashed { border-style: dashed; border-color: #B8AE98; }
.po-card-icon { width: 44px; height: 30px; border-radius: 6px; background: #1A3C34; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.po-card-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.po-card-title { font-size: 15px; font-weight: 600; }
.po-card-sub { font-size: 13px; color: #555; }
.po-note { border-radius: 16px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; }
.po-note-green { background: #E3EFE8; border: 1px solid #B9D6C5; color: #2F3F38; }
.po-note-amber { background: #FBEBC9; border: 1px solid #E8C77A; color: #4A3A1A; }
.po-note-white { background: #fff; border: 1px solid #E2D9C6; color: #555; }
.po-note-title { display: block; font-size: 15px; font-weight: 700; color: #111; margin-bottom: 4px; }
.po-note-text { font-size: 14px; line-height: 1.45; }
.po-due { display: flex; flex-direction: column; gap: 6px; font-size: 15px; border-top: 1px solid #E2D9C6; padding-top: 14px; }
.po-due-row { display: flex; justify-content: space-between; }
.po-due-strong { font-weight: 700; }
.po-spacer { flex: 1; }
.po-btn { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; border-radius: 16px; font-family: inherit; font-size: 17px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; width: 100%; padding: 0 16px; }
.po-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.po-btn-black { background: #000; color: #E8B930; }
.po-btn-gold { background: #E8B930; color: #000; }
.po-btn-ghost { background: transparent; color: #111; border: 1px solid #CFC6B4; min-height: 48px; font-size: 16px; font-weight: 600; }
.po-btn-plain { background: transparent; color: #3A3A3A; min-height: 48px; font-size: 16px; font-weight: 600; }
.po-fine { margin: 0; text-align: center; font-size: 13px; line-height: 1.5; color: #555; }
.po-err { margin: 0; font-size: 14px; color: #8A2414; background: #F8DCD6; border-radius: 12px; padding: 10px 12px; }
.po-link { color: #1A3C34; font-weight: 600; font-size: 14px; min-height: 44px; display: inline-flex; align-items: center; background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; }
.po-badge-icon { width: 64px; height: 64px; border-radius: 32px; display: flex; align-items: center; justify-content: center; }
.po-checks { display: flex; flex-direction: column; gap: 8px; font-size: 15px; }
.po-check { display: flex; gap: 10px; align-items: center; }

/* Popup (artboards 1 Main and FreeOffer): a bottom sheet on phones, a centered card on wider screens */
.po-overlay { position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,0.55); display: flex; align-items: flex-end; justify-content: center; }
.po-sheet { position: relative; width: 100%; max-width: 480px; background: #F5F0E6; border-radius: 28px 28px 0 0; padding: 28px 24px 32px; display: flex; flex-direction: column; gap: 18px; max-height: 92vh; overflow-y: auto; }
@media (min-width: 640px) { .po-overlay { align-items: center; padding: 16px; } .po-sheet { border-radius: 28px; } }
.po-sheet-x { position: absolute; top: 14px; right: 14px; background: #E2D9C6; }
.po-grip { align-self: center; width: 44px; height: 5px; border-radius: 3px; background: #CFC6B4; }
.po-tag { align-self: flex-start; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; padding: 6px 12px; border-radius: 999px; }
.po-tag-green { background: #1A3C34; color: #F5F0E6; }
.po-tag-gold { background: #E8B930; color: #000; }
.po-sheet-h { margin: 0; font-size: 44px; line-height: 0.95; }
.po-sheet-card { background: #fff; border: 1px solid #E2D9C6; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.po-sheet-price { font-size: 40px; line-height: 1; }

/* Banner (artboard Reminder) */
.po-banner { position: sticky; top: 56px; z-index: 150; background: #E8B930; display: flex; align-items: center; }
.po-banner-main { flex: 1; color: #000; text-decoration: none; padding: 12px 0 12px 20px; display: flex; align-items: center; gap: 12px; min-height: 44px; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
.po-banner-title { display: block; font-weight: 700; font-size: 15px; }
.po-banner-body { display: block; font-size: 13px; }

/* Success (artboards 4 Live and FreeLive) */
.po-dark { background: #000; color: #F5F0E6; min-height: calc(100vh - 56px); display: flex; justify-content: center; }
.po-dark .po-body { padding-top: 48px; gap: 24px; }
.po-dark-h { margin: 0; font-size: 50px; line-height: 0.95; }
.po-dark-p { margin: 0; font-size: 16px; line-height: 1.5; color: #CFC6B4; }
.po-dark-card { background: #111; border: 1px solid #2A2A2A; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.po-dark-eyebrow { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; color: #E8B930; }
.po-dark .po-btn-ghost { color: #F5F0E6; border-color: #3A3A3A; }
`;
