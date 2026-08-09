# GridSense Local Setup Guide 🚀

This guide will help you set up the GridSense backend and database from scratch on your local machine.

## Prerequisites

Before you start, make sure you have the following installed and running:
1. **Python 3.12+**
2. **Node.js 18+** (for the Vite frontend)
3. **Docker Desktop** (MUST be running in the background!)
4. **Git**

---

## 1. Start the Database (Postgres + PostGIS)

We use Docker to run the database locally so we don't have to deal with complex native installations.

1. Open **Docker Desktop** and make sure it is running (the whale icon in your system tray should be stable/green).
2. Open a terminal in the root of the project (`GridSense/`).
3. Run the following command to spin up the database in the background:
   ```bash
   docker-compose up -d
   ```
*(This starts a Postgres 16 container with the PostGIS extension on port 5432).*

---

## 2. Set up the Python Backend Environment

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   
   # Mac/Linux
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   ```bash
   # Windows (CMD / PowerShell)
   venv\Scripts\activate
   
   # Windows (Git Bash)
   source venv/Scripts/activate
   
   # Mac/Linux
   source venv/bin/activate
   ```
4. Install all backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 3. Seed the Database

Now we need to create the tables (via Alembic migrations) and load our demo data from the CSV files.

Make sure your virtual environment is still activated in the `backend` folder, then run:
```bash
python seed.py
```
*You should see a bunch of green checkmarks indicating the tables were created and rows were seeded. It also creates two demo users:*
* Admin: `admin@gridsense.io` / `AdminPass123`
* Crew: `crew1@gridsense.io` / `CrewPass123`

---

## 4. Run the Backend API

With the database ready, you can start the FastAPI server. From the `backend` folder:
```bash
uvicorn app.main:app --reload
```
*The API will be available at `http://127.0.0.1:8000`.*
*You can view the interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

---

## 5. Run the Frontend

Open a **new terminal window** (leave the backend running), navigate to the `frontend` folder, and start Vite:

```bash
cd frontend
npm install
npm run dev
```
*The React app should now be running locally.*

---

## 6. Check the Database

You can verify that the tables were created and seeded correctly in two ways:

**Option A: Database GUI (Recommended)**
Install a tool like **DBeaver**, **pgAdmin**, or a VS Code PostgreSQL extension and connect with:
- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `gridsense`
- **Username:** `gridsense`
- **Password:** `gridsense_pass`

**Option B: Terminal (psql)**
Jump directly into the Postgres shell running inside Docker:
```bash
docker exec -it gridsense_db psql -U gridsense -d gridsense
```
*Try running `\dt` to list tables, or `SELECT COUNT(*) FROM telemetry;`. Type `\q` to exit.*

---

### Troubleshooting
* **`failed to connect to the docker API`**: Your Docker Desktop app is closed. Open it from the Start menu and wait for the engine to start.
* **Database connection refused**: Make sure the docker container is actually running by typing `docker ps`.
* **ModuleNotFoundError**: Your Python virtual environment isn't activated. Run `venv\Scripts\activate` again.
