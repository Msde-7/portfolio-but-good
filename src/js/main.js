let nameElement;
const nameText = "Gabe Shores";
let index = 0;
let isDeleting = false;

let scene, camera, renderer, sphere;
let skillsScene, skillsCamera, skillsRenderer, skillsCube;
let projectsScene, projectsCamera, projectsRenderer, projectsKnot;
let educationScene, educationCamera, educationRenderer, graduationCapGroup;
let experienceScene, experienceCamera, experienceRenderer, experienceCone;
let leadershipScene, leadershipCamera, leadershipRenderer, leadershipOctahedron;
let interestsScene, interestsCamera, interestsRenderer, interestsDodecahedron;
let contactScene, contactCamera, contactRenderer, contactTorus;

let terminalOverlay, terminalContent, terminalCursor, loadingOverlay, mainContent;

const commands = [
    { text: "cd portfolio-project", delayAfter: 150 }, 
    { text: "serve", delayAfter: 300 } 
];


const networkIp = "192.168.253.184";

const outputLines = [
    { text: "   ┌──────────────────────────────────────────┐", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   Serving!                               │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   - Local:    http://localhost:3000      │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: `   │   - Network:  http://${networkIp}:3000│`, delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true }, 
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   │   Copied local address to clipboard!     │", delayAfter: 10, isOutput: true, color: 'text-neutral-400', instant: true },
    { text: "   │                                          │", delayAfter: 10, isOutput: true, color: 'text-neutral-100', instant: true },
    { text: "   └──────────────────────────────────────────┘", delayAfter: 500, isOutput: true, color: 'text-neutral-100', instant: true },
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
            textSpan.textContent = lineData.text;
            if (callback) setTimeout(callback, lineData.delayAfter || 1);
        } else {
            typeChar(textSpan, lineData.text, 0, lineData.isCommand ? 42 : 15, () => {
                if (lineData.isCommand && window.CRT) CRT.enter();
                if (callback) setTimeout(callback, lineData.delayAfter || 200);
            });
        }
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
                // The loader sits under the machine, uncovered as it zooms past
                const showLoader = () => {
                    if (loadingOverlay) {
                        loadingOverlay.style.display = 'flex';
                        loadingOverlay.style.opacity = '1';
                    }

                    try {
                        initThreeJS();
                    } catch (e) {
                        console.error("loading sphere failed", e);
                    }
                };

                const dropMachine = () => {
                    if (terminalOverlay) terminalOverlay.style.display = 'none';
                };

                if (window.CRT) {
                    CRT.dive(showLoader, dropMachine);
                } else {
                    showLoader();
                    dropMachine();
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


                        startSectionAnimations();
                    } 
                }, 1700);
            }, outputLines[outputLines.length - 1].delayAfter || 1000);
        }
    }
    if (terminalCursor) terminalCursor.style.display = 'inline-block';

    if (window.CRT && CRT.init()) {
        CRT.powerOn(() => setTimeout(nextCommand, 450));
    } else {
        nextCommand();
    }
}

const sectionInits = [
    initSkillsAnimation, initProjectsAnimation, initEducationAnimation,
    initExperienceAnimation, initLeadershipAnimation, initInterestsAnimation,
    initContactAnimation, initProjectsCarousel
];

// one section failing must not stop the rest
function startSectionAnimations() {
    if (nameElement) {
        index = 0;
        isDeleting = false;
        typeWriter();
    }
    for (const init of sectionInits) {
        try { init(); } catch (e) { console.error(init.name, e); }
    }
}

function initThreeJS() {
    const loadingSphereCanvas = document.getElementById('bg-canvas');
    if (!loadingSphereCanvas) {
        return;
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, loadingSphereCanvas.clientWidth / loadingSphereCanvas.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: loadingSphereCanvas, alpha: true });
    renderer.setSize(loadingSphereCanvas.clientWidth, loadingSphereCanvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    const geometry = new THREE.SphereGeometry(2.5, 16, 16);
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1,
    }); 
    
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

function initSkillsAnimation() {
    const skillsAnimationCanvas = document.getElementById('skills-animation-canvas');
    if (!skillsAnimationCanvas) {
        return;
    }

    skillsScene = new THREE.Scene();
    skillsCamera = new THREE.PerspectiveCamera(75, skillsAnimationCanvas.clientWidth / skillsAnimationCanvas.clientHeight, 0.1, 1000);
    skillsRenderer = new THREE.WebGLRenderer({ canvas: skillsAnimationCanvas, alpha: true });
    skillsRenderer.setSize(skillsAnimationCanvas.clientWidth, skillsAnimationCanvas.clientHeight);
    skillsRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
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

function initEducationAnimation() {
    const educationAnimationCanvas = document.getElementById('education-animation-canvas');
    if (!educationAnimationCanvas) {
        return;
    }

    educationScene = new THREE.Scene();
    educationCamera = new THREE.PerspectiveCamera(75, educationAnimationCanvas.clientWidth / educationAnimationCanvas.clientHeight, 0.1, 1000);
    educationRenderer = new THREE.WebGLRenderer({ canvas: educationAnimationCanvas, alpha: true });
    educationRenderer.setSize(educationAnimationCanvas.clientWidth, educationAnimationCanvas.clientHeight);
    educationRenderer.setClearColor(0x000000, 0);

    graduationCapGroup = new THREE.Group();

    const material = new THREE.LineBasicMaterial({ color: 0xffffff });

    const cylinderRadius = 0.6;
    const cylinderHeight = 0.5;
    const cylinderGeometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 16);
    const cylinderWireframe = new THREE.WireframeGeometry(cylinderGeometry);
    const cylinderMesh = new THREE.LineSegments(cylinderWireframe, material);
    graduationCapGroup.add(cylinderMesh);

    const planeSize = 1.5;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeWireframe = new THREE.WireframeGeometry(planeGeometry);
    const planeMesh = new THREE.LineSegments(planeWireframe, material);
    planeMesh.position.y = cylinderHeight / 2 + 0.05;
    planeMesh.rotation.x = Math.PI / 2;
    graduationCapGroup.add(planeMesh);
    

    educationScene.add(graduationCapGroup);
    educationCamera.position.z = 3;
    educationCamera.position.y = 0.5;
    educationCamera.lookAt(graduationCapGroup.position);

    animateEducation();
}

function animateEducation() {
    requestAnimationFrame(animateEducation);
    if (graduationCapGroup) {
        graduationCapGroup.rotation.x += 0.005;
        graduationCapGroup.rotation.y += 0.01;
    }
    if (educationRenderer && educationScene && educationCamera) {
        educationRenderer.render(educationScene, educationCamera);
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

function initLeadershipAnimation() {
    const leadershipAnimationCanvas = document.getElementById('leadership-animation-canvas');
    if (!leadershipAnimationCanvas) {
        return;
    }

    leadershipScene = new THREE.Scene();
    leadershipCamera = new THREE.PerspectiveCamera(75, leadershipAnimationCanvas.clientWidth / leadershipAnimationCanvas.clientHeight, 0.1, 1000);
    leadershipRenderer = new THREE.WebGLRenderer({ canvas: leadershipAnimationCanvas, alpha: true });
    leadershipRenderer.setSize(leadershipAnimationCanvas.clientWidth, leadershipAnimationCanvas.clientHeight);
    leadershipRenderer.setClearColor(0x000000, 0);
    const geometry = new THREE.OctahedronGeometry(1.0);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
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

function initInterestsAnimation() {
    const interestsAnimationCanvas = document.getElementById('interests-animation-canvas');
    if (!interestsAnimationCanvas) {
        return;
    }

    interestsScene = new THREE.Scene();
    interestsCamera = new THREE.PerspectiveCamera(75, interestsAnimationCanvas.clientWidth / interestsAnimationCanvas.clientHeight, 0.1, 1000);
    interestsRenderer = new THREE.WebGLRenderer({ canvas: interestsAnimationCanvas, alpha: true });
    interestsRenderer.setSize(interestsAnimationCanvas.clientWidth, interestsAnimationCanvas.clientHeight);
    interestsRenderer.setClearColor(0x000000, 0);

    const geometry = new THREE.DodecahedronGeometry(1.0);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
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

let terminalSequenceInitialized = false;

window.onload = () => {

  nameElement = document.getElementById('name');
  terminalOverlay = document.getElementById('terminal-sequence-overlay');
  terminalContent = document.getElementById('terminal-output');
  terminalCursor = document.getElementById('terminal-cursor-line');
  loadingOverlay = document.getElementById('loading-overlay');
  mainContent = document.getElementById('main-content');

  setupMobileMenu();


  if (terminalOverlay && terminalContent) {
    runTerminalSequence();
  } else {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }
    try {
        initThreeJS(); 
    } catch (e) {
        console.error("loading sphere failed", e);
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
        

          startSectionAnimations();
        }
    }, 1500);
  }

};

function setupMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('show');
      }
    });
    
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
        return;
    }

    let originalCards = Array.from(carousel.querySelectorAll('.project-card'));
    if (originalCards.length === 0) {
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
    
    updateCarousel(true);

    window.addEventListener('resize', () => {
        const newSpaceBetweenCards = parseFloat(getComputedStyle(carousel).columnGap) || (8*4);
        const newCardWidthWithMargin = originalCards[0].offsetWidth + newSpaceBetweenCards;

        cardWidthWithMargin = newCardWidthWithMargin;
        spaceBetweenCards = newSpaceBetweenCards;
        updateCarousel(true);
    });

}
//Writes Gabe Shores (Who???)
function typeWriter() {
    if (!nameElement) {
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