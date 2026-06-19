/* ======================================================================
   CET138 Full Stack Development ePortfolio
   Vanilla JavaScript interactions and accessible status updates
   ====================================================================== */

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.body.classList.add("js-ready");


  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function updateExplanation(panelId, content) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    Object.entries(content).forEach(([key, value]) => {
      const field = panel.querySelector(`[data-explanation="${key}"]`);
      if (field) field.textContent = value;
    });

    panel.classList.remove("is-updated");
    // Reading offsetWidth restarts the short update animation without changing content.
    void panel.offsetWidth;
    panel.classList.add("is-updated");
  }

  function setPressedButton(buttons, selectedButton, selectedClass = "is-selected") {
    buttons.forEach((button) => {
      const isSelected = button === selectedButton;
      button.classList.toggle(selectedClass, isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  /* General page behaviour ------------------------------------------- */

  const currentYear = document.getElementById("current-year");
  if (currentYear) currentYear.textContent = new Date().getFullYear();

  const revealItems = $$(".reveal-on-scroll");
  if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const progressBar = document.getElementById("scroll-progress-bar");
  let progressFrame = null;

  function updateScrollProgress() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    progressFrame = null;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!progressFrame) progressFrame = window.requestAnimationFrame(updateScrollProgress);
    },
    { passive: true }
  );
  updateScrollProgress();

  const portfolioSections = $$("main > section[id]").filter((section) =>
    ["full-stack", "html", "css", "bootstrap", "javascript"].includes(section.id)
  );
  const sectionLinks = $$(".site-header .nav-link");

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) return;
        const activeId = visibleEntries[0].target.id;
        sectionLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${activeId}`;
          link.classList.toggle("active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.05, 0.2, 0.5] }
    );
    portfolioSections.forEach((section) => sectionObserver.observe(section));
  }

  sectionLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const navContent = document.getElementById("primary-navigation");
      if (navContent?.classList.contains("show") && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(navContent).hide();
      }
    });
  });

  /* Copy-code controls ------------------------------------------------ */

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const temporaryTextArea = document.createElement("textarea");
    temporaryTextArea.value = text;
    temporaryTextArea.setAttribute("readonly", "");
    temporaryTextArea.style.position = "fixed";
    temporaryTextArea.style.opacity = "0";
    document.body.append(temporaryTextArea);
    temporaryTextArea.select();
    document.execCommand("copy");
    temporaryTextArea.remove();
  }

  $$(".copy-code").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;

      const previousLabel = button.textContent;
      try {
        await copyText(target.textContent);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      window.setTimeout(() => {
        button.textContent = previousLabel;
      }, 1600);
    });
  });

  /* 1. Full-stack request and response simulation -------------------- */

  const requestRunButton = document.getElementById("run-request-demo");
  const requestResetButton = document.getElementById("reset-request-demo");
  const requestStatusText = document.getElementById("request-status-text");
  const requestStatus = requestStatusText?.closest(".request-status");
  const journeyNodes = $$("[data-journey-node]");
  const responseEmptyState = document.getElementById("response-empty-state");
  const profileResult = document.getElementById("profile-result");
  let requestRunId = 0;

  const fullStackCodeSnippets = {
    "ready": `const stages = ["client", "frontend", "server", "database"];

for (const stage of stages) {
  activateJourneyNode(stage);
  await wait(700);
}`,
    "client": `// Stage 1: Client / Browser
// User initiated request for profile aashin
fetch("https://api.example.com/profile/aashin")
  .then(response => response.json())
  .then(data => renderProfile(data));`,
    "frontend": `// Stage 2: Front End
// Preparing HTTP Request and headers
const request = new Request("https://api.example.com/profile/aashin", {
  method: "GET",
  headers: {
    "Accept": "application/json",
    "Authorization": "Bearer session-token"
  }
});`,
    "server-request": `// Stage 3: API / Server (Receive Request)
// Server matches route, validates parameters, and checks authorization
router.get("/profile/:id", authenticate, (req, res) => {
  const userId = req.params.id;
  // Server checks database for user data...
});`,
    "database": `-- Stage 4: Database query
-- Retrieving matching user profile safely using parameters
SELECT id, name, email, role FROM users 
WHERE email = 'ctit25a.asn.ismt.edu.np' LIMIT 1;`,
    "server-response": `// Stage 5: API / Server (Prepare Response)
// Server converts database record to JSON and sends it back
const payload = {
  name: "Aashin Lamichhane",
  email: "ctit25a.asn.ismt.edu.np",
  role: "Full stack"
};
res.status(200).json(payload);`,
    "frontend-return": `// Stage 6: Front End (Receive Response)
// Parsing the JSON body payload
const response = await fetch("/profile/aashin");
const data = await response.json();
// Update DOM...`,
    "client-return": `// Stage 7: Client / Browser (Success)
// Rendering the profile in the DOM
profileResult.hidden = false;
profileAvatar.innerHTML = '<img src="student_avatar.jpg" class="profile-avatar-img">';
profileName.textContent = "Aashin Lamichhane";
profileEmail.textContent = "ctit25a.asn.ismt.edu.np";`
  };

  const requestStages = [
    {
      node: "client",
      status: "The user has requested profile information in the browser.",
      action: "The user selected “Send request” in the browser.",
      change: "The Browser / Client layer is now active.",
      implementation: "A click event started an asynchronous JavaScript sequence.",
      concept: "User actions begin the client-server request cycle.",
      snippetKey: "client"
    },
    {
      node: "frontend",
      status: "The front end prepares and sends an HTTP request.",
      action: "Front-end JavaScript prepared the request.",
      change: "The Front End layer is highlighted and the client is marked complete.",
      implementation: "JavaScript moved an active class to the next data-labelled node.",
      concept: "The interface communicates with a server through an API request.",
      snippetKey: "frontend"
    },
    {
      node: "server",
      status: "The API server validates and processes the request.",
      action: "The simulated API received the request.",
      change: "The API / Server layer is active.",
      implementation: "The sequence updated DOM classes and the live status text.",
      concept: "Back-end logic validates input and applies application rules.",
      snippetKey: "server-request"
    },
    {
      node: "database",
      status: "The database finds and returns the requested record.",
      action: "The server requested a matching database record.",
      change: "The Database layer is active.",
      implementation: "A timed stage represents a database query without claiming a real connection.",
      concept: "Persistent data is accessed by server-side code, not directly by the browser.",
      snippetKey: "database"
    },
    {
      node: "server",
      status: "The server converts the record into a JSON response.",
      action: "The database result returned to the server.",
      change: "The API / Server layer becomes active again on the return path.",
      implementation: "The same node is reused to visualise the response journey.",
      concept: "An API serialises data and sends an HTTP response.",
      snippetKey: "server-response"
    },
    {
      node: "frontend",
      status: "The front end receives the JSON and prepares an interface update.",
      action: "The response reached the browser’s JavaScript.",
      change: "The Front End layer is active on the return path.",
      implementation: "The script updates the interface only after the simulated response arrives.",
      concept: "Front-end code converts returned data into visible content.",
      snippetKey: "frontend-return"
    },
    {
      node: "client",
      status: "Success: the browser displays the returned profile (200 OK).",
      action: "The browser rendered the successful response.",
      change: "All layers are complete and the profile result is visible.",
      implementation: "JavaScript removed the hidden state and updated text and CSS classes.",
      concept: "A complete request-response cycle ends with a user-visible DOM update.",
      snippetKey: "client-return"
    }
  ];

  function resetRequestDemo({ announce = true } = {}) {
    requestRunId += 1;
    journeyNodes.forEach((node) => node.classList.remove("is-active", "is-complete"));
    if (responseEmptyState) responseEmptyState.hidden = false;
    if (profileResult) profileResult.hidden = true;
    if (requestStatusText) requestStatusText.textContent = "Ready: select “Send request” to begin the simulation.";
    requestStatus?.classList.remove("is-running", "is-complete");
    if (requestRunButton) requestRunButton.disabled = false;

    const snippetEl = document.getElementById("full-stack-code-snippet");
    if (snippetEl) snippetEl.textContent = fullStackCodeSnippets["ready"];

    if (announce) {
      updateExplanation("full-stack-explanation", {
        action: "The simulation was reset.",
        change: "All active and completed states were removed.",
        implementation: "JavaScript removed state classes and restored the empty response panel.",
        concept: "Application state can be returned to a known initial condition."
      });
    }
  }

  async function runRequestDemo() {
    resetRequestDemo({ announce: false });
    const thisRun = requestRunId;
    if (requestRunButton) requestRunButton.disabled = true;
    requestStatus?.classList.add("is-running");
    const completedNodes = new Set();

    for (const stage of requestStages) {
      if (thisRun !== requestRunId) return;

      journeyNodes.forEach((node) => node.classList.remove("is-active"));
      const activeNode = journeyNodes.find((node) => node.dataset.journeyNode === stage.node);
      if (activeNode) {
        activeNode.classList.add("is-active");
        completedNodes.add(stage.node);
      }
      journeyNodes.forEach((node) => {
        // Active node shouldn't show the checkmark icon yet
        node.classList.toggle("is-complete", completedNodes.has(node.dataset.journeyNode) && node.dataset.journeyNode !== stage.node);
      });

      if (requestStatusText) requestStatusText.textContent = stage.status;
      updateExplanation("full-stack-explanation", stage);

      const snippetEl = document.getElementById("full-stack-code-snippet");
      if (snippetEl) snippetEl.textContent = fullStackCodeSnippets[stage.snippetKey];

      await wait(1200); // 1200ms step-by-step delay as requested
    }

    if (thisRun !== requestRunId) return;
    journeyNodes.forEach((node) => {
      node.classList.remove("is-active");
      node.classList.add("is-complete");
    });
    if (responseEmptyState) responseEmptyState.hidden = true;
    if (profileResult) profileResult.hidden = false;
    requestStatus?.classList.remove("is-running");
    requestStatus?.classList.add("is-complete");
    if (requestRunButton) requestRunButton.disabled = false;
  }

  requestRunButton?.addEventListener("click", runRequestDemo);
  requestResetButton?.addEventListener("click", () => resetRequestDemo());

  const htmlCodeSnippets = {
    "default": `<article>
  <h2>Semantic HTML</h2>
  <section aria-labelledby="benefits-title">
    <h3 id="benefits-title">Benefits</h3>
    <p>Meaningful elements improve structure.</p>
  </section>
</article>`,
    "header": `<!-- Landmark: banner -->
<header class="section-heading">
  <div class="section-number" aria-hidden="true">02</div>
  <div>
    <p class="section-kicker">Semantic HTML</p>
    <h2>Topic 2</h2>
  </div>
</header>`,
    "nav": `<!-- Landmark: navigation -->
<nav class="navbar navbar-expand-md demo-navbar" aria-label="Demo nav">
  <div class="container-fluid">
    <a class="navbar-brand" href="#"><i data-lucide="package"></i> DemoNav</a>
  </div>
</nav>`,
    "main": `<!-- Landmark: main -->
<main class="page-content" id="main-content">
  <!-- The main content of the document outline -->
</main>`,
    "article": `<!-- Landmark: article (independent container) -->
<article class="demo-shell" id="demo-html" aria-labelledby="html-title">
  <div class="demo-heading">
    <h3>Semantic HTML Outline</h3>
  </div>
</article>`,
    "section": `<!-- Landmark: region (needs accessible label) -->
<section class="semantic-explorer-section" aria-labelledby="explorer-title">
  <h4 id="explorer-title">Interactive outline explorer</h4>
</section>`,
    "aside": `<!-- Landmark: complementary content -->
<aside class="learning-note">
  <h3>My understanding</h3>
  <p>Semantic outline communicates purpose before style.</p>
</aside>`,
    "footer": `<!-- Landmark: contentinfo -->
<footer class="site-footer">
  <div class="container-xl">
    <span>© 2026 Aashin Lamichhane</span>
  </div>
</footer>`,
    "form": `<!-- Accessible Form structure -->
<form id="contact-form" novalidate>
  <div class="form-field">
    <label for="contact-name">Name *</label>
    <input id="contact-name" type="text" required aria-describedby="contact-name-error">
    <span class="field-error" id="contact-name-error"></span>
  </div>
  <button type="submit">Validate form</button>
</form>`
  };

  const semanticData = {
    header: {
      name: "<header>",
      purpose: "Introduces a page or section and can contain a heading, logo or introductory content.",
      syntax: "<header>...</header>",
      benefit: "It identifies introductory content more clearly than a generic div.",
      accessibility: "A page-level header may be exposed as a banner landmark."
    },
    nav: {
      name: "<nav>",
      purpose: "Groups the main links used to navigate a page or website.",
      syntax: "<nav aria-label=\"Primary\">...</nav>",
      benefit: "It identifies a navigation region instead of an unlabelled list of links.",
      accessibility: "Assistive technology users can move directly between navigation landmarks."
    },
    main: {
      name: "<main>",
      purpose: "Contains the page’s unique primary content.",
      syntax: "<main id=\"main-content\">...</main>",
      benefit: "It distinguishes central content from repeated headers, navigation and footers.",
      accessibility: "It creates a main landmark and provides a useful target for a skip link."
    },
    article: {
      name: "<article>",
      purpose: "Represents self-contained content that could make sense independently.",
      syntax: "<article>...</article>",
      benefit: "It communicates that the content is a complete item rather than a styling wrapper.",
      accessibility: "A clear heading inside the article improves document navigation and context."
    },
    section: {
      name: "<section>",
      purpose: "Groups a thematic part of a document, normally with its own heading.",
      syntax: "<section aria-labelledby=\"title\">...</section>",
      benefit: "It identifies a meaningful topic grouping rather than an arbitrary container.",
      accessibility: "A labelled section can be exposed as a named region."
    },
    aside: {
      name: "<aside>",
      purpose: "Contains complementary information related to, but separate from, the main flow.",
      syntax: "<aside>Related content</aside>",
      benefit: "It signals supporting content such as a note, glossary or related links.",
      accessibility: "It may create a complementary landmark that users can navigate to."
    },
    form: {
      name: "<form>",
      purpose: "Groups controls used to collect and submit user input.",
      syntax: "<form action=\"/contact\" method=\"post\">...</form>",
      benefit: "It defines a submission boundary and supports native browser behaviour.",
      accessibility: "Labels, instructions and grouped controls make data entry understandable."
    },
    footer: {
      name: "<footer>",
      purpose: "Contains closing information for a page or section, such as authorship or links.",
      syntax: "<footer>...</footer>",
      benefit: "It identifies concluding metadata more clearly than a generic div.",
      accessibility: "A page-level footer may be exposed as a content information landmark."
    }
  };

  const semanticButtons = $$("[data-semantic-target]");
  const semanticRegions = $$("[data-semantic-region]");

  semanticButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.semanticTarget;
      const details = semanticData[key];
      if (!details) return;

      setPressedButton(semanticButtons, button);
      semanticRegions.forEach((region) => {
        region.classList.toggle("is-highlighted", region.dataset.semanticRegion === key);
      });

      const name = document.getElementById("semantic-name");
      const purpose = document.getElementById("semantic-purpose");
      const syntax = document.getElementById("semantic-syntax");
      const benefit = document.getElementById("semantic-benefit");
      const accessibility = document.getElementById("semantic-accessibility");
      if (name) name.textContent = details.name;
      if (purpose) purpose.textContent = details.purpose;
      if (syntax) syntax.textContent = details.syntax;
      if (benefit) benefit.textContent = details.benefit;
      if (accessibility) accessibility.textContent = details.accessibility;

      const snippetEl = document.getElementById("html-code-snippet");
      if (snippetEl && htmlCodeSnippets[key]) {
        snippetEl.textContent = htmlCodeSnippets[key];
      }

      updateExplanation("html-explanation", {
        action: `You selected the ${details.name} element.`,
        change: `The matching ${key} region is now outlined and its description is displayed.`,
        implementation: `JavaScript matched data-semantic-target="${key}" with data-semantic-region="${key}".`,
        concept: "Semantic elements describe purpose, not visual appearance."
      });
    });
  });

  const contactForm = document.getElementById("contact-form");

  function setFieldError(input, errorElement, message) {
    if (!input || !errorElement) return;
    input.classList.toggle("is-invalid", Boolean(message));
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    
    errorElement.replaceChildren();
    if (message) {
      const errorIcon = document.createElement("i");
      errorIcon.setAttribute("data-lucide", "alert-triangle");
      errorIcon.className = "error-icon-inline";
      errorElement.append(errorIcon, document.createTextNode(" " + message));
      window.lucide?.createIcons();
    }
  }

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const messageInput = document.getElementById("contact-message");
    const formStatus = document.getElementById("contact-form-status");
    const errors = [];

    const nameMessage = nameInput.value.trim() ? "" : "Enter your name.";
    const emailMessage = !emailInput.value.trim()
      ? "Enter your email address."
      : emailInput.validity.typeMismatch
        ? "Enter an email address in a valid format."
        : "";
    const messageMessage = messageInput.value.trim().length >= 10
      ? ""
      : "Enter a message containing at least 10 characters.";

    setFieldError(nameInput, document.getElementById("contact-name-error"), nameMessage);
    setFieldError(emailInput, document.getElementById("contact-email-error"), emailMessage);
    setFieldError(messageInput, document.getElementById("contact-message-error"), messageMessage);

    if (nameMessage) errors.push(nameInput);
    if (emailMessage) errors.push(emailInput);
    if (messageMessage) errors.push(messageInput);

    const snippetEl = document.getElementById("html-code-snippet");

    if (errors.length) {
      if (formStatus) {
        formStatus.replaceChildren();
        const errIcon = document.createElement("i");
        errIcon.setAttribute("data-lucide", "alert-circle");
        formStatus.append(errIcon, document.createTextNode(` Please correct ${errors.length} ${errors.length === 1 ? "field" : "fields"}.`));
        formStatus.classList.add("is-error");
        formStatus.classList.remove("is-success");
        window.lucide?.createIcons();
      }
      errors[0].focus();

      if (snippetEl) {
        const errorList = [];
        if (nameMessage) errorList.push({ field: "contact-name", message: nameMessage });
        if (emailMessage) errorList.push({ field: "contact-email", message: emailMessage });
        if (messageMessage) errorList.push({ field: "contact-message", message: messageMessage });

        snippetEl.textContent = `// Contact Form Validation: FAILED
// Storing error context inside application state
const formState = {
  isValid: false,
  errorsCount: ${errors.length},
  errors: ${JSON.stringify(errorList, null, 2)},
  timestamp: "${new Date().toISOString()}"
};`;
      }

      updateExplanation("html-explanation", {
        action: "The form was submitted with incomplete or invalid information.",
        change: "Visible messages were associated with each invalid field.",
        implementation: "JavaScript checked values, set aria-invalid and prevented submission.",
        concept: "Accessible client-side validation supports, but does not replace, server validation."
      });
      return;
    }

    if (formStatus) {
      formStatus.replaceChildren();
      const successIcon = document.createElement("i");
      successIcon.setAttribute("data-lucide", "check-circle");
      formStatus.append(successIcon, document.createTextNode(" Validation passed. This static demonstration did not send data."));
      formStatus.classList.add("is-success");
      formStatus.classList.remove("is-error");
      window.lucide?.createIcons();
    }

    if (snippetEl) {
      snippetEl.textContent = `// Contact Form Validation: PASSED
// Input values checked and validated successfully
const formState = {
  isValid: true,
  data: {
    name: "${nameInput.value.trim().replace(/"/g, '\\"')}",
    email: "${emailInput.value.trim().replace(/"/g, '\\"')}",
    subject: "${document.getElementById("contact-subject")?.value || "Project enquiry"}",
    message: "${messageInput.value.trim().replace(/\n/g, " ").replace(/"/g, '\\"')}"
  },
  timestamp: "${new Date().toISOString()}"
};`;
    }

    updateExplanation("html-explanation", {
      action: "The completed form was validated.",
      change: "The success message confirms that every required value is valid.",
      implementation: "The submit event used preventDefault because this static demo has no endpoint.",
      concept: "HTML constraints and JavaScript feedback can work together in an accessible form."
    });
  });

  $$("#contact-form input, #contact-form textarea").forEach((input) => {
    input.addEventListener("input", () => {
      const errorElement = document.getElementById(`${input.id}-error`);
      if (input.classList.contains("is-invalid")) setFieldError(input, errorElement, "");
    });
  });

  /* 3. CSS style playground, palette and box model ------------------- */

  const stylePreview = document.getElementById("style-preview");
  const activeClassesDisplay = document.getElementById("active-css-classes");
  const cssControlButtons = $$("[data-css-group][data-css-class]");
  const cssState = new Map();

  cssControlButtons.forEach((button) => {
    if (button.getAttribute("aria-pressed") === "true") {
      cssState.set(button.dataset.cssGroup, button.dataset.cssClass);
    }
  });

  let activeThemeClass = "theme-cyan";

  const cssDescriptions = {
    "appearance-light": ["Light appearance was selected.", "The preview now uses a white surface and dark text.", "The appearance-light class defines surface and text custom properties.", "Classes can switch a complete visual theme."],
    "appearance-dark": ["Dark appearance was selected.", "The preview now uses a near-black surface and light text.", "The appearance-dark class overrides custom properties inherited by child elements.", "The cascade and custom properties support accessible theme changes."],
    "density-compact": ["Compact padding was selected.", "The space inside the preview became smaller.", "The density-compact class changes the card’s padding property.", "Padding is the space between content and border in the box model."],
    "density-spacious": ["Spacious padding was selected.", "The space inside the preview increased.", "The density-spacious class applies responsive padding with clamp().", "Responsive values can scale between minimum and maximum sizes."],
    "corners-square": ["Square corners were selected.", "The preview’s border radius changed to zero.", "The corners-square class sets border-radius: 0.", "A reusable class can control component shape."],
    "corners-rounded": ["Rounded corners were selected.", "The preview now has a large border radius.", "The corners-rounded class sets border-radius: 1.5rem.", "Properties and values define a selected visual rule."],
    "align-left": ["Left alignment was selected.", "Text and content align to the left.", "The align-left class sets text-align and retains normal block margins.", "Inherited text properties can affect descendant content."],
    "align-centred": ["Centred alignment was selected.", "Text and constrained content are centred.", "The align-centred class sets text-align and adjusts child margins.", "Selectors can coordinate parent and descendant styles."],
    "shadow-normal": ["Normal shadow was selected.", "The preview has a subtle depth effect.", "The shadow-normal class applies a reusable box-shadow token.", "Design tokens keep repeated effects consistent."],
    "shadow-elevated": ["Elevated shadow was selected.", "The preview appears raised with a coloured offset.", "The shadow-elevated class combines two box-shadow values.", "Multiple shadows can create depth without changing HTML."],
    "motion-static": ["Static motion was selected.", "The preview no longer moves.", "The motion-static state has no animation declaration.", "Motion should be optional and purposeful."],
    "motion-animated": ["Animated motion was selected.", "The preview gently moves up and down.", "The motion-animated class applies a keyframe animation.", "CSS animation can communicate emphasis and respects reduced-motion settings."],
    "layout-block": ["Block layout was selected.", "Preview items stack vertically.", "The layout-block state keeps normal block flow.", "Normal document flow is the default layout model."],
    "layout-flex": ["Flexbox layout was selected.", "Preview items share one flexible row and wrap when required.", "The layout-flex class sets display: flex and flex sizing.", "Flexbox is effective for one-dimensional alignment."],
    "layout-grid": ["Grid layout was selected.", "Preview items occupy three explicit columns.", "The layout-grid class sets display: grid and grid-template-columns.", "Grid is effective for two-dimensional row and column layout."]
  };

  function updateCSSPlaygroundSnippet() {
    const appearance = cssState.get("appearance") || "appearance-light";
    const density = cssState.get("density") || "density-spacious";
    const corners = cssState.get("corners") || "corners-rounded";
    const alignment = cssState.get("alignment") || "align-left";
    const shadow = cssState.get("shadow") || "shadow-normal";
    const motion = cssState.get("motion") || "motion-static";
    const layout = cssState.get("layout") || "layout-block";

    const backgroundVal = appearance === "appearance-dark" ? "var(--colour-ink)" : "var(--colour-surface)";
    const colorVal = appearance === "appearance-dark" ? "var(--colour-surface)" : "var(--colour-ink)";
    const paddingVal = density === "density-compact" ? "0.75rem 1rem" : "2rem";
    const radiusVal = corners === "corners-square" ? "0" : "0.55rem";
    const alignVal = alignment === "align-centred" ? "center" : "left";
    const shadowVal = shadow === "shadow-elevated" ? "6px 6px 0 var(--colour-ink)" : "2px 2px 0 var(--colour-ink)";
    const animationVal = motion === "motion-animated" ? "preview-float 3s ease infinite" : "none";
    
    let layoutVal = "display: block;";
    if (layout === "layout-flex") layoutVal = "display: flex;\n  flex-direction: row;\n  gap: 0.5rem;";
    else if (layout === "layout-grid") layoutVal = "display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 0.5rem;";

    const nextTheme = activeThemeClass || "theme-cyan";
    const themeVar = paletteDescriptions[nextTheme]?.variable || "--brand-cyan";
    const themeHex = paletteDescriptions[nextTheme]?.value || "#00F7FF";

    const code = `/* Active design system styling */
.style-preview {
  background: ${backgroundVal};
  color: ${colorVal};
  padding: ${paddingVal};
  border-radius: ${radiusVal};
  text-align: ${alignVal};
  box-shadow: ${shadowVal};
  animation: ${animationVal};
  ${layoutVal}
}

/* Theme accent: ${nextTheme} */
.${nextTheme} {
  --preview-accent: var(${themeVar}); /* ${themeHex} */
}`;
    const snippet = document.getElementById("css-code-snippet");
    if (snippet) snippet.textContent = code;
  }

  function updateActiveClassDisplay() {
    if (!activeClassesDisplay) return;
    activeClassesDisplay.textContent = [...cssState.values(), activeThemeClass].join(" ");
    updateCSSPlaygroundSnippet();
  }

  cssControlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!stylePreview) return;
      const group = button.dataset.cssGroup;
      const newClass = button.dataset.cssClass;
      const oldClass = cssState.get(group);
      if (oldClass === newClass) return;

      if (oldClass) stylePreview.classList.remove(oldClass);
      stylePreview.classList.add(newClass);
      cssState.set(group, newClass);

      const groupButtons = cssControlButtons.filter((candidate) => candidate.dataset.cssGroup === group);
      setPressedButton(groupButtons, button);
      updateActiveClassDisplay();

      const [action, change, implementation, concept] = cssDescriptions[newClass];
      updateExplanation("css-explanation", { action, change, implementation, concept });
    });
  });

  const paletteButtons = $$("[data-theme-class]");
  const paletteDescriptions = {
    "theme-cyan": { name: "Electric Cyan", variable: "--brand-cyan", value: "#00F7FF" },
    "theme-aqua": { name: "Soft Aqua", variable: "--brand-aqua", value: "#B0FFFA" },
    "theme-magenta": { name: "Hot Magenta", variable: "--brand-magenta", value: "#FF0087" },
    "theme-pink": { name: "Soft Pink", variable: "--brand-pink", value: "#FF7DB0" }
  };

  paletteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!stylePreview) return;
      const nextTheme = button.dataset.themeClass;
      const details = paletteDescriptions[nextTheme];

      stylePreview.classList.remove(activeThemeClass);
      stylePreview.classList.add(nextTheme);
      activeThemeClass = nextTheme;
      setPressedButton(paletteButtons, button);
      paletteButtons.forEach((candidate) => {
        const label = candidate.querySelector(".selected-label");
        if (label) label.textContent = candidate === button ? "Selected" : "Select";
      });
      updateActiveClassDisplay();

      updateExplanation("css-explanation", {
        action: `You selected the ${details.name} palette option.`,
        change: `The preview border, badge, decorative accent and button now use ${details.name}.`,
        implementation: `JavaScript replaced the theme class; ${nextTheme} reads ${details.variable} (${details.value}).`,
        concept: "CSS custom properties and reusable classes centralise colour decisions without inline styles."
      });
    });
  });

  const boxModelButtons = $$("[data-box-layer]");
  const boxModelDiagram = $(".box-model-diagram");
  const boxModelDescription = document.getElementById("box-model-description");
  const boxModelDetails = {
    content: ["Content", "the text, image or other material inside the element."],
    padding: ["Padding", "transparent internal space between the content and the border."],
    border: ["Border", "the visible edge drawn around the content and padding."],
    margin: ["Margin", "transparent external space separating the element from neighbouring elements."]
  };

  boxModelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const layer = button.dataset.boxLayer;
      const [label, description] = boxModelDetails[layer];
      setPressedButton(boxModelButtons, button);
      if (boxModelDiagram) boxModelDiagram.dataset.activeLayer = layer;
      if (boxModelDescription) {
        boxModelDescription.replaceChildren();
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        boxModelDescription.append(strong, document.createTextNode(description));
      }

      const boxModelCodes = {
        content: `<span class="token-comment">/* Box Model: Content layer */</span>
<span class="token-class">.box-content</span> {
  <span class="token-keyword">width</span>: <span class="token-number">100%</span>;
  <span class="token-keyword">min-height</span>: <span class="token-number">5.5rem</span>;
  <span class="token-keyword">padding</span>: <span class="token-number">1.25rem</span>;
  <span class="token-keyword">border-style</span>: solid;
  <span class="token-keyword">background</span>: <span class="token-function">rgba</span>(<span class="token-number">139</span>, <span class="token-number">92</span>, <span class="token-number">246</span>, <span class="token-number">0.2</span>); <span class="token-comment">/* Lavender */</span>
  <span class="token-keyword">border-radius</span>: <span class="token-number">8px</span>;
}`,
        padding: `<span class="token-comment">/* Box Model: Padding layer */</span>
<span class="token-class">.box-padding</span> {
  <span class="token-keyword">width</span>: <span class="token-number">100%</span>;
  <span class="token-keyword">padding</span>: <span class="token-number">1.75rem</span>;
  <span class="token-keyword">background</span>: <span class="token-function">rgba</span>(<span class="token-number">244</span>, <span class="token-number">194</span>, <span class="token-number">215</span>, <span class="token-number">0.3</span>); <span class="token-comment">/* Baby Pink */</span>
  <span class="token-keyword">border-radius</span>: <span class="token-function">var</span>(<span class="token-operator">--radius-sm</span>);
}`,
        border: `<span class="token-comment">/* Box Model: Border layer */</span>
<span class="token-class">.box-border</span> {
  <span class="token-keyword">width</span>: <span class="token-number">100%</span>;
  <span class="token-keyword">padding</span>: <span class="token-number">2rem</span>;
  <span class="token-keyword">background</span>: <span class="token-function">rgba</span>(<span class="token-number">139</span>, <span class="token-number">92</span>, <span class="token-number">246</span>, <span class="token-number">0.1</span>); <span class="token-comment">/* Lavender outline */</span>
  <span class="token-keyword">border-radius</span>: <span class="token-function">var</span>(<span class="token-operator">--radius-md</span>);
  <span class="token-keyword">border-style</span>: solid;
}`,
        margin: `<span class="token-comment">/* Box Model: Margin layer */</span>
<span class="token-class">.box-margin</span> {
  <span class="token-keyword">padding</span>: <span class="token-number">2.5rem</span>;
  <span class="token-keyword">background</span>: <span class="token-function">rgba</span>(<span class="token-number">244</span>, <span class="token-number">194</span>, <span class="token-number">215</span>, <span class="token-number">0.12</span>); <span class="token-comment">/* Baby Pink tint */</span>
  <span class="token-keyword">border-radius</span>: <span class="token-function">var</span>(<span class="token-operator">--radius-lg</span>);
}`
      };
      const snippetEl = document.getElementById("css-code-snippet");
      if (snippetEl && boxModelCodes[layer]) snippetEl.innerHTML = boxModelCodes[layer];

      updateExplanation("css-explanation", {
        action: `You selected the ${label.toLowerCase()} layer.`,
        change: `The ${label.toLowerCase()} region is outlined and its purpose is displayed.`,
        implementation: `A data-active-layer attribute changes which nested diagram layer matches the CSS selector.`,
        concept: "Every rendered element is calculated using the CSS box model."
      });
    });
  });

  updateActiveClassDisplay();

  /* 4. Bootstrap component interactions ------------------------------ */

  const bootstrapExplanationId = "bootstrap-explanation";
  const alertRegion = document.getElementById("bootstrap-alert-region");
  const alertButton = document.getElementById("show-bootstrap-alert");
  const spacingButton = document.getElementById("toggle-bootstrap-spacing");
  let compactBootstrapCards = false;
  let activeBootstrapTab = "overview-tab";

  function updateBootstrapCodeSnippet(tabId) {
    const snippet = document.getElementById("bootstrap-code-snippet");
    if (!snippet) return;

    if (tabId === "overview-tab") {
      snippet.textContent = `<!-- Bootstrap 5 Form and Overlays -->
<form class="row g-3" novalidate>
  <div class="col-md-7">
    <div class="input-group">
      <span class="input-group-text">@</span>
      <input type="email" class="form-control" id="bootstrap-email" required>
    </div>
  </div>
  <div class="col-md-3">
    <select class="form-select" id="bootstrap-role">
      <option>Front-end</option>
      <option>Back-end</option>
      <option>Full stack</option>
    </select>
  </div>
</form>

<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#portfolio-modal">
  Open modal
</button>
<button class="btn btn-secondary" id="show-bootstrap-alert">
  Show alert
</button>`;
    } else if (tabId === "cards-tab") {
      const spacingClass = compactBootstrapCards ? "p-2" : "p-4";
      snippet.textContent = `<!-- Responsive Card Grid with spacing classes -->
<div class="row g-4" id="bootstrap-cards">
  <div class="col-12 col-md-6 col-lg-4">
    <div class="card h-100 brand-bootstrap-card">
      <div class="card-body ${spacingClass}">
        <span class="badge bg-primary">HTML</span>
        <h4 class="card-title">Semantic structure</h4>
        <p class="card-text">...</p>
      </div>
    </div>
  </div>
</div>`;
    } else if (tabId === "accordion-tab") {
      snippet.textContent = `<!-- Bootstrap Collapsible Accordion -->
<div class="accordion" id="bootstrap-accordion">
  <div class="accordion-item">
    <h4 class="accordion-header">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#breakpoint-answer">
        What do the column classes mean?
      </button>
    </h4>
    <div id="breakpoint-answer" class="accordion-collapse collapse show" data-bs-parent="#bootstrap-accordion">
      <div class="accordion-body">col-12 fills the row; col-md-6 half width; col-lg-4 third width.</div>
    </div>
  </div>
</div>`;
    }
  }

  // Bind to genuine Bootstrap tab transitions
  const bootstrapTabs = $$('#demo-bootstrap [data-bs-toggle="tab"]');
  bootstrapTabs.forEach((tabButton) => {
    tabButton.addEventListener("shown.bs.tab", (event) => {
      const tabId = event.target.id;
      activeBootstrapTab = tabId;
      updateBootstrapCodeSnippet(tabId);

      if (tabId === "overview-tab") {
        updateExplanation(bootstrapExplanationId, {
          action: "The “Form & Overlays” tab was selected.",
          change: "A simulated registration form, modal, and alert triggers are displayed.",
          implementation: "Bootstrap components handle overlays and form controls with responsive column classes.",
          concept: "Forms and overlay utilities handle interactive behaviors declaratively."
        });
      } else if (tabId === "cards-tab") {
        updateExplanation(bootstrapExplanationId, {
          action: "The “Cards Grid” tab was selected.",
          change: "Cards are arranged using Bootstrap's responsive grid system.",
          implementation: "col-12 col-md-6 col-lg-4 breakpoint classes configure column widths.",
          concept: "Mobile-first responsive layouts scale without custom media queries."
        });
      } else if (tabId === "accordion-tab") {
        updateExplanation(bootstrapExplanationId, {
          action: "The “Accordion FAQ” tab was selected.",
          change: "Standard collapsible content headers are presented.",
          implementation: "accordion-collapse collapse show manages active visibility classes.",
          concept: "Progressive disclosure of info blocks reduces page clutter."
        });
      }
    });
  });

  function buildBootstrapAlert() {
    if (!alertRegion) return;
    alertRegion.replaceChildren();

    const alert = document.createElement("div");
    alert.className = "alert alert-dismissible fade show";
    alert.setAttribute("role", "alert");

    const strong = document.createElement("strong");
    strong.textContent = "Bootstrap alert: ";
    const message = document.createTextNode("the component is visible and can be dismissed.");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.dataset.bsDismiss = "alert";
    closeButton.setAttribute("aria-label", "Dismiss alert");

    alert.append(strong, message, closeButton);
    alertRegion.append(alert);
    alert.addEventListener("closed.bs.alert", () => {
      updateExplanation(bootstrapExplanationId, {
        action: "The alert’s close button was selected.",
        change: "Bootstrap removed the dismissible alert from the document.",
        implementation: "The data-bs-dismiss=\"alert\" attribute activated Bootstrap’s Alert plugin.",
        concept: "Framework JavaScript can provide reusable behaviour from declarative data attributes."
      });
    });
  }

  alertButton?.addEventListener("click", () => {
    buildBootstrapAlert();
    updateExplanation(bootstrapExplanationId, {
      action: "The “Show alert” button was selected.",
      change: "A branded, dismissible Bootstrap alert appeared.",
      implementation: "JavaScript created alert classes while Bootstrap controls its dismiss behaviour.",
      concept: "A framework component can be generated dynamically and styled with custom CSS."
    });
  });

  spacingButton?.addEventListener("click", () => {
    compactBootstrapCards = !compactBootstrapCards;
    $$("#bootstrap-cards .card-body").forEach((body) => {
      body.classList.toggle("p-4", !compactBootstrapCards);
      body.classList.toggle("p-2", compactBootstrapCards);
    });
    spacingButton.setAttribute("aria-pressed", String(compactBootstrapCards));
    spacingButton.textContent = compactBootstrapCards ? "Restore card spacing" : "Compact cards";

    if (activeBootstrapTab === "cards-tab") {
      updateBootstrapCodeSnippet("cards-tab");
    }

    updateExplanation(bootstrapExplanationId, {
      action: compactBootstrapCards ? "Compact card spacing was selected." : "Normal card spacing was restored.",
      change: compactBootstrapCards ? "Each card body now uses less internal space." : "Each card body now uses the original spacing.",
      implementation: compactBootstrapCards ? "JavaScript replaced Bootstrap’s p-4 utility with p-2." : "JavaScript replaced p-2 with Bootstrap’s p-4 utility.",
      concept: "Bootstrap spacing utilities encode predictable values in reusable class names."
    });
  });

  $$("[data-card-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardName = button.dataset.cardAction;
      updateExplanation(bootstrapExplanationId, {
        action: `The ${cardName} action was selected.`,
        change: "The explanation panel now identifies the card component.",
        implementation: "A custom event listener complements the card, button, badge and spacing classes.",
        concept: "Bootstrap supplies presentation patterns while project JavaScript can add application-specific behaviour."
      });
    });
  });

  const portfolioModal = document.getElementById("portfolio-modal");
  portfolioModal?.addEventListener("shown.bs.modal", () => {
    updateExplanation(bootstrapExplanationId, {
      action: "The modal trigger button was selected.",
      change: "A dialog opened above a backdrop and keyboard focus moved inside it.",
      implementation: "Bootstrap read data-bs-toggle and data-bs-target, then ran its Modal plugin.",
      concept: "Bootstrap’s JavaScript bundle manages component state, focus and keyboard dismissal."
    });
  });
  portfolioModal?.addEventListener("hidden.bs.modal", () => {
    updateExplanation(bootstrapExplanationId, {
      action: "The modal was closed.",
      change: "The dialog and backdrop were removed and focus returned to the trigger.",
      implementation: "Bootstrap completed the modal hide lifecycle.",
      concept: "Accessible components need predictable focus restoration as well as visual changes."
    });
  });

  const bootstrapAccordion = document.getElementById("bootstrap-accordion");
  bootstrapAccordion?.addEventListener("show.bs.collapse", (event) => {
    const trigger = document.querySelector(`[data-bs-target="#${event.target.id}"]`);
    updateExplanation(bootstrapExplanationId, {
      action: `The accordion item “${trigger?.textContent.trim() || "item"}” was opened.`,
      change: "One answer expanded while the grouped accordion controls the other panels.",
      implementation: "Bootstrap’s Collapse plugin changed classes and aria-expanded automatically.",
      concept: "Accordion behaviour progressively reveals content without leaving the page."
    });
  });

  const demoNavbarContent = document.getElementById("demo-navbar-content");
  demoNavbarContent?.addEventListener("show.bs.collapse", () => {
    updateExplanation(bootstrapExplanationId, {
      action: "The demonstration navbar toggler was selected.",
      change: "The collapsed navigation links are opening.",
      implementation: "navbar-expand-md combines responsive CSS with Bootstrap’s Collapse plugin.",
      concept: "A breakpoint can switch navigation between expanded and collapsible layouts."
    });
  });

  const bootstrapFormDemo = document.getElementById("bootstrap-form-demo");
  const bootstrapEmail = document.getElementById("bootstrap-email");
  const bootstrapFormStatus = document.getElementById("bootstrap-form-status");

  bootstrapFormDemo?.addEventListener("submit", (event) => {
    event.preventDefault();
    const isValid = Boolean(bootstrapEmail?.value.trim()) && !bootstrapEmail.validity.typeMismatch;

    bootstrapEmail?.classList.toggle("is-invalid", !isValid);
    bootstrapEmail?.classList.toggle("is-valid", isValid);
    bootstrapEmail?.setAttribute("aria-invalid", String(!isValid));

    const bootstrapSnippet = document.getElementById("bootstrap-code-snippet");

    if (!isValid) {
      if (bootstrapFormStatus) {
        bootstrapFormStatus.textContent = "Enter a valid email address to complete the demonstration.";
        bootstrapFormStatus.classList.add("is-error");
        bootstrapFormStatus.classList.remove("is-success");
      }
      bootstrapEmail?.focus();

      if (bootstrapSnippet) {
        bootstrapSnippet.textContent = `// Bootstrap Form Check: FAILED
// Storing local validation constraints check
const validationResult = {
  isValid: false,
  error: "Enter a valid email address.",
  inputClass: "is-invalid",
  timestamp: "${new Date().toISOString()}"
};`;
      }

      updateExplanation(bootstrapExplanationId, {
        action: "The Bootstrap form was checked with an invalid email value.",
        change: "The form-control received an invalid state and a written error appeared.",
        implementation: "JavaScript used the input validity API and Bootstrap’s is-invalid class.",
        concept: "Framework validation classes still require meaningful labels and accessible messages."
      });
      return;
    }

    if (bootstrapFormStatus) {
      bootstrapFormStatus.textContent = "Form controls validated successfully; no data was sent.";
      bootstrapFormStatus.classList.add("is-success");
      bootstrapFormStatus.classList.remove("is-error");
    }

    if (bootstrapSnippet) {
      bootstrapSnippet.textContent = `// Bootstrap Form Check: PASSED
// Form controls validated successfully
const validationResult = {
  isValid: true,
  data: {
    email: "${bootstrapEmail?.value.trim().replace(/"/g, '\\"')}",
    role: "${document.getElementById("bootstrap-role")?.value || "Front-end"}",
    updates: ${document.getElementById("bootstrap-updates")?.checked || false}
  },
  timestamp: "${new Date().toISOString()}"
};`;
    }

    updateExplanation(bootstrapExplanationId, {
      action: "The Bootstrap form controls were validated.",
      change: "The email control now shows a valid state and a success message.",
      implementation: "The input group, form-control, form-select, form-check and grid classes remain Bootstrap components while JavaScript handles this static validation.",
      concept: "Bootstrap can style forms responsively, but application logic still belongs to project code."
    });
  });

  bootstrapEmail?.addEventListener("input", () => {
    bootstrapEmail.classList.remove("is-invalid", "is-valid");
    bootstrapEmail.removeAttribute("aria-invalid");
    if (bootstrapFormStatus) {
      bootstrapFormStatus.textContent = "Bootstrap form controls are ready.";
      bootstrapFormStatus.classList.remove("is-error", "is-success");
    }
  });

  /* 5. JavaScript task manager --------------------------------------- */

  const STORAGE_KEY = "cet138-eportfolio-tasks";
  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const taskCategory = document.getElementById("task-category");
  const taskError = document.getElementById("task-error");
  const taskList = document.getElementById("task-list");
  const taskEmptyState = document.getElementById("task-empty-state");
  const taskCount = document.getElementById("task-count");
  const taskStorageStatus = document.getElementById("task-storage-status");
  const taskFilterButtons = $$("[data-task-filter]");
  const clearCompletedButton = document.getElementById("clear-completed");
  let activeTaskFilter = "all";
  let storageAvailable = true;

  function createUniqueId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function starterTasks() {
    const now = new Date().toISOString();
    return [
      { id: createUniqueId(), text: "Setup semantic HTML outline (header, nav, main, sections, footer)", category: "Development", completed: true, createdAt: now },
      { id: createUniqueId(), text: "Configure custom responsive CSS layout variables and selectors", category: "Development", completed: true, createdAt: now },
      { id: createUniqueId(), text: "Link and configure local Bootstrap 5.3.6 styles and JS bundles", category: "Development", completed: true, createdAt: now },
      { id: createUniqueId(), text: "Implement dynamic code previews and explanations in script.js", category: "Testing", completed: true, createdAt: now },
      { id: createUniqueId(), text: "Refine design aesthetics for liquid layouts, transitions, and dark themes", category: "Testing", completed: false, createdAt: now }
    ];
  }

  function loadTasks() {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (!storedValue) return starterTasks();
      const parsedValue = JSON.parse(storedValue);
      if (!Array.isArray(parsedValue)) throw new TypeError("Stored tasks are not an array.");

      return parsedValue
        .filter((task) => task && typeof task === "object" && typeof task.text === "string")
        .map((task) => ({
          id: String(task.id || createUniqueId()),
          text: task.text.slice(0, 120),
          category: String(task.category || "Study"),
          completed: Boolean(task.completed),
          createdAt: task.createdAt || new Date().toISOString()
        }));
    } catch {
      storageAvailable = false;
      return starterTasks();
    }
  }

  let tasks = loadTasks();

  function saveTasks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      storageAvailable = true;
      if (taskStorageStatus) taskStorageStatus.textContent = `Saved locally · ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    } catch {
      storageAvailable = false;
      if (taskStorageStatus) taskStorageStatus.textContent = "Storage unavailable · tasks remain for this page only";
    }
  }

  function filteredTasks() {
    if (activeTaskFilter === "active") return tasks.filter((task) => !task.completed);
    if (activeTaskFilter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }

  function formatTaskDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently added";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function buildTaskElement(task) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.classList.toggle("is-completed", task.completed);
    item.dataset.taskId = task.id;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "task-toggle";
    toggleButton.dataset.taskAction = "toggle";
    toggleButton.setAttribute("aria-label", task.completed ? `Mark ${task.text} as active` : `Mark ${task.text} as complete`);
    toggleButton.setAttribute("aria-pressed", String(task.completed));
    const checkIcon = document.createElement("i");
    checkIcon.setAttribute("data-lucide", "check");
    toggleButton.append(checkIcon);

    const content = document.createElement("div");
    content.className = "task-content";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const meta = document.createElement("span");
    meta.className = "task-meta";
    const category = document.createElement("span");
    category.className = "task-category";
    category.textContent = task.category;
    const date = document.createElement("span");
    date.textContent = `Added ${formatTaskDate(task.createdAt)}`;
    meta.append(category, date);
    content.append(text, meta);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "task-delete";
    deleteButton.dataset.taskAction = "delete";
    deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
    const trashIcon = document.createElement("i");
    trashIcon.setAttribute("data-lucide", "trash-2");
    deleteButton.append(trashIcon, document.createTextNode(" Delete"));

    item.append(toggleButton, content, deleteButton);
    return item;
  }

  function renderTasks() {
    if (!taskList) return;
    const visibleTasks = filteredTasks();
    taskList.replaceChildren(...visibleTasks.map(buildTaskElement));

    if (taskEmptyState) taskEmptyState.hidden = visibleTasks.length > 0;
    const remaining = tasks.filter((task) => !task.completed).length;
    if (taskCount) taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;
    if (clearCompletedButton) clearCompletedButton.disabled = !tasks.some((task) => task.completed);
    if (taskStorageStatus && !storageAvailable) taskStorageStatus.textContent = "Storage unavailable · tasks remain for this page only";
    
    // Refresh dynamic Lucide icons inside the task list
    window.lucide?.createIcons();
  }

  function setTaskInputError(message) {
    if (!taskInput || !taskError) return;
    taskError.textContent = message;
    taskInput.classList.toggle("is-invalid", Boolean(message));
    if (message) taskInput.setAttribute("aria-invalid", "true");
    else taskInput.removeAttribute("aria-invalid");
  }

  taskForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const taskText = taskInput.value.trim();
    const snippetEl = document.getElementById("javascript-code-snippet");

    if (!taskText) {
      setTaskInputError("Enter a task before selecting Add task.");
      taskInput.focus();
      if (snippetEl) {
        snippetEl.textContent = `// Task Manager Action: ADD_TASK (Validation Failed)
// Input validation rejected empty task description
const error = "Enter a task before selecting Add task.";`;
      }
      updateExplanation("javascript-explanation", {
        action: "A submit event was detected with an empty task.",
        change: "The task was not added and a validation message appeared.",
        implementation: "preventDefault stopped submission; trim() and a condition rejected an empty string.",
        concept: "Input must be validated before application state changes."
      });
      return;
    }

    const task = {
      id: createUniqueId(),
      text: taskText,
      category: taskCategory.value,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks = [...tasks, task];
    saveTasks();
    renderTasks();
    taskForm.reset();
    setTaskInputError("");
    taskInput.focus();

    if (snippetEl) {
      snippetEl.textContent = `// Task Manager Action: ADD_TASK (Success)
// Appended new task object to tasks array
const task = {
  id: "${task.id}",
  text: "${task.text.replace(/"/g, '\\"')}",
  category: "${task.category}",
  completed: false,
  createdAt: "${task.createdAt}"};
tasks = [...tasks, task];
localStorage.setItem("cet138-eportfolio-tasks", JSON.stringify(tasks));`;
    }

    updateExplanation("javascript-explanation", {
      action: `The task “${task.text}” was submitted.`,
      change: "A new task appears in the list and the remaining count increased.",
      implementation: "A task object was added to a new array, saved with JSON.stringify and rendered as safe DOM nodes.",
      concept: "Events update application state, persistence and the DOM in a controlled data flow."
    });
  });

  taskInput?.addEventListener("input", () => {
    if (taskInput.value.trim()) setTaskInputError("");
  });

  taskList?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-task-action]");
    const item = event.target.closest("[data-task-id]");
    if (!actionButton || !item) return;
    const taskId = item.dataset.taskId;
    const selectedTask = tasks.find((task) => task.id === taskId);
    if (!selectedTask) return;

    const snippetEl = document.getElementById("javascript-code-snippet");

    if (actionButton.dataset.taskAction === "toggle") {
      tasks = tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
      const updatedTask = tasks.find((task) => task.id === taskId);
      saveTasks();
      renderTasks();

      if (snippetEl) {
        snippetEl.textContent = `// Task Manager Action: TOGGLE_TASK
// Toggling completed boolean for matching ID
const taskId = "${taskId}";
tasks = tasks.map((t) =>
  t.id === taskId ? { ...t, completed: !t.completed } : t
);
localStorage.setItem("cet138-eportfolio-tasks", JSON.stringify(tasks));`;
      }

      updateExplanation("javascript-explanation", {
        action: `The task “${selectedTask.text}” was marked ${updatedTask.completed ? "complete" : "active"}.`,
        change: "Its completed property, visual state and remaining count changed.",
        implementation: "Array.map returned a new array with an updated object, then the DOM was re-rendered.",
        concept: "Immutable-style state updates make a UI’s data flow easier to follow."
      });
    }

    if (actionButton.dataset.taskAction === "delete") {
      tasks = tasks.filter((task) => task.id !== taskId);
      saveTasks();
      renderTasks();

      if (snippetEl) {
        snippetEl.textContent = `// Task Manager Action: DELETE_TASK
// Removing matching task ID from main collection
const taskId = "${taskId}";
tasks = tasks.filter((t) => t.id !== taskId);
localStorage.setItem("cet138-eportfolio-tasks", JSON.stringify(tasks));`;
      }

      updateExplanation("javascript-explanation", {
        action: `The task “${selectedTask.text}” was deleted.`,
        change: "The selected task was removed from the list and local storage.",
        implementation: "Array.filter created an array containing every object except the matching unique ID.",
        concept: "Unique IDs allow one data record and its DOM representation to be targeted reliably."
      });
    }
  });

  taskFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTaskFilter = button.dataset.taskFilter;
      setPressedButton(taskFilterButtons, button);
      renderTasks();

      const snippetEl = document.getElementById("javascript-code-snippet");
      if (snippetEl) {
        snippetEl.textContent = `// Task Manager Action: FILTER_TASKS
// Deriving active subset using active filter: "${activeTaskFilter}"
const activeTaskFilter = "${activeTaskFilter}";
const visibleTasks = activeTaskFilter === "active"
  ? tasks.filter((t) => !t.completed)
  : activeTaskFilter === "completed"
    ? tasks.filter((t) => t.completed)
    : tasks;`;
      }

      updateExplanation("javascript-explanation", {
        action: `The ${button.textContent.trim()} filter was selected.`,
        change: "The list now displays only tasks matching the selected state.",
        implementation: "Array.filter derived a visible subset without deleting anything from the main task array.",
        concept: "The same application data can be rendered in different views."
      });
    });
  });

  clearCompletedButton?.addEventListener("click", () => {
    const completedCount = tasks.filter((task) => task.completed).length;
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();

    const snippetEl = document.getElementById("javascript-code-snippet");
    if (snippetEl) {
      snippetEl.textContent = `// Task Manager Action: CLEAR_COMPLETED
// Retaining only active (uncompleted) tasks
tasks = tasks.filter((t) => !t.completed);
localStorage.setItem("cet138-eportfolio-tasks", JSON.stringify(tasks));`;
    }

    updateExplanation("javascript-explanation", {
      action: `Clear completed removed ${completedCount} ${completedCount === 1 ? "task" : "tasks"}.`,
      change: "Only active tasks remain in the application state and DOM.",
      implementation: "Array.filter retained objects whose completed property is false, then localStorage was updated.",
      concept: "Bulk actions can transform a collection using a single array operation."
    });
  });

  /* Global Theme Switcher & Scroll Navigation -------------------------- */
  const savedTheme = localStorage.getItem("cet138-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("cet138-theme", nextTheme);
  }

  document.getElementById("theme-toggle-btn-desktop")?.addEventListener("click", toggleTheme);
  document.getElementById("theme-toggle-btn-mobile")?.addEventListener("click", toggleTheme);

  // Quick scroll-to buttons
  document.getElementById("scroll-to-top-btn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("scroll-to-bottom-btn")?.addEventListener("click", () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });

  /* CSS Playground Interactivity -------------------------------------- */
  const btnToggleFlex = document.getElementById("btn-toggle-flex");
  const btnToggleGrid = document.getElementById("btn-toggle-grid");
  const layoutDemoContainer = document.getElementById("layout-demo-container");
  const layoutExplanationText = document.getElementById("layout-explanation-text");
  const btnAnimateLiquid = document.getElementById("btn-animate-liquid");
  const btnAnimateFloat = document.getElementById("btn-animate-float");
  const animationDemoElement = document.getElementById("animation-demo-element");
  const snippetEl = document.getElementById("css-code-snippet");

  function updateCSSLayoutView(mode) {
    if (mode === "flex") {
      btnToggleFlex?.classList.add("active");
      btnToggleGrid?.classList.remove("active");
      layoutDemoContainer?.classList.remove("grid-mode");
      layoutDemoContainer?.classList.add("flex-mode");
      if (layoutExplanationText) {
        layoutExplanationText.innerHTML = "<strong>Flexbox (Flexible Box Layout):</strong> One-dimensional layout model. Great for aligning elements in a row or column, distributing space dynamically.";
      }
      const flexCode = `<span class="token-comment">/* Flexbox: One-dimensional Layout */</span>
<span class="token-class">.flex-container</span> {
  <span class="token-keyword">display</span>: flex;
  <span class="token-keyword">flex-direction</span>: row;
  <span class="token-keyword">flex-wrap</span>: wrap;
  <span class="token-keyword">justify-content</span>: space-around;
  <span class="token-keyword">gap</span>: <span class="token-number">1.25rem</span>;
}

<span class="token-class">.flex-item</span> {
  <span class="token-comment">/* flex-grow, flex-shrink, flex-basis */</span>
  <span class="token-keyword">flex</span>: <span class="token-number">1</span> <span class="token-number">1</span> <span class="token-function">calc</span>(<span class="token-number">25%</span> <span class="token-operator">-</span> <span class="token-number">1.25rem</span>);
  <span class="token-keyword">background</span>: <span class="token-function">linear-gradient</span>(<span class="token-number">135deg</span>, #fdf2f6, #f3e8ff);
}`;
      if (snippetEl) snippetEl.innerHTML = flexCode;
      updateExplanation("css-explanation", {
        action: "Flexbox layout model is selected.",
        change: "Demo items flow as responsive flex blocks and wrap inside the container.",
        implementation: "display: flex triggers a one-dimensional layout, utilizing flex sizing properties.",
        concept: "Flexbox calculates sizes along a single main axis, distributing remaining space."
      });
    } else {
      btnToggleGrid?.classList.add("active");
      btnToggleFlex?.classList.remove("active");
      layoutDemoContainer?.classList.remove("flex-mode");
      layoutDemoContainer?.classList.add("grid-mode");
      if (layoutExplanationText) {
        layoutExplanationText.innerHTML = "<strong>CSS Grid Layout:</strong> Two-dimensional layout system (rows AND columns). Ideal for building complex page structures and aligning items in grids.";
      }
      const gridCode = `<span class="token-comment">/* CSS Grid: Two-dimensional Layout */</span>
<span class="token-class">.grid-container</span> {
  <span class="token-keyword">display</span>: grid;
  <span class="token-keyword">grid-template-columns</span>: <span class="token-keyword">repeat</span>(auto-fit, <span class="token-function">minmax</span>(<span class="token-number">130px</span>, <span class="token-number">1fr</span>));
  <span class="token-keyword">gap</span>: <span class="token-number">1.25rem</span>;
  <span class="token-keyword">align-content</span>: center;
}

<span class="token-class">.grid-item</span> {
  <span class="token-keyword">border</span>: <span class="token-number">2px</span> solid var(<span class="token-operator">--colour-ink</span>);
  <span class="token-keyword">box-shadow</span>: <span class="token-number">4px</span> <span class="token-number">4px</span> <span class="token-number">0</span> var(<span class="token-operator">--colour-ink</span>);
}`;
      if (snippetEl) snippetEl.innerHTML = gridCode;
      updateExplanation("css-explanation", {
        action: "CSS Grid layout model is selected.",
        change: "Demo items align in an auto-fitting grid system.",
        implementation: "display: grid triggers a two-dimensional grid, scaling items on rows and columns.",
        concept: "CSS Grid manages columns and rows simultaneously, allowing precise layout control."
      });
    }
  }

  function updateCSSAnimationView(type) {
    if (type === "liquid") {
      animationDemoElement?.classList.toggle("morph-active");
      const isMorphActive = animationDemoElement?.classList.contains("morph-active");
      if (isMorphActive) {
        if (btnAnimateLiquid) {
          btnAnimateLiquid.textContent = "Reset Shape";
          btnAnimateLiquid.classList.add("active");
        }
        btnAnimateFloat?.classList.remove("active");
        animationDemoElement?.classList.remove("float-active");
        if (btnAnimateFloat) btnAnimateFloat.textContent = "Float Orb";
      } else {
        if (btnAnimateLiquid) {
          btnAnimateLiquid.textContent = "Morph Shape";
          btnAnimateLiquid.classList.remove("active");
        }
      }

      if (isMorphActive) {
        const morphCode = `<span class="token-comment">/* Animation: Morph Shape */</span>
<span class="token-class">.animation-element.morph-active</span> {
  <span class="token-keyword">border-radius</span>: <span class="token-number">30% 70% 70% 30% / 30% 30% 70% 70%</span>;
  <span class="token-keyword">transform</span>: <span class="token-function">rotate</span>(<span class="token-number">45deg</span>);
  <span class="token-keyword">background</span>: <span class="token-function">linear-gradient</span>(<span class="token-number">135deg</span>, #f4c2d7, #8b5cf6, #bae6fd);
  <span class="token-keyword">transition</span>: <span class="token-keyword">border-radius</span> <span class="token-number">0.6s</span> cubic-bezier(<span class="token-number">0.175</span>, <span class="token-number">0.885</span>, <span class="token-number">0.32</span>, <span class="token-number">1.275</span>);
}`;
        if (snippetEl) snippetEl.innerHTML = morphCode;
        updateExplanation("css-explanation", {
          action: "Morph Shape transition is toggled on.",
          change: "The circular orb rotates and morphs into a fluid liquid organic shape.",
          implementation: "border-radius with slash syntax defines non-uniform corners, interpolated smoothly.",
          concept: "CSS transitions interpolate property values over time using custom cubic-bezier easing."
        });
      } else {
        showDefaultAnimationSnippet();
      }
    } else if (type === "float") {
      animationDemoElement?.classList.toggle("float-active");
      const isFloatActive = animationDemoElement?.classList.contains("float-active");
      if (isFloatActive) {
        if (btnAnimateFloat) {
          btnAnimateFloat.textContent = "Stop Float";
          btnAnimateFloat.classList.add("active");
        }
        btnAnimateLiquid?.classList.remove("active");
        animationDemoElement?.classList.remove("morph-active");
        if (btnAnimateLiquid) btnAnimateLiquid.textContent = "Morph Shape";
      } else {
        if (btnAnimateFloat) {
          btnAnimateFloat.textContent = "Float Orb";
          btnAnimateFloat.classList.remove("active");
        }
      }

      if (isFloatActive) {
        const floatCode = `<span class="token-comment">/* Animation: Bounce Float */</span>
<span class="token-class">.animation-element.float-active</span> {
  <span class="token-keyword">animation</span>: bounce-float <span class="token-number">1.8s</span> infinite ease-in-out alternate;
}

<span class="token-keyword">@keyframes</span> bounce-float {
  <span class="token-number">0%</span> { <span class="token-keyword">transform</span>: <span class="token-function">translateY</span>(<span class="token-number">0</span>); }
  <span class="token-number">100%</span> { <span class="token-keyword">transform</span>: <span class="token-function">translateY</span>(<span class="token-number">-25px</span>); }
}`;
        if (snippetEl) snippetEl.innerHTML = floatCode;
        updateExplanation("css-explanation", {
          action: "Float Orb animation is toggled on.",
          change: "The orb floats smoothly up and down with spring-like physics.",
          implementation: "CSS @keyframes define vertical displacement using translateY properties.",
          concept: "Keyframes let you declare states along an animation timeline for complex movement."
        });
      } else {
        showDefaultAnimationSnippet();
      }
    }
  }

  function showDefaultAnimationSnippet() {
    const defaultCode = `<span class="token-comment">/* Animations & Transitions: Base Orb */</span>
<span class="token-class">.animation-demo-element</span> {
  <span class="token-keyword">width</span>: <span class="token-number">7.5rem</span>;
  <span class="token-keyword">height</span>: <span class="token-number">7.5rem</span>;
  <span class="token-keyword">border-radius</span>: <span class="token-number">50%</span>;
  <span class="token-keyword">background</span>: <span class="token-function">linear-gradient</span>(<span class="token-number">135deg</span>, #f4c2d7, #8b5cf6, #bae6fd);
  <span class="token-keyword">transition</span>: <span class="token-keyword">all</span> <span class="token-number">0.4s</span> ease;
}`;
    if (snippetEl) snippetEl.innerHTML = defaultCode;
    updateExplanation("css-explanation", {
      action: "Animations & Transitions tab is active.",
      change: "The orb sits at rest, ready to morph or float on user trigger.",
      implementation: "Transition properties declare how changes to layout or transform properties animate.",
      concept: "CSS transitions handle simple state changes; keyframes manage complex, repeating actions."
    });
  }

  btnToggleFlex?.addEventListener("click", () => updateCSSLayoutView("flex"));
  btnToggleGrid?.addEventListener("click", () => updateCSSLayoutView("grid"));
  btnAnimateLiquid?.addEventListener("click", () => updateCSSAnimationView("liquid"));
  btnAnimateFloat?.addEventListener("click", () => updateCSSAnimationView("float"));

  // Bind to CSS tab transitions
  const cssTabs = $$('#demo-css [data-bs-toggle="tab"]');
  cssTabs.forEach((tabButton) => {
    tabButton.addEventListener("shown.bs.tab", (event) => {
      const tabId = event.target.id;
      if (tabId === "boxmodel-tab") {
        const selectedLayerButton = $(".box-model-button.is-selected");
        if (selectedLayerButton) {
          selectedLayerButton.click();
        } else {
          const contentBtn = $('[data-box-layer="content"]');
          contentBtn?.click();
        }
      } else if (tabId === "flexgrid-tab") {
        const isFlexActive = btnToggleFlex?.classList.contains("active");
        updateCSSLayoutView(isFlexActive ? "flex" : "grid");
      } else if (tabId === "animation-tab") {
        const isMorphActive = animationDemoElement?.classList.contains("morph-active");
        const isFloatActive = animationDemoElement?.classList.contains("float-active");
        if (isMorphActive) {
          updateCSSAnimationView("liquid");
        } else if (isFloatActive) {
          updateCSSAnimationView("float");
        } else {
          showDefaultAnimationSnippet();
        }
      }
    });
  });

  /* Mobile Navbar Toggle Fallback ------------------------------------- */
  const navbarToggler = document.querySelector(".navbar-toggler");
  const primaryNavigation = document.getElementById("primary-navigation");
  if (navbarToggler && primaryNavigation) {
    navbarToggler.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = navbarToggler.getAttribute("aria-expanded") === "true";
      navbarToggler.setAttribute("aria-expanded", !isExpanded);
      primaryNavigation.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (primaryNavigation.classList.contains("show") && !e.target.closest(".site-header")) {
        primaryNavigation.classList.remove("show");
        navbarToggler.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* 5. Section Focus (Puff Up) Mode ---------------------------------- */
  const sections = $$(".portfolio-section");
  
  // Create backdrop element
  const backdrop = document.createElement("div");
  backdrop.className = "focus-backdrop";
  document.body.appendChild(backdrop);

  // Create close button element
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close-focus";
  closeBtn.innerHTML = '<i data-lucide="x"></i> Close Focus Mode';
  document.body.appendChild(closeBtn);
  window.lucide?.createIcons(); // Render close icon

  function activateFocusMode(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    // First deactivate any current focus
    deactivateFocusMode();

    // Align the background page scroll position instantly first
    targetSection.scrollIntoView({ behavior: "auto", block: "center" });

    // Activate focus mode immediately without scroll delay
    document.body.classList.add("has-focused-section");
    targetSection.classList.add("section-focused");
  }

  function deactivateFocusMode() {
    const focusedSection = $(".portfolio-section.section-focused");
    document.body.classList.remove("has-focused-section");
    sections.forEach((sec) => sec.classList.remove("section-focused"));
    
    // Smoothly scroll back to the section in the normal document flow
    if (focusedSection) {
      focusedSection.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }

  // Intercept all anchor nav links matching portfolio sections
  $$('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href === "#" || href === "#top") return;
    
    const targetId = href.substring(1);
    const targetSection = document.getElementById(targetId);
    if (targetSection && targetSection.classList.contains("portfolio-section")) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        activateFocusMode(targetId);
      });
    }
  });

  // Backdrop and Close Button listeners
  backdrop.addEventListener("click", deactivateFocusMode);
  closeBtn.addEventListener("click", deactivateFocusMode);

  // Escape key listener to close focus mode
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      deactivateFocusMode();
    }
  });

  saveTasks();
  renderTasks();
  
  // Initialize static Lucide icons on initial page load
  window.lucide?.createIcons();
})();
