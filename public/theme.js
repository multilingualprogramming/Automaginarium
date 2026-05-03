(function () {
  const STORAGE_KEY = "automaginarium-theme";

  function preferredTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function getTheme() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : preferredTheme();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const nextTheme = theme === "dark" ? "light" : "dark";
      button.dataset.nextTheme = nextTheme;
      button.setAttribute("aria-label", `Activer le mode ${nextTheme}`);
      button.setAttribute("title", `Activer le mode ${nextTheme}`);
      button.textContent = nextTheme === "dark" ? "Mode sombre" : "Mode clair";
    });
  }

  function setTheme(theme) {
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getTheme());

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(button.dataset.nextTheme || "dark");
      });
    });
  });
})();
