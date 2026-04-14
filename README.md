# Table Generator Demo

An editorial single-page demo for AI-assisted table customization, built with React, Three.js, GSAP, and a small Express proxy for OpenAI requests.

## Features

- Wabi-Sabi inspired landing page with a blurred cinematic scene transition.
- Split-screen configurator with manual controls for scenario, shape, size, and material.
- Parametric Three.js table geometry with animated updates for form, lighting, and material.
- AI prompt box that maps natural language into strict JSON configuration.
- Draft saving and restoration through `localStorage`.

## Project structure

```text
server/
  index.js           Express API for AI design translation
src/
  components/        Landing, panel, drawer, and Three.js viewport
  lib/               Catalog data, API calls, and draft storage helpers
  App.jsx            Top-level SPA orchestration
  styles.css         Visual system and layout
```

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and choose one provider.

OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5-mini
```

DeepSeek:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-chat
```

Doubao / Ark:

```env
AI_PROVIDER=doubao
DOUBAO_API_KEY=your_key
DOUBAO_MODEL=your_endpoint_id
```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open the Vite address shown in the terminal, usually `http://localhost:5173`.

## AI endpoint notes

- OpenAI uses the Responses API with strict JSON schema output.
- DeepSeek and Doubao use an OpenAI-compatible chat interface with JSON mode.
- The frontend never stores your key; it stays in the local `.env` file.

## Public deployment

GitHub Pages is not a good fit for the current full app because this project includes a Node/Express server and secret API keys. Use GitHub as the code host, then connect the repository to Render for a public link.

### Recommended path: GitHub + Render

1. Push this project to a GitHub repository.
2. Go to [Render](https://render.com/) and create a new Blueprint or Web Service from that GitHub repo.
3. Render will detect [render.yaml](./render.yaml).
4. In Render, add the secret environment variable:

   ```text
   DEEPSEEK_API_KEY=your_real_key
   ```

5. Deploy the service. Render will:

   - run `npm install && npm run build`
   - start the app with `npm run start`
   - give you a public URL such as `https://your-app.onrender.com`

6. Share that URL and anyone can open the site.

### Push to GitHub

If you have not created a remote yet:

```bash
git init
git add .
git commit -m "Initial table generator demo"
git branch -M main
git remote add origin https://github.com/<your-name>/<your-repo>.git
git push -u origin main
```

### Important

- Do not commit `.env`.
- Do not put `DEEPSEEK_API_KEY` in GitHub.
- Keep API keys only in Render environment variables or your local `.env`.
