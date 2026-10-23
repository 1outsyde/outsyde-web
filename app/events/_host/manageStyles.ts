/** Extra styles for /events/mine and /events/[id]/manage (mockup 6). Builds on EDITOR_CSS (ed-*). */
export const MANAGE_CSS = `
.mg-head { display: flex; align-items: center; gap: 4px; padding: 8px 12px 0; min-height: 60px; }
.mg-head-h { flex: 1 1 auto; min-width: 0; font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 30px; letter-spacing: 0.04em; margin: 0; }
.mg-body { padding: 8px 16px 40px; display: flex; flex-direction: column; gap: 18px; }
.mg-chip { align-self: flex-start; background: #1A3C34; color: #BFE3D5; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 10px; border-radius: 10px; }
.mg-chip.draft { background: #2E2A1E; color: #E8B930; }
.mg-chip.cancelled { background: #3A1C18; color: #FF8A7A; }
.mg-chip.ended { background: #2A2A2A; color: #CFC7B8; }
.mg-title { font-family: 'Bebas Neue', sans-serif; font-size: 34px; line-height: 1; margin: 0; overflow-wrap: anywhere; font-weight: 400; }
.mg-sub { font-size: 13px; color: #B8B0A0; }
.mg-section { font-size: 12px; font-weight: 700; color: #B8B0A0; letter-spacing: 1px; margin: 0; }
.mg-sechead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mg-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.mg-stat { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mg-stat-label { font-size: 12px; color: #B8B0A0; }
.mg-stat-big { font-family: 'Bebas Neue', sans-serif; font-size: 30px; line-height: 1; }
.mg-stat-mid { font-size: 15px; font-weight: 700; }
.mg-stat-hint { font-size: 11px; color: #A0A0A0; line-height: 1.3; }
.mg-gold { color: #E8B930; }
.mg-bar { height: 6px; border-radius: 3px; background: #2A2A2A; }
.mg-bar > div { height: 6px; border-radius: 3px; background: #E8B930; }
.mg-trow { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.mg-trow > :first-child { min-width: 0; overflow-wrap: anywhere; }
.mg-trow > :last-child { color: #B8B0A0; text-align: right; flex: 0 0 auto; }
.mg-list { list-style: none; margin: 0; padding: 0; }
.mg-li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid #1F1F1F; min-height: 56px; }
.mg-li:last-child { border-bottom: 0; }
.mg-li-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mg-li-name { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.mg-li-sub { font-size: 12px; color: #B8B0A0; overflow-wrap: anywhere; }
.mg-in { font-size: 11px; font-weight: 700; color: #BFE3D5; background: #1A3C34; border-radius: 10px; padding: 3px 8px; flex: 0 0 auto; }
.mg-small { min-height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid #38383A; background: transparent; color: #F5F0E6; font: 600 13px 'Hanken Grotesk', sans-serif; cursor: pointer; flex: 0 0 auto; }
.mg-small:disabled { opacity: 0.5; cursor: not-allowed; }
.mg-confirm { background: #1C1C1E; border: 1px solid #5C4E22; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; line-height: 1.5; }
.mg-confirm p { margin: 0; }
.mg-confirm-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.mg-danger { min-height: 44px; padding: 0 18px; border-radius: 22px; border: 0; background: #FF8A7A; color: #000; font: 700 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.mg-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.mg-cancel-link { min-height: 44px; border: 0; background: transparent; color: #FF8A7A; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; }
.mg-actions { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #1F1F1F; padding-top: 16px; }
.mg-quick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.mg-quick > * { min-width: 0; }
.mg-toprow { display: flex; flex-wrap: wrap; gap: 8px; }
.mg-toprow > * { flex: 1 1 120px; min-width: 0; }
.mg-evrow { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; background: #1C1C1E; color: #F5F0E6; text-decoration: none; min-height: 68px; }
.mg-evrow-main { display: flex; flex-direction: column; gap: 3px; flex: 1 1 auto; min-width: 0; }
.mg-evrow-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; line-height: 1; overflow-wrap: anywhere; }
.mg-evrow-side { font-size: 12px; color: #B8B0A0; flex: 0 0 auto; text-align: right; }
.mg-group { display: flex; flex-direction: column; gap: 8px; }
.mg-head-label { flex: 1 1 auto; min-width: 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #B8B0A0; }
.mg-head.mg-head-wrap { flex-wrap: wrap; row-gap: 8px; }
.mg-head-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.ed-outline.mg-head-btn { min-height: 44px; padding: 0 18px; }
.ed-outline.mg-share { background: transparent; color: #F5F0E6; cursor: pointer; font: 600 14px 'Hanken Grotesk', sans-serif; }
@media (min-width: 640px) { .mg-body { padding-left: 24px; padding-right: 24px; } }
`;
