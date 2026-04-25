# Table Generator Demo

An editorial single-page demo for AI-assisted table customization, built with React, Three.js, GSAP, and a small Express proxy for Gemini / OpenAI-compatible requests.

## Features

- Wabi-Sabi inspired landing page with a blurred cinematic scene transition.
- Split-screen configurator with manual controls for scenario, shape, size, and material.
- Parametric Three.js table geometry with animated updates for form, lighting, and material.
- AI prompt box that maps natural language into strict JSON configuration.
- Quote page scene rendering flow that captures the current table and sends it to Gemini for photoreal interior scene generation.
- Draft saving and restoration through `localStorage`.

## Project structure

```text
server/
  index.js           Express API for AI design translation and Gemini scene rendering
src/
  components/        Landing, panel, drawer, and Three.js viewport
  lib/               Catalog data, API calls, and draft storage helpers
  App.jsx            Top-level SPA orchestration
  styles.css         Visual system and layout
docs/
  rhino-gh-roadmap.md  Rhino / Grasshopper / Compute roadmap
scripts/rhino/
  modular_table_kernel.py
  ghpython_component_example.py
```

## Rhino / Grasshopper next step

If you want to evolve this demo into a manufacturable modular furniture workflow, see:

- `C:\Users\25874\Documents\New project\docs\rhino-gh-roadmap.md`
- `C:\Users\25874\Documents\New project\docs\rhino7-gh-quickstart.md`
- `C:\Users\25874\Documents\New project\docs\rhino7-web-bridge-quickstart.md`
- `C:\Users\25874\Documents\New project\scripts\rhino\modular_table_kernel.py`
- `C:\Users\25874\Documents\New project\scripts\rhino\modular_table_kernel_rhino7.py`
- `C:\Users\25874\Documents\New project\scripts\rhino\ghpython_component_example.py`
- `C:\Users\25874\Documents\New project\scripts\rhino\ghpython_rhino7_component_example.py`
- `C:\Users\25874\Documents\New project\scripts\rhino\ghpython_rhino7_web_bridge.py`

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and choose one provider.

Gemini (recommended for the current build):

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image-preview
GEMINI_TRANSPORT=native
```

If your Gemini key comes from a gateway such as ViVi-API instead of Google AI Studio, you may also need one of these:

```env
GEMINI_BASE_URL=https://your-gemini-native-base/v1beta
```

or

```env
GEMINI_TRANSPORT=openai_compat
GEMINI_OPENAI_BASE_URL=https://your-openai-compatible-base
```

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

- If `AI_PROVIDER` is empty and `GEMINI_API_KEY` is present, the server auto-selects Gemini.
- Gemini text requests support two modes:
  - native Gemini REST for structured design control
  - OpenAI-compatible mode for gateway providers
- Quote page AI scenes use Gemini image generation and save outputs to `public/generated-scenes`.
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
