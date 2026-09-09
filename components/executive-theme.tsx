"use client";

export function ExecutiveTheme() {
  return (
    <style>{`
      .corporate-sidebar .corporate-nav-item {
        color: #c5d4e5;
        min-height: 44px;
        border-radius: 10px;
      }
      .corporate-sidebar .corporate-nav-item:hover {
        background: rgba(255,255,255,.055);
        color: #ffffff;
      }
      .corporate-sidebar .corporate-nav-item.is-active {
        background: linear-gradient(90deg,#1b67dc,#257df4);
        color: #ffffff;
        box-shadow: 0 8px 22px rgba(13,93,206,.28), inset 3px 0 0 #79bdff;
      }
      .corporate-mark-dark {
        width: 34px;
        height: 29px;
      }
      .corporate-mark-dark i {
        width: 10px;
        height: 26px;
        background: linear-gradient(180deg,#4b99ef,#1c6ccd);
      }
      .corporate-mark-dark i:nth-child(2) {
        height: 21px;
        background: linear-gradient(180deg,#cc4050,#892333);
      }
      .corporate-mark-dark i:nth-child(3) {
        height: 26px;
        background: linear-gradient(180deg,#3b79bb,#1b4d80);
      }

      .corporate-page-market > main > div > section:first-child {
        display: grid !important;
      }

      .executive-kpi {
        border: 1px solid #dce8f3;
        border-radius: 14px;
        padding: 16px;
        background: #ffffff;
        box-shadow: 0 7px 24px rgba(39,78,114,.055);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }
      .executive-kpi:hover {
        transform: translateY(-2px);
        border-color: #c5daed;
        box-shadow: 0 13px 34px rgba(35,73,108,.09);
      }
      .executive-kpi-red { background: linear-gradient(135deg,#fff 0%,#fff7f7 100%); border-color:#f2dede; }
      .executive-kpi-orange { background: linear-gradient(135deg,#fff 0%,#fff9f1 100%); border-color:#f2e3cd; }
      .executive-kpi-blue { background: linear-gradient(135deg,#fff 0%,#f5faff 100%); }
      .executive-kpi-green { background: linear-gradient(135deg,#fff 0%,#f2fbf7 100%); border-color:#d9eee5; }
      .executive-kpi-icon {
        display:grid;
        width:38px;
        height:38px;
        place-items:center;
        border-radius:12px;
      }
      .executive-kpi-icon-red { background:#fff0f1; color:#d83f4b; }
      .executive-kpi-icon-orange { background:#fff3e2; color:#e48617; }
      .executive-kpi-icon-blue { background:#eaf4ff; color:#147efb; }
      .executive-kpi-icon-green { background:#e9f8f2; color:#0a8f65; }

      .executive-score {
        display:grid;
        width:46px;
        height:46px;
        place-items:center;
        border-radius:14px;
        border:2px solid;
        font-weight:900;
        font-size:15px;
        letter-spacing:-.03em;
      }
      .executive-score-critical { background:#fff2f3; border-color:#efb4b9; color:#d93642; }
      .executive-score-high { background:#fff7e9; border-color:#f2ca89; color:#d47708; }
      .executive-score-watch { background:#eef6ff; border-color:#bcd9f6; color:#126fdc; }

      .executive-priority {
        display:inline-flex;
        min-height:22px;
        align-items:center;
        border-radius:999px;
        padding:0 8px;
        font-size:9px;
        font-weight:900;
        letter-spacing:.07em;
        text-transform:uppercase;
      }
      .executive-priority-critical { background:#ffe9eb; color:#d73540; }
      .executive-priority-high { background:#fff0d8; color:#c86d07; }
      .executive-priority-watch { background:#e8f3ff; color:#126edb; }

      .executive-change-card,
      .executive-brief-card {
        position:relative;
        overflow:hidden;
        border:1px solid #dce8f3;
        border-radius:14px;
        background:#ffffff;
        padding:18px;
        box-shadow:0 7px 24px rgba(39,78,114,.055);
      }
      .executive-change-card {
        background: linear-gradient(145deg,#ffffff 0%,#f6fbff 60%,#edf6ff 100%);
      }
      .executive-change-card::after {
        content:"";
        position:absolute;
        width:180px;
        height:180px;
        right:-70px;
        bottom:-95px;
        border-radius:50%;
        background:radial-gradient(circle,rgba(20,126,251,.10),rgba(20,126,251,0) 68%);
        pointer-events:none;
      }
      .executive-brief-card {
        background: linear-gradient(145deg,#ffffff 0%,#fbfdff 100%);
      }

      .corp-hero-home {
        background-position:center 44%;
      }
      .corp-hero-home::after {
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(0,0,0,.05));
      }
      .corp-hero-content,.corp-tagline { z-index:2; }

      .pilot-content table tbody tr {
        transition: background-color .16s ease;
      }

      @media (max-width: 1279px) {
        .executive-change-card,.executive-brief-card { min-height:0; }
      }
      @media (prefers-reduced-motion: no-preference) {
        .executive-kpi,.executive-change-card,.executive-brief-card,.corp-card {
          animation: executive-rise .32s ease both;
        }
        @keyframes executive-rise {
          from { opacity:0; transform:translateY(5px); }
          to { opacity:1; transform:translateY(0); }
        }
      }
    `}</style>
  );
}
