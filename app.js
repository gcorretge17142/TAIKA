// Referències a les figuretes i elements del carrusel
const figs = [...document.querySelectorAll('.fig')];
const infos = [...document.querySelectorAll('.info')];
const track = document.getElementById('track');
const stage = document.getElementById('stage');
const header = document.getElementById('hd');
const dotBox = document.getElementById('dots');
const blob = document.getElementById('blob');
const figureCount = figs.length;

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const smoothStep = (value) =>
  value * value * value * (value * (value * 6 - 15) + 10);
const scaleStops = [0.5, 0.34, 0.23, 0.12];

const baseScale = (distance) => {
  if (distance >= 3) return 0;

  const index = Math.floor(distance);
  return scaleStops[index]
    + (scaleStops[index + 1] - scaleStops[index]) * (distance - index);
};

const dots = figs.map((figure, index) => {
  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Figureta ' + (index + 1));
  button.onclick = () => goToFigure(index);
  dotBox.appendChild(button);
  return button;
});

// Desplaça el carrusel fins a la figureta triada
function goToFigure(index) {
  const scrollRange = track.offsetHeight - innerHeight;
  scrollTo({
    top: track.offsetTop + scrollRange * (index + 1) / figureCount,
    behavior: 'smooth'
  });
}

figs.forEach((figure, index) => {
  figure.onclick = () => goToFigure(index);
});

const palette = [
  [247, 198, 214],
  [244, 217, 168],
  [191, 228, 242],
  [255, 189, 180],
  [248, 199, 138]
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
    });
  }

  const trackRect = track.getBoundingClientRect();
  targetProgress = clamp(-trackRect.top / (trackRect.height - height));

  if (currentProgress === null) currentProgress = targetProgress;
  currentProgress += (targetProgress - currentProgress)
    * (1 - Math.exp(-delta / 180));
  if (Math.abs(targetProgress - currentProgress) < 2e-4) {
    currentProgress = targetProgress;
  }

  const progress = currentProgress;
  const center = progress * figureCount - 1;
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

  const heroProgress = clamp(scrollY / (height * 0.8));
  heroFigures.forEach((figure, index) => {
    figure.style.transform = 'scaleX('
      + Math.cos(2 * Math.PI * smoothStep(clamp(heroProgress * 1.3 - index * 0.07)))
      + ')';
  });

  const colorIndex = clamp(Math.floor(center), 0, figureCount - 1);
  const colorProgress = clamp(center - colorIndex);
  const startColor = palette[colorIndex];
  const endColor = palette[Math.min(figureCount - 1, colorIndex + 1)];
  stage.style.background = 'rgb('
    + startColor.map((value, index) =>
      Math.round(value + (endColor[index] - value) * colorProgress)
    ).join(',')
    + ')';

  blob.style.opacity = 0.35 + 0.4 * blobStrength;
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

// Actualitza el carrusel quan es mou o es redimensiona la finestra
addEventListener('scroll', requestScrollAnimation, { passive: true });
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

// Duplica les figuretes a la portada i connecta el logo
const heroRow = document.getElementById('row');
figs.forEach((figure, index) => {
  const image = figure.firstElementChild.cloneNode();
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
  const rowHeight = Math.min(Math.max(90, height * 0.24), 216, innerWidth * 0.24);

  document.querySelectorAll('#row img').forEach((image) => {
    image.style.height = rowHeight * (+image.dataset.r || 1) + 'px';
  });

  document.querySelectorAll('.cd .fg').forEach((image) => {
    image.style.height = 240 * (+image.dataset.r || 1) + 'px';
  });
}

// Dades de les cinc figuretes de la col·lecció
const figuresInfo = [
  {
    n: 'La Dioneia',
    w: 'Bosc',
    e: 'Edició nº 01 de 100',
    t: 'Fixa’t en la flor que abraça: és una mini planta carnívora.'
  },
  {
    n: 'La Casa',
    w: 'Poble',
    e: 'Edició nº 02 de 100',
    t: 'El gat negre vigila el teulat i la bústia vermella espera cartes.'
  },
  {
    n: 'La Pluja',
    w: 'Aigua',
    e: 'Edició nº 03 de 100',
    t: 'Les dues granotes de la base són inseparables.'
  },
  {
    n: 'La Maduixa',
    w: 'Hort',
    e: 'Edició nº 04 de 100',
    t: 'El cargol de la mà és el més tranquil de tota la col·lecció.'
  },
  {
    n: 'El Bolet',
    w: 'Bosc',
    e: 'Edició nº 05 de 100',
    t: 'El fanalet és l’única llum de tot el bosc de figuretes.'
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
  card.tabIndex = 0;
  card.dataset.w = figureInfo.w;
  card.style.background = 'rgb(' + palette[index] + ')';
  card.innerHTML =
    '<div class="top2"><h3>' + figureInfo.n + '</h3><span class="tg">'
    + figureInfo.w + '</span></div><div class="det"><p><b>'
    + figureInfo.e + '</b></p><p>' + figureInfo.t
    + '</p></div><button class="own" type="button" aria-pressed="false">'
    + 'Tinc aquesta</button>';

  const image = figs[index].firstElementChild.cloneNode();
  image.className = 'fg';
  image.removeAttribute('draggable');
  image.alt = figureInfo.n;
  card.insertBefore(image, card.querySelector('.det'));

  card.onclick = (event) => {
    if (event.target.closest('.own')) return;
    card.classList.toggle('open');
  };
  card.onkeydown = (event) => {
    if (event.key === 'Enter' && event.target === card) {
      card.classList.toggle('open');
    }
  };
  card.querySelector('.own').onclick = () => {
    const isOwned = ownedFigures.includes(index);
    ownedFigures = isOwned
      ? ownedFigures.filter((ownedIndex) => ownedIndex !== index)
      : [...ownedFigures, index];

    if (!isOwned) {
      image.classList.remove('jump');
      void image.offsetWidth;
      image.classList.add('jump');
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
    button.textContent = isOwned ? 'La tinc ✓' : 'Tinc aquesta';
  });

  const collectionComplete = ownedFigures.length === 5;
  counter.textContent = ownedFigures.length + ' de 5';
  progressBar.style.width = ownedFigures.length * 20 + '%';
  secret.classList.toggle('on', collectionComplete);
  secret.querySelector('p').textContent = collectionComplete
    ? 'Món secret desbloquejat! Aviat al taller: un sisè món. Escriu-me i seràs la primera persona a saber-ne el nom.'
    : 'Un secret t’espera quan tinguis les cinc figuretes.';

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
