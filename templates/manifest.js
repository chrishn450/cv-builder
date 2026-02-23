// /templates/manifest.js
(function () {
  // Du kan legge til flere templates her uten å endre app.js
  window.CV_TEMPLATES = [
    {
      id: "nurse",
      name: "Nurse (Classic)",
      css: "/templates/nurse/template.css",
      render: "/templates/nurse/render.js",
    },
    // eksempel:
    // {
    //   id: "modern",
    //   name: "Modern",
    //   css: "/templates/modern/template.css",
    //   render: "/templates/modern/render.js",
    // },
  ];
})();
