// Applies portal theme/fontSize before first paint to prevent FOUC. Skips
// /admin paths: the admin always uses light mode at default font size.
// Loaded via <script src> rather than inlined so a strict CSP script-src
// doesn't need 'unsafe-inline' just for this one bit of startup logic.
;(function () {
  if (location.pathname.startsWith("/admin")) return
  var t = localStorage.getItem("theme")
  var d = window.matchMedia("(prefers-color-scheme:dark)").matches
  if (t === "dark" || (t !== "light" && d)) document.documentElement.classList.add("dark")
  var f = localStorage.getItem("fontSize")
  if (f === "sm") document.documentElement.classList.add("font-sm")
  else if (f === "lg") document.documentElement.classList.add("font-lg")
})()
