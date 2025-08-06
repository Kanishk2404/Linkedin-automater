
# LinkedGenie 🚀

LinkedGenie is a web application for automating LinkedIn posts using AI-powered content and image generation. It supports scheduling, company page posting, rich formatting, and is fully containerized for easy deployment.

## Key Features
- **AI-Powered Content Generation:** Generate LinkedIn posts using OpenAI, Gemini, or Perplexity APIs.
- **Rich Formatting:** Supports bold, italic, hashtags, bullet points, and section dividers with LinkedIn-friendly Unicode formatting.
- **Image & Article Support:** Attach images (upload or by URL) and article links for rich LinkedIn previews.
- **Company Page Posting:** Post to personal profiles or LinkedIn company pages.
- **Scheduling:** Schedule posts for future publication.
- **API Key Management:** Use your own API keys or default keys (if available).
- **Rate Limiting:** Per-user API call limits and provider fallback logic.
- **Modern UI:** Professional, accessible, and responsive interface.
- **Full Docker Support:** Easy to run locally or deploy anywhere with Docker Compose.


## How to Access and Use

### For Users (No Coding Required)
- **Quick Start:**
  1. Download or copy the `docker-compose.prod.yml` file to your machine.
  2. Make sure you have [Docker](https://www.docker.com/get-started) installed.
  3. In the same folder as `docker-compose.prod.yml`, run:
     ```bash
     docker compose -f docker-compose.prod.yml up --build
     ```
  4. Open your browser and go to [http://localhost:3000](http://localhost:3000)
  5. Enter your API keys in the web UI and start automating your LinkedIn posts!
- You do not need to clone the full repository unless you want to contribute or customize the code.


### For Contributors (Developers)
- **Clone this repository:**
  ```bash
  git clone https://github.com/Kanishk2404/Linkedin-automater.git
  cd Linkedin-automater
  ```
- Use `docker-compose.yml` for local development (hot reload, etc.).
- Use `docker-compose.prod.yml` for production or sharing.


## Project Structure
```
/Linkedin-automater
|-- backend/
|   |-- Dockerfile
|   |-- server.js
|   |-- package.json
|   `-- ... (other backend files)
|
|-- frontend/
|   |-- Dockerfile
|   |-- App.jsx
|   |-- package.json
|   `-- ... (other frontend files)
|
|-- .gitignore
|-- docker-compose.yml             # For development
|-- docker-compose.prod.yml        # For deployment/sharing
`-- README.md                      # Instructions
```

## Notes
- **No .env file is needed for users.** All API keys are entered in the web UI after the app loads.
- The backend and frontend are fully containerized and networked via Docker Compose.
- For any issues, check the logs with `docker compose logs backend` or `docker compose logs frontend`.

---
## For Contributors
- Want to contribute? Feel free to fork this repository and submit a pull request!
- Contributions are welcome—add features, fix bugs, or improve documentation:
  1. Fork this repository.
  2. Create a new branch for your feature or fix.
  3. Make your changes and test them locally using Docker Compose.
  4. Submit a pull request with a clear description of your changes.
- Please follow best practices for code quality and documentation.
- For major changes, open an issue first to discuss what you would like to change.

## Troubleshooting: Frontend-Backend Container Communication
- During development, a major challenge was getting the frontend container to talk to the backend container reliably.
- **Common Issues Faced:**
  - Frontend could not reach backend when using `localhost` or `127.0.0.1` inside Docker.
  - Environment variables (like VITE_API_URL) were not set or picked up correctly at build time.
  - Docker Compose service names were not used, causing network errors.
- **Solutions:**
  - Changed backend to listen on `0.0.0.0` instead of `localhost` for Docker compatibility.
  - Set `VITE_API_URL` to `http://backend:5000` in the frontend's build environment and .env file.
  - Ensured .env is present before building the frontend image.
  - Used Docker Compose service names (`backend`) for internal networking between containers.
- **Lesson Learned:**
  - Always use Docker Compose service names for container-to-container communication.
  - Ensure environment variables are available at build time, not just runtime.
  - Test networking on multiple platforms to catch environment-specific issues early.

---


---

Enjoy automating your LinkedIn posts with AI!
