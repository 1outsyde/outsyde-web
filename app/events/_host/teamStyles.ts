/** Styles for the Event team pages (host team page, Event team page, my-team). Builds on EDITOR_CSS and MANAGE_CSS. */
export const TEAM_CSS = `
.tm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tm-chips button { min-height: 36px; padding: 6px 12px; border-radius: 999px; border: 1px solid #3A3A3A; background: transparent; color: #CFC7B8; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.tm-chips button.on { background: #E8B930; border-color: #E8B930; color: #111; }
.tm-row { width: 100%; text-align: left; background: #141414; border: 1px solid #2A2A2A; border-radius: 12px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; color: inherit; font: inherit; cursor: pointer; min-height: 56px; }
.tm-row:hover { border-color: #3A3A3A; }
.tm-row-name { font-weight: 700; font-size: 14px; overflow-wrap: anywhere; }
.tm-st { font-size: 12px; font-weight: 700; color: #CFC7B8; white-space: nowrap; }
.tm-st.ok { color: #6FC193; } .tm-st.wait { color: #E8B930; } .tm-st.no { color: #FF8A7A; }
.tm-panel { background: #101010; border: 1px solid #E8B930; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.tm-panel-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.tm-panel-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; line-height: 1; }
.tm-block { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #1F1F1F; padding-top: 12px; }
.tm-time { display: flex; flex-direction: column; gap: 4px; }
.tm-time-in { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.tm-btn { min-height: 44px; font-size: 14px; }
.tm-wrap { flex-wrap: wrap; }
.tm-req { background: #1C1A12; border: 1px solid #4A3E1C; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.tm-amt { display: flex; gap: 8px; } .tm-amt .ed-in { flex: 1 1 auto; min-width: 0; }
.tm-danger { color: #FF8A7A; border-color: #5A2A24; }
.tm-tot { background: #141414; border: 1px solid #2A2A2A; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.tm-msg { background: #141414; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.dr-row2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dr-row2 .mg-small { width: 100%; }
.tm-msg-text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; }
`;
