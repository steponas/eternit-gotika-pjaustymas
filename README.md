# Gotika pjovimo pagalbininkas

Mobiliai pritaikyta lietuviška žiniatinklio programa Eternit Gotika stogo lakštų išdėstymui ir pjovimui. Po pirmo įkėlimo veikia ir be interneto (PWA).

## Paleidimas

```bash
npm install
npm run dev
```

## Testai ir build

```bash
npm test
npm run build
```

PWA ikonas generuoti (po `public/icon.svg` pakeitimo):

```bash
npm run generate-pwa-assets
```

## Diegimas (GitHub Pages)

1. Repozitorijos nustatymuose: **Settings → Pages → Source: GitHub Actions**.
2. Push į `main` (arba paleiskite workflow rankiniu būdu) — GitHub Actions sukompiliuoja ir išviešina `dist`.

Programa veikia po katalogu `/<repo>/` (Vite `base: './'`).

## Pastaba apie specifikacijas

Lakštų matmenys ir skylės remiasi Eternit Baltic montavimo instrukcijomis. Skylių pozicijas galima tikslinti programoje: **Lakštas → Nustatymai**.
