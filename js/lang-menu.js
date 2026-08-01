/**
 * Sélecteur de langue avec drapeaux SVG (compatible Windows)
 * Remplace les emojis qui s'affichent comme FR/DE/IT/GB sous Windows.
 */
(function (global) {
  "use strict";

  const LANGS = [
    { code: "fr", label: "Français", flag: "images/flags/fr.svg" },
    { code: "de", label: "Deutsch", flag: "images/flags/de.svg" },
    { code: "it", label: "Italiano", flag: "images/flags/it.svg" },
    { code: "en", label: "English", flag: "images/flags/gb.svg" },
  ];

  function flagSrc(path) {
    // Chemins relatifs selon la profondeur de la page (admin/)
    const inAdmin = /\/admin\//i.test(location.pathname) || location.pathname.endsWith("/admin");
    if (inAdmin && path.startsWith("images/")) return "../" + path;
    return path;
  }

  function buildMarkup(current) {
    const currentLang = LANGS.find((l) => l.code === current) || LANGS[0];
    const options = LANGS.map((lang) => {
      const selected = lang.code === currentLang.code ? "true" : "false";
      const active = lang.code === currentLang.code ? " is-active" : "";
      return `
        <li role="option" aria-selected="${selected}">
          <button type="button" class="lang-option${active}" data-lang="${lang.code}">
            <img class="lang-flag" src="${flagSrc(lang.flag)}" alt="" width="22" height="16">
            <span>${lang.label}</span>
          </button>
        </li>`;
    }).join("");

    return `
      <button type="button" class="lang-btn" id="lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Langue">
        <img class="lang-flag" id="lang-btn-flag" src="${flagSrc(currentLang.flag)}" alt="" width="22" height="16">
        <span class="lang-btn-label" id="lang-btn-label">${currentLang.label}</span>
        <span class="lang-caret" aria-hidden="true"></span>
      </button>
      <ul class="lang-menu" id="lang-menu" role="listbox" hidden>
        ${options}
      </ul>`;
  }

  function updateButton(code) {
    const lang = LANGS.find((l) => l.code === code) || LANGS[0];
    const flag = document.getElementById("lang-btn-flag");
    const label = document.getElementById("lang-btn-label");
    if (flag) flag.src = flagSrc(lang.flag);
    if (label) label.textContent = lang.label;

    document.querySelectorAll(".lang-option").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === lang.code;
      btn.classList.toggle("is-active", active);
      btn.parentElement?.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function closeMenu() {
    const menu = document.getElementById("lang-menu");
    const btn = document.getElementById("lang-btn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function initLangMenu() {
    const wrap = document.querySelector(".lang-wrap");
    if (!wrap) return;

    const current = global.AutoDiagI18n?.getLang?.() || localStorage.getItem("ads_lang") || "fr";
    wrap.innerHTML = buildMarkup(current);

    const btn = document.getElementById("lang-btn");
    const menu = document.getElementById("lang-menu");

    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    menu?.addEventListener("click", (e) => {
      const option = e.target.closest("[data-lang]");
      if (!option) return;
      const code = option.getAttribute("data-lang");
      closeMenu();
      updateButton(code);
      global.AutoDiagI18n?.apply?.(code);
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    document.addEventListener("autodiag:lang-changed", (e) => {
      updateButton(e.detail?.lang || current);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLangMenu);
  } else {
    initLangMenu();
  }

  global.AutoDiagLangMenu = { updateButton, LANGS };
})(window);
