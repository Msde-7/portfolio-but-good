let nameElement;
const nameText = "Hi, I'm Gabe";
let index = 0;

let projectsScene, projectsCamera, projectsRenderer, projectsKnot;
let experienceScene, experienceCamera, experienceRenderer, experienceCone;
let contactScene, contactCamera, contactRenderer, contactTorus;

let terminalOverlay, terminalContent, terminalCursor, mainContent;

const commands = [
    { text: "cd portfolio-project", delayAfter: 90 },
    { text: "serve", delayAfter: 180 }
];

const networkIp = "192.168.253.184";

const outputLines = [
    { text: "   ┌──────────────────────────────────────────┐", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   │   Serving!                               │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   │   - Local:    http://localhost:3000      │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: `   │   - Network:  http://${networkIp}:3000│`, delayAfter: 10, color: 'text-neutral-100', instant: true }, 
    { text: "   │                                          │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   │   Copied local address to clipboard!     │", delayAfter: 10, color: 'text-neutral-400', instant: true },
    { text: "   │                                          │", delayAfter: 10, color: 'text-neutral-100', instant: true },
    { text: "   └──────────────────────────────────────────┘", delayAfter: 280, color: 'text-neutral-100', instant: true },
];

function typeChar(lineElement, text, charIndex, speed, callback) {
    if (charIndex < text.length) {
        const char = text.charAt(charIndex);
        lineElement.innerHTML += char;
        if (window.CRT) CRT.press(char);
        // Vary the rate so it does not read as a metronome
        const jitter = speed * (0.5 + Math.random() * 1.1);
        setTimeout(() => typeChar(lineElement, text, charIndex + 1, speed, callback), jitter);
    } else {
        if (callback) callback();
    }
}

function typeLine(lineData, callback) {
    const newLine = document.createElement('div');
    if (lineData.isCommand) {
        const promptSpan = document.createElement('span');
        promptSpan.className = 'text-white';
        promptSpan.textContent = '$ ';
        newLine.appendChild(promptSpan);
    }

        const textSpan = document.createElement('span');
        textSpan.style.whiteSpace = 'pre'; // Preserve whitespace for correct box rendering

        if (lineData.color) {
            textSpan.className = lineData.color;
        } else if (!lineData.isCommand) {
            textSpan.className = 'text-neutral-100'; 
        }
        newLine.appendChild(textSpan);
        terminalContent.appendChild(newLine);
        terminalContent.scrollTop = terminalContent.scrollHeight; 

        if (lineData.instant) {
            textSpan.textContent = lineData.text;
            if (callback) setTimeout(callback, lineData.delayAfter || 1);
        } else {
            typeChar(textSpan, lineData.text, 0, lineData.isCommand ? 28 : 15, () => {
                if (lineData.isCommand && window.CRT) CRT.enter();
                if (callback) setTimeout(callback, lineData.delayAfter || 200);
        });
    }
}

function runTerminalSequence() {
    let currentCommandIndex = 0;
    let currentOutputIndex = 0;

    function nextCommand() {
        if (currentCommandIndex < commands.length) {
            const commandData = { ...commands[currentCommandIndex], isCommand: true };
            currentCommandIndex++;
            typeLine(commandData, () => {
                if (commandData.text === "serve") nextOutput(); 
                else nextCommand(); 
            });
        } else {
        }
    }

    function nextOutput() {
        if (currentOutputIndex < outputLines.length) {
            const outputData = outputLines[currentOutputIndex];
            currentOutputIndex++;
            typeLine(outputData, nextOutput); 
        } else {
            if (terminalCursor) terminalCursor.style.display = 'none'; 

            setTimeout(() => {
                const dropMachine = () => {
                    if (terminalOverlay) terminalOverlay.style.display = 'none';
                };

                // The site sits under the machine, uncovered as it zooms past
                if (window.CRT) {
                    CRT.dive(showMainContent, dropMachine);
                } else {
                    showMainContent();
                    dropMachine();
                }
            }, outputLines[outputLines.length - 1].delayAfter || 1000);
        }
    }
    if (terminalCursor) terminalCursor.style.display = 'inline-block';

    if (window.CRT && CRT.init()) {
        CRT.powerOn(() => setTimeout(nextCommand, 280));
    } else {
        nextCommand();
    }
}

function showMainContent() {
    if (!mainContent) return;
    mainContent.classList.remove('hidden');
    void mainContent.offsetWidth;  // settle the display change so the fade runs
    mainContent.style.opacity = '1';
    mainContent.style.transform = 'translateY(0)';
    startSectionAnimations();
}

const sectionInits = [
    initProjectsAnimation, initExperienceAnimation,
    initContactAnimation, initProjectBrowser, initExperienceCards,
    initSectionRail, initSendButton
];

// one section failing must not stop the rest
function startSectionAnimations() {
    if (nameElement) {
        index = 0;
        typeWriter();
    }
    for (const init of sectionInits) {
        try { init(); } catch (e) { console.error(init.name, e); }
    }
}

function initProjectsAnimation() {
    const projectsAnimationCanvas = document.getElementById('torus-knot-canvas');
    if (!projectsAnimationCanvas) {
        return;
    }

    projectsScene = new THREE.Scene();
    projectsCamera = new THREE.PerspectiveCamera(75, projectsAnimationCanvas.clientWidth / projectsAnimationCanvas.clientHeight, 0.1, 1000);
    projectsRenderer = new THREE.WebGLRenderer({ canvas: projectsAnimationCanvas, alpha: true });
    projectsRenderer.setSize(projectsAnimationCanvas.clientWidth, projectsAnimationCanvas.clientHeight);
    projectsRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.TorusKnotGeometry(0.8, 0.2, 80, 10);
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
    });
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    projectsKnot = new THREE.LineSegments(wireframeGeometry, material);
    projectsScene.add(projectsKnot);

    projectsCamera.position.z = 2.5;

    animateProjects();
}

function animateProjects() {
    requestAnimationFrame(animateProjects);
    if (projectsKnot) {
        projectsKnot.rotation.x += 0.01;
        projectsKnot.rotation.y += 0.015;
    }
    if (projectsRenderer && projectsScene && projectsCamera) {
        projectsRenderer.render(projectsScene, projectsCamera);
    }
}

function initExperienceAnimation() {
    const experienceAnimationCanvas = document.getElementById('experience-animation-canvas');
    if (!experienceAnimationCanvas) {
        return;
    }

    experienceScene = new THREE.Scene();
    experienceCamera = new THREE.PerspectiveCamera(75, experienceAnimationCanvas.clientWidth / experienceAnimationCanvas.clientHeight, 0.1, 1000);
    experienceRenderer = new THREE.WebGLRenderer({ canvas: experienceAnimationCanvas, alpha: true });
    experienceRenderer.setSize(experienceAnimationCanvas.clientWidth, experienceAnimationCanvas.clientHeight);
    experienceRenderer.setClearColor(0x000000, 0);
    const geometry = new THREE.ConeGeometry(0.8, 1.5, 16);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    experienceCone = new THREE.LineSegments(wireframeGeometry, material);
    experienceScene.add(experienceCone);
    experienceCamera.position.z = 3;
    animateExperience();
}

function animateExperience() {
    requestAnimationFrame(animateExperience);
    if (experienceCone) {
        experienceCone.rotation.x += 0.008;
        experienceCone.rotation.y += 0.012;
    }
    if (experienceRenderer && experienceScene && experienceCamera) {
        experienceRenderer.render(experienceScene, experienceCamera);
    }
}

function initContactAnimation() {
    const contactAnimationCanvas = document.getElementById('contact-animation-canvas');
    if (!contactAnimationCanvas) {
        return;
    }

    contactScene = new THREE.Scene();
    contactCamera = new THREE.PerspectiveCamera(75, contactAnimationCanvas.clientWidth / contactAnimationCanvas.clientHeight, 0.1, 1000);
    contactRenderer = new THREE.WebGLRenderer({ canvas: contactAnimationCanvas, alpha: true });
    contactRenderer.setSize(contactAnimationCanvas.clientWidth, contactAnimationCanvas.clientHeight);
    contactRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.TorusGeometry(0.8, 0.3, 12, 48);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    contactTorus = new THREE.LineSegments(wireframeGeometry, material);
    contactScene.add(contactTorus);
    contactCamera.position.z = 3;
    animateContact();
}

function animateContact() {
    requestAnimationFrame(animateContact);
    if (contactTorus) {
        contactTorus.rotation.x += 0.007;
        contactTorus.rotation.y += 0.013;
    }
    if (contactRenderer && contactScene && contactCamera) {
        contactRenderer.render(contactScene, contactCamera);
    }
}

// Once the opening screen is gone, show where you are on the right edge,
// or a back to top button where there is no room for that
function initSectionRail() {
    const hero = document.getElementById('about');
    const rail = document.querySelector('.rail');
    const top = document.querySelector('.to-top');
    if (!hero || !rail) return;

    const links = new Map();
    rail.querySelectorAll('a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));

    let queued = false;
    const onScroll = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const past = window.scrollY > hero.offsetHeight * 0.6;
            rail.classList.toggle('is-shown', past);
            if (top) top.classList.toggle('is-shown', past);
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // The section crossing the middle of the screen is the current one
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((a, id) => a.classList.toggle('is-current', id === entry.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a, id) => {
        const section = document.getElementById(id);
        if (section) spy.observe(section);
    });

    if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// The plane leaves before the mail app opens
function initSendButton() {
    const btn = document.querySelector('.send-btn');
    if (!btn) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    btn.addEventListener('click', (e) => {
        if (calm.matches) return;
        e.preventDefault();
        if (btn.classList.contains('is-sending')) return;

        btn.classList.remove('is-returning');
        btn.classList.add('is-sending');
        setTimeout(() => { window.location.href = btn.href; }, 650);
        setTimeout(() => {
            btn.classList.remove('is-sending');
            void btn.offsetWidth;
            btn.classList.add('is-returning');
        }, 1500);
    });
}

// The dot grid under each card follows the pointer
function initExperienceCards() {
    document.querySelectorAll('.xp-card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });
}

function initProjectBrowser() {
    const rows = Array.from(document.querySelectorAll('.pj-row'));
    if (rows.length === 0) return;

    // Side by side on wide screens, otherwise the panes open under their rows
    const wide = window.matchMedia('(min-width: 768px)');
    const hover = window.matchMedia('(hover: hover)');
    const paneOf = (row) => document.getElementById(row.getAttribute('aria-controls'));
    let intent = 0;

    function open(row) {
        rows.forEach((r) => {
            const on = r === row;
            if ((r.getAttribute('aria-expanded') === 'true') === on) return;
            r.setAttribute('aria-expanded', String(on));
            paneOf(r).classList.toggle('is-open', on);
        });
    }

    function toggle(row) {
        if (wide.matches) {
            open(row);
            return;
        }
        // Closing a tall pane above would yank the tapped row off screen
        const before = row.getBoundingClientRect().top;
        open(row.getAttribute('aria-expanded') === 'true' ? null : row);
        window.scrollBy(0, row.getBoundingClientRect().top - before);
    }

    // A pane is open from the start beside the list, but on a phone that would
    // push the rest of the projects down before anyone asked for it
    function sync() {
        if (!wide.matches) open(null);
        else if (!rows.some((r) => r.getAttribute('aria-expanded') === 'true')) open(rows[0]);
    }
    sync();
    wide.addEventListener('change', sync);

    rows.forEach((row, i) => {
        row.addEventListener('click', () => toggle(row));

        // A short wait so sweeping down the list does not replay every pane
        row.addEventListener('pointerenter', () => {
            if (!wide.matches || !hover.matches) return;
            clearTimeout(intent);
            intent = setTimeout(() => open(row), 70);
        });
        row.addEventListener('pointerleave', () => clearTimeout(intent));

        row.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const next = rows[(i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length];
            next.focus();
            if (wide.matches) open(next);
        });
    });
}

// Types the greeting, then waves
function typeWriter() {
    if (!nameElement) {
        return;
    }

    const currentText = nameText;
    const typingSpeed = 150;

    // Only typing. Deleting was a bit too much
    if (index < currentText.length) {
        nameElement.textContent = currentText.substring(0, index + 1);
        index++;
        setTimeout(typeWriter, typingSpeed);
        return;
    }

    // Wave once the greeting is out
    const wave = document.querySelector('.hero-wave');
    if (wave) wave.hidden = false;
}

window.onload = () => {
  nameElement = document.getElementById('name');
  terminalOverlay = document.getElementById('terminal-sequence-overlay');
  terminalContent = document.getElementById('terminal-output');
  terminalCursor = document.getElementById('terminal-cursor-line');
  mainContent = document.getElementById('main-content');

  if (terminalOverlay && terminalContent) {
    runTerminalSequence();
  } else {
    showMainContent();
  }
};
