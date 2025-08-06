

# LinkedIn Genie Automation Dockerization: Issues & Solutions


## How the Database and LinkedIn Post History Were Implemented


**Files involved:**
- `backend/models/post.js` — Defines the Post model (structure of each LinkedIn post in the database)
- `backend/db.js` — Sets up the Sequelize connection to SQLite and ensures the database directory exists
- `backend/server.js` — Initializes the database, syncs models, and uses the Post model for all LinkedIn post storage/retrieval

**Key code snippets:**


**1. Post Model (`backend/models/post.js`):**
```js
const {DataTypes} = require('sequelize');
module.exports = (sequelize) => {
    const Post = sequelize.define('Post', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userName: { type: DataTypes.STRING, allowNull: false },
        content: { type: DataTypes.STRING(3000), allowNull: false },
        imageUrl: { type: DataTypes.STRING, allowNull: true },
        linkedinId: { type: DataTypes.STRING, allowNull: true },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });
    return Post;
}
```

**2. Database Setup (`backend/db.js`):**
```js
const path = require('path');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(dbDir, 'database.sqlite'),
    logging: false
});
module.exports = sequelize;
```


**3. Database Initialization and Usage (`backend/server.js`):**
```js
const sequelize = require('./db');
const PostModel = require('./models/post');
const Post = PostModel(sequelize);
sequelize.sync().then(() => {
    console.log('Database synced!');
});
```


**How it works together:**
- When the backend starts, it ensures the database directory exists and connects to the SQLite file.
- The Post model defines the structure for all LinkedIn post records.
- `sequelize.sync()` creates the necessary tables if they don't exist.
- All tweet history is stored in the SQLite file, which is persisted by Docker volume.

**Extra notes:**
- No manual SQL is needed; Sequelize handles all table creation and queries.
- The database file is always at `/app/db/database.sqlite` inside the container, matching the Docker volume for persistence.

## Session Log: July 26, 2025

**Today's actions and changes:**

- Investigated and fixed repeated `SQLITE_CANTOPEN: unable to open database file` errors in the backend container.
- Verified and updated Docker Compose files to use named volumes mounted as directories for both uploads and the database.
- Changed `backend/db.js` to:
  - Use an absolute path for the SQLite database file inside a `db` directory.
  - Ensure the `db` directory exists at startup.
- Added missing dependencies (`sequelize`, `sqlite3`) to `backend/package.json` and rebuilt the backend Docker image.
- Used `docker compose down -v` and `docker compose up --build` to reset and test the environment multiple times.
- Confirmed that the backend now starts, creates the database, and logs `Database synced!`.
- Confirmed that the frontend container starts and serves the React app via Nginx.
- Updated and clarified `docker-compose.prod.yml` for production, removing unused build sections and adding comments.
- Created and updated this documentation file to summarize all issues, solutions, and the exact code/config changes made.

All changes were tested and verified to work as intended.

## Brief Overview

To make the Tweet Automation app production-ready, persistent, and easy to deploy for anyone, we:

- **Added Docker named volumes** for persistent storage of both the SQLite database and uploaded files. This ensures data is not lost when containers are restarted or rebuilt.
- **Changed the backend code (`backend/db.js`)** to use an absolute path for the SQLite database file inside a dedicated directory (`/app/db/database.sqlite`). This matches the Docker volume mount and avoids path/permission issues.
- **Ensured the database directory exists at startup** in the backend code, so SQLite can always create/access the file.
- **Updated Docker Compose files** (`docker-compose.yml` and `docker-compose.prod.yml`) to:
  - Mount volumes as directories (not single files) for both uploads and the database.
  - Use only `image:` (not `build:`) in production for image-only deployment.
  - Add healthchecks and proper `depends_on` for reliable startup order.
- **Added missing dependencies** (`sequelize`, `sqlite3`) to `backend/package.json` so the backend container always has what it needs.
- **Faced and solved problems** like:
  - Database file not being created or accessible (fixed by volume and code path changes)
  - Data loss on restart (fixed by using named volumes)
  - Module not found errors (fixed by updating dependencies)
  - Frontend-backend networking in Docker (fixed by using service names and correct API URLs)
  - Needing a clean, image-only deployment for non-technical users (fixed by updating compose files and `.dockerignore`)

These changes make the app robust, persistent, and easy to run with a single Docker Compose command, with no manual setup required.

## 1. Issue: SQLite Database Not Persistent or Accessible
- **Symptom:** Data was lost on container restart, or backend failed with `SQLITE_CANTOPEN: unable to open database file`.
- **Solution:**
  - Used Docker named volumes for persistence.
  - Mounted the volume to a directory (`/app/db`) instead of a single file.
  - Updated backend code to use an absolute path for the database file (`/app/db/database.sqlite`).
  - Ensured the directory exists at container startup.

## 2. Issue: Missing Node Modules (`sequelize`, `sqlite3`)
- **Symptom:** Backend container failed to start with `Cannot find module 'sequelize'`.
- **Solution:**
  - Added `sequelize` and `sqlite3` to `backend/package.json` dependencies.
  - Rebuilt the Docker image to include these modules.

## 3. Issue: Docker Compose Volume Mounts Not Working
- **Symptom:** Backend could not create or access the SQLite file even with correct volume config.
- **Solution:**
  - Switched from mounting a single file to mounting a directory for the database volume.
  - Ensured backend code and Docker Compose volume path matched exactly.

## 4. Issue: Docker Volume Corruption or Permission Problems
- **Symptom:** Backend failed to create/access the database file after several runs.
- **Solution:**
  - Used `docker compose down -v` to remove all containers and volumes, then started fresh.

## 5. Issue: Frontend-Backend Networking in Docker
- **Symptom:** Frontend could not reach backend API when both ran in Docker.
- **Solution:**
  - Used Docker Compose service names for API URLs (e.g., `VITE_API_URL=http://backend:5000`).
  - Ensured backend listens on `0.0.0.0`.

## 6. Issue: Production-Ready, Image-Only Deployment
- **Symptom:** Users needed source code to deploy, or had to build images themselves.
- **Solution:**
  - Provided `docker-compose.prod.yml` for image-only deployment.
  - Ensured `.dockerignore` excluded local database files.
  - Documented how to use pre-built images from Docker Hub.

## 7. Issue: Healthcheck and Container Startup Order
- **Symptom:** Frontend started before backend was ready, causing errors.
- **Solution:**
  - Added healthcheck to backend service in Docker Compose.
  - Used `depends_on` with `condition: service_healthy` for frontend.

---

**Summary:**
- All issues were solved by careful Docker volume management, matching code/database paths, proper dependency installation, and robust Docker Compose configuration.
- The final setup is production-ready, persistent, and easy for non-technical users to deploy.

