// Referències a les figuretes i elements del carrusel
const figs = [...document.querySelectorAll('.fig')];
const infos = [...document.querySelectorAll('.info')];
const track = document.getElementById('track');
const stage = document.getElementById('stage');
const header = document.getElementById('hd');
const navLinks = [...header.querySelectorAll('nav a')];
const dotBox = document.getElementById('dots');
const blob = document.getElementById('blob');
const collection = document.getElementById('colleccions');
const contact = document.getElementById('contacte');
const figureCount = figs.length;

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const smoothStep = (value) =>
  value * value * value * (value * (value * 6 - 15) + 10);
const scaleStops = [0.5, 0.34, 0.23, 0.12];
const turntableFrameCount = 72;
const turntableFrames = Array.from({ length: turntableFrameCount }, (_, index) => {
  const image = new Image();
  image.decoding = 'async';
  return image;
});
let turntableFramesReady = false;

function showTurntableFrame(image, frameNumber) {
  const frame = clamp(frameNumber, 1, turntableFrameCount);
  if (!turntableFramesReady || image.dataset.turntableFrame === String(frame)) return;

  image.dataset.turntableFrame = frame;
  image.src = turntableFrames[frame - 1].src;
}

const baseScale = (distance) => {
  if (distance >= 3) return 0;

  const index = Math.floor(distance);
  return scaleStops[index]
    + (scaleStops[index + 1] - scaleStops[index]) * (distance - index);
};

const dots = figs.map((figure, index) => {
  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Figurine ' + (index + 1));
  button.onclick = () => goToFigure(index);
  dotBox.appendChild(button);
  return button;
});

function getScrollStops() {
  const documentTop = (element) => element.getBoundingClientRect().top + scrollY;
  const trackTop = documentTop(track);
  const collectionTop = documentTop(collection);
  const contactTop = documentTop(contact);
  const trackRange = Math.max(0, track.offsetHeight - innerHeight);
  const stops = [
    0,
    ...figs.map((_, index) =>
      trackTop + trackRange * index / (figureCount - 1)
    )
  ];
  const collectionEnd = Math.max(
    collectionTop,
    collectionTop + collection.offsetHeight - innerHeight
  );
  if (collection.offsetHeight <= innerHeight || innerWidth > 1000) {
    stops.push(collectionTop - (innerHeight - collection.offsetHeight) / 2);
  } else {
    stops.push(collectionTop);

    const cards = [...grid.querySelectorAll('.cd:not([hidden])')];
    const rows = [];
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const top = rect.top + scrollY;
      let row = rows.find((candidate) => Math.abs(candidate.top - top) < 2);
      if (!row) {
        row = { top, bottom: top + rect.height };
        rows.push(row);
      } else {
        row.bottom = Math.max(row.bottom, top + rect.height);
      }
    });

    rows.forEach((row) => {
      const rowHeight = row.bottom - row.top;
      stops.push(clamp(
        row.top - (innerHeight - rowHeight) / 2,
        collectionTop,
        collectionEnd
      ));
    });
  }

  stops.push(contactTop);
  return [...new Set(stops)].sort((a, b) => a - b);
}

let movingToStop = false;
let pendingDirection = 0;
let scrollAnimationFrame = 0;
let previousScrollBehavior = '';
let restoreScrollBehavior = false;
let settleTimer = 0;
let fallbackTimer = 0;

function finishStop() {
  if (!movingToStop) return;

  movingToStop = false;
  clearTimeout(settleTimer);
  clearTimeout(fallbackTimer);
  if (restoreScrollBehavior) {
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    previousScrollBehavior = '';
    restoreScrollBehavior = false;
  }
  if (pendingDirection) {
    const direction = pendingDirection;
    pendingDirection = 0;
    moveToStop(nearestStopIndex(scrollY) + direction);
  }
}

function moveToStop(index) {
  const stops = getScrollStops();
  const target = stops[clamp(index, 0, stops.length - 1)];
  if (Math.abs(target - scrollY) < 1) return;

  movingToStop = true;
  cancelAnimationFrame(scrollAnimationFrame);
  clearTimeout(settleTimer);
  clearTimeout(fallbackTimer);
  const start = scrollY;
  const distance = target - start;
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1250;

  if (!duration) {
    scrollTo({ top: target, behavior: 'instant' });
    finishStop();
    return;
  }

  previousScrollBehavior = document.documentElement.style.scrollBehavior;
  restoreScrollBehavior = true;
  document.documentElement.style.scrollBehavior = 'auto';
  const startedAt = performance.now();
  const animateScroll = (now) => {
    const progress = clamp((now - startedAt) / duration);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    scrollTo(0, start + distance * eased);

    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(animateScroll);
    } else {
      scrollAnimationFrame = 0;
      finishStop();
    }
  };

  scrollAnimationFrame = requestAnimationFrame(animateScroll);
}

function nearestStopIndex(position, stops = getScrollStops()) {
  return stops.reduce((nearest, stop, index) =>
    Math.abs(stop - position) < Math.abs(stops[nearest] - position) ? index : nearest,
    0
  );
}

function advanceStop(direction) {
  if (movingToStop) {
    pendingDirection = direction;
    return;
  }

  const stops = getScrollStops();
  const current = nearestStopIndex(scrollY, stops);
  moveToStop(current + direction);
}

// Desplaça el carrusel fins a la figureta triada
function goToFigure(index) {
  moveToStop(index + 1);
}

figs.forEach((figure, index) => {
  figure.onclick = () => goToFigure(index);
});

const palette = [
  [169, 209, 221],
  [184, 213, 146],
  [204, 177, 210],
  [222, 170, 152],
  [231, 207, 146],
];

// Estat de l'animació del carrusel
let currentProgress = null;
let targetProgress = 0;
let animationFrame = 0;
let lastFigureHeight = 0;
let lastFrameTime = 0;
let heroFigures = [];

// Calcula la posició, la mida i l'aspecte de les figuretes segons el scroll
function updateScrollAnimation(now) {
  animationFrame = 0;
  now = now || performance.now();

  const delta = lastFrameTime
    ? Math.min(now - lastFrameTime, 64)
    : 16.67;
  lastFrameTime = now;

  const width = innerWidth;
  const height = innerHeight;
  const isSmallScreen = width < 700;
  const figureHeight = Math.min(height * 0.62, width * 1.5);

  if (figureHeight !== lastFigureHeight) {
    lastFigureHeight = figureHeight;
    figs.forEach((figure) => {
      const image = figure.firstElementChild;
      image.style.height = figureHeight * (+image.dataset.r || 1) + 'px';
      image.style.width = image.dataset.fit === 'square'
        ? image.style.height
        : 'auto';
    });
  }

  const trackRect = track.getBoundingClientRect();
  targetProgress = clamp(-trackRect.top / (trackRect.height - height));

  if (currentProgress === null) currentProgress = targetProgress;
  currentProgress += (targetProgress - currentProgress)
    * (1 - Math.exp(-delta / 360));
  if (Math.abs(targetProgress - currentProgress) < 2e-4) {
    currentProgress = targetProgress;
  }

  const progress = currentProgress;
  const center = progress * (figureCount - 1);
  const focusStrength = 1
    - smoothStep(clamp(Math.abs(center - Math.round(center)) / 0.5));
  const blobStrength = center < 0
    ? smoothStep(clamp(center + 1))
    : focusStrength;

  figs.forEach((figure, index) => {
    const distanceFromCenter = index - center;
    const absoluteDistance = Math.abs(distanceFromCenter);
    const scale = absoluteDistance < 1
      ? 1 - (1 - scaleStops[1]) * smoothStep(absoluteDistance)
      : baseScale(absoluteDistance);
    const horizontalOffset = distanceFromCenter * width
      * (isSmallScreen ? 0.27 : 0.24);
    const opacity = clamp(1 - (absoluteDistance - 2) / 0.8);
    const image = figure.firstElementChild;
    if (image.dataset.turntable === 'pluja') {
      const frameNumber = turntableFrameCount - Math.round(
        smoothStep(clamp(absoluteDistance)) * (turntableFrameCount - 1)
      );
      showTurntableFrame(image, frameNumber);
    }

    figure.style.transform =
      `translateX(-50%) translateX(${horizontalOffset}px) ` +
      `scale(${scale})`;
    figure.style.opacity = opacity;
    figure.style.zIndex = Math.round(
      20 - absoluteDistance * 4
      + focusStrength * clamp(1 - absoluteDistance) * 10
    );
    figure.style.visibility = opacity > 0 ? 'visible' : 'hidden';
  });

  const activeInfo = Math.round(center);
  infos.forEach((info, index) => {
    const visibility = index === activeInfo ? focusStrength : 0;
    info.style.opacity = visibility;
    info.style.transform = `translateY(${(1 - visibility) * 16}px)`;
  });

  const activeDot = clamp(Math.round(center), 0, figureCount - 1);
  dots.forEach((dot, index) => {
    dot.classList.toggle('on', index === activeDot);
  });

  header.classList.toggle('on', scrollY > innerHeight * 0.7);
  const viewportCenter = scrollY + height / 2;
  const sectionTops = [
    track.getBoundingClientRect().top + scrollY,
    collection.getBoundingClientRect().top + scrollY,
    contact.getBoundingClientRect().top + scrollY
  ];
  const activeSection = viewportCenter >= sectionTops[2]
    ? '#contacte'
    : viewportCenter >= sectionTops[1]
      ? '#colleccions'
      : viewportCenter >= sectionTops[0]
        ? '#track'
        : '';
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === activeSection;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });

  heroFigures.forEach((figure) => {
    const image = figure.firstElementChild;
    if (image.dataset.turntable === 'pluja') {
      const turntableProgress = smoothStep(clamp(scrollY / height));
      const frameNumber = 1 + Math.round(
        turntableProgress * (turntableFrameCount - 1)
      );
      showTurntableFrame(image, frameNumber);
      figure.style.transform = '';
      return;
    }

    figure.style.transform = '';
  });

  const colorIndex = clamp(Math.floor(center), 0, figureCount - 1);
  const colorProgress = smoothStep(clamp(center - colorIndex));
  const startColor = palette[colorIndex];
  const endColor = palette[Math.min(figureCount - 1, colorIndex + 1)];
  const stageTextureOpacity = smoothStep(clamp(center / 0.65))
    * (1 - smoothStep(clamp((center - (figureCount - 1.8)) / 0.8)));
  stage.style.setProperty(
    '--stage-texture-opacity',
    String(stageTextureOpacity)
  );
  stage.style.backgroundColor = 'rgb('
    + startColor.map((value, index) =>
      Math.round(value + (endColor[index] - value) * colorProgress)
    ).join(',')
    + ')';

  const blobFadeOut = 1 - smoothStep(
    clamp((center - (figureCount - 1.8)) / 0.8)
  );
  blob.style.opacity = (0.35 + 0.4 * blobStrength) * blobFadeOut;
  blob.style.transform =
    `translateX(-50%) rotate(${progress * 200}deg) ` +
    `scale(${0.45 + blobStrength * 0.6})`;

  if (currentProgress !== targetProgress) {
    animationFrame = requestAnimationFrame(updateScrollAnimation);
  }
}

const requestScrollAnimation = () => {
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(updateScrollAnimation);
  }
};

function isEditableTarget(target) {
  return target instanceof Element
    && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

let wheelGestureActive = false;
let wheelEndTimer = 0;

addEventListener('wheel', (event) => {
  if (isEditableTarget(event.target) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

  event.preventDefault();
  if (!wheelGestureActive) {
    wheelGestureActive = true;
    advanceStop(Math.sign(event.deltaY));
  }

  clearTimeout(wheelEndTimer);
  wheelEndTimer = setTimeout(() => {
    wheelGestureActive = false;
  }, 260);
}, { passive: false });

let touchStartY = 0;
let touchStartStop = 0;
let trackingTouch = false;

addEventListener('touchstart', (event) => {
  if (event.touches.length !== 1 || isEditableTarget(event.target)) {
    trackingTouch = false;
    return;
  }

  trackingTouch = true;
  touchStartY = event.touches[0].clientY;
  touchStartStop = nearestStopIndex(scrollY);
}, { passive: true });

addEventListener('touchmove', (event) => {
  if (!trackingTouch) return;
  if (event.touches.length === 1) event.preventDefault();
  else trackingTouch = false;
}, { passive: false });

addEventListener('touchend', (event) => {
  if (!trackingTouch) return;

  const touch = event.changedTouches[0];
  const delta = touchStartY - touch.clientY;
  trackingTouch = false;
  if (Math.abs(delta) > 32 && !movingToStop) {
    moveToStop(touchStartStop + Math.sign(delta));
  }
}, { passive: true });

addEventListener('touchcancel', () => {
  trackingTouch = false;
}, { passive: true });

addEventListener('keydown', (event) => {
  if (isEditableTarget(event.target)) return;

  const directions = {
    ArrowDown: 1,
    PageDown: 1,
    ' ': 1,
    ArrowUp: -1,
    PageUp: -1
  };
  if (Object.hasOwn(directions, event.key)) {
    event.preventDefault();
    advanceStop(directions[event.key]);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    moveToStop(event.key === 'Home' ? 0 : getScrollStops().length - 1);
  }
});

// Precarrega els fotogrames perquè el scroll els pugui recórrer sense pauses
Promise.all(turntableFrames.map((image, index) => new Promise((resolve, reject) => {
  const source = `assets/pluja-scroll/${String(index + 1).padStart(4, '0')}.png`;
  image.addEventListener('load', () => resolve(image), { once: true });
  image.addEventListener('error', () => {
    reject(new Error('Could not load frame ' + (index + 1) + '.'));
  }, { once: true });
  image.src = source;

  if (image.complete) {
    if (image.naturalWidth > 0) resolve(image);
    else reject(new Error('Could not load frame ' + (index + 1) + '.'));
  }
})))
  .then(() => {
    turntableFramesReady = true;
    requestScrollAnimation();
  })
  .catch((error) => {
    console.error('Could not load the Rain figurine frames.', error);
  });

// Actualitza el carrusel quan es mou o es redimensiona la finestra
addEventListener('scroll', () => {
  requestScrollAnimation();
  revealVisibleElements();
  if (movingToStop) {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(finishStop, 120);
  }
}, { passive: true });
addEventListener('resize', requestScrollAnimation);
updateScrollAnimation();

// Mostra els elements quan entren a la pantalla
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.rv').forEach((element) => {
  revealObserver.observe(element);
});

function revealVisibleElements() {
  document.querySelectorAll('.rv:not(.in)').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      element.classList.add('in');
      revealObserver.unobserve(element);
    }
  });
}

revealVisibleElements();

// Duplica les figuretes a la portada i connecta el logo
const heroRow = document.getElementById('row');
figs.forEach((figure, index) => {
  const image = figure.firstElementChild.cloneNode();
  const isTurntable = image.dataset.turntable === 'pluja';
  if (isTurntable) image.src = turntableFrames[0].src;
  else if (image.dataset.poster) image.src = image.dataset.poster;
  if (!isTurntable) image.removeAttribute('data-turntable');
  image.removeAttribute('data-turntable-frame');
  image.removeAttribute('data-poster');
  image.removeAttribute('data-fit');
  image.removeAttribute('draggable');
  image.alt = '';
  image.onclick = () => goToFigure(index);

  const wrapper = document.createElement('div');
  wrapper.className = 'hf';
  wrapper.appendChild(image);
  heroRow.appendChild(wrapper);
});
heroFigures = [...heroRow.children];

const headerLogo = document.getElementById('hl');
headerLogo.src = header.firstElementChild.src;

const hero = document.getElementById('top');
hero.addEventListener('pointermove', (event) => {
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', event.clientX / rect.width - 0.5);
  hero.style.setProperty('--my', (event.clientY - rect.top) / rect.height - 0.5);
});

// Ajusta la mida de les imatges a la finestra
function sizeStaticImages() {
  const height = innerHeight;
  const rowHeight = Math.min(Math.max(100, height * 0.32), 280, innerWidth * 0.3);

  document.querySelectorAll('#row img').forEach((image) => {
    const imageHeight = rowHeight * (+image.dataset.r || 1);
    image.style.height = imageHeight + 'px';
    image.style.width = image.dataset.fit === 'square'
      ? imageHeight + 'px'
      : 'auto';
  });

  document.querySelectorAll('.cd .fg').forEach((image) => {
    image.style.height = 240 * (+image.dataset.r || 1) + 'px';
    image.style.width = '100%';
  });
}

// Dades de les cinc figuretes de la col·lecció
const figuresInfo = [
  {
    id: 'rain',
    n: 'The Rain',
    w: 'Water',
    e: 'Edition No. 03 of 100',
    t: 'The two frogs at the base are inseparable.',
    image: 'assets/TaikaPlujaPortadaFinal.png'
  },
  {
    id: 'venus',
    n: 'The Venus Flytrap',
    w: 'Forest',
    e: 'Edition No. 01 of 100',
    t: 'Look at the flower she is holding: it is a tiny carnivorous plant.',
    image: 'assets/PlantaPortada.png'
  },
  {
    id: 'mushroom',
    n: 'The Mushroom',
    w: 'Forest',
    e: 'Edition No. 05 of 100',
    t: 'The lantern is the only light in the whole figurine forest.'
  },
  {
    id: 'house',
    n: 'The House',
    w: 'Village',
    e: 'Edition No. 02 of 100',
    t: 'A black cat keeps watch on the roof while the red mailbox waits for letters.'
  },
  {
    id: 'strawberry',
    n: 'The Strawberry',
    w: 'Garden',
    e: 'Edition No. 04 of 100',
    t: 'The snail in her hand is the calmest in the whole collection.'
  }
];

const grid = document.getElementById('grid');
const counter = document.getElementById('cnt');
const progressBar = document.getElementById('bar');
const secret = document.getElementById('secret');

// Recupera les figuretes marcades en una visita anterior
let ownedFigures = [];
try {
  ownedFigures = JSON.parse(localStorage.getItem('taika-own') || '[]');
} catch (error) {}

const cards = figuresInfo.map((figureInfo, index) => {
  const card = document.createElement('article');
  card.className = 'cd';
  card.dataset.figure = figureInfo.id;
  card.dataset.w = figureInfo.w;
  card.innerHTML =
    '<div class="top2"><h3>' + figureInfo.n + '</h3><span class="tg">'
    + figureInfo.w + '</span></div><div class="det"><p><b>'
    + figureInfo.e + '</b></p><p>' + figureInfo.t
    + '</p></div><button class="own" type="button" aria-pressed="false">'
    + 'I have this one</button>';

  const image = figs[index].firstElementChild.cloneNode();
  if (image.dataset.poster) image.src = image.dataset.poster;
  if (figureInfo.image) image.src = figureInfo.image;
  image.removeAttribute('data-turntable');
  image.removeAttribute('data-turntable-frame');
  image.removeAttribute('data-poster');
  image.className = 'fg';
  image.removeAttribute('draggable');
  image.alt = figureInfo.n;
  card.insertBefore(image, card.querySelector('.det'));

  card.querySelector('.own').onclick = () => {
    const isOwned = ownedFigures.includes(index);
    ownedFigures = isOwned
      ? ownedFigures.filter((ownedIndex) => ownedIndex !== index)
      : [...ownedFigures, index];

    if (!isOwned) {
      card.classList.remove('just-added');
      void card.offsetWidth;
      card.classList.add('just-added');
    }
    updateCollection();
  };

  grid.appendChild(card);
  return card;
});

// Actualitza les targetes, el comptador i el progrés de la col·lecció
function updateCollection() {
  cards.forEach((card, index) => {
    const isOwned = ownedFigures.includes(index);
    const button = card.querySelector('.own');

    card.classList.toggle('has', isOwned);
    button.setAttribute('aria-pressed', isOwned);
    button.textContent = isOwned ? 'I have this one ✓' : 'I have this one';
  });

  const collectionComplete = ownedFigures.length === 5;
  counter.textContent = ownedFigures.length + ' of 5';
  progressBar.style.width = ownedFigures.length * 20 + '%';
  progressBar.parentElement.setAttribute('aria-valuenow', ownedFigures.length);
  secret.classList.toggle('on', collectionComplete);
  secret.querySelector('p').textContent = collectionComplete
    ? 'Secret world unlocked! Coming soon from the studio: a sixth world. Get in touch to be the first to learn its name.'
    : 'A secret awaits when you have all five figurines.';

  try {
    localStorage.setItem('taika-own', JSON.stringify(ownedFigures));
  } catch (error) {}
}

// Filtra les targetes per món
document.getElementById('chips').onclick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  document.querySelectorAll('#chips button').forEach((chip) => {
    chip.classList.toggle('on', chip === button);
    chip.setAttribute('aria-pressed', chip === button);
  });
  cards.forEach((card) => {
    card.hidden = button.dataset.f !== '*'
      && card.dataset.w !== button.dataset.f;
  });
};

// Reinicia les figuretes marcades
document.getElementById('reset').onclick = () => {
  ownedFigures = [];
  updateCollection();
};

// Inicialitza la col·lecció i adapta les imatges a la finestra
updateCollection();
sizeStaticImages();
addEventListener('resize', sizeStaticImages);
