
const CONTACT_SUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/rivdowdy@stanford.edu';
const CONTACT_RATE_LIMIT_KEY = 'contactSubmissionTimestamps';
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_SUBMISSIONS = 4;
const CONTACT_MIN_INTERVAL_MS = 90 * 1000;
const CONTACT_MIN_FILL_TIME_MS = 3500;

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM loaded, running startup sequence...");

    try {
        await runStartupSequence();
    } catch (error) {
        console.warn("Startup sequence interrupted:", error);
        const startupScreen = document.getElementById('startup-screen');
        if (startupScreen) {
            startupScreen.classList.add('hidden');
        }
        document.body.classList.remove('startup-active');
    }

    initMainSite();
});

function initMainSite() {
    // Set current date in footer
    const now = new Date();
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = now.toISOString().split('T')[0];
    }

    // Initialize terminal typing effect
    initTerminalEffect();

    // Add random glitch effects
    setInterval(addRandomGlitch, 5000);

    // Add radar coordinate tracking
    initCoordinateTracking();
    
    // Enhance radar visuals with dynamic contacts
    initRadarEffects();

    // Initialize contact form functionality
    initContactForm();

    // Initialize hover effects
    initHoverEffects();

    // Initialize smooth-scrolling navigation
    initNavigation();

    // Initialize command palette
    initCommandPalette();

    // Initialize audio elements
    initAudio();

    // Initialize uptime counter
    initUptimeCounter();

    // Check and initialize Tesseract if THREE.js is available
    if (typeof THREE !== 'undefined') {
        console.log("THREE.js found, initializing tesseract...");
        setTimeout(initTesseract, 100);
    } else {
        console.warn("THREE.js not loaded. Tesseract animation unavailable.");
    }
}

async function runStartupSequence() {
    const startupScreen = document.getElementById('startup-screen');
    const canvas = document.getElementById('startup-oscilloscope');
    const startupLog = document.getElementById('startup-log');
    const startupWelcome = document.getElementById('startup-welcome');
    const greetingAudio = document.getElementById('greeting-audio');

    if (!startupScreen || !canvas || !startupLog || !startupWelcome) {
        document.body.classList.remove('startup-active');
        return;
    }

    document.body.classList.add('startup-active');
    startupLog.innerHTML = '';
    startupWelcome.classList.remove('visible');

    let rafId = null;
    let running = true;
    let skipRequested = false;
    let startupSoundPlayed = false;
    let traceSamples = [];

    const skipHandler = (event) => {
        if (event.key === 'Escape') {
            skipRequested = true;
        }
    };

    document.addEventListener('keydown', skipHandler);

    const ctx = canvas.getContext('2d');
    const configureCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        traceSamples = buildAccessGrantedVectorTrace(canvas.clientWidth, canvas.clientHeight, 2200);
    };

    configureCanvas();
    window.addEventListener('resize', configureCanvas);

    const stageWaveEnd = 4200;
    const stageMorphEnd = 10800;
    const stageHoldEnd = 14300;

    const startTime = performance.now();
    const draw = (timestamp) => {
        if (!running) return;

        const elapsed = timestamp - startTime;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        drawScopeGrid(ctx, width, height);

        let morphProgress = 0;
        if (elapsed >= stageWaveEnd) {
            morphProgress = easeInOutCubic(clamp01((elapsed - stageWaveEnd) / (stageMorphEnd - stageWaveEnd)));
        }

        const revealProgress = clamp01(elapsed / (stageMorphEnd - 450));

        const beamHead = drawMorphingBeam(ctx, traceSamples, width, height, elapsed, revealProgress, morphProgress);

        ctx.beginPath();
        ctx.fillStyle = 'rgba(140, 255, 140, 0.94)';
        ctx.arc(beamHead.x, beamHead.y, 2.9, 0, Math.PI * 2);
        ctx.fill();

        if (revealProgress < 1) {
            const revealX = width * revealProgress;
            ctx.strokeStyle = 'rgba(40, 255, 40, 0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(revealX, 0);
            ctx.lineTo(revealX, height);
            ctx.stroke();
        }

        if (morphProgress > 0.88) {
            startupWelcome.classList.add('visible');
        }

        if (!startupSoundPlayed && morphProgress > 0.985 && greetingAudio) {
            startupSoundPlayed = true;
            greetingAudio.dataset.startupPlayed = '1';
            greetingAudio.currentTime = 0;
            greetingAudio.volume = 0.5;
            const startupPlay = greetingAudio.play();
            if (startupPlay && typeof startupPlay.catch === 'function') {
                startupPlay.catch((error) => {
                    console.log("Startup audio blocked by browser:", error);
                });
            }
        }

        rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const typeLine = async (text) => {
        const line = document.createElement('div');
        line.className = 'startup-log-line';
        startupLog.appendChild(line);

        for (let i = 0; i < text.length; i++) {
            if (skipRequested) {
                line.textContent = text;
                return;
            }
            line.textContent += text.charAt(i);
            await wait(24);
        }
    };

    await wait(950);

    const lines = [
        '[BOOT] calibrating oscilloscope channel...',
        '[NET] initializing secure connection...',
        '[NET] establishing encrypted route...',
        '[AUTH] access granted.'
    ];

    for (const line of lines) {
        if (skipRequested) break;
        await typeLine(line);
        await wait(260);
    }

    startupWelcome.classList.add('visible');
    if (!skipRequested) {
        const remainingTime = stageHoldEnd - (performance.now() - startTime);
        if (remainingTime > 0) {
            await wait(remainingTime);
        }
    }
    await wait(skipRequested ? 240 : 960);

    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', configureCanvas);
    document.removeEventListener('keydown', skipHandler);

    startupScreen.classList.add('hidden');
    document.body.classList.remove('startup-active');
}

function drawScopeGrid(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 80, 0, 0.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawMorphingBeam(ctx, traceSamples, width, height, elapsed, revealProgress, morphProgress) {
    const midline = height / 2;
    const sampleCount = traceSamples.length || 1600;
    const safeMaxIndex = Math.max(1, sampleCount - 1);
    const maxIndex = Math.max(2, Math.floor(safeMaxIndex * clamp01(revealProgress)));
    const waveAmplitudeScale = lerp(1, 0.18, morphProgress);
    const rippleAmplitude = Math.pow(1 - morphProgress, 1.25) * Math.min(height * 0.1, 24);
    let head = { x: 0, y: midline };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= maxIndex; i++) {
        const p = i / safeMaxIndex;
        const wavePoint = getSineSignalPoint(p, elapsed, width, midline, height, waveAmplitudeScale);
        const targetPoint = traceSamples[i] || wavePoint;

        let x = lerp(wavePoint.x, targetPoint.x, morphProgress);
        let y = lerp(wavePoint.y, targetPoint.y, morphProgress);

        const prevTarget = traceSamples[Math.max(0, i - 1)] || targetPoint;
        const nextTarget = traceSamples[Math.min(safeMaxIndex, i + 1)] || targetPoint;
        const tangentX = nextTarget.x - prevTarget.x;
        const tangentY = nextTarget.y - prevTarget.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const targetNormalX = -tangentY / tangentLength;
        const targetNormalY = tangentX / tangentLength;

        let normalX = lerp(0, targetNormalX, morphProgress * 0.92);
        let normalY = lerp(1, targetNormalY, morphProgress * 0.92);
        const normalLength = Math.hypot(normalX, normalY) || 1;
        normalX /= normalLength;
        normalY /= normalLength;

        const phase = (elapsed * 0.016) + (p * 170);
        const ripple = Math.sin(phase) + (Math.sin((phase * 0.43) + (p * 34)) * 0.45);
        const edgeEnvelope = Math.pow(Math.sin(Math.PI * p), 0.45);
        const offset = ripple * rippleAmplitude * edgeEnvelope;

        x += normalX * offset * 0.42;
        y += normalY * offset;

        const shimmer = Math.sin((elapsed * 0.035) + (p * 930)) * Math.pow(1 - morphProgress, 2.2) * 0.75;
        y += shimmer;

        x = Math.min(width - 8, Math.max(8, x));
        y = Math.min(height - 8, Math.max(8, y));

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        head = { x, y };
    }

    ctx.strokeStyle = 'rgba(40, 255, 40, 0.2)';
    ctx.lineWidth = 5.6;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(112, 255, 112, 0.97)';
    ctx.lineWidth = 2.1;
    ctx.shadowColor = 'rgba(50, 255, 50, 0.9)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    return head;
}

function buildAccessGrantedVectorTrace(width, height, sampleCount = 2200) {
    const text = 'ACCESS GRANTED';
    const horizontalMargin = Math.max(26, width * 0.05);
    const verticalMargin = Math.max(18, height * 0.12);
    const edgePad = 12;

    let charHeight = Math.min(height * 0.58, height - (verticalMargin * 2));
    let charWidth = charHeight * 0.56;
    let charSpacing = charWidth * 0.22;
    let wordSpacing = charWidth * 0.92;

    const availableWidth = Math.max(80, width - (horizontalMargin * 2));
    let totalWidth = measureSignalTextWidth(text, charWidth, charSpacing, wordSpacing);
    if (totalWidth > availableWidth) {
        const fitScale = availableWidth / totalWidth;
        charHeight *= fitScale;
        charWidth *= fitScale;
        charSpacing *= fitScale;
        wordSpacing *= fitScale;
        totalWidth = measureSignalTextWidth(text, charWidth, charSpacing, wordSpacing);
    }

    const topY = ((height - charHeight) / 2) + (charHeight * 0.04);
    const baselineY = topY + (charHeight * 0.9);

    let cursorX = (width - totalWidth) / 2;
    const rawPath = [];
    let current = {
        x: Math.max(edgePad, cursorX - (charWidth * 0.28)),
        y: baselineY
    };
    rawPath.push({ x: current.x, y: current.y });

    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        if (char === ' ') {
            const spaceTarget = {
                x: cursorX + (wordSpacing * 0.68),
                y: baselineY
            };
            appendCarrierBridge(rawPath, current, spaceTarget, charHeight * 0.05, 2.4, i * 0.35);
            current = spaceTarget;
            cursorX += wordSpacing;
            continue;
        }

        const glyph = getSignalGlyph(char);
        if (glyph.length > 1) {
            const absoluteGlyph = glyph.map((point) => ({
                x: cursorX + (point.x * charWidth),
                y: topY + (point.y * charHeight)
            }));

            appendCarrierBridge(rawPath, current, absoluteGlyph[0], charHeight * 0.045, 2.2, i * 0.43);
            appendSegmentedPath(rawPath, absoluteGlyph, 1.65);
            current = rawPath[rawPath.length - 1];
        }

        cursorX += charWidth + charSpacing;

        const nextChar = text.charAt(i + 1);
        if (nextChar && nextChar !== ' ') {
            const bridgeTarget = { x: cursorX, y: baselineY };
            appendCarrierBridge(rawPath, current, bridgeTarget, charHeight * 0.04, 2.2, (i + 1) * 0.39);
            current = bridgeTarget;
        }
    }

    const tailTarget = {
        x: Math.min(width - edgePad, current.x + (charWidth * 0.42)),
        y: baselineY
    };
    appendCarrierBridge(rawPath, current, tailTarget, charHeight * 0.025, 2.6, 2.1);

    const smoothedPath = smoothContinuousPath(rawPath, 2);
    const boundedPath = smoothedPath.map((point) => ({
        x: Math.min(width - edgePad, Math.max(edgePad, point.x)),
        y: Math.min(height - edgePad, Math.max(edgePad, point.y))
    }));

    return resampleContinuousPath(boundedPath, sampleCount);
}

function measureSignalTextWidth(text, charWidth, charSpacing, wordSpacing) {
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        if (char === ' ') {
            totalWidth += wordSpacing;
            continue;
        }
        totalWidth += charWidth;
        if (i < text.length - 1 && text.charAt(i + 1) !== ' ') {
            totalWidth += charSpacing;
        }
    }
    return totalWidth;
}

function getSignalGlyph(letter) {
    const glyphs = {
        A: [
            { x: 0.05, y: 0.92 }, { x: 0.34, y: 0.12 }, { x: 0.52, y: 0.12 },
            { x: 0.86, y: 0.92 }, { x: 0.72, y: 0.58 }, { x: 0.30, y: 0.58 },
            { x: 0.66, y: 0.58 }, { x: 0.90, y: 0.92 }
        ],
        C: [
            { x: 0.90, y: 0.26 }, { x: 0.78, y: 0.12 }, { x: 0.30, y: 0.08 },
            { x: 0.12, y: 0.28 }, { x: 0.10, y: 0.50 }, { x: 0.12, y: 0.74 },
            { x: 0.30, y: 0.92 }, { x: 0.78, y: 0.88 }, { x: 0.90, y: 0.74 }
        ],
        E: [
            { x: 0.90, y: 0.12 }, { x: 0.16, y: 0.12 }, { x: 0.16, y: 0.52 },
            { x: 0.72, y: 0.52 }, { x: 0.16, y: 0.52 }, { x: 0.16, y: 0.92 },
            { x: 0.90, y: 0.92 }
        ],
        S: [
            { x: 0.90, y: 0.20 }, { x: 0.72, y: 0.10 }, { x: 0.30, y: 0.10 },
            { x: 0.14, y: 0.26 }, { x: 0.24, y: 0.44 }, { x: 0.74, y: 0.56 },
            { x: 0.88, y: 0.72 }, { x: 0.74, y: 0.90 }, { x: 0.28, y: 0.90 },
            { x: 0.10, y: 0.78 }
        ],
        G: [
            { x: 0.90, y: 0.26 }, { x: 0.78, y: 0.12 }, { x: 0.30, y: 0.08 },
            { x: 0.12, y: 0.28 }, { x: 0.10, y: 0.50 }, { x: 0.12, y: 0.74 },
            { x: 0.30, y: 0.92 }, { x: 0.78, y: 0.88 }, { x: 0.90, y: 0.70 },
            { x: 0.58, y: 0.70 }, { x: 0.88, y: 0.70 }, { x: 0.88, y: 0.88 }
        ],
        R: [
            { x: 0.14, y: 0.92 }, { x: 0.14, y: 0.10 }, { x: 0.56, y: 0.10 },
            { x: 0.82, y: 0.30 }, { x: 0.58, y: 0.52 }, { x: 0.14, y: 0.52 },
            { x: 0.86, y: 0.92 }
        ],
        N: [
            { x: 0.14, y: 0.92 }, { x: 0.14, y: 0.10 }, { x: 0.86, y: 0.92 },
            { x: 0.86, y: 0.10 }
        ],
        T: [
            { x: 0.08, y: 0.10 }, { x: 0.92, y: 0.10 }, { x: 0.50, y: 0.10 },
            { x: 0.50, y: 0.92 }
        ],
        D: [
            { x: 0.14, y: 0.92 }, { x: 0.14, y: 0.10 }, { x: 0.54, y: 0.10 },
            { x: 0.86, y: 0.34 }, { x: 0.86, y: 0.68 }, { x: 0.54, y: 0.92 },
            { x: 0.14, y: 0.92 }
        ]
    };

    return glyphs[letter.toUpperCase()] || [];
}

function appendSegmentedPath(path, points, stepPx) {
    if (!points || points.length < 2) return;

    if (path.length === 0) {
        path.push({ x: points[0].x, y: points[0].y });
    } else {
        const last = path[path.length - 1];
        if (Math.hypot(last.x - points[0].x, last.y - points[0].y) > 0.6) {
            appendLinearSegment(path, last, points[0], Math.max(stepPx, 1.4));
        }
    }

    for (let i = 0; i < points.length - 1; i++) {
        appendLinearSegment(path, points[i], points[i + 1], stepPx);
    }
}

function appendCarrierBridge(path, start, end, amplitudePx = 6.5, stepPx = 2.2, phase = 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return;

    const tangentX = dx / distance;
    const tangentY = dy / distance;
    const normalX = -tangentY;
    const normalY = tangentX;
    const cycles = Math.max(0.75, distance / 52);
    const steps = Math.max(2, Math.ceil(distance / stepPx));

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const travelX = lerp(start.x, end.x, t);
        const travelY = lerp(start.y, end.y, t);
        const envelope = Math.sin(Math.PI * t);
        const wave = Math.sin((t * Math.PI * 2 * cycles) + phase) * amplitudePx * envelope;

        path.push({
            x: travelX + (normalX * wave),
            y: travelY + (normalY * wave)
        });
    }
}

function appendLinearSegment(path, start, end, stepPx) {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / stepPx));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        path.push({
            x: lerp(start.x, end.x, t),
            y: lerp(start.y, end.y, t)
        });
    }
}

function smoothContinuousPath(points, passes = 1) {
    if (!points || points.length < 3 || passes < 1) {
        return points ? points.slice() : [];
    }

    let smoothed = points.slice();
    for (let pass = 0; pass < passes; pass++) {
        if (smoothed.length < 3) break;
        const next = [smoothed[0]];
        for (let i = 0; i < smoothed.length - 1; i++) {
            const curr = smoothed[i];
            const following = smoothed[i + 1];
            next.push({
                x: (curr.x * 0.75) + (following.x * 0.25),
                y: (curr.y * 0.75) + (following.y * 0.25)
            });
            next.push({
                x: (curr.x * 0.25) + (following.x * 0.75),
                y: (curr.y * 0.25) + (following.y * 0.75)
            });
        }
        next.push(smoothed[smoothed.length - 1]);
        smoothed = next;
    }

    return smoothed;
}

function resampleContinuousPath(points, sampleCount) {
    if (!points || points.length < 2) {
        return [];
    }

    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        cumulative.push(cumulative[i - 1] + Math.hypot(curr.x - prev.x, curr.y - prev.y));
    }

    const totalLength = cumulative[cumulative.length - 1];
    if (totalLength === 0) {
        return new Array(sampleCount).fill({ x: points[0].x, y: points[0].y });
    }

    const sampled = [];
    let segIndex = 1;

    for (let i = 0; i < sampleCount; i++) {
        const targetDist = (i / (sampleCount - 1)) * totalLength;
        while (segIndex < cumulative.length - 1 && cumulative[segIndex] < targetDist) {
            segIndex++;
        }

        const prevDist = cumulative[segIndex - 1];
        const nextDist = cumulative[segIndex];
        const segSpan = Math.max(1e-6, nextDist - prevDist);
        const localT = (targetDist - prevDist) / segSpan;
        const prevPoint = points[segIndex - 1];
        const nextPoint = points[segIndex];

        sampled.push({
            x: lerp(prevPoint.x, nextPoint.x, localT),
            y: lerp(prevPoint.y, nextPoint.y, localT)
        });
    }

    return sampled;
}

function getSineSignalPoint(progress, elapsed, width, midline, height, amplitudeScale = 1) {
    const x = progress * width;
    const carrier = Math.sin((progress * 13.8 * Math.PI) + (elapsed * 0.0072));
    const harmonic = Math.sin((progress * 35 * Math.PI) - (elapsed * 0.0104)) * 0.18;
    const modulation = Math.sin((progress * 3.1 * Math.PI) + (elapsed * 0.0015));
    const envelope = 0.7 + (modulation * 0.3);
    const amplitude = height * 0.19 * envelope * amplitudeScale;

    return {
        x,
        y: midline + ((carrier * 0.86 + harmonic) * amplitude)
    };
}

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function lerp(start, end, amount) {
    return start + ((end - start) * amount);
}

function easeInOutCubic(value) {
    const t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - (Math.pow(-2 * t + 2, 3) / 2);
}

// Initialize uptime counter
function initUptimeCounter() {
    const uptimeEl = document.getElementById('uptime-counter');
    if (!uptimeEl) return;
    
    const startTime = Date.now();
    
    setInterval(() => {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(uptime % 60).toString().padStart(2, '0');
        
        uptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

// Initialize audio functionality
function initAudio() {
    const greetingAudio = document.getElementById('greeting-audio');
    const clickSound = document.getElementById('click-sound');
    
    // Auto-play greeting on page load
    if (greetingAudio) {
        const playedDuringStartup = greetingAudio.dataset.startupPlayed === '1';
        if (!playedDuringStartup) {
            greetingAudio.volume = 0.5;
            
            // Try to play audio - browsers may block autoplay
            const playPromise = greetingAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented by browser: ", error);
                });
            }
        }
    }
    
    // Add click sounds to buttons and links
    const buttons = document.querySelectorAll('button, .project-link, .nav-link');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (clickSound) {
                clickSound.currentTime = 0;
                clickSound.volume = 0.3;
                clickSound.play().catch(() => {
                    // Ignore playback failures caused by browser policies or missing media.
                });
            }
        });
    });
    
}

// Initialize hover effects and fix navigation
function initHoverEffects() {
    // Project items hover
    const projectItems = document.querySelectorAll('.grid-item');
    projectItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = '0 0 15px var(--glow-color)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
        
        // Make grid items clickable to match what's shown in the images
        item.addEventListener('click', function() {
            // You could add a link to project details here if needed
            console.log('Project clicked');
        });
        
        // Make sure inner links don't trigger parent click
        const innerLinks = item.querySelectorAll('.project-link');
        innerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                if (link.getAttribute('href') === '#') {
                    e.preventDefault();
                }
            });
        });
    });
    
    // Contact methods hover
    const contactMethods = document.querySelectorAll('.contact-method');
    contactMethods.forEach(method => {
        method.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = '0 0 10px var(--glow-color)';
        });
        
        method.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}

// Initialize nav links with smooth scrolling (CSP-safe, no inline handlers)
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const target = link.getAttribute('href');
            if (!target || target.length < 2) return;
            scrollToSection(target.substring(1), event);
        });
    });
}

function initRadarEffects() {
    const radarContainers = document.querySelectorAll('.radar-container');
    radarContainers.forEach((radar, index) => {
        let contactsLayer = radar.querySelector('.radar-contacts');
        if (!contactsLayer) {
            contactsLayer = document.createElement('div');
            contactsLayer.className = 'radar-contacts';
            radar.appendChild(contactsLayer);
        }

        const anchorBlip = radar.querySelector('.radar-blip');
        if (anchorBlip) {
            const moveAnchorBlip = () => {
                const radius = 18 + (Math.random() * 26);
                const angle = Math.random() * Math.PI * 2;
                const x = 50 + (Math.cos(angle) * radius);
                const y = 50 + (Math.sin(angle) * radius);
                anchorBlip.style.left = `${x}%`;
                anchorBlip.style.top = `${y}%`;
            };
            moveAnchorBlip();
            setInterval(moveAnchorBlip, 2200 + (Math.random() * 1200));
        }

        const spawnContact = () => {
            const contact = document.createElement('span');
            contact.className = 'radar-contact';

            const radius = 12 + (Math.random() * 36);
            const angle = Math.random() * Math.PI * 2;
            const x = 50 + (Math.cos(angle) * radius);
            const y = 50 + (Math.sin(angle) * radius);

            contact.style.left = `${x}%`;
            contact.style.top = `${y}%`;
            contact.style.setProperty('--contact-size', `${2.8 + (Math.random() * 3.4)}px`);
            contact.style.animationDuration = `${1.6 + (Math.random() * 1.8)}s`;
            contact.style.animationDelay = `${Math.random() * 0.3}s`;
            contactsLayer.appendChild(contact);

            while (contactsLayer.children.length > 14) {
                contactsLayer.firstElementChild.remove();
            }

            setTimeout(() => {
                contact.remove();
            }, 3400);
        };

        spawnContact();
        setInterval(() => {
            if (Math.random() > 0.18) {
                spawnContact();
            }
        }, 1100 + (Math.random() * 600) + (index * 140));
    });
}

function initCommandPalette() {
    const palette = document.getElementById('command-palette');
    const trigger = document.getElementById('command-palette-trigger');
    const input = document.getElementById('command-input');
    const resultsEl = document.getElementById('command-results');

    if (!palette || !trigger || !input || !resultsEl) return;

    const commands = buildCommandPaletteCommands();
    let visibleCommands = [...commands];
    let activeIndex = 0;

    const renderResults = () => {
        resultsEl.innerHTML = '';

        if (visibleCommands.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'command-result';
            emptyState.innerHTML = '<div class="command-result-title">No command match</div><div class="command-result-meta">Try: projects, contact, github, diagnostics</div>';
            resultsEl.appendChild(emptyState);
            return;
        }

        visibleCommands.forEach((cmd, index) => {
            const item = document.createElement('li');
            item.className = `command-result${index === activeIndex ? ' active' : ''}`;
            item.innerHTML = `<div class="command-result-title">${cmd.title}</div><div class="command-result-meta">${cmd.meta}</div>`;

            item.addEventListener('mouseenter', () => {
                activeIndex = index;
                renderResults();
            });

            item.addEventListener('click', () => {
                executeCommand(cmd);
            });

            resultsEl.appendChild(item);
        });
    };

    const filterCommands = (query) => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) {
            visibleCommands = [...commands];
            activeIndex = 0;
            renderResults();
            return;
        }

        visibleCommands = commands
            .map((cmd) => ({
                cmd,
                score: getCommandScore(cmd, trimmed)
            }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.cmd);

        activeIndex = 0;
        renderResults();
    };

    const openPalette = () => {
        palette.hidden = false;
        document.body.classList.add('command-palette-open');
        input.value = '';
        visibleCommands = [...commands];
        activeIndex = 0;
        renderResults();
        setTimeout(() => input.focus(), 20);
    };

    const closePalette = () => {
        palette.hidden = true;
        document.body.classList.remove('command-palette-open');
    };

    const executeCommand = (command) => {
        closePalette();
        command.action();
    };

    trigger.addEventListener('click', openPalette);
    palette.querySelector('[data-close-command-palette]').addEventListener('click', closePalette);

    input.addEventListener('input', () => filterCommands(input.value));

    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!visibleCommands.length) return;
            activeIndex = (activeIndex + 1) % visibleCommands.length;
            renderResults();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!visibleCommands.length) return;
            activeIndex = (activeIndex - 1 + visibleCommands.length) % visibleCommands.length;
            renderResults();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (!visibleCommands.length) return;
            executeCommand(visibleCommands[activeIndex]);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closePalette();
        }
    });

    document.addEventListener('keydown', (event) => {
        const isCmdK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
        if (isCmdK) {
            event.preventDefault();
            if (palette.hidden) {
                openPalette();
            } else {
                closePalette();
            }
            return;
        }

        if (event.key === 'Escape' && !palette.hidden) {
            closePalette();
        }
    });
}

function buildCommandPaletteCommands() {
    const openUrl = (url) => window.open(url, '_blank', 'noopener,noreferrer');
    const jumpTo = (sectionId) => scrollToSection(sectionId);
    const pushMessage = (type, text) => {
        if (typeof window.showSystemMessage === 'function') {
            window.showSystemMessage(type, text);
        }
    };

    return [
        {
            title: 'Go: Mission Brief',
            meta: 'Jump to About section',
            keywords: ['about', 'mission', 'intro', 'bio'],
            action: () => jumpTo('about')
        },
        {
            title: 'Go: Training & Education',
            meta: 'Jump to Education section',
            keywords: ['education', 'training', 'stanford'],
            action: () => jumpTo('education')
        },
        {
            title: 'Go: Classified Projects',
            meta: 'Jump to Projects section',
            keywords: ['projects', 'portfolio', 'builds', 'work'],
            action: () => jumpTo('projects')
        },
        {
            title: 'Go: Technical Capabilities',
            meta: 'Jump to Skills section',
            keywords: ['skills', 'capabilities', 'stack', 'tools'],
            action: () => jumpTo('skills')
        },
        {
            title: 'Go: Establish Communication',
            meta: 'Jump to Contact section',
            keywords: ['contact', 'email', 'connect', 'message'],
            action: () => jumpTo('contact')
        },
        {
            title: 'Open: GitHub',
            meta: 'github.com/rivercraft911',
            keywords: ['github', 'repos', 'code'],
            action: () => openUrl('https://github.com/rivercraft911')
        },
        {
            title: 'Open: LinkedIn',
            meta: 'linkedin.com/in/river-dowdy-5b597124a',
            keywords: ['linkedin', 'network', 'professional'],
            action: () => openUrl('https://linkedin.com/in/river-dowdy-5b597124a')
        },
        {
            title: 'Compose: Stanford Email',
            meta: 'rivdowdy@stanford.edu',
            keywords: ['email', 'stanford', 'message'],
            action: () => { window.location.href = 'mailto:rivdowdy@stanford.edu'; }
        },
        {
            title: 'Open: Magtorque Optimization',
            meta: 'Project repository',
            keywords: ['magtorque', 'pcb', 'optimization'],
            action: () => openUrl('https://github.com/Rivercraft911/magtorque-optimization')
        },
        {
            title: 'Open: Project Theia',
            meta: 'TreeHacks project repository',
            keywords: ['theia', 'rf', 'pose', 'mimo'],
            action: () => openUrl('https://github.com/Timothy2105/theia')
        },
        {
            title: 'Open: InfiniteRecon',
            meta: 'Audio surveillance project repository',
            keywords: ['infinite', 'recon', 'audio', 'esp32'],
            action: () => openUrl('https://github.com/Rivercraft911/InfiniteRecon')
        },
        {
            title: 'Run: Diagnostics Pulse',
            meta: 'Show live system status check',
            keywords: ['diagnostics', 'status', 'health', 'test'],
            action: () => {
                pushMessage('info', 'RUNNING SYSTEM DIAGNOSTICS');
                setTimeout(() => pushMessage('success', 'ALL CHANNELS OPERATIONAL'), 500);
            }
        }
    ];
}

function getCommandScore(command, query) {
    const haystack = `${command.title} ${command.meta} ${command.keywords.join(' ')}`.toLowerCase();
    if (!haystack.includes(query)) return 0;
    if (command.title.toLowerCase().includes(query)) return 10;
    if (command.keywords.some((keyword) => keyword.includes(query))) return 8;
    return 4;
}

// Function to scroll to section (fixing navigation)
function scrollToSection(sectionId, event) {
    if (event) event.preventDefault(); // Prevent default anchor behavior
    const section = document.getElementById(sectionId);
    if (section) {
        console.log("Scrolling to section:", sectionId);
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize enhanced contact form with validation
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    const formSuccess = document.querySelector('.form-success');
    const formStatus = document.getElementById('form-status');
    const submitBtn = contactForm ? contactForm.querySelector('.submit-btn') : null;
    
    if (!contactForm) return;
    
    // Input validation messages
    const nameValidation = document.getElementById('name-validation');
    const emailValidation = document.getElementById('email-validation');
    const subjectValidation = document.getElementById('subject-validation');
    const messageValidation = document.getElementById('message-validation');
    
    const honeypot = document.getElementById('contact-honey');
    const formStartedAt = document.getElementById('form-started-at');
    if (formStartedAt) {
        formStartedAt.value = String(Date.now());
    }

    const setValidationState = (input, validationNode, isValid, message) => {
        if (!input || !validationNode) return isValid;
        validationNode.textContent = isValid ? '' : message;
        input.style.borderColor = isValid ? 'var(--terminal-green-dark)' : 'var(--error-red)';
        return isValid;
    };

    const validateName = () => {
        const valid = nameInput.value.trim().length >= 2;
        return setValidationState(nameInput, nameValidation, valid, 'Name must be at least 2 characters long');
    };

    const validateEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const valid = emailRegex.test(emailInput.value.trim());
        return setValidationState(emailInput, emailValidation, valid, 'Please enter a valid email address');
    };

    const validateSubject = () => {
        const valid = subjectInput.value.trim().length >= 3;
        return setValidationState(subjectInput, subjectValidation, valid, 'Subject must be at least 3 characters long');
    };

    const validateMessage = () => {
        const valid = messageInput.value.trim().length >= 10;
        return setValidationState(messageInput, messageValidation, valid, 'Message must be at least 10 characters long');
    };

    const setFormStatus = (type, message) => {
        if (!formStatus) return;
        formStatus.className = `form-status ${type}`;
        formStatus.textContent = message;
    };

    const getSubmissionHistory = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(CONTACT_RATE_LIMIT_KEY) || '[]');
            if (!Array.isArray(parsed)) return [];
            const cutoff = Date.now() - CONTACT_RATE_LIMIT_WINDOW_MS;
            return parsed.filter((timestamp) => Number.isFinite(timestamp) && timestamp >= cutoff);
        } catch {
            return [];
        }
    };

    const saveSubmissionHistory = (history) => {
        try {
            localStorage.setItem(CONTACT_RATE_LIMIT_KEY, JSON.stringify(history));
        } catch {
            // Ignore storage failures; submission still works.
        }
    };

    const checkRateLimit = () => {
        const now = Date.now();
        const history = getSubmissionHistory();

        if (history.length >= CONTACT_RATE_LIMIT_MAX_SUBMISSIONS) {
            return 'Rate limit reached. Please wait before sending another transmission.';
        }

        if (history.length > 0) {
            const newest = history[history.length - 1];
            if (now - newest < CONTACT_MIN_INTERVAL_MS) {
                const waitSeconds = Math.ceil((CONTACT_MIN_INTERVAL_MS - (now - newest)) / 1000);
                return `Please wait ${waitSeconds}s before sending another transmission.`;
            }
        }

        return null;
    };

    const registerSubmission = () => {
        const history = getSubmissionHistory();
        history.push(Date.now());
        saveSubmissionHistory(history);
    };

    // Add validation on input
    const nameInput = document.getElementById('name');
    if (nameInput && nameValidation) {
        nameInput.addEventListener('input', validateName);
    }
    
    // Validate email format
    const emailInput = document.getElementById('email');
    if (emailInput && emailValidation) {
        emailInput.addEventListener('input', validateEmail);
    }
    
    // Subject validation
    const subjectInput = document.getElementById('subject');
    if (subjectInput && subjectValidation) {
        subjectInput.addEventListener('input', validateSubject);
    }
    
    // Message validation
    const messageInput = document.getElementById('message');
    if (messageInput && messageValidation) {
        messageInput.addEventListener('input', validateMessage);
    }
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (honeypot && honeypot.value.trim() !== '') {
            return;
        }

        if (formStartedAt) {
            const startedAt = Number(formStartedAt.value);
            if (Number.isFinite(startedAt) && Date.now() - startedAt < CONTACT_MIN_FILL_TIME_MS) {
                setFormStatus('error', 'Transmission blocked. Please complete the form normally and try again.');
                return;
            }
        }

        const rateLimitMessage = checkRateLimit();
        if (rateLimitMessage) {
            setFormStatus('error', rateLimitMessage);
            return;
        }

        const isValid = [
            validateName(),
            validateEmail(),
            validateSubject(),
            validateMessage()
        ].every(Boolean);

        if (!isValid) {
            setFormStatus('error', 'Please resolve validation errors before transmitting.');
            return;
        }

        const payload = new FormData(contactForm);
        payload.append('_replyto', emailInput.value.trim());
        payload.append('source_page', window.location.href);
        payload.append('submitted_at', new Date().toISOString());

        if (submitBtn) submitBtn.disabled = true;
        setFormStatus('info', 'Encrypting and transmitting...');

        try {
            const response = await fetch(CONTACT_SUBMIT_ENDPOINT, {
                method: 'POST',
                body: payload,
                headers: {
                    'Accept': 'application/json'
                }
            });

            let responseData = null;
            try {
                responseData = await response.json();
            } catch {
                responseData = null;
            }

            const serverRejected = responseData && String(responseData.success).toLowerCase() === 'false';
            if (!response.ok || serverRejected) {
                const message = responseData && responseData.message ? responseData.message : 'Transmission failed. Please retry in a moment.';
                throw new Error(message);
            }

            registerSubmission();

            contactForm.style.display = 'none';
            if (formSuccess) {
                formSuccess.style.display = 'block';
            }
            setFormStatus('success', 'Transmission accepted.');

            const successSound = document.getElementById('success-sound');
            if (successSound) {
                successSound.play().catch(() => {
                    // Ignore playback failures caused by browser policies or missing media.
                });
            }

            if (typeof window.showSystemMessage === 'function') {
                window.showSystemMessage('success', 'INBOUND MESSAGE RELAYED TO STANFORD CHANNEL');
            }
        } catch (error) {
            console.error("Contact submission failed:", error);
            setFormStatus('error', error.message || 'Transmission failed. Please use direct email channel.');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// Terminal typing effect
function initTerminalEffect() {
    console.log("Initializing terminal effect");
    
    // Console lines in header
    const consoleLines = document.querySelectorAll('.terminal-line');
    let delay = 0;
    
    consoleLines.forEach(line => {
        const text = line.textContent;
        line.textContent = '';
        line.style.display = 'block';
        
        setTimeout(() => {
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < text.length) {
                    line.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 20);
        }, delay);
        
        delay += 800;
    });
}

// Random glitch effect for UI elements
function addRandomGlitch() {
    const elements = document.querySelectorAll('h1, h2, h3, h4, .classification, .project-badge, .coordinates');
    if (elements.length === 0) return;
    
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    
    randomElement.classList.add('glitch');
    
    // Add random text distortion for terminal-like effect
    const originalText = randomElement.textContent;
    if (Math.random() > 0.7) { // 30% chance of text glitch
        const glitchText = originalText.split('')
            .map(char => {
                // 20% chance to replace character with random character
                if (Math.random() < 0.2) {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/\\';
                    return chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return char;
            })
            .join('');
        
        randomElement.textContent = glitchText;
        
        // Restore original text after short delay
        setTimeout(() => {
            randomElement.textContent = originalText;
        }, 300);
    }
    
    setTimeout(() => {
        randomElement.classList.remove('glitch');
    }, 500);
}

// Coordinate tracking for radar display
function initCoordinateTracking() {
    const coords = document.querySelector('.coordinates');
    const footerCoords = document.getElementById('footer-coordinates');
    
    if (!coords && !footerCoords) return;
    
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Convert pixel coordinates to fake lat/long for effect
        const fakeLat = (37.4275 + (y / windowHeight * 0.01)).toFixed(4);
        const fakeLong = (122.1697 + (x / windowWidth * 0.01)).toFixed(4);
        
        if (coords) {
            coords.textContent = `LAT: ${fakeLat}° N • LONG: ${fakeLong}° W`;
        }
        
        if (footerCoords) {
            footerCoords.textContent = `${fakeLat}° N, ${fakeLong}° W`;
        }
    });
}
