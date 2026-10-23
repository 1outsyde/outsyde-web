/** Styles for the host create and edit flow (mockups 8 to 13), centered column up to 640 px. */
export const EDITOR_CSS = `
.ed-page { min-height: 100vh; background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', system-ui, sans-serif; }
.ed-page *, .ed-page *::before, .ed-page *::after { box-sizing: border-box; }
.ed-wrap { max-width: 640px; margin: 0 auto; padding: 64px 0 0; min-height: 100vh; display: flex; flex-direction: column; }
.ed-top { min-height: 60px; padding: 8px 12px 0; display: flex; align-items: center; gap: 4px; }
.ed-top-title { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.ed-top-h { font-size: 17px; font-weight: 700; margin: 0; }
.ed-top-action { min-height: 44px; padding: 0 8px; border: 0; background: transparent; color: #A0A0A0; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-top-action:disabled { opacity: 0.5; cursor: not-allowed; }
.ed-icon-btn { width: 44px; height: 44px; flex: 0 0 44px; border: 0; background: transparent; color: #F5F0E6; display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; border-radius: 22px; }
.ed-icon-btn:focus-visible, .ed-page button:focus-visible, .ed-page a:focus-visible, .ed-page input:focus-visible, .ed-page select:focus-visible, .ed-page textarea:focus-visible, .ed-agree-box:focus-visible { outline: 2px solid #E8B930; outline-offset: 2px; }
.ed-icon-spacer { width: 44px; flex: 0 0 44px; }
.ed-progress { height: 3px; background: #1C1C1E; margin: 0 16px; }
.ed-progress > div { height: 3px; background: #E8B930; }
.ed-body { flex: 1 1 auto; padding: 16px; }
.ed-foot { position: sticky; bottom: 0; background: #000; padding: 10px 16px 24px; border-top: 1px solid #1F1F1F; display: flex; flex-direction: column; gap: 8px; z-index: 5; }
.ed-stack { display: flex; flex-direction: column; gap: 14px; }
.ed-stack-sm { display: flex; flex-direction: column; gap: 8px; }
.ed-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ed-grow { flex: 1 1 auto; }
.ed-label { font-size: 12px; font-weight: 700; color: #A0A0A0; letter-spacing: 1px; padding: 0; }
.ed-sublabel { font-size: 13px; color: #B8B0A0; }
.ed-hint { font-size: 12px; color: #A0A0A0; line-height: 1.4; }
.ed-strong { font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
.ed-gold-sm { font-size: 12px; color: #E8B930; }
.ed-gold { color: #E8B930; }
.ed-left { align-self: flex-start; padding: 0; }
.ed-warn { color: #E8B930; }
.ed-muted { font-size: 14px; color: #B8B0A0; padding: 24px 16px; }
.ed-err { font-size: 14px; color: #e57a6e; margin: 0; line-height: 1.4; }
.ed-ok { font-size: 14px; color: #9FC2B5; margin: 0; line-height: 1.4; }
.ed-in { width: 100%; min-height: 44px; border-radius: 12px; border: 1px solid #38383A; background: #1C1C1E; color: #F5F0E6; padding: 0 12px; font: 500 15px 'Hanken Grotesk', sans-serif; color-scheme: dark; }
.ed-in::placeholder { color: #8A8478; }
.ed-in:disabled { opacity: 0.55; }
.ed-area { min-height: 96px; padding: 10px 12px; resize: vertical; line-height: 1.5; }
.ed-namerow { display: flex; gap: 12px; align-items: flex-end; }
.ed-thumb { position: relative; width: 72px; height: 72px; flex: 0 0 72px; border-radius: 14px; background: #1A3C34; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
.ed-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ed-thumb-plus { font-size: 24px; color: #9FC2B5; line-height: 1; }
.ed-thumb-text { position: relative; font-size: 11px; font-weight: 700; color: #F5F0E6; background: rgba(0,0,0,0.55); padding: 2px 6px; border-radius: 8px; margin-top: 2px; }
.ed-thumb img + .ed-thumb-text { margin-top: 40px; }
.ed-hidden-file { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.ed-choice-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.ed-choice { min-height: 44px; border-radius: 12px; border: 1px solid #38383A; background: #1C1C1E; color: #F5F0E6; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; padding: 0 10px; }
.ed-choice.on { border-color: #E8B930; background: #2E2A1E; }
.ed-choice:disabled { cursor: default; }
.ed-when { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ed-when .ed-date { grid-column: 1 / -1; }
.ed-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.ed-grid3 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ed-grid3 > :first-child { grid-column: 1 / -1; }
@media (min-width: 520px) {
  .ed-when { grid-template-columns: 1.4fr 1fr 1fr; }
  .ed-when .ed-date { grid-column: auto; }
  .ed-grid3 { grid-template-columns: 1.6fr 1fr 1fr; }
  .ed-grid3 > :first-child { grid-column: auto; }
}
.ed-fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.ed-box { display: flex; flex-direction: column; border-radius: 14px; background: #1C1C1E; overflow: hidden; }
.ed-box-title { padding: 12px 14px 4px; font-size: 14px; font-weight: 700; }
.ed-box-pad { padding: 4px 14px 12px; }
.ed-radio { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px; font-size: 14px; cursor: pointer; }
.ed-radio input[type=radio] { width: 20px; height: 20px; margin: 0; accent-color: #E8B930; flex: 0 0 20px; cursor: pointer; }
.ed-radio input[type=radio]:disabled { cursor: not-allowed; opacity: 0.4; }
.ed-radio-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ed-inline { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ed-hours { width: 72px; min-height: 44px; text-align: center; padding: 0 8px; }
.ed-switchrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 6px 6px 12px; border-radius: 12px; background: #1C1C1E; }
.ed-switch { width: 58px; height: 44px; flex: 0 0 58px; border: 0; background: transparent; padding: 0; position: relative; cursor: pointer; }
.ed-switch::before { content: ""; position: absolute; left: 6px; top: 8px; width: 46px; height: 28px; border-radius: 14px; background: #48484A; transition: background 0.15s; }
.ed-switch.on::before { background: #E8B930; }
.ed-knob { position: absolute; top: 11px; left: 9px; width: 22px; height: 22px; border-radius: 11px; background: #000; transition: left 0.15s; }
.ed-switch.on .ed-knob { left: 27px; }
.ed-primary { width: 100%; min-height: 52px; border-radius: 26px; border: 0; background: #E8B930; color: #000; font: 700 16px 'Hanken Grotesk', sans-serif; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.ed-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ed-primary.ed-auto { width: auto; padding: 0 24px; min-height: 44px; font-size: 14px; }
.ed-secondary { min-height: 44px; border-radius: 22px; border: 1px solid #E8B930; background: transparent; color: #E8B930; font: 700 14px 'Hanken Grotesk', sans-serif; padding: 0 18px; align-self: flex-start; cursor: pointer; }
.ed-ghost { min-height: 44px; border: 0; background: transparent; color: #A0A0A0; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-ghost:disabled { opacity: 0.5; }
.ed-pill { align-self: flex-start; min-height: 44px; padding: 0 16px; border-radius: 22px; border: 0; background: #E8B930; color: #000; font: 700 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-pill:disabled { opacity: 0.6; }
.ed-textbtn { min-height: 44px; min-width: 44px; padding: 0 6px; border: 0; background: transparent; color: #CFC7B8; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-textbtn:disabled { opacity: 0.5; }
.ed-inline-btn { min-height: 44px; padding: 0 2px; text-decoration: underline; }
.ed-link { font-size: 14px; color: #B8B0A0; text-decoration: underline; min-height: 44px; display: inline-flex; align-items: center; }
.ed-outline { min-height: 48px; border-radius: 24px; border: 1px solid #38383A; color: #F5F0E6; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; text-decoration: none; }
.ed-banner { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: 14px; background: #2E2A1E; border: 1px solid #5C4E22; font-size: 13px; line-height: 1.4; }
.ed-banner-icon { flex: 0 0 20px; margin-top: 2px; }
.ed-types { list-style: none; margin: 0; padding: 0; border-radius: 14px; background: #1C1C1E; }
.ed-type { display: flex; align-items: center; gap: 10px; padding: 8px 6px 8px 12px; border-bottom: 1px solid #2A2A2A; }
.ed-type:last-child { border-bottom: 0; }
.ed-type-main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto; min-width: 0; }
.ed-type-side { display: flex; flex-direction: column; align-items: flex-end; flex: 0 0 auto; }
.ed-type-side .ed-strong { padding-right: 6px; }
.ed-type-actions { display: flex; }
.ed-dashed { min-height: 48px; border-radius: 14px; border: 1px dashed #5A5A5A; background: transparent; color: #F5F0E6; display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); background: #000; border-radius: 22px; padding: 2px; }
.ed-seg button { min-height: 44px; border-radius: 20px; border: 0; background: transparent; color: #A0A0A0; font: 700 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.ed-seg button.on { background: #F5F0E6; color: #000; }
.ed-seg button:disabled { cursor: not-allowed; }
.ed-sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
.ed-sheet { width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto; background: #161618; border-radius: 24px 24px 0 0; border-top: 1px solid #2A2A2A; padding: 10px 16px 24px; }
@media (min-width: 640px) { .ed-sheet-backdrop { align-items: center; } .ed-sheet { border-radius: 24px; border: 1px solid #2A2A2A; } }
.ed-sheet-grip { width: 40px; height: 5px; border-radius: 3px; background: #48484A; margin: 0 auto 6px; }
.ed-sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ed-sheet-title { font-size: 18px; font-weight: 700; margin: 0; }
.ed-card { background: #1C1C1E; border-radius: 16px; overflow: hidden; width: 100%; text-align: left; }
.ed-card-cover { position: relative; height: 160px; background: #1A3C34; display: flex; align-items: center; justify-content: center; color: #9FC2B5; font-size: 13px; }
.ed-card-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ed-card-tag { position: absolute; top: 10px; right: 10px; background: #E8B930; color: #000; font-weight: 700; font-size: 10px; letter-spacing: 1px; padding: 4px 8px; border-radius: 10px; }
.ed-card-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.ed-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; line-height: 1; overflow-wrap: anywhere; }
.ed-rows { list-style: none; margin: 0; padding: 0; border-radius: 14px; background: #1C1C1E; }
.ed-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 6px 6px 14px; border-bottom: 1px solid #2A2A2A; }
.ed-row:last-child { border-bottom: 0; }
.ed-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ed-agree { display: flex; flex-direction: column; gap: 10px; }
.ed-agree-title { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 24px; letter-spacing: 0.03em; margin: 6px 0 0; }
.ed-agree-box { height: 300px; overflow-y: auto; border: 1px solid #38383A; border-radius: 12px; background: #0F0F10; padding: 4px 14px; font-size: 13px; line-height: 1.55; color: #CFC7B8; overscroll-behavior: contain; }
.ed-agree-box h3 { font-size: 14px; color: #F5F0E6; margin: 14px 0 6px; }
.ed-agree-box p { margin: 0 0 10px; }
.ed-agree-box ul, .ed-agree-box ol { margin: 0 0 10px; padding-left: 20px; }
.ed-agree-box li { margin-bottom: 4px; }
.ed-agree-box a { color: #E8B930; }
.ed-agree-box strong { color: #F5F0E6; }
.ed-check { display: flex; gap: 10px; align-items: center; min-height: 44px; font-size: 14px; color: #CFC7B8; cursor: pointer; }
.ed-check input { width: 22px; height: 22px; margin: 0; accent-color: #E8B930; flex: 0 0 22px; cursor: pointer; }
.ed-check.off { opacity: 0.6; cursor: not-allowed; }
.ed-check.off input { cursor: not-allowed; }
.ed-accepted { font-size: 14px; color: #CFC7B8; margin: 0; line-height: 1.5; }
.ed-cover-tile { position: relative; min-height: 320px; border-radius: 20px; border: 2px dashed #38383A; background: #0F0F10; color: #F5F0E6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; cursor: pointer; overflow: hidden; }
.ed-cover-tile.has { border-style: solid; }
.ed-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.55; }
.ed-cover-icon { position: relative; width: 64px; height: 64px; border-radius: 32px; background: #1C1C1E; color: #E8B930; display: flex; align-items: center; justify-content: center; }
.ed-cover-title { position: relative; font-family: 'Bebas Neue', sans-serif; font-size: 30px; line-height: 1; }
.ed-cover-sub { position: relative; max-width: 260px; color: #CFC7B8; }
.ed-draft { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; background: #1C1C1E; color: #F5F0E6; text-decoration: none; min-height: 68px; }
.ed-draft-thumb { position: relative; width: 48px; height: 48px; border-radius: 10px; background: #2E2A1E; flex: 0 0 48px; overflow: hidden; }
.ed-draft-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ed-draft-main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto; min-width: 0; }
.ed-live { flex: 1 1 auto; padding: 16px 20px 32px; display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
.ed-live-check { width: 76px; height: 76px; border-radius: 38px; background: #E8B930; color: #000; display: flex; align-items: center; justify-content: center; }
.ed-live-title { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 40px; line-height: 1; margin: 0; }
.ed-live-text { font-size: 14px; color: #CFC7B8; line-height: 1.5; max-width: 320px; margin: 0; }
.ed-share { width: 100%; display: flex; align-items: center; gap: 8px; background: #1C1C1E; border-radius: 14px; padding: 6px 6px 6px 14px; }
.ed-share-url { flex: 1 1 auto; min-width: 0; text-align: left; font-size: 14px; color: #CFC7B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ed-copy { min-height: 44px; padding: 0 18px; border-radius: 22px; border: 0; background: #F5F0E6; color: #000; font: 700 13px 'Hanken Grotesk', sans-serif; flex: 0 0 auto; cursor: pointer; }
.ed-live-actions { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.ed-card-msg { margin: 24px 16px; background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 28px 22px; }
.ed-h1 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 36px; letter-spacing: 0.04em; margin: 0 0 10px; }
.ed-text { font-size: 15px; line-height: 1.6; color: #B8B0A0; margin: 0 0 20px; }
.ed-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
`;
