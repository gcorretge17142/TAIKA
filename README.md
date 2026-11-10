# TAIKA

Web estàtica de les figuretes TAIKA.

## Estructura

- `taika.html`: entry point and website content.
- `styles.css`: estils i disseny.
- `app.js`: carrusel, filtres i interaccions de la col·lecció.
- `assets/`: logo i imatges de les figuretes.
- `assets/PLUJA36fps/`: 150 fotogrames originals de la Pluja.
- `assets/pluja-scroll/`: fotogrames 1–72 optimitzats; el 72 coincideix amb el centre del carrusel. A la portada, el scroll també fa avançar i recular la seqüència de la Pluja.

## Previsualització local

Des de la carpeta del projecte, inicia un servidor local:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/taika.html` in your browser. Stop the server with `Ctrl+C`.
