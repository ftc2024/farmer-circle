import "./profile-force-layout.js?v=20260706-profile-force-1";

function injectProfileNeonStyle() {
  if (document.querySelector("#profile-neon-style")) return;

  const style = document.createElement("style");
  style.id = "profile-neon-style";
  style.textContent = `
    #profile-section { width: 100%; }
    #profile-section .acct-wrap {
      width: min(100%, 980px) !important;
      display: grid !important;
      gap: 22px !important;
      isolation: isolate !important;
    }
    #profile-section .acct-card {
      position: relative !important;
      border-radius: 18px !important;
      border-color: rgba(198, 255, 0, .42) !important;
      background:
        radial-gradient(circle at 96% 4%, rgba(198, 255, 0, .22), transparent 25%),
        radial-gradient(circle at 6% 0%, rgba(37, 212, 206, .16), transparent 30%),
        linear-gradient(135deg, rgba(198, 255, 0, .11), rgba(20, 28, 26, .88) 38%, rgba(7, 10, 18, .95)) !important;
      box-shadow:
        0 30px 92px rgba(0, 0, 0, .58),
        0 0 0 1px rgba(198, 255, 0, .08),
        0 0 58px rgba(198, 255, 0, .14),
        inset 0 1px 0 rgba(255, 255, 255, .06) !important;
      backdrop-filter: blur(18px) !important;
    }
    #profile-section .acct-card::before {
      background:
        linear-gradient(90deg, transparent, rgba(198,255,0,.22), transparent) top left / 100% 1px no-repeat,
        linear-gradient(180deg, rgba(198,255,0,.20), transparent 44%) top right / 1px 100% no-repeat !important;
      opacity: .95 !important;
      filter: drop-shadow(0 0 12px rgba(198,255,0,.24));
    }
    #profile-section .acct-card::after {
      filter: drop-shadow(0 0 10px rgba(198,255,0,.36)) !important;
      opacity: .95 !important;
    }
    #profile-section .acct-avatar {
      width: 68px !important;
      height: 68px !important;
      border-radius: 14px !important;
      border-color: rgba(198, 255, 0, .28) !important;
      box-shadow:
        0 16px 34px rgba(0, 0, 0, .38),
        0 0 0 4px rgba(198, 255, 0, .04),
        0 0 34px rgba(198, 255, 0, .13) !important;
    }
    #profile-section .acct-avatar:hover {
      border-color: rgba(198, 255, 0, .58) !important;
      box-shadow:
        0 20px 42px rgba(0, 0, 0, .44),
        0 0 0 4px rgba(198, 255, 0, .07),
        0 0 40px rgba(198, 255, 0, .24) !important;
    }
    #profile-section .acct-role {
      color: #c6ff00 !important;
      text-shadow: 0 0 18px rgba(198,255,0,.36) !important;
    }
    #profile-section .acct-line {
      background: linear-gradient(90deg, rgba(198,255,0,.06), rgba(198,255,0,.20), rgba(37,212,206,.08)) !important;
    }
    #profile-section .acct-card input,
    #profile-section .acct-card textarea {
      border-radius: 8px !important;
      background: rgba(8, 10, 14, .88) !important;
      border-color: rgba(150, 165, 210, .15) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.035),
        0 10px 24px rgba(0,0,0,.14) !important;
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease !important;
    }
    #profile-section .acct-card input:hover,
    #profile-section .acct-card textarea:hover {
      border-color: rgba(198, 255, 0, .26) !important;
      background: rgba(9, 12, 16, .94) !important;
    }
    #profile-section .acct-card input:focus,
    #profile-section .acct-card textarea:focus {
      border-color: rgba(198, 255, 0, .60) !important;
      box-shadow:
        0 0 0 3px rgba(198, 255, 0, .09),
        0 0 28px rgba(198,255,0,.09),
        inset 0 1px 0 rgba(255,255,255,.045) !important;
    }
    #profile-section .acct-upload {
      min-height: 118px !important;
      border-radius: 12px !important;
      border-color: rgba(198, 255, 0, .24) !important;
      background:
        radial-gradient(circle at 50% 0%, rgba(198,255,0,.10), transparent 48%),
        rgba(255, 255, 255, .035) !important;
      box-shadow: inset 0 0 30px rgba(198,255,0,.03) !important;
    }
    #profile-section .acct-upload:hover {
      border-color: rgba(198, 255, 0, .54) !important;
      background:
        radial-gradient(circle at 50% 0%, rgba(198,255,0,.17), transparent 48%),
        rgba(198, 255, 0, .055) !important;
      box-shadow:
        inset 0 0 36px rgba(198,255,0,.05),
        0 0 30px rgba(198,255,0,.09) !important;
    }
    #profile-section .acct-upload i {
      color: #c6ff00 !important;
      filter: drop-shadow(0 0 12px rgba(198,255,0,.46)) !important;
    }
    #profile-section .acct-file-native::file-selector-button:hover {
      color: #07101a !important;
      background: #c6ff00 !important;
    }
    #profile-section .acct-action {
      border-top-color: rgba(198, 255, 0, .09) !important;
    }
    #profile-section .acct-action .primary-button {
      box-shadow:
        0 16px 34px rgba(198, 255, 0, .16),
        0 0 30px rgba(198, 255, 0, .12) !important;
    }
    #profile-section .acct-action .primary-button:hover {
      box-shadow:
        0 20px 42px rgba(198, 255, 0, .20),
        0 0 38px rgba(198, 255, 0, .18) !important;
    }
  `;
  document.head.appendChild(style);
}

function syncProfileNeonCopy() {
  const uploadHint = document.querySelector("#profile-section .acct-upload small");
  if (uploadHint) uploadHint.textContent = "Otomatis crop square 1:1 dan kompres agar avatar tidak gepeng.";

  const uploadIcon = document.querySelector("#profile-section .acct-upload i");
  if (uploadIcon) uploadIcon.setAttribute("data-lucide", "scan-face");

  window.lucide?.createIcons();
}

function bootProfileNeon() {
  injectProfileNeonStyle();
  syncProfileNeonCopy();
  setTimeout(syncProfileNeonCopy, 600);
  setTimeout(syncProfileNeonCopy, 1500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootProfileNeon);
else bootProfileNeon();

setInterval(syncProfileNeonCopy, 1800);
