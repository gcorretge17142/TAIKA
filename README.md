# TAIKA

Web estàtica de les figuretes TAIKA.

## Estructura

- `taika.html`: entry point and website content.
- `styles.css`: estils i disseny.
- `app.js`: carrusel, filtres i interaccions de la col·lecció.
- `assets/`: logo i imatges de les figuretes.
- `assets/PLUJA36fps/`: 150 fotogrames originals de la Pluja.
- `assets/pluja-scroll/`: fotogrames 1–72 optimitzats en AVIF per al carrusel.
- `assets/PLANTA150fps/`: fotogrames originals de la Dionea.
- `assets/planta-scroll/`: fotogrames quadrats optimitzats en AVIF; al carrusel gran, la planta mostra el fotograma 72 al centre i recorre els fotogrames 1–150 en passar-hi.

## Previsualització local

Des de la carpeta del projecte, inicia un servidor local:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/taika.html` in your browser. Stop the server with `Ctrl+C`.
