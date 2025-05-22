let nameElement; // Declare globally containing the type writer
const nameText = "Gabe Shores";
let index = 0;
let isDeleting = false;

// Good lord you might think!!!! Just 3js animations though 🤪
let scene, camera, renderer, sphere; // For loading sphere
let skillsScene, skillsCamera, skillsRenderer, skillsCube;
let projectsScene, projectsCamera, projectsRenderer, projectsKnot;
let educationScene, educationCamera, educationRenderer, graduationCapGroup;
let experienceScene, experienceCamera, experienceRenderer, experienceCone;
let leadershipScene, leadershipCamera, leadershipRenderer, leadershipOctahedron;
let interestsScene, interestsCamera, interestsRenderer, interestsDodecahedron;
let contactScene, contactCamera, contactRenderer, contactTorus;

let terminalOverlay, terminalContent, terminalCursor, loadingOverlay, mainContent; // Declare globally

const commands = [
    { text: "cd portfolio-project", delayAfter: 150 }, 
    { text: "serve", delayAfter: 300 } 
];


//Dynamically generate?? Makes harder to format. not sure people will notice
//Can I get their IP tho??
const networkIp = "192.168.253.184";

//Ugly ahhhhh display now in the code. looked better
const outputLines = [
    { text: "   ┌──────────────────────────────────────────┐", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   Serving!                               │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   - Local:    http://localhost:3000      │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: `   │   - Network:  http://${networkIp}:3000│`, delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true }, //Ruins the aligning :( but neccessary to display
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   Copied local address to clipboard!     │", delayAfter: 10, isOutput: true, color: 'text-green-400', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   └──────────────────────────────────────────┘", delayAfter: 500, isOutput: true, color: 'text-neutral-100', instant: true },
];

function typeChar(lineElement, text, charIndex, speed, callback) {
    if (charIndex < text.length) {
        lineElement.innerHTML += text.charAt(charIndex);
        setTimeout(() => typeChar(lineElement, text, charIndex + 1, speed, callback), speed);
    } else {
        if (callback) callback();
    }
}

function typeLine(lineData, callback) {
    const newLine = document.createElement('div');
    if (lineData.isCommand) {
        const promptSpan = document.createElement('span');
        promptSpan.className = 'text-sky-500';
        promptSpan.textContent = '$ ';
        newLine.appendChild(promptSpan);
    }

    if (lineData.isHTML) { 
        const tempSpan = document.createElement('span');
        newLine.appendChild(tempSpan);
        terminalContent.appendChild(newLine);
        terminalContent.scrollTop = terminalContent.scrollHeight; 

        typeChar(tempSpan, lineData.text, 0, 20, () => { 
            tempSpan.innerHTML = lineData.text; 
            const linkElement = document.getElementById('localhost-link');
            //Pretend to ctrl click on the localhost-link
            if(linkElement) {
                linkElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log("Localhost link clicked (simulated)");
                });
            }
            if (callback) setTimeout(callback, lineData.delayAfter || 200);
        });
    } else {
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
            textSpan.textContent = lineData.text; // Set text directly for instant lines
            if (callback) setTimeout(callback, lineData.delayAfter || 1);
        } else {
            typeChar(textSpan, lineData.text, 0, lineData.isCommand ? 35 : 15, () => { 
                if (callback) setTimeout(callback, lineData.delayAfter || 200);
            });
        }
    }
}


//Oddly was a pain in the ass
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
            console.log("Finished all commands in sequence.");
        }
    }

    function nextOutput() {
        if (currentOutputIndex < outputLines.length) {
            const outputData = outputLines[currentOutputIndex];
            currentOutputIndex++;
            typeLine(outputData, nextOutput); 
        } else {
            console.log("Finished all output lines. Preparing to transition.");
            if (terminalCursor) terminalCursor.style.display = 'none'; 

            setTimeout(() => {
                if (terminalOverlay) terminalOverlay.style.display = 'none';
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'flex'; //💪
                    loadingOverlay.style.opacity = '1';
                }

                try {
                    console.log("Terminal sequence finished. Initializing loading sphere (initThreeJS)...");
                    initThreeJS();
                    console.log("Loading sphere initialized after terminal sequence.");
                } catch (e) {
                    console.error("Error in initThreeJS (loading sphere) after terminal:", e);
                }

                setTimeout(() => {
                    const currentLoadingOverlay = document.getElementById('loading-overlay'); 
                    const currentMainContent = document.getElementById('main-content');

                    if (currentLoadingOverlay) {
                        currentLoadingOverlay.style.opacity = '0';
                        setTimeout(() => {
                            if (currentLoadingOverlay) {
                                currentLoadingOverlay.style.display = 'none';
                            }
                        }, 500); 
                    }
                    if (currentMainContent) {
                        currentMainContent.classList.remove('hidden');
                        void currentMainContent.offsetWidth; 
                        currentMainContent.style.opacity = '1';
                        currentMainContent.style.transform = 'translateY(0)';

                        console.log("Main content revealed. Now initializing section animations.");

                        try {
                            if (nameElement) {
                                console.log("Main flow: Resetting and calling typeWriter...");
                                index = 0;
                                isDeleting = false;
                                typeWriter();
                                console.log("Main flow: typeWriter call initiated.");
                            } else {
                                console.error("Main flow: nameElement not found, cannot call typeWriter.");
                            }
                        } catch (e) {
                            console.error("Main flow: Error calling typeWriter:", e);
                        }

                        try { initSkillsAnimation(); } catch(e) { console.error("Error initSkillsAnimation:", e); }
                        try { initProjectsAnimation(); } catch(e) { console.error("Error initProjectsAnimation:", e); }
                        try { initEducationAnimation(); } catch(e) { console.error("Error initEducationAnimation:", e); }
                        try { initExperienceAnimation(); } catch(e) { console.error("Error initExperienceAnimation:", e); }
                        try { initLeadershipAnimation(); } catch(e) { console.error("Error initLeadershipAnimation:", e); }
                        try { initInterestsAnimation(); } catch(e) { console.error("Error initInterestsAnimation:", e); }
                        try { initContactAnimation(); } catch(e) { console.error("Error initContactAnimation:", e); }
                        try { initProjectsCarousel(); } catch(e) { console.error("Error initProjectsCarousel:", e); }
                    } 
                }, 1500); 
            }, outputLines[outputLines.length - 1].delayAfter || 1000); // Corrected: Ensure this is outputLines[outputLines.length - 1]
        }
    }
    if (terminalCursor) terminalCursor.style.display = 'inline-block'; 
    nextCommand(); 
}

// Loading Animation 💃
function initThreeJS() {
    console.log("Attempting to init loading sphere (initThreeJS)");
    const loadingSphereCanvas = document.getElementById('bg-canvas');
    if (!loadingSphereCanvas) {
        console.error("Loading sphere canvas ('bg-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Loading sphere canvas found. Initializing scene...");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, loadingSphereCanvas.clientWidth / loadingSphereCanvas.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: loadingSphereCanvas, alpha: true });
    renderer.setSize(loadingSphereCanvas.clientWidth, loadingSphereCanvas.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background

    const geometry = new THREE.SphereGeometry(2.5, 16, 16); // Radius, widthSegments, heightSegments
    const material = new THREE.LineBasicMaterial({
        color: 0x0ea5e9, // sky-400
        linewidth: 1,
    }); 
    
    // Create a wireframe from the sphere geometry
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    sphere = new THREE.LineSegments(wireframeGeometry, material);
    scene.add(sphere);

    camera.position.z = 5;

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (sphere) {
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.005;
    }
    if (renderer && scene && camera) 
        renderer.render(scene, camera);
}

// Skills Animation
function initSkillsAnimation() {
    console.log("Attempting to init Skills animation");
    const skillsAnimationCanvas = document.getElementById('skills-animation-canvas');
    if (!skillsAnimationCanvas) {
        console.error("Skills animation canvas ('skills-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Skills animation canvas found. Initializing scene...");

    skillsScene = new THREE.Scene();
    skillsCamera = new THREE.PerspectiveCamera(75, skillsAnimationCanvas.clientWidth / skillsAnimationCanvas.clientHeight, 0.1, 1000);
    skillsRenderer = new THREE.WebGLRenderer({ canvas: skillsAnimationCanvas, alpha: true });
    skillsRenderer.setSize(skillsAnimationCanvas.clientWidth, skillsAnimationCanvas.clientHeight);
    skillsRenderer.setClearColor(0x000000, 0); // Transparent background

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9, // sky-400
        wireframe: true,
    });
    skillsCube = new THREE.Mesh(geometry, material);
    skillsScene.add(skillsCube);

    skillsCamera.position.z = 3;

    animateSkills();
}

function animateSkills() {
    requestAnimationFrame(animateSkills);
    if (skillsCube) {
        skillsCube.rotation.x += 0.01;
        skillsCube.rotation.y += 0.01;
    }
    if (skillsRenderer && skillsScene && skillsCamera) 
        skillsRenderer.render(skillsScene, skillsCamera);
}

// Projects Animation
function initProjectsAnimation() {
    console.log("Attempting to init Projects animation (Torus Knot)");
    const projectsAnimationCanvas = document.getElementById('torus-knot-canvas'); // Changed ID
    if (!projectsAnimationCanvas) {
        console.error("Projects animation canvas ('torus-knot-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Projects animation canvas found. Initializing scene...");

    projectsScene = new THREE.Scene();
    projectsCamera = new THREE.PerspectiveCamera(75, projectsAnimationCanvas.clientWidth / projectsAnimationCanvas.clientHeight, 0.1, 1000);
    projectsRenderer = new THREE.WebGLRenderer({ canvas: projectsAnimationCanvas, alpha: true });
    projectsRenderer.setSize(projectsAnimationCanvas.clientWidth, projectsAnimationCanvas.clientHeight);
    projectsRenderer.setClearColor(0x000000, 0); // Transparent background

    const geometry = new THREE.TorusKnotGeometry(0.8, 0.2, 80, 10); // Radius, tube, tubularSegments, radialSegments. In short, cool little thing
    const material = new THREE.LineBasicMaterial({
        color: 0x0ea5e9, // sky-400
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

// Education Animation
function initEducationAnimation() {
    console.log("Attempting to init Education animation (Graduation Cap)"); //Not sure if anybody will see the vision
    const educationAnimationCanvas = document.getElementById('education-animation-canvas');
    if (!educationAnimationCanvas) {
        console.error("Education animation canvas ('education-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Education animation canvas found. Initializing scene...");

    educationScene = new THREE.Scene();
    educationCamera = new THREE.PerspectiveCamera(75, educationAnimationCanvas.clientWidth / educationAnimationCanvas.clientHeight, 0.1, 1000);
    educationRenderer = new THREE.WebGLRenderer({ canvas: educationAnimationCanvas, alpha: true });
    educationRenderer.setSize(educationAnimationCanvas.clientWidth, educationAnimationCanvas.clientHeight);
    educationRenderer.setClearColor(0x000000, 0);

    graduationCapGroup = new THREE.Group(); // Create a group for the cap parts

    const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });

    // Cylinder part
    const cylinderRadius = 0.6;
    const cylinderHeight = 0.5;
    const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 16);
    const cylinderWireframe = new THREE.WireframeGeometry(cylinderGeometry);
    const cylinderMesh = new THREE.LineSegments(cylinderWireframe, material);
    graduationCapGroup.add(cylinderMesh);

    // Plane part
    const planeSize = 1.5;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeWireframe = new THREE.WireframeGeometry(planeGeometry);
    const planeMesh = new THREE.LineSegments(planeWireframe, material);
    planeMesh.position.y = cylinderHeight / 2 + 0.05; // Position it on top of the cylinder
    planeMesh.rotation.x = Math.PI / 2; // Rotate it to be flat (Changed from -Math.pi -> Math.pi but might change back)
    graduationCapGroup.add(planeMesh);
    
    //tassel later???????

    educationScene.add(graduationCapGroup);
    educationCamera.position.z = 3;
    educationCamera.position.y = 0.5;
    educationCamera.lookAt(graduationCapGroup.position);

    animateEducation();
}

function animateEducation() {
    requestAnimationFrame(animateEducation);
    if (graduationCapGroup) {
        graduationCapGroup.rotation.x += 0.005; // Slower rotation for a cap might look better
        graduationCapGroup.rotation.y += 0.01;
    }
    if (educationRenderer && educationScene && educationCamera) {
        educationRenderer.render(educationScene, educationCamera);
    }
}

// Experience Animation
function initExperienceAnimation() {
    console.log("Attempting to init Experience animation");
    const experienceAnimationCanvas = document.getElementById('experience-animation-canvas');
    if (!experienceAnimationCanvas) {
        console.error("Experience animation canvas ('experience-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Experience animation canvas found. Initializing scene...");

    experienceScene = new THREE.Scene();
    experienceCamera = new THREE.PerspectiveCamera(75, experienceAnimationCanvas.clientWidth / experienceAnimationCanvas.clientHeight, 0.1, 1000);
    experienceRenderer = new THREE.WebGLRenderer({ canvas: experienceAnimationCanvas, alpha: true });
    experienceRenderer.setSize(experienceAnimationCanvas.clientWidth, experienceAnimationCanvas.clientHeight);
    experienceRenderer.setClearColor(0x000000, 0);
    const geometry = new THREE.ConeGeometry(0.8, 1.5, 16); // Radius, height, radialSegments
    const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });
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

// Leadership Animation
// Why an octahedron? You tell me
function initLeadershipAnimation() {
    console.log("Attempting to init Leadership animation");
    const leadershipAnimationCanvas = document.getElementById('leadership-animation-canvas');
    if (!leadershipAnimationCanvas) {
        console.error("Leadership animation canvas ('leadership-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Leadership animation canvas found. Initializing scene...");

    leadershipScene = new THREE.Scene();
    leadershipCamera = new THREE.PerspectiveCamera(75, leadershipAnimationCanvas.clientWidth / leadershipAnimationCanvas.clientHeight, 0.1, 1000);
    leadershipRenderer = new THREE.WebGLRenderer({ canvas: leadershipAnimationCanvas, alpha: true });
    leadershipRenderer.setSize(leadershipAnimationCanvas.clientWidth, leadershipAnimationCanvas.clientHeight);
    leadershipRenderer.setClearColor(0x000000, 0);
    const geometry = new THREE.OctahedronGeometry(1.0);
    const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    leadershipOctahedron = new THREE.LineSegments(wireframeGeometry, material);
    leadershipScene.add(leadershipOctahedron);
    leadershipCamera.position.z = 3;
    animateLeadership();
}

function animateLeadership() {
    requestAnimationFrame(animateLeadership);
    if (leadershipOctahedron) {
        leadershipOctahedron.rotation.x += 0.015;
        leadershipOctahedron.rotation.y += 0.005;
    }
    if (leadershipRenderer && leadershipScene && leadershipCamera) {
        leadershipRenderer.render(leadershipScene, leadershipCamera);
    }
}

// Interests Animation
function initInterestsAnimation() {
    console.log("Attempting to init Interests animation");
    const interestsAnimationCanvas = document.getElementById('interests-animation-canvas');
    if (!interestsAnimationCanvas) {
        console.error("Interests animation canvas ('interests-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Interests animation canvas found. Initializing scene...");

    interestsScene = new THREE.Scene();
    interestsCamera = new THREE.PerspectiveCamera(75, interestsAnimationCanvas.clientWidth / interestsAnimationCanvas.clientHeight, 0.1, 1000);
    interestsRenderer = new THREE.WebGLRenderer({ canvas: interestsAnimationCanvas, alpha: true });
    interestsRenderer.setSize(interestsAnimationCanvas.clientWidth, interestsAnimationCanvas.clientHeight);
    interestsRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.DodecahedronGeometry(1.0); // Radius
    const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    interestsDodecahedron = new THREE.LineSegments(wireframeGeometry, material);
    interestsScene.add(interestsDodecahedron);
    interestsCamera.position.z = 3;
    animateInterests();
}

function animateInterests() {
    requestAnimationFrame(animateInterests);
    if (interestsDodecahedron) {
        interestsDodecahedron.rotation.x += 0.01;
        interestsDodecahedron.rotation.y += 0.01;
    }
    if (interestsRenderer && interestsScene && interestsCamera) {
        interestsRenderer.render(interestsScene, interestsCamera);
    }
}

// Contact Animation
function initContactAnimation() {
    console.log("Attempting to init Contact animation");
    const contactAnimationCanvas = document.getElementById('contact-animation-canvas');
    if (!contactAnimationCanvas) {
        console.error("Contact animation canvas ('contact-animation-canvas') NOT FOUND in DOM!");
        return;
    }
    console.log("Contact animation canvas found. Initializing scene...");

    contactScene = new THREE.Scene();
    contactCamera = new THREE.PerspectiveCamera(75, contactAnimationCanvas.clientWidth / contactAnimationCanvas.clientHeight, 0.1, 1000);
    contactRenderer = new THREE.WebGLRenderer({ canvas: contactAnimationCanvas, alpha: true });
    contactRenderer.setSize(contactAnimationCanvas.clientWidth, contactAnimationCanvas.clientHeight);
    contactRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.TorusGeometry(0.8, 0.3, 12, 48); // Radius, tube, radialSegments, tubularSegments
    const material = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });
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

// Terminal Sequence Logic
let terminalSequenceInitialized = false;

// Window Onload
window.onload = () => {
  console.log("window.onload: Script execution started.");

  // Assign DOM elements now that the DOM is fully loaded
  nameElement = document.getElementById('name');
  terminalOverlay = document.getElementById('terminal-sequence-overlay');
  terminalContent = document.getElementById('terminal-output');
  terminalCursor = document.getElementById('terminal-cursor-line');
  loadingOverlay = document.getElementById('loading-overlay');
  mainContent = document.getElementById('main-content');

  // Setup mobile menu
  setupMobileMenu();

  console.log("DOM Elements after assignment:", {
    nameElement,
    terminalOverlay,
    terminalContent,
    terminalCursor,
    loadingOverlay,
    mainContent
  });

  if (terminalOverlay && terminalContent) {
    console.log("Terminal elements found. Starting sequence.");
    runTerminalSequence();
  } else {
    console.warn("Terminal sequence elements not found (terminalOverlay or terminalContent is null). Falling back to direct loading screen.");
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }
    try {
        console.log("Fallback: Initializing loading sphere (initThreeJS)...", loadingOverlay);
        initThreeJS(); 
        console.log("Fallback: Loading sphere initialized.");
    } catch (e) {
        console.error("Fallback: Error in initThreeJS (loading sphere):", e);
    }
    setTimeout(() => {
        const currentLoadingOverlay = loadingOverlay; 
        const currentMainContent = mainContent; 

        if (currentLoadingOverlay) {
          currentLoadingOverlay.style.opacity = '0';
          setTimeout(() => {
            if (currentLoadingOverlay) currentLoadingOverlay.style.display = 'none';
          }, 500);
        }
        if (currentMainContent) {
          currentMainContent.classList.remove('hidden');
          void currentMainContent.offsetWidth;
          currentMainContent.style.opacity = '1';
          currentMainContent.style.transform = 'translateY(0)';
        
          console.log("Fallback: Main content revealed. Now initializing section animations.");

          try {
              if (nameElement) {
                  console.log("Fallback: Resetting and calling typeWriter...");
                  index = 0;
                  isDeleting = false;
                  typeWriter();
                  console.log("Fallback: typeWriter call initiated.");
              } else {
                  console.error("Fallback: nameElement not found, cannot call typeWriter.");
              }
          } catch (e) {
              console.error("Fallback: Error calling typeWriter:", e);
          }

          try { initSkillsAnimation(); } catch(e) { console.error("Error initSkillsAnimation:", e); }
          try { initProjectsAnimation(); } catch(e) { console.error("Error initProjectsAnimation:", e); }
          try { initEducationAnimation(); } catch(e) { console.error("Error initEducationAnimation:", e); }
          try { initExperienceAnimation(); } catch(e) { console.error("Error initExperienceAnimation:", e); }
          try { initLeadershipAnimation(); } catch(e) { console.error("Error initLeadershipAnimation:", e); }
          try { initInterestsAnimation(); } catch(e) { console.error("Error initInterestsAnimation:", e); }
          try { initContactAnimation(); } catch(e) { console.error("Error initContactAnimation:", e); }
          try { initProjectsCarousel(); } catch(e) { console.error("Error initProjectsCarousel:", e); }
        }
    }, 1500);
  }

  console.log("window.onload: Script execution finished initial setup.");
};

// Mobile menu functionality
function setupMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('show');
      }
    });
    
    // Close menu when a link is clicked
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('show');
      });
    });
  }
}

function initProjectsCarousel() {
    const carousel = document.getElementById('projects-carousel');
    const prevButton = document.getElementById('prev-project');
    const nextButton = document.getElementById('next-project');
    const carouselWrapper = document.getElementById('projects-carousel-wrapper');

    if (!carousel || !prevButton || !nextButton || !carouselWrapper) {
        console.error('Carousel elements not found!');
        return;
    }

    let originalCards = Array.from(carousel.querySelectorAll('.project-card'));
    if (originalCards.length === 0) {
        console.warn("No project cards found in the carousel.");
        return;
    }

    const spaceBetweenCards = parseFloat(getComputedStyle(carousel).columnGap) || (8 * 4); // From space-x-8
    const cardWidthWithMargin = originalCards[0].offsetWidth + spaceBetweenCards;
    
    let totalCards = originalCards.length;
    // Determine clone count based on visible area, ensuring enough for smooth looping
    const visibleAreaWidth = carouselWrapper.offsetWidth;
    const cardsToFillVisibleArea = Math.ceil(visibleAreaWidth / cardWidthWithMargin);
    const CLONE_COUNT = totalCards > 1 ? Math.max(cardsToFillVisibleArea + 1, 3) : 0; 

    if (totalCards > 1) {
        // Append clones to the end
        for (let j = 0; j < CLONE_COUNT; j++) {
            originalCards.forEach(card => {
                carousel.appendChild(card.cloneNode(true));
            });
        }
        // Prepend clones to the beginning
        for (let j = 0; j < CLONE_COUNT; j++) {
            originalCards.slice().reverse().forEach(card => {
                carousel.insertBefore(card.cloneNode(true), carousel.firstChild);
            });
        }
    }
    
    // Recapture all cards including clones
    let allCards = Array.from(carousel.querySelectorAll('.project-card'));
    // Initial position: show the first "original" card, which is now offset by the prepended clones.
    let currentIndex = totalCards > 1 ? CLONE_COUNT * totalCards : 0;

    // Remove previous card style modifications
    allCards.forEach(card => {
        card.style.transform = ''; // Reset transform
        card.style.opacity = '';   // Reset opacity
    });

    function updateCarousel(isInstant = false) {
        const offset = -currentIndex * cardWidthWithMargin + (carouselWrapper.offsetWidth / 2) - (originalCards[0].offsetWidth / 2);
        
        if (isInstant) {
            carousel.style.transition = 'none';
        } else {
            carousel.style.transition = 'transform 0.5s ease-in-out';
        }
        carousel.style.transform = `translateX(${offset}px)`;

        if (totalCards > 1) {
            const timeoutDuration = isInstant ? 0 : 500; // Match CSS transition time
            setTimeout(() => {
                const logicalCurrentIndexInClones = currentIndex % totalCards;
                // Target physical index in the middle set of clones (or originals if no extensive cloning)
                const targetPhysicalIndex = (CLONE_COUNT * totalCards) + logicalCurrentIndexInClones;

                // Check if current index has drifted too far into the cloned areas
                if (currentIndex < totalCards || currentIndex >= allCards.length - totalCards) { 
                    currentIndex = targetPhysicalIndex;
                    carousel.style.transition = 'none';
                    const newOffset = -currentIndex * cardWidthWithMargin + (carouselWrapper.offsetWidth / 2) - (originalCards[0].offsetWidth / 2);
                    carousel.style.transform = `translateX(${newOffset}px)`;
                }
                // Re-enable transition for next user interaction if it was disabled
                 if (carousel.style.transition === 'none') {
                    // Force reflow if needed, then re-enable
                    void carousel.offsetWidth;
                    carousel.style.transition = 'transform 0.5s ease-in-out';
                }
            }, timeoutDuration);
        }
    }

    prevButton.addEventListener('click', () => {
        if (totalCards <= 1) return;
        currentIndex--;
        updateCarousel();
    });

    nextButton.addEventListener('click', () => {
        if (totalCards <= 1) return;
        currentIndex++;
        updateCarousel();
    });
    
    updateCarousel(true); // Initial positioning

    window.addEventListener('resize', () => {
        const newSpaceBetweenCards = parseFloat(getComputedStyle(carousel).columnGap) || (8*4);
        const newCardWidthWithMargin = originalCards[0].offsetWidth + newSpaceBetweenCards;

        //Might need to fix tbh 😴
        cardWidthWithMargin = newCardWidthWithMargin;
        spaceBetweenCards = newSpaceBetweenCards;
        updateCarousel(true);
    });

    console.log("Projects carousel setup complete (simplified styles).");
}
//Writes Gabe Shores (Who???)
function typeWriter() {
    if (!nameElement) {
        console.error("typeWriter: nameElement not found, cannot type.");
        return;
    }

    const currentText = nameText;
    const typingSpeed = 150;

    // Only typing. Deleting was a bit too much
    if (index < currentText.length) {
        nameElement.innerHTML = currentText.substring(0, index + 1);
        index++;
        setTimeout(typeWriter, typingSpeed);
    }
}